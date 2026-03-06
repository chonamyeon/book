import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../final_podcast/intelligent-investor_script.json');
const outputPath = path.resolve('C:/Users/admin/Desktop/현명한투자자_일레븐랩스.txt');

try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const script = JSON.parse(rawData);

    // 일레븐랩스 자동 화자 인식용 텍스트 (이름: 대사 형식)
    let textContent = '';

    script.forEach((turn, idx) => {
        // 일레븐랩스가 인식하기 가장 좋은 영문 이름 콜론 형식을 사용합니다.
        const speakerName = turn.speaker === '제임스' ? 'James' : 'Stella';
        textContent += `${speakerName}: ${turn.text}\n\n`;
    });

    fs.writeFileSync(outputPath, textContent.trim(), 'utf8');
    console.log(`✅ 일레븐랩스 자동 인식용 대본 업데이트 완료: ${outputPath}`);
} catch (error) {
    console.error(`❌ 대본 변환 중 에러 발생: ${error.message}`);
}
