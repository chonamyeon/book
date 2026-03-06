import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../final_podcast/intelligent-investor_script.json');
const outputPath = path.resolve(__dirname, '../final_podcast/현명한투자자_대본.txt');

try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const script = JSON.parse(rawData);

    let textContent = `📚 현명한 투자자 (The Intelligent Investor) - 팟캐스트 대본\n`;
    textContent += `===========================================================\n\n`;

    script.forEach((turn, idx) => {
        textContent += `[Turn ${idx} - ${turn.speaker}]\n${turn.text}\n\n`;
    });

    fs.writeFileSync(outputPath, textContent, 'utf8');
    console.log(`✅ 대본 텍스트 파일 생성 성공: ${outputPath}`);
} catch (error) {
    console.error(`❌ 대본 변환 중 에러 발생: ${error.message}`);
}
