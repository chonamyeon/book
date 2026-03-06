import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOK_ID = 'intelligent-investor';
const AUDIO_DIR = path.resolve(__dirname, `../temp_audio/${BOOK_ID}`);
const OUTPUT_FILE = path.resolve(__dirname, `../temp_audio/${BOOK_ID}/preview_50.mp3`);
const RAW_MERGED_FILE = path.resolve(__dirname, `../temp_audio/${BOOK_ID}/preview_merged.pcm`);

const buffers = [];

// 0번부터 50번 턴까지만 합칩니다.
console.log("🎵 오디오(Raw PCM) 버퍼 결합 시도 중...");
let count = 0;
for (let i = 0; i <= 50; i++) {
    const rawFile = path.join(AUDIO_DIR, `turn_${i}.wav`);
    if (fs.existsSync(rawFile)) {
        buffers.push(fs.readFileSync(rawFile));
        count++;
    }
}

if (buffers.length === 0) {
    console.error("❌ 합칠 파일이 없습니다.");
    process.exit(1);
}

// Raw PCM 데이터이므로 단순히 Buffer를 합치기만 해도 완벽히 연결됩니다.
const mergedBuffer = Buffer.concat(buffers);
fs.writeFileSync(RAW_MERGED_FILE, mergedBuffer);
console.log(`✅ ${count}개 턴 버퍼 결합 완료! (총 크기: ${(mergedBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
console.log("🛠️ MP3 인코딩 중...");

try {
    // raw PCM -> MP3 변환
    execSync(`"${ffmpegInstaller.path}" -y -f s16le -ar 24000 -ac 1 -i "${RAW_MERGED_FILE}" -c:a libmp3lame -b:a 192k "${OUTPUT_FILE}"`, { stdio: 'inherit' });
    console.log(`\n🎉 미리듣기 파일이 완성되었습니다!`);
    console.log(`▶️ 저장 위치: ${OUTPUT_FILE}`);

    // 임시 병합 파일 삭제 처리
    if (fs.existsSync(RAW_MERGED_FILE)) fs.unlinkSync(RAW_MERGED_FILE);
} catch (e) {
    console.error("❌ 변환 실패:", e.message);
}
