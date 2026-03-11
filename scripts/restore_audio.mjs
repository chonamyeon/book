import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const audioDir = path.join(root, 'public', 'audio');
const mp3File = path.join(audioDir, 'one-thing.mp3');
const tempMp3File = path.join(audioDir, 'one-thing_restore.mp3');

if (!fs.existsSync(mp3File)) {
    console.error('❌ one-thing.mp3 파일을 찾을 수 없습니다.');
    process.exit(1);
}

console.log('🛠️ 오디오 노이즈 및 깨짐 현상 복구 작업 시작...');

try {
    // 1. volume=-2dB: 오디오가 찢어지는(Clipping) 현상을 방지하기 위해 마진 확보
    // 2. highpass/lowpass: 불필요한 초고역대/초저역대 노이즈 제거 (가청 대역 집중)
    // 3. afftdn: 미세한 디지털 노이즈 제거
    // 4. deesser: 세기를 낮추어(0.3) 자연스럽게 치찰음 억제
    // 5. loudnorm: 최종 음량을 안정적으로 재설정
    const restoreFilter = "volume=-1.5dB,highpass=f=70,lowpass=f=13000,afftdn=nr=10:nf=-35,deesser=i=0.3:m=0:f=0.5:s=e,loudnorm=I=-16:TP=-1.5:LRA=11";

    const cmd = `ffmpeg -y -i "${mp3File}" -af "${restoreFilter}" -ar 44100 -ac 2 -c:a libmp3lame -b:a 192k "${tempMp3File}"`;

    console.log('🚀 복구 필터 적용 중 (Clipping 방지 및 노이즈 제거)...');
    execSync(cmd, { stdio: 'pipe' });

    console.log('✅ 복구 완료. 파일을 교체합니다.');
    if (fs.existsSync(mp3File)) fs.unlinkSync(mp3File);
    fs.renameSync(tempMp3File, mp3File);

    console.log(`✨ 결과: ${mp3File}`);

} catch (error) {
    console.error('❌ 처리 중 오류 발생:', error.message);
    if (fs.existsSync(tempMp3File)) fs.unlinkSync(tempMp3File);
    process.exit(1);
}
