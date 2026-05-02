import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ffmpegPath = 'ffmpeg'; // Assuming ffmpeg is in path or I should find it
const audioDir = path.join(root, 'public', 'audio');
const musicDir = path.join(root, 'public', 'music');

const wavFile = path.join(audioDir, 'one-thing_tts.wav');
const mp3File = path.join(audioDir, 'one-thing.mp3');
const jingleFile = path.join(musicDir, 'intro_jingle.mp3');

if (!fs.existsSync(wavFile)) {
    console.error('❌ one-thing_tts.wav 파일을 찾을 수 없습니다.');
    process.exit(1);
}

if (!fs.existsSync(jingleFile)) {
    console.error('❌ intro_jingle.mp3 파일을 찾을 수 없습니다.');
    process.exit(1);
}

console.log('🎵 인트로/아웃트로 병합 및 MP3 변환 시작...');

const metadata = `-metadata title="원씽" -metadata artist="Whiteboard Editorial" -metadata album="Whiteboard Podcast"`;

try {
    // 병합 커맨드 실행
    // intro(0) + silence(s1) + voice(1) + silence(s2) + outro(0)
    const cmd = `ffmpeg -y -i "${jingleFile}" -i "${wavFile}" -filter_complex "[0:a]aresample=44100,aformat=channel_layouts=stereo,asplit=2[intro1][intro2];[1:a]aresample=44100,aformat=channel_layouts=stereo[voice];anullsrc=r=44100:cl=stereo,atrim=end=1,asplit=2[s1][s2];[intro1][s1][voice][s2][intro2]concat=n=5:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]" -map "[out]" ${metadata} -c:a libmp3lame -b:a 192k "${mp3File}"`;

    console.log('🚀 실행 중...');
    execSync(cmd, { stdio: 'inherit' });

    console.log('✅ MP3 생성 완료. WAV 파일 삭제 중...');
    fs.unlinkSync(wavFile);
    console.log('🗑️ WAV 파일 삭제 완료.');
    console.log(`✨ 결과: ${mp3File}`);

} catch (error) {
    console.error('❌ 처리 중 오류 발생:', error.message);
}
