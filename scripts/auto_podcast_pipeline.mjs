import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { createRequire } from 'module';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// [수정] .env 위치를 더 확실하게 탐색 (the-archive 폴더 안 또는 부모 폴더)
const envPaths = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'the-archive/.env')
];
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`📡 [Env] Loaded from: ${envPath}`);
        break;
    }
}

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// --- [환경 설정: API 키 로테이션] ---
const API_KEYS = [
    process.env.VITE_GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY2,
    process.env.VITE_GEMINI_API_KEY3,
    process.env.VITE_GEMINI_API_KEY4,
    process.env.VITE_GEMINI_API_KEY5,
    process.env.VITE_GEMINI_API_KEY6,
    process.env.VITE_GEMINI_API_KEY7,
    process.env.VITE_GEMINI_API_KEY8,
    process.env.VITE_GEMINI_API_KEY9
].filter(key => !!key);

if (API_KEYS.length === 0) {
    console.error("❌ API 키를 읽어오지 못했습니다! .env 파일을 확인하세요.");
}

let currentKeyIndex = 0; // 1번 키(유료/Pro)부터 시작하도록 수정
const getCurrentKey = () => API_KEYS[currentKeyIndex];
const getNextKey = () => {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    console.log(`🔑 API 키를 교체합니다. (Next Index: ${currentKeyIndex})`);
    return API_KEYS[currentKeyIndex];
};

const TEMP_BASE_DIR = path.resolve(__dirname, '../temp_audio');
const OUTPUT_DIR = path.resolve(__dirname, '../final_podcast');
const INPUT_DIR = path.resolve(__dirname, '../ebook_inputs');
const PUBLIC_AUDIO_DIR = path.resolve(__dirname, '../public/audio');

[TEMP_BASE_DIR, OUTPUT_DIR, INPUT_DIR, PUBLIC_AUDIO_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// --- [도서 메타 정보 로드 (books.json)] ---
function getBookMeta(bookId) {
    try {
        const booksPath = path.resolve(__dirname, 'books.json');
        if (fs.existsSync(booksPath)) {
            const books = JSON.parse(fs.readFileSync(booksPath, 'utf-8'));
            return books.find(b => b.id === bookId) || null;
        }
    } catch (e) { /* graceful */ }
    return null;
}

export async function extractTextFromFile(fileName) {
    const filePath = path.join(INPUT_DIR, fileName);
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    }
    return fs.readFileSync(filePath, 'utf-8');
}

export async function generatePodcastScript(bookText) {
    console.log(`\n🤖 [Step 2] Claude API로 대본 생성 중 (직장인 맞춤형 유쾌한 톤)...`);
    const prompt = `당신은 오리지널 팟캐스트 대본을 쓰는 프로 작가입니다.

【이 팟캐스트의 핵심 정체성】
이 대본은 책을 소개하는 것이 아닙니다.
책 속 아이디어를 소재로 삼아, 제임스와 스텔라가 자신들의 직장생활·일상·인간관계에 직접 대입해서
웃고 공감하고 가끔은 진지하게 토론하는 오리지널 토크 콘텐츠입니다.
청취자가 "이거 완전 내 얘기잖아!"라는 반응을 이끌어내는 것이 목표입니다.

【대본의 방향성】
- 책 내용은 대화의 출발점일 뿐, 금방 우리 삶으로 튀어나와야 합니다
- 예시: 책에서 '선택의 역설' 이야기 → "나 지난주에 점심 메뉴 고르다가 진짜 번아웃 왔잖아" 식으로 전환
- 직장생활 에피소드(상사, 야근, 회의, 번아웃, 연봉협상), 인간관계(친구, 연애, 가족), 커리어 고민을 자연스럽게 끌어들이기
- 책의 인사이트가 "그래서 나는 이렇게 바꿨어" "이게 진짜 써먹힌다니까" 식의 실용 팁으로 착지해야 함

【대화 스타일 — 이게 제일 중요】
【대본 작성 규칙 - ❗️어길 시 시스템 오류 발생❗️】
- ❗ 전체 대화 턴(Turn) 수는 반드시 48턴 이상 50턴 이하로 생성하세요. 51턴부터는 시스템이 강제로 잘라내므로 대본이 어색하게 끊깁니다.
- ❗ 대본을 작성하기 전에 먼저 전체 구성(기승전결)을 50턴 안에 끝낼 수 있도록 설계한 뒤 작성하세요.
- **[중요]** 마지막 턴(48~50번째)에서는 친구와 헤어질 때처럼 아주 자연스럽게 마무리 인사를 나누며 대화를 끝내야 합니다.
- ❗ 작성이 끝나면 제출 전에 반드시 턴 수를 세어 48~50 범위인지 확인하세요.
- 하나의 턴 당 대사 길이는 3~4문장(약 55~65자)으로 유지하세요. 한 번에 혼자 너무 길게 말하는 독백은 절대 금지!
- 빠른 티키타카(주거니 받거니)를 유지하되, 대사의 총 글자 수가 2800자 ~ 3000자 가 되도록 에피소드를 꽉 채우세요.
- 반드시 제임스(남, 인덱스0)가 첫 대사를 시작하며, 이후 스텔라(여)와 완벽하게 교대해야 합니다.

【절대 금지】
- [웃음] 같은 괄호 지시문
- "안녕하세요", "저는 제임스입니다" 같은 인사말 → 바로 본론으로 시작
- 책 내용을 줄줄이 설명하는 강의식 말투
- 너무 진지하고 교훈적인 마무리 → 가볍게 끝내도 됨

형식: [{"speaker": "제임스", "text": "..."}, {"speaker": "스텔라", "text": "..."}, ...]
텍스트: ${bookText.substring(0, 8000)}`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            console.log(`    📡 Claude API 대본 요청 중... (Attempt: ${attempt + 1})`);
            const message = await anthropic.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 8192,
                messages: [{ role: 'user', content: prompt }]
            });

            const text = message.content[0].text;
            if (!text) throw new Error("Empty response from Claude");

            // 안전한 JSON 파싱 로직 복구
            const jsonStart = text.indexOf('[');
            const jsonEnd = text.lastIndexOf(']') + 1;
            if (jsonStart === -1 || jsonEnd === 0) {
                console.error("    ❌ 응답에서 JSON 형식을 찾을 수 없습니다:", text.substring(0, 100));
                throw new Error("Invalid JSON format in response");
            }
            let script = JSON.parse(text.substring(jsonStart, jsonEnd));

            // [안전장치] AI가 51턴 이상 생성한 경우, 자연스러운 마무리 턴을 찾아 거기서 끊음
            if (script.length > 50) {
                console.log(`    ⚠️ [경고] AI가 ${script.length}턴을 생성했습니다. 자연스러운 마무리 지점을 탐색합니다.`);
                const closingKeywords = ["다음에", "수고", "그럼", "안녕", "오늘은", "여기까지", "끝내자", "마무리"];
                // 48~50번째 턴에서 역순으로 자연스러운 마무리 키워드 탐색
                let cutIndex = 50;
                for (let i = 49; i >= 47; i--) {
                    if (script[i] && closingKeywords.some(kw => script[i].text.includes(kw))) {
                        cutIndex = i + 1;
                        console.log(`    ✅ ${i + 1}번째 턴에서 자연스러운 마무리 감지 → 여기서 종료`);
                        break;
                    }
                }
                script = script.slice(0, cutIndex);
            }

            // 상투적인 인사말 삭제
            const bannedKeywords = ["안녕하세요", "누구입니다", "에디토리얼", "에디터", "반갑습니다", "제임스입니다", "스텔라입니다"];
            while (script.length > 1) {
                const firstPara = script[0].text;
                if (bannedKeywords.some(k => firstPara.includes(k))) {
                    console.log(`🗑️ [인사말 발견] '${firstPara.substring(0, 20)}...' 패턴 유지를 위해 첫 2줄을 삭제합니다.`);
                    script.splice(0, 2);
                } else {
                    break;
                }
            }

            console.log(`✅ Claude 대본 생성 완료! (${script.length}턴)`);
            return script;
        } catch (err) {
            console.warn(`⚠️ 대본 생성 시도 ${attempt + 1} 실패: ${err.message}`);
            await new Promise(r => setTimeout(r, 10000));
        }
    }
    throw new Error("대본 생성 실패 (메인 루프로 전달)");
}

