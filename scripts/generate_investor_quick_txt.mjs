import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractTextFromFile, generatePodcastScript } from './auto_podcast_pipeline.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOK_ID = 'intelligent-investor';
const TXT_OUTPUT = path.resolve(__dirname, '../final_podcast/현명한투자자_대본.txt');

async function main() {
    console.log("📖 책 내용 추출 중...");
    let bookText = '';
    try {
        bookText = await extractTextFromFile(`${BOOK_ID}.txt`);
    } catch (e) {
        console.error("원본 텍스트를 불러오는데 실패했습니다.", e);
        bookText = "현명한 투자자 (The Intelligent Investor) - 벤저민 그레이엄. 투기 대신 가치투자에 대한 성찰을 담은 직장인들의 도서 리뷰.";
    }

    console.log("🤖 원스톱 시스템 모듈(auto_podcast_pipeline)을 호출하여 대본 생성 중...");

    try {
        // 방금 수정한 원스톱 시스템 내부의 함수를 그대로 호출!
        const script = await generatePodcastScript(bookText);
        console.log(`✅ 생성 완료! 총 턴 수: ${script.length}턴`);

        // TXT 저장
        let textContent = `📚 현명한 투자자 (The Intelligent Investor) - 팟캐스트 대본 (50턴 이하 원스톱 버전)\n`;
        textContent += `===========================================================\n\n`;

        script.forEach((turn, idx) => {
            textContent += `[Turn ${idx} - ${turn.speaker}]\n${turn.text}\n\n`;
        });

        fs.writeFileSync(TXT_OUTPUT, textContent, 'utf-8');
        console.log(`✅ 텍스트 대본 업데이트 완료: ${TXT_OUTPUT}`);

    } catch (err) {
        console.error("대본 생성 실패:", err.message);
    }
}

main();
