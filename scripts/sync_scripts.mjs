import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FINAL_PODCAST_DIR = path.resolve(__dirname, '../final_podcast');
const SCRIPTS_FILE = path.resolve(__dirname, '../src/data/bookScripts.js');

async function syncScripts() {
    console.log('🔄 [Sync] 대본 파일 동기화 시작 (JSON -> bookScripts.js)...');

    if (!fs.existsSync(FINAL_PODCAST_DIR)) {
        console.error('❌ final_podcast 폴더를 찾을 수 없습니다.');
        return;
    }

    if (!fs.existsSync(SCRIPTS_FILE)) {
        console.error('❌ bookScripts.js 파일을 찾을 수 없습니다.');
        return;
    }

    const jsonFiles = fs.readdirSync(FINAL_PODCAST_DIR).filter(f => f.endsWith('_script.json'));
    console.log(`📜 발견된 대본 JSON: ${jsonFiles.length}개`);

    let content = fs.readFileSync(SCRIPTS_FILE, 'utf-8');

    for (const file of jsonFiles) {
        const bookId = file.replace('_script.json', '');
        const scriptData = JSON.parse(fs.readFileSync(path.join(FINAL_PODCAST_DIR, file), 'utf-8'));

        // 스크립트 형식 변환 (speaker -> role: A/B)
        const formattedScript = scriptData.map(turn => ({
            role: turn.speaker === '제임스' ? 'A' : 'B',
            text: turn.text
        }));

        const entry = JSON.stringify(formattedScript, null, 8);
        const entryRegex = new RegExp(`["']?${bookId}["']?:\s*\[[\s\S]*?\],?`, 'g');

        if (content.match(entryRegex)) {
            console.log(`✅ [${bookId}] 기존 데이터 업데이트 중...`);
            content = content.replace(entryRegex, `"${bookId}": ${entry},`);
        } else {
            console.log(`➕ [${bookId}] 새 데이터 추가 중...`);
            const lastBraceIndex = content.lastIndexOf('};');
            if (lastBraceIndex !== -1) {
                const newEntry = `    "${bookId}": ${entry},
`;
                content = content.slice(0, lastBraceIndex) + newEntry + content.slice(lastBraceIndex);
            }
        }
    }

    fs.writeFileSync(SCRIPTS_FILE, content, 'utf-8');
    console.log('✨ [완료] 모든 대본이 실제 오디오 데이터와 동기화되었습니다.');
}

syncScripts().catch(console.error);
