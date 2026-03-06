import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOK_ID = 'brahms';
const OUTPUT_DIR = path.resolve(__dirname, '../final_podcast');

// bookScripts.js 내용을 문자열로 읽어서 파싱 (ESM import가 안될 수 있으므로)
const bookScriptsPath = path.resolve(__dirname, '../src/data/bookScripts.js');
const content = fs.readFileSync(bookScriptsPath, 'utf-8');

// 정규식으로 brahms 섹션 추출
const brahmsMatch = content.match(/"brahms":\s*(\[[\s\S]*?\])\s*}/);
if (!brahmsMatch) {
    console.error('❌ brahms 스크립트를 찾을 수 없습니다.');
    process.exit(1);
}

const rawScript = JSON.parse(brahmsMatch[1]);
const formattedScript = rawScript.map(turn => ({
    speaker: turn.role === 'A' ? '제임스' : '스텔라',
    text: turn.text
}));

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, `${BOOK_ID}_script.json`), JSON.stringify(formattedScript, null, 2));

console.log(`✅ ${BOOK_ID}_script.json 생성 완료! (총 ${formattedScript.length}턴)`);
