import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../final_podcast/one-thing_script.json');
// 바탕화면에 '원씽_일레븐랩스.txt'로 저장
const outputPath = path.resolve('C:/Users/admin/Desktop/원씽_일레븐랩스.txt');

try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const script = JSON.parse(rawData);

    // 일레븐랩스 자동 화자 인식용 텍스트 (James: 대사, Stella: 대사 형식)
    let textContent = '';

    script.forEach((turn) => {
        const speakerName = turn.speaker === '제임스' ? 'James' : 'Stella';
        textContent += `${speakerName}: ${turn.text}\n\n`;
    });

    fs.writeFileSync(outputPath, textContent.trim(), 'utf8');
    console.log(`✅ 일레븐랩스용 변환 완료: ${outputPath}`);
} catch (error) {
    console.error(`❌ 변환 중 에러: ${error.message}`);
}