// --- [이북 리뷰 자동 생성] ---
export async function generateBookReview(bookText, bookTitle, bookAuthor, bookPublisher) {
    console.log(`\n📖 [Step 2-B] Claude로 이북 리뷰 자동 생성 중 (${bookTitle})...`);
    const prompt = `당신은 Archiview의 전문 북 큐레이터이자 에세이 작가입니다.
주어진 책의 원문 텍스트를 바탕으로, 이 책이 독자의 삶에 어떤 방향을 제시하는지를 중심으로 깊은 감상 에세이를 작성하세요.

## 도서 정보
- 제목: ${bookTitle}
- 저자: ${bookAuthor}
- 출판사: ${bookPublisher}

## 이북의 성격과 방향성 (대본과 완전히 다릅니다)
이북은 팟캐스트 대본이 아닙니다.
독자가 혼자 조용히 읽으며 책의 세계관에 천천히 빠져드는 글입니다.
가볍고 재미있는 대화체가 아니라, 한 권의 책이 나의 인생관·가치관·삶의 방향에
어떤 울림을 남겼는지를 성찰하는 진지한 에세이입니다.
약간의 무게감과 문학적 밀도가 있어도 좋습니다.

## 핵심 작성 원칙
- 총 4,000자 이상, 밀도 있게 (채우기용 문구 절대 금지)
- 책 전체가 주는 분위기·철학·세계관을 독자가 느낄 수 있도록 서술
- 이 책이 나에게 어떤 인사이트를 주었고, 삶을 살아가는 방향에 어떤 영향을 미쳤는지가 핵심
- 나의 내면 이야기가 70%, 책 내용은 그 생각을 뒷받침하는 근거로 30% 활용
- 책의 특정 문장을 직접 인용할 때는 반드시 큰따옴표(" ") 사용
- "도서요약", "성찰 70%" 같은 내부 구조 표시는 절대 본문에 노출하지 말 것
- 이북 뷰어에서 읽히므로 단락 간 여백을 충분히, 문단은 4~6줄 내외로 구성

## 구조 (반드시 준수)

첫 줄: 참고 도서: ${bookTitle} / 저자: ${bookAuthor} / 출판사: ${bookPublisher}

(한 줄 공백)

■ 서론: [감성적이고 인상적인 소제목]
이 책을 처음 만났을 때의 순간, 당시 내가 처했던 삶의 상황,
그리고 첫 장을 펼쳤을 때의 감각을 섬세하게 묘사합니다.
독자가 "나도 저런 순간이 있었는데"라고 느낄 수 있도록. (3~4문단)

■ [이 책의 핵심 주제 1]: [소제목]
책이 다루는 첫 번째 중요한 주제를 통해, 내가 어떤 생각의 변화를 겪었는지 서술.
단순 요약이 아니라, 이 주제가 내 삶의 어떤 장면과 맞닿았는지를 풀어냅니다. (3~4문단)

■ [이 책의 핵심 주제 2]: [소제목]
책에서 인상 깊었던 구절이나 장면을 인용하고,
그 문장이 왜 내 마음에 걸렸는지, 나는 그것을 어떻게 해석했는지 깊게 서술. (3~4문단)

■ [이 책의 핵심 주제 3]: [소제목]
저자의 철학 또는 책의 세계관이 현재 우리 시대·사회와 어떻게 연결되는지,
그리고 그것이 내가 앞으로 살아가는 방식에 어떤 나침반이 되었는지 서술. (3~4문단)

■ 개인적 성찰: [소제목]
이 책을 다 읽고 났을 때의 감각, 변화된 나의 생각,
그리고 이 책이 내 인생의 어느 챕터에서 어떤 의미를 가지는지 마무리. (2~3문단)

---
【지혜의 갈무리】

책을 선택한 이유:
(이 책이 지금 이 시대, 이 삶을 살아가는 독자에게 왜 필요한지 2~3줄)

저자 소개:
(저자의 이력·다른 저서와의 연결 고리, 이 책을 쓰게 된 배경 2~3줄)

추천 대상:
(어떤 고민을 가진 사람에게 이 책이 특히 필요한지 구체적으로 2~3줄)

지혜의 요약:
1. (이 책이 삶에 주는 첫 번째 통찰)
2. (이 책이 삶에 주는 두 번째 통찰)
3. (이 책이 삶에 주는 세 번째 통찰)

## 톤앤매너
- 1인칭 에세이체, 차분하고 성찰적인 문어체
- 대화체·구어체 금지 → 문학적이고 밀도 있는 문장
- 풍부한 수식어, 비유, 철학적 질문을 자연스럽게 녹이기
- 독자가 혼자 조용히 읽으며 자신의 삶을 돌아보게 만드는 분위기
- ■ 기호로 시작하는 섹션 헤더 반드시 사용

텍스트: ${bookText.substring(0, 8000)}`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            console.log(`    📡 Claude API 리뷰 요청 중... (Attempt: ${attempt + 1})`);
            const message = await anthropic.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 8192,
                messages: [{ role: 'user', content: prompt }]
            });

            const text = message.content[0].text;
            if (!text || text.length < 500) throw new Error("리뷰가 너무 짧음");
            console.log(`✅ Claude 리뷰 생성 완료! (${text.length}자)`);
            return text;
        } catch (err) {
            console.warn(`⚠️ 리뷰 생성 시도 ${attempt + 1} 실패: ${err.message}`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    throw new Error("리뷰 생성 실패");
}

// --- [도서 제목 매핑 데이터] ---
const BOOK_TITLES = {
    '1984': '1984',
    '1984-rm': '1984',
    '21-lessons': '21세기를 위한 21가지 제언',
    'almond': '아몬드',
    'built-to-last': '성공하는 기업들의 8가지 습관',
    'catcher-in-the-rye': '호밀밭의 파수꾼',
    'demian': '데미안',
    'factfulness': '팩트풀니스',
    'gentleman-in-moscow': '모스크바의 신사',
    'greek-lessons': '희랍어 시간',
    'homo-deus': '호모 데우스',
    'human-acts': '소년이 온다',
    'human-acts-hk': '소년이 온다',
    'klara-and-the-sun': '클라라와 태양',
    'leverage': '레버리지',
    'lightness-of-being': '참을 수 없는 존재의 가벼움',
    'norwegian-wood': '상실의 시대',
    'one-thing': '원씽',
    'onething': '원씽',
    'project-hail-mary': '프로젝트 헤일메리',
    'property-money': '돈의 속성',
    'psychology': '돈의 심리학',
    'sapiens': '사피엔스',
    'sayno': '세이노의 가르침',
    'stoner': '스토너',
    'the-stranger': '이방인',
    'ubermensch': '위버멘쉬',
    'vegetarian': '채식주의자',
    'vegetarian-hk': '채식주의자',
    'vegetarian-rm': '채식주의자',
    'we-do-not-part': '작별하지 않는다',
    'why-we-sleep': '우리는 왜 잠을 자야 할까',
    'your-name': '너의 이름은',
    'small-things': '이처럼 사소한 것들',
    'intelligent-investor': '현명한 투자자'
};

export async function generateAudioGemini(script, bookTempDir, bookTitle) {
    if (!fs.existsSync(bookTempDir)) fs.mkdirSync(bookTempDir, { recursive: true });
    console.log(`🎙️ [Step 2] TTS 생성 시작 (도서 전용 폴더: ${path.basename(bookTempDir)})...`);
    const audioFilePaths = [];

    // [원칙] 일반 베스트셀러 도서: gemini-2.5-flash-preview-tts (45턴↑)
    // 오리지널 도서(특별 지정 시): gemini-2.5-pro-preview-tts (40턴↑)
    let currentModelName = "gemini-2.5-flash-preview-tts";

    for (let i = 0; i < script.length; i++) {
        const turn = script[i];
        const tempFile = path.join(bookTempDir, `turn_${i}.wav`);

        let success = false;
        let attempts = 0;

        while (!success && attempts < 5) {
            try {
                // [Lockdown] 인덱스 기반 절대 할당: 짝수=Puck(남/제임스), 홀수=Kore(여/스텔라)
                // speaker 이름 기반 할당은 대본 오류 시 꼬임 발생 → 인덱스로만 고정
                const voiceName = (i % 2 === 0) ? 'Puck' : 'Kore';

                if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 1000) {
                    console.log(`    ⏩ [${i + 1}/${script.length}] 이미 존재함 (건너뜀)`);
                    audioFilePaths.push(tempFile);
                    success = true;
                    continue;
                }

                // [안정성] 짧은 대기 (20초)
                if (i > 0 || attempts > 0) {
                    const waitSec = 20;
                    console.log(`    ⏱️  대기 중(${waitSec}s)...`);
                    await new Promise(r => setTimeout(r, waitSec * 1000));
                }

                const targetKeyIndices = [0, 1, 3, 7]; // 1, 2, 4, 8번 키
                let keyIndex = -1;
                let key = "";

                // 세션 내 429로 판명된 키는 즉시 스킵하여 속도 향상
                if (!global.failedKeyIndices) global.failedKeyIndices = new Set();

                for (let kIdx of targetKeyIndices) {
                    if (global.failedKeyIndices.has(kIdx)) continue;
                    keyIndex = kIdx;
                    key = API_KEYS[kIdx];
                    break;
                }

                if (!key) {
                    console.log("⚠️ 모든 키가 429로 막혔습니다. 60초 대기 후 초기화...");
                    global.failedKeyIndices.clear();
                    await new Promise(r => setTimeout(r, 60000));
                    continue;
                }

                console.log(`    🎙️ [${i + 1}/${script.length}] ${keyIndex + 1}번 키로 생성 시도...`);

                const TARGET_URL = `https://generativelanguage.googleapis.com/v1beta/models/${currentModelName}:generateContent`;

                const response = await fetch(`${TARGET_URL}?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `[TTS 낭독] ${turn.text}` }] // [TTS 낭독] 마커: "들었어?" 같은 질문형 텍스트의 400에러 방지
                        }],
                        generationConfig: {
                            responseModalities: ["audio"],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: voiceName }
                                }
                            }
                        }
                    })
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error(`    ❌ TTS 실패 (키 ${keyIndex + 1}, 코드 ${response.status}): ${errorBody}`);
                    if (response.status === 429) {
                        global.failedKeyIndices.add(keyIndex);
                        attempts++;
                        continue;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));
                if (!audioPart) throw new Error("Audio data missing in response");

                const buffer = Buffer.from(audioPart.inlineData.data, 'base64');

                // [참고] Gemini TTS는 RIFF 헤더가 없는 RAW PCM(s16le) 데이터를 반환함. 
                // 따라서 헤더 검증은 생략하고 실제 데이터 크기로만 간단히 체크.
                if (buffer.length < 100) {
                    throw new Error("Invalid audio data (Too small).");
                }

                fs.writeFileSync(tempFile, buffer);
                audioFilePaths.push(tempFile);
                success = true;
                console.log(`    ✅ [${i + 1}/${script.length}] 완료 (Voice: ${voiceName}, Key: ${keyIndex + 1})`);

            } catch (err) {
                attempts++;
                console.error(`    ❌ [${i + 1}/${script.length}] 시도 ${attempts}/5 실패: ${err.message}`);

                if (attempts < 5) {
                    console.log(`    🔄 API 키 교체 후 3초 뒤 재시도...`);
                    getNextKey();
                    await new Promise(r => setTimeout(r, 3000));
                } else {
                    throw err;
                }
            }
        }
        if (!success) throw new Error(`${i}번 대사 최종 실패`);
    }
    return audioFilePaths;
}

export async function mergeAudio(audioFilePaths, outputFileName, bookTitle) {
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    const ffmpegPath = ffmpegInstaller.path;
    const bookId = path.parse(outputFileName).name.replace('_partial', '');
    const bookTempDir = path.join(TEMP_BASE_DIR, bookId);

    console.log(`🎬 [Step 3] 오디오 정밀 병합 중 (Concat Demuxer 방식)...`);

    const jinglePath = path.resolve(__dirname, '../public/music/intro_jingle.mp3');
    const hasJingle = fs.existsSync(jinglePath);

    try {
        const metadata = `-metadata title="${bookTitle}" -metadata artist="Archiview Editorial" -metadata album="Archiview Podcast"`;

        // 1. 각 개별 파일을 표준 포맷(44.1k Stereo)으로 임시 변환 (병합용)
        const transitionDir = path.join(bookTempDir, 'normalized');
        if (!fs.existsSync(transitionDir)) fs.mkdirSync(transitionDir, { recursive: true });

        const normalizedFiles = [];
        console.log(`   🛠️  ${audioFilePaths.length}개 파일 표준화 작업 중...`);
        for (let i = 0; i < audioFilePaths.length; i++) {
            const input = audioFilePaths[i];
            const output = path.join(transitionDir, `norm_${i}.wav`);
            // Gemini TTS 반환값은 헤더 없는 RAW PCM(s16le, 24kHz, 1채널)이므로 명시적으로 알려주어야 함
            execSync(`"${ffmpegPath}" -y -f s16le -ar 24000 -ac 1 -i "${input}" -ar 44100 -ac 2 "${output}"`, { windowsHide: true });
            normalizedFiles.push(output);
        }

        // 2. Concat List 파일 생성
        const listFilePath = path.join(bookTempDir, 'concat_list.txt');
        const listContent = normalizedFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
        fs.writeFileSync(listFilePath, listContent);

        // 3. 음성 파일들 하나로 병합
        const tempVoiceMergedPath = path.join(bookTempDir, 'temp_voice_final.mp3');
        console.log(`   🎙️  음성 파일 병합 추진...`);
        execSync(`"${ffmpegPath}" -y -f concat -safe 0 -i "${listFilePath}" -c:a libmp3lame -b:a 192k "${tempVoiceMergedPath}"`, {
            windowsHide: true,
            stdio: 'inherit'
        });

        // 4. 리샘플링 및 최종 믹싱 (징글 포함)
        if (hasJingle) {
            console.log(`   🎵 오프닝/엔딩 및 정규화(loudnorm) 적용...`);
            execSync(`"${ffmpegPath}" -y \
                -i "${jinglePath}" \
                -i "${tempVoiceMergedPath}" \
                -filter_complex "[0:a]aresample=44100:out_ch_layout=stereo[a0];[1:a]aresample=44100:out_ch_layout=stereo[a1];anullsrc=r=44100:cl=stereo,atrim=end=1[silence];[a0][silence][a1][silence][a0]concat=n=5:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]" \
                -map "[out]" ${metadata} -c:a libmp3lame -b:a 192k "${outputPath}"`, { windowsHide: true, stdio: 'inherit' });
        } else {
            console.log(`   ℹ️ 오프닝 음악 없음. 정규화만 진행.`);
            execSync(`"${ffmpegPath}" -y -i "${tempVoiceMergedPath}" -af "aresample=44100:out_ch_layout=stereo,loudnorm=I=-16:TP=-1.5:LRA=11" ${metadata} -c:a libmp3lame -b:a 192k "${outputPath}"`, { windowsHide: true, stdio: 'inherit' });
        }

        // 5. 임시 파일 정리
        if (fs.existsSync(tempVoiceMergedPath)) fs.unlinkSync(tempVoiceMergedPath);
        if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath);
        fs.rmSync(transitionDir, { recursive: true, force: true });

        const finalDestPath = path.join(PUBLIC_AUDIO_DIR, outputFileName);
        fs.copyFileSync(outputPath, finalDestPath);
        console.log(`✅ 서버 저장 완료: /audio/${outputFileName}`);

        return `/audio/${outputFileName}`;
    } catch (err) {
        console.error("❌ 병합 실패:", err.message);
        throw err;
    }
}

function updateServiceData(baseId, audioUrl) {
    console.log(`🔗 [Step 4] 프론트엔드 데이터 연동 중...`);
    const celebFilePath = path.resolve(__dirname, '../src/data/celebrities.js');
    if (!fs.existsSync(celebFilePath)) return;

    let content = fs.readFileSync(celebFilePath, 'utf-8');

    // ID 매핑 테이블 (onething -> one-thing 등)
    const idMapping = {
        'onething': 'one-thing',
        '1984-rm': '1984',
        'vegetarian-rm': 'vegetarian',
        'vegetarian-hk': 'vegetarian-hk',
        'human-acts-hk': 'human-acts'
    };

    const entryId = idMapping[baseId] || baseId;
    const regex = new RegExp(`id:\\s*["']${entryId}["'],`, 'g');

    if (content.match(regex)) {
        if (!content.includes(`podcastFile: "${audioUrl}"`)) {
            content = content.replace(regex, `$&\n                isPodcast: true,\n                podcastFile: "${audioUrl}",`);
            fs.writeFileSync(celebFilePath, content, 'utf-8');
            console.log(`✅ celebrities.js 연동 성공 (ID: ${entryId}).`);
        } else {
            console.log(`ℹ️ 이미 연동되어 있습니다 (ID: ${entryId}).`);
        }
    } else {
        console.warn(`⚠️ celebrities.js에서 id: "${entryId}"를 찾을 수 없습니다.`);
    }
}

// --- [리뷰 존재 여부 확인] ---
function checkReviewExists(bookId) {
    const celebFilePath = path.resolve(__dirname, '../src/data/celebrities.js');
    if (!fs.existsSync(celebFilePath)) return false;
    const content = fs.readFileSync(celebFilePath, 'utf-8');

    const idMapping = { 'onething': 'one-thing', '1984-rm': '1984', 'vegetarian-rm': 'vegetarian', 'vegetarian-hk': 'vegetarian-hk', 'human-acts-hk': 'human-acts' };
    const entryId = idMapping[bookId] || bookId;

    // id 해당 블록을 찾아서 review 필드가 실질적 내용(200자 이상)을 가지고 있는지 확인
    const regex = new RegExp(`id:\\s*["']${entryId}["'][\\s\\S]*?review:\\s*\`([\\s\\S]*?)\``, 'm');
    const match = content.match(regex);
    if (match && match[1] && match[1].trim().length > 200) {
        return true;
    }
    return false;
}

// --- [리뷰 → celebrities.js 업데이트] ---
function updateReviewData(bookId, reviewText) {
    console.log(`📝 [Step 7] 리뷰 데이터를 celebrities.js에 업데이트 중...`);
    const celebFilePath = path.resolve(__dirname, '../src/data/celebrities.js');
    if (!fs.existsSync(celebFilePath)) return;
    let content = fs.readFileSync(celebFilePath, 'utf-8');

    const idMapping = { 'onething': 'one-thing', '1984-rm': '1984', 'vegetarian-rm': 'vegetarian', 'vegetarian-hk': 'vegetarian-hk', 'human-acts-hk': 'human-acts' };
    const entryId = idMapping[bookId] || bookId;

    // 백틱 이스케이프 처리
    const escaped = reviewText.replace(/`/g, "'").replace(/\$/g, '\\$');

    // review: `...` 패턴 교체 (id 필드와의 간격을 더 유연하게 매칭)
    const reviewRegex = new RegExp(`(id:\\s*["']${entryId}["'][\\s\\S]{1,1000}review:\\s*)\`[\\s\\S]*?\``);
    if (content.match(reviewRegex)) {
        content = content.replace(reviewRegex, `$1\`${escaped}\``);
        fs.writeFileSync(celebFilePath, content, 'utf-8');
        console.log(`✅ 리뷰 업데이트 완료 (ID: ${entryId}, ${reviewText.length}자)`);
    } else {
        console.warn(`⚠️ celebrities.js에서 id: "${entryId}"의 review 필드를 찾을 수 없습니다.`);
    }
}

// --- [bookScripts.js 업데이트] ---
function updateBookScripts(bookId, script) {
    console.log(`🎙️ [Step 6] bookScripts.js 업데이트 중...`);
    const filePath = path.resolve(__dirname, '../src/data/bookScripts.js');
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');

    // 스크립트 형식 변환 (speaker → role)
    const formattedScript = script.map(turn => ({
        role: turn.speaker === '제임스' ? 'A' : 'B',
        text: turn.text
    }));

    const entry = JSON.stringify(formattedScript, null, 8);
    const entryRegex = new RegExp(`["']?${bookId}["']?:\\s*\\[[\\s\\S]*?\\],?`, 'g');

    if (content.match(entryRegex)) {
        content = content.replace(entryRegex, `"${bookId}": ${entry},`);
    } else {
        const lastBraceIndex = content.lastIndexOf('};');
        if (lastBraceIndex !== -1) {
            const newEntry = `    "${bookId}": ${entry},\n`;
            content = content.slice(0, lastBraceIndex) + newEntry + content.slice(lastBraceIndex);
        }
    }
    fs.writeFileSync(filePath, content);
    console.log(`✅ bookScripts.js 업데이트 완료 (ID: ${bookId}, ${formattedScript.length}턴)`);
}

// --- [북커버 자동 다운로드 (Google Books API)] ---
const COVERS_DIR = path.resolve(__dirname, '../public/images/covers');
if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });

async function fetchBookCover(bookId, bookTitle) {
    const coverPath = path.join(COVERS_DIR, `${bookId}.jpg`);

    // 이미 커버가 있으면 스킵
    if (fs.existsSync(coverPath)) {
        console.log(`🖼️ [Skip] 커버가 이미 존재합니다: ${bookId}.jpg`);
        return `/images/covers/${bookId}.jpg`;
    }

    console.log(`🖼️ [커버 다운로드] "${bookTitle}" 검색 중...`);

    try {
        // Google Books API로 검색 (API 키 불필요)
        const query = encodeURIComponent(bookTitle);
        const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5&langRestrict=ko`;
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (!data.items || data.items.length === 0) {
            // 한국어 실패 시 영어로 재시도
            const apiUrlEn = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`;
            const resEn = await fetch(apiUrlEn);
            const dataEn = await resEn.json();
            if (!dataEn.items || dataEn.items.length === 0) {
                console.warn(`⚠️ Google Books에서 "${bookTitle}"을 찾지 못했습니다.`);
                return null;
            }
            data.items = dataEn.items;
        }

        // 가장 관련도 높은 결과에서 thumbnails 가져오기
        let thumbnailUrl = null;
        for (const item of data.items) {
            const imageLinks = item.volumeInfo?.imageLinks;
            if (imageLinks) {
                // 가장 큰 해상도 우선
                thumbnailUrl = imageLinks.extraLarge || imageLinks.large ||
                    imageLinks.medium || imageLinks.small || imageLinks.thumbnail;
                if (thumbnailUrl) break;
            }
        }

        if (!thumbnailUrl) {
            console.warn(`⚠️ "${bookTitle}"의 커버 이미지를 찾지 못했습니다.`);
            return null;
        }

        // Google Books URL 해상도 업그레이드
        // zoom=1 → zoom=3 (고해상도), edge=curl 제거
        thumbnailUrl = thumbnailUrl
            .replace('zoom=1', 'zoom=3')
            .replace('&edge=curl', '')
            .replace('http://', 'https://');

        // 다운로드
        const imgRes = await fetch(thumbnailUrl);
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);

        const buffer = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(coverPath, buffer);

        const sizeKB = (buffer.length / 1024).toFixed(1);
        console.log(`✅ 커버 다운로드 완료! (${sizeKB}KB → ${bookId}.jpg)`);
        return `/images/covers/${bookId}.jpg`;

    } catch (err) {
        console.warn(`⚠️ 커버 다운로드 실패: ${err.message}`);
        return null;
    }
}

// celebrities.js의 cover 필드 업데이트
function updateCoverData(bookId, coverPath) {
    if (!coverPath) return;
    const celebFilePath = path.resolve(__dirname, '../src/data/celebrities.js');
    if (!fs.existsSync(celebFilePath)) return;
    let content = fs.readFileSync(celebFilePath, 'utf-8');

    const idMapping = { 'onething': 'one-thing', '1984-rm': '1984', 'vegetarian-rm': 'vegetarian', 'vegetarian-hk': 'vegetarian-hk', 'human-acts-hk': 'human-acts' };
    const entryId = idMapping[bookId] || bookId;

    // cover: "/images/covers/xxx.jpg" or cover: '/images/covers/xxx.jpg' 패턴 교체
    const coverRegex = new RegExp(`(id:\\s*["']${entryId}["'][\\s\\S]*?cover:\\s*)["'][^"']*["']`);
    if (content.match(coverRegex)) {
        content = content.replace(coverRegex, `$1"${coverPath}"`);
        fs.writeFileSync(celebFilePath, content, 'utf-8');
        console.log(`✅ 커버 경로 업데이트 완료 (ID: ${entryId})`);
    }
}

/**
 * 전용 파이프라인 실행 엔진 (10단계)
 */
async function runPipelineForBook(fileName) {
    const bookId = path.parse(fileName).name;
    const bookTitle = BOOK_TITLES[bookId] || bookId;

    console.log(`\n\n=========================================`);
    console.log(`🚀 [시작] ${bookTitle} (${bookId}) 처리 중...`);
    console.log(`=========================================`);

    // 0. 🆕 커버 자동 다운로드 (없을 때만)
    const coverResult = await fetchBookCover(bookId, bookTitle);
    if (coverResult) updateCoverData(bookId, coverResult);

    // 1. 텍스트 추출
    const text = await extractTextFromFile(fileName);

    // 2. 대본 생성 (이어받기 지원)
    const scriptJsonPath = path.join(OUTPUT_DIR, `${bookId}_script.json`);
    let script;

    if (fs.existsSync(scriptJsonPath)) {
        console.log(`📜 기존 대본 발견. 기존 대본으로 작업을 재개합니다.`);
        script = JSON.parse(fs.readFileSync(scriptJsonPath, 'utf-8'));
    } else {
        script = await generatePodcastScript(text);
        // [수정] 강제 인사말(intro) 삽입 로직 제거 - "바로 제목/설명으로 시작"

        // 대본 저장 (JSON & TXT)
        fs.writeFileSync(scriptJsonPath, JSON.stringify(script, null, 2));
        const scriptTxtPath = path.join(OUTPUT_DIR, `${bookId}_script.txt`);
        fs.writeFileSync(scriptTxtPath, script.map(t => `${t.speaker}: ${t.text}`).join('\n\n'));
    }

    // 2.5 🆕 리뷰 자동 생성 (기존 리뷰 없을 때만)
    const reviewSavePath = path.join(OUTPUT_DIR, `${bookId}_review.txt`);
    if (!checkReviewExists(bookId)) {
        let review;
        if (fs.existsSync(reviewSavePath)) {
            console.log(`📖 기존 생성 리뷰 파일 발견. 재사용합니다.`);
            review = fs.readFileSync(reviewSavePath, 'utf-8');
        } else {
            const bookMeta = getBookMeta(bookId);
            review = await generateBookReview(
                text, bookTitle,
                bookMeta?.author || '',
                bookMeta?.publisher || ''
            );
            fs.writeFileSync(reviewSavePath, review, 'utf-8');
        }
        updateReviewData(bookId, review);
    } else {
        console.log(`📖 [Skip] 리뷰가 이미 존재합니다 (ID: ${bookId}).`);
    }

    // 3. 음성 생성 (도서별 독립 폴더 사용으로 충돌 방지 및 완벽 이어받기)
    const bookTempDir = path.join(TEMP_BASE_DIR, bookId);

    // 이어받기 상태 확인 및 출력
    if (fs.existsSync(bookTempDir)) {
        const doneTurns = fs.readdirSync(bookTempDir)
            .filter(f => f.startsWith('turn_') && f.endsWith('.wav') && fs.statSync(path.join(bookTempDir, f)).size > 1000).length;
        if (doneTurns > 0) {
            console.log(`\n🔄 [이어받기 모드] 이미 완료된 턴: ${doneTurns}/${script.length}개 → ${script.length - doneTurns}개 남음`);
        }
    }
    let audioFiles = [];
    try {
        audioFiles = await generateAudioGemini(script, bookTempDir, bookTitle);
    } catch (err) {
        // 중간에 실패하더라라도 현재까지의 작업물을 병합해서 'partial'로 제공
        console.log(`⚠️ TTS 작업이 중단되었습니다. 작업된 부분까지 병합을 시도합니다...`);
        const partialFiles = fs.readdirSync(bookTempDir)
            .filter(f => f.startsWith('turn_') && f.endsWith('.wav'))
            .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
            .map(f => path.join(bookTempDir, f));

        if (partialFiles.length > 0) {
            const partialName = `${bookId}_partial.mp3`;
            await mergeAudio(partialFiles, partialName, bookTitle);
            console.log(`📢 [중간 결과] 현재 ${partialFiles.length}번 대사까지 '${partialName}'으로 생성되었습니다.`);
        }
        throw err; // 상위 루프의 재시도 로직으로 전달
    }

    // 4. 병합 및 저장
    const finalAudioName = (bookId === 'onething' || bookId === 'one-thing') ? 'one-thing.mp3' : `${bookId}.mp3`;
    const audioUrl = await mergeAudio(audioFiles, finalAudioName, bookTitle);

    // 5. 연동
    updateServiceData(bookId, audioUrl);

    // 6. bookScripts.js 연동
    updateBookScripts(bookId, script);

    // 7. [자동화 추가] 오디오 파일과 데이터 강제 동기화 및 자동 배포
    try {
        const syncScriptPath = path.resolve(__dirname, 'sync_audio_data.mjs');
        if (fs.existsSync(syncScriptPath)) {
            console.log(`🔄 [Auto-Sync] celebrities.js 데이터 동기화 중...`);
            execSync(`node "${syncScriptPath}"`, { stdio: 'inherit' });
        }

        console.log(`🚀 [Auto-Deploy] 실서버 배포 중 (이 작업은 몇 분 정도 소요됩니다)...`);
        execSync(`npm run deploy`, { cwd: path.resolve(__dirname, '../'), stdio: 'inherit' });
        console.log(`✅ [Success] 배포가 완료되었습니다!`);
    } catch (e) {
        console.warn(`⚠️ 자동 동기화 또는 배포 실패: ${e.message}`);
    }

    console.log(`✨ [완료] ${bookTitle} 팟캐스트 + 리뷰 + 대본 변환 종료.`);
}

/**
 * [5단계: 무한 반복 루프 / 배치 모드]
 */
const isMain = process.argv[1] && (process.argv[1].endsWith('auto_podcast_pipeline.mjs') || process.argv[1] === fileURLToPath(import.meta.url));

if (isMain) {
    (async () => {
        // 명령줄 인수로 특정 책 지정 가능: node auto_podcast_pipeline.mjs norwegian-wood
        const targetBookId = process.argv[2] || null;

        if (targetBookId) {
            console.log(`🎯 [단일 처리 모드] 대상 도서: ${targetBookId}`);
        } else {
            console.log(`🏭 Archiview Podcast Factory 가동 시작! (전체 처리 모드)`);
        }

        const booksToProcess = fs.readdirSync(INPUT_DIR)
            .filter(f => f.endsWith('.txt') || f.endsWith('.pdf'))
            .filter(f => targetBookId ? path.parse(f).name === targetBookId : true)
            .sort((a, b) => a.localeCompare(b));

        if (booksToProcess.length === 0) {
            if (targetBookId) {
                console.log(`❌ '${targetBookId}' 파일을 ebook_inputs 폴더에서 찾을 수 없습니다.`);
                console.log(`   확인: ebook_inputs/${targetBookId}.txt 또는 .pdf 파일이 있어야 합니다.`);
            } else {
                console.log("📭 ebook_inputs 폴더에 처리할 책이 없습니다.");
            }
            return;
        }

        console.log(`📚 총 ${booksToProcess.length}권의 도서를 발견했습니다: ${booksToProcess.join(', ')}`);

        for (const bookFile of booksToProcess) {
            let bookSuccess = false;
            let failCount = 0;
            const waitIntervals = [10, 15, 20, 30]; // 유저 요청: 10분, 15분, 20분, 30분

            while (!bookSuccess) {
                try {
                    const bookId = path.parse(bookFile).name;
                    const bookTitle = BOOK_TITLES[bookId] || bookId;
                    const baseId = bookId.split('-')[0]; // -rm, -hk 등 접미사 제거

                    const possibleFiles = [
                        path.join(PUBLIC_AUDIO_DIR, `${bookId}.mp3`),
                        path.join(PUBLIC_AUDIO_DIR, `${baseId}.mp3`),
                        path.join(PUBLIC_AUDIO_DIR, `${baseId}-hk.mp3`),
                        path.join(PUBLIC_AUDIO_DIR, `${baseId}-rm.mp3`)
                    ];

                    if (possibleFiles.some(f => fs.existsSync(f))) {
                        console.log(`⏩ [Skip] ${bookId} (or its variant) is already completed. Skipping...`);
                        bookSuccess = true;
                        break;
                    }

                    // [사용자 요청] 절대 지우지 말고 이어받기 위해 삭제 로직 제거
                    const bookTempDir = path.join(TEMP_BASE_DIR, bookId);
                    if (!fs.existsSync(bookTempDir)) fs.mkdirSync(bookTempDir, { recursive: true });

                    await runPipelineForBook(bookFile);

                    // 성공 시에도 폴더를 지우지 않습니다 (사용자 확인 및 보존용)
                    console.log(`✨ ${bookId} 작업 완료.`);

                    // partial 파일이 있었다면 삭제
                    const partialPath = path.join(PUBLIC_AUDIO_DIR, `${bookId}_partial.mp3`);
                    if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath);

                    // 10. 전체 오디오 링크 동기화 (Celebrities.js 자동 업데이트)
                    console.log(`\n🔄 [Step 10] 최종 데이터 연동 시스템 가동...`);
                    updateServiceData(bookId, `/audio/${bookId}.mp3`);

                    console.log(`\n✨ [완료] "${bookTitle}" 모든 공정이 성공적으로 끝났습니다! 1분 휴식 후 다음 도서로...`);
                    await new Promise(r => setTimeout(r, 60000));
                    bookSuccess = true;
                } catch (err) {
                    failCount++;
                    const waitMin = 5; // [사용자 요청: 에러 발생 시 무조건 5분 휴식]

                    console.error(`\n💥 [오류 발생] '${bookFile}' 처리 실패 (시도 ${failCount})`);
                    console.error(`   이유: ${err.message}`);
                    console.log(`⏳ 이 책이 완성될 때까지 다음으로 넘기지 않습니다.`);
                    console.log(`🔑 다음 시도를 위해 API 키를 교체합니다.`);
                    getNextKey(); // 키 교체
                    console.log(`🛑 [대기] API 안정을 위해 ${waitMin}분 동안 휴식을 취한 후 다시 시도합니다...\n`);

                    await new Promise(r => setTimeout(r, waitMin * 60 * 1000));
                }
            }
        }

        console.log(`\n🏁 모든 도서의 파이프라인 작업이 완료되었습니다.`);
    })();
}
