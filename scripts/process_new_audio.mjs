import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const audioDir = path.join(root, 'public', 'audio');
const musicDir = path.join(root, 'public', 'music');
const jingleFile = path.join(musicDir, 'intro_jingle.mp3');

if (!fs.existsSync(jingleFile)) {
    console.error('❌ intro_jingle.mp3 파일을 찾을 수 없습니다.');
    process.exit(1);
}

// public/audio 디렉토리에서 .wav 파일들을 찾습니다.
const files = fs.readdirSync(audioDir).filter(f => f.toLowerCase().endsWith('.wav'));

if (files.length === 0) {
    console.log('ℹ️ 처리할 WAV 파일이 없습니다.');
    process.exit(0);
}

console.log(`🎵 ${files.length}개의 WAV 파일을 발견했습니다.`);

for (const file of files) {
    const wavPath = path.join(audioDir, file);

    // 파일명 정제 (예: 'demian_tts (1).wav' -> 'demian')
    // 1. 확장자 제거
    let baseName = file.replace(/\.wav$/i, '');
    // 2. _tts 제거
    baseName = baseName.replace(/_tts/gi, '');
    // 3. ' (1)', ' (2)' 등 제거
    baseName = baseName.replace(/\s\(\d+\)/g, '');
    // 4. 공백을 하이픈으로 변경 (필요시)
    baseName = baseName.trim().replace(/\s+/g, '-');

    const mp3Path = path.join(audioDir, `${baseName}.mp3`);

    console.log(`\n🚀 [${file}] -> [${baseName}.mp3] 변환 및 병합 중...`);

    const metadata = `-metadata title="${baseName}" -metadata artist="Whiteboard Editorial" -metadata album="Whiteboard Podcast"`;

    try {
        // ffmpeg 커맨드 (fix_audio_merge.mjs의 로직 사용)
        // intro(0:a) + 1s silence + voice(1:a) + 1s silence + outro(0:a)
        const cmd = `ffmpeg -y -i "${jingleFile}" -i "${wavPath}" -filter_complex "[0:a]aresample=44100,aformat=channel_layouts=stereo,asplit=2[intro1][intro2];[1:a]aresample=44100,aformat=channel_layouts=stereo[voice];anullsrc=r=44100:cl=stereo,atrim=end=1,asplit=2[s1][s2];[intro1][s1][voice][s2][intro2]concat=n=5:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]" -map "[out]" ${metadata} -c:a libmp3lame -b:a 192k "${mp3Path}"`;

        execSync(cmd, { stdio: 'inherit' });

        console.log(`✅ ${baseName}.mp3 생성 완료.`);

        // 원본 WAV 삭제
        fs.unlinkSync(wavPath);
        console.log(`🗑️ 원본 WAV 삭제 완료: ${file}`);

    } catch (error) {
        console.error(`❌ ${file} 처리 중 오류 발생:`, error.message);
    }
}

console.log('\n✨ 모든 오디오 처리가 완료되었습니다.');
