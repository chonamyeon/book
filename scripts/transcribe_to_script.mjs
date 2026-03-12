import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import djson from 'dirty-json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env 위치: the-archive/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ VITE_GEMINI_API_KEY not found in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);

const root = path.resolve(__dirname, '..');
const audioDir = path.join(root, 'public', 'audio');
const bookScriptsPath = path.join(root, 'src', 'data', 'bookScripts.js');

async function proofreadScript(script, bookId) {
    console.log(`🧹 [${bookId}] 오타 및 맞춤법 검사 중...`);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `다음은 도서 팟캐스트 전사 대본(JSON)입니다. 
오타, 맞춤법, 띄어쓰기 오류만 수정해 주세요. 
**절대로 내용을 요약하거나 문장을 새로 만들거나 삭제하지 마세요.** 
오로지 텍스트의 표기법만 교정해야 합니다. 
반드시 원래의 JSON 형식을 유지하세요.

대본 JSON:
${JSON.stringify(script, null, 2)}`;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        
        // JSON 추출 로직 강화
        const jsonStart = text.indexOf('[');
        const jsonEnd = text.lastIndexOf(']') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
            text = text.substring(jsonStart, jsonEnd);
        }
        
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            return script; // 형식이 이상하면 원본 반환
        } catch (e) {
            console.log(`⚠️ standard JSON parse failed for ${bookId} during proofread, trying dirty-json...`);
            const parsed = djson.parse(text);
            if (Array.isArray(parsed)) return parsed;
            return script;
        }
    } catch (error) {
        console.warn(`⚠️ [${bookId}] 맞춤법 검사 중 오류 발생 (원본 사용):`, error.message);
        return script;
    }
}

async function transcribe(filePath, bookId) {
    console.log(`🎙️ [${bookId}] 오디오 분석 및 대본 생성 중... (Gemini 2.5 Flash)`);
    
    try {
        // Step 1: Upload to Google AI File Manager
        const uploadResult = await fileManager.uploadFile(filePath, {
            mimeType: 'audio/mpeg',
            displayName: bookId,
        });
        
        // Wait for file to be processed (optional but recommended for longer files)
        // For sub-10min files, it's usually instant.
        
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `[정밀 전사 및 재구성 가이드]
1. 반드시 오디오의 내용을 기반으로 하되, 제임스(남)와 스텔라(여)의 '공감 가고 재미있는 오피스 라이프 대화(상황극)' 형식으로 재구성하거나 전사하세요.
2. 반드시 정확히 40턴(Turn)의 대화로 구성하세요. (A-B-A-B... 순서로 총 40번의 대사)
3. 전체 글자 수는 공백 포함 3,000자 이상의 고밀도 리뷰가 되도록 상세하게 작성하세요.
4. 오디오의 핵심 인사이트가 모두 포함되어야 하며, 직장인들이 출퇴근이나 점심시간에 공감할 수 있는 말투와 에피소드를 섞어주세요.
5. 제임스와 스텔라의 목소리 톤을 일관되게 유지하세요 (Index 기반: 0, 2, 4...=제임스 / 1, 3, 5...=스텔라).
6. **가장 중요한 규칙**: 마지막 40번째 대사는 반드시 "**오늘도 아카이뷰와 깨달음이 있는 하루 되시길 바랍니다. 감사합니다.**"로 끝나야 합니다. 그 뒤에 어떠한 농담이나 추가 텍스트도 붙이지 마세요.
7. 대본을 반드시 JSON 배열 형식으로 출력하세요: [ { "speaker": "제임스", "text": "..." }, ... ]`;

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResult.file.mimeType,
                    fileUri: uploadResult.file.uri
                }
            },
            { text: prompt },
        ]);

        let text = result.response.text().trim();
        // Clean up markdown markers if Gemini ignores the instruction
        text = text.replace(/^```json/, '').replace(/```$/, '').trim();
        
        // Use dirty-json for more robust parsing
        try {
            return JSON.parse(text);
        } catch (e) {
            console.log(`⚠️ standard JSON parse failed for ${bookId}, trying dirty-json...`);
            return djson.parse(text);
        }
    } catch (error) {
        console.error(`❌ [${bookId}] 처리 중 오류 발생:`, error.message);
        return null;
    }
}

function updateBookScripts(bookId, script) {
    let content = fs.readFileSync(bookScriptsPath, 'utf8');
    
    const key = bookId;
    const replacement = `\n\t"${key}": ${JSON.stringify(script, null, '\t\t')},`;
    
    const regex = new RegExp(`"${key}":\\s*\\[[\\s\\S]*?\\],?`, 'g');
    
    if (content.match(regex)) {
        content = content.replace(regex, replacement);
        console.log(`✅ [${bookId}] 기존 대본 업데이트 완료.`);
    } else {
        // bookScripts 객체의 시작 부분 뒤에 추가
        content = content.replace(/(export const bookScripts = {)/, `$1${replacement}`);
        console.log(`✅ [${bookId}] 새 대본 추가 완료.`);
    }
    
    fs.writeFileSync(bookScriptsPath, content);
}

async function main() {
    console.log('🚀 Archiview 오디오-대본 동기화 시스템을 시작합니다.');
    
    if (!fs.existsSync(audioDir)) {
        console.error('❌ 오디오 디렉토리를 찾을 수 없습니다:', audioDir);
        return;
    }

    const currentScriptsContent = fs.readFileSync(bookScriptsPath, 'utf8');
    const files = fs.readdirSync(audioDir).filter(f => f.toLowerCase().endsWith('.mp3'));
    
    if (files.length === 0) {
        console.log('ℹ️ 처리할 MP3 파일이 없습니다.');
        return;
    }

    console.log(`📂 총 ${files.length}개의 MP3 파일을 발견했습니다.`);

    for (const file of files) {
        const bookId = file.replace(/\.mp3$/i, '');
        
        /* 
        // 덮어쓰기 요청에 따라 기존 존재 여부 체크 해제
        if (currentScriptsContent.includes(`"${bookId}":`)) {
            console.log(`⏩ [${bookId}] 이미 대본이 존재합니다. 건너뜁니다.`);
            continue;
        }
        */
        console.log(`🔄 [${bookId}] 분석 시작 (덮어쓰기 모드)`);
        
        const filePath = path.join(audioDir, file);
        const script = await transcribe(filePath, bookId);
        
        if (script && Array.isArray(script)) {
            const polishedScript = await proofreadScript(script, bookId);
            updateBookScripts(bookId, polishedScript);
        }
    }

    // 최종적으로 availableAudio.js 동기화
    console.log('\n🔄 availableAudio.js 동기화 중...');
    try {
        execSync('node scripts/sync-audio.js', { cwd: root, stdio: 'inherit' });
    } catch (e) {
        console.warn('⚠️ sync-audio.js 실행 중 경고 발생:', e.message);
    }

    console.log('\n✨ 모든 작업이 완료되었습니다! 이제 팟캐스트 버튼을 클릭하면 카톡 대본이 함께 출력됩니다.');
}

main().catch(error => {
    console.error('💥 치명적 오류 발생:', error);
});
