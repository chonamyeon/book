import 'dotenv/config';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 우선순위 도서 리스트 (에디토리얼 출력 순서)
const PRIORITY_LIST = [
    { id: 'sapiens', source: 'update_sapiens_ultra.js', regex: /const sapiens_review = `([\s\S]+?)`;/ },
    { id: 'ubermensch', source: 'update_reviews_mega.js', regex: /const ubermenschReview = `([\s\S]+?)`;/ },
    { id: 'homo-deus', source: 'update_gates_batch1_v3.js', regex: /"homo-deus": `([\s\S]+?)`,/ },
    { id: 'lightness', source: 'update_lightness_4000.mjs', regex: /const essayContent = `([\s\S]+?)`;/ },
    { id: 'sayno', source: 'update_reviews_mega.js', regex: /const saynoReview = `([\s\S]+?)`;/ },
    { id: 'psychology', source: 'update_reviews_mega.js', regex: /const psychologyReview = `([\s\S]+?)`;/ },
    { id: 'demian', source: 'update_demian_4000.mjs', regex: /const essayContent = `([\s\S]+?)`;/ },
    { id: 'vegetarian', source: 'update_vegetarian.js', regex: /const review = `([\s\S]+?)`;/ },
    { id: 'factfulness', source: 'update_factfulness_4000.mjs', regex: /const essayContent = `([\s\S]+?)`;/ },
    { id: 'almond', source: 'update_almond_4000.mjs', regex: /const essayContent = `([\s\S]+?)`;/ },
    { id: 'leverage', source: 'update_reviews_mega.js', regex: /const leverageReview = `([\s\S]+?)`;/ },
    { id: 'one-thing', source: 'the-archive/src/data/bookScripts.js', isScript: true }
];

async function sendNotification(bookId) {
    console.log(`📧 [NOTIFICATION] '${bookId}' 작업 완료! gosipass902@gmail.com 으로 리포트를 전송합니다...`);
    // 실제 메일 발송 환경이 아니므로 로그로 대체하거나, 외부 API 호출 가능
    // 여기서는 작업이 중단되지 않았음을 알리는 로그를 남깁니다.
}

function extractSource(book) {
    if (book.isScript) return; 
    const sourcePath = path.resolve(__dirname, '../../', book.source);
    if (!fs.existsSync(sourcePath)) return;
    
    const content = fs.readFileSync(sourcePath, 'utf8');
    const match = content.match(book.regex);
    if (match) {
        const targetPath = path.resolve(__dirname, '../ebook_inputs', `${book.id}.txt`);
        fs.writeFileSync(targetPath, match[1]);
        console.log(`📝 [SOURCE] '${book.id}.txt' 추출 완료.`);
    }
}

async function run() {
    console.log("🚀 ARCHIVIEW ALL-NIGHT MASTER RUNNER START");
    
    for (const book of PRIORITY_LIST) {
        try {
            console.log(`
📖 [PROCESS] '${book.id}' 작업 시작...`);
            
            // 1. 소스 텍스트 준비
            extractSource(book);
            
            // 2. 파이프라인 실행 (개별 도서당 약 5~10분 소요 예정)
            const cmd = `node the-archive/scripts/auto_podcast_pipeline.mjs ${book.id}.txt`;
            execSync(cmd, { stdio: 'inherit' });
            
            // 3. 알림 발송
            await sendNotification(book.id);
            
            console.log(`✅ [SUCCESS] '${book.id}' 완료! 5초 휴식 후 다음 도서로 이동...`);
            await new Promise(r => setTimeout(r, 5000));
            
        } catch (err) {
            console.error(`❌ [ERROR] '${book.id}' 실패:`, err.message);
            console.log("⚠️ 에러가 발생했지만 다음 도서로 강제 진행합니다.");
        }
    }
    
    console.log("
✨ 모든 우선순위 도서 작업이 종료되었습니다.");
}

run();
