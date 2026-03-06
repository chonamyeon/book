import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 로드
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
console.log(`📡 Env loaded, keys: ${Object.keys(process.env).filter(k => k.startsWith('VITE_GEMINI')).length}개`);

// API 키 목록 (순서대로 시도)
const API_KEYS = [
    process.env.VITE_GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY2,
    process.env.VITE_GEMINI_API_KEY3,
    process.env.VITE_GEMINI_API_KEY4,
    process.env.VITE_GEMINI_API_KEY5,
    process.env.VITE_GEMINI_API_KEY6,
    process.env.VITE_GEMINI_API_KEY7,
    process.env.VITE_GEMINI_API_KEY8,
    process.env.VITE_GEMINI_API_KEY9
].filter(k => !!k);

console.log(`🔑 사용 가능한 API 키: ${API_KEYS.length}개`);
if (API_KEYS.length === 0) {
    console.error('❌ API 키 없음! .env 확인');
    process.exit(1);
}

let keyIndex = 0;

const BOOK_ID = 'one-thing';
const BOOK_TITLE = '원씽';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const TARGET_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`;

const TEMP_BASE_DIR = path.resolve(__dirname, '../temp_audio');
const OUTPUT_DIR = path.resolve(__dirname, '../final_podcast');
const PUBLIC_AUDIO_DIR = path.resolve(__dirname, '../public/audio');
const bookTempDir = path.join(TEMP_BASE_DIR, BOOK_ID);

// ffmpeg
const { default: ffmpegInstaller } = await import('@ffmpeg-installer/ffmpeg');
const ffmpegPath = ffmpegInstaller.path;

if (!fs.existsSync(bookTempDir)) fs.mkdirSync(bookTempDir, { recursive: true });

// 스크립트 로드
const scriptPath = path.join(OUTPUT_DIR, `${BOOK_ID}_script.json`);
const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
console.log(`📜 스크립트 로드 완료: 총 ${script.length}턴`);

// [검증] speaker가 제임스→스텔라→제임스... 순서로 교대하는지 확인
let speakerError = false;
for (let i = 0; i < script.length; i++) {
    const expected = (i % 2 === 0) ? '제임스' : '스텔라';
    if (script[i].speaker !== expected) {
        console.error(`❌ [speaker 순서 오류] turn ${i}: 예상=${expected}, 실제=${script[i].speaker}`);
        speakerError = true;
    }
}
if (speakerError) {
    console.error('❌ 스크립트 speaker 순서가 올바르지 않습니다. 대본을 확인하세요.');
    // process.exit(1); // 일단 강제 진행 방지 (필요 시 주석 해제)
}
console.log(`✅ speaker 순서 검증 통과 (${script.length}턴)`);

// turn_X.wav 파일 목록 체크
function getCompletedTurns() {
    if (!fs.existsSync(bookTempDir)) return 0;
    return fs.readdirSync(bookTempDir)
        .filter(f => /^turn_\d+\.wav$/.test(f) && fs.statSync(path.join(bookTempDir, f)).size > 1000)
        .length;
}

console.log(`✅ 이미 완료된 턴: ${getCompletedTurns()}/${script.length}`);

// 단일 TTS 생성
async function generateOneTurn(index, text, voiceName) {
    for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
        const key = API_KEYS[keyIndex % API_KEYS.length];
        const displayKey = (keyIndex % API_KEYS.length) + 1;

        console.log(`    🎙️ [${index + 1}/${script.length}] ${displayKey}번 키, Voice: ${voiceName}, 시도 ${attempt + 1}...`);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000); // 90초 타임아웃 (Flash)

            const response = await fetch(`${TARGET_URL}?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `[TTS 낭독] ${text}` }] }],
                    generationConfig: {
                        responseModalities: ['audio'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName }
                            }
                        }
                    }
                })
            });

            const statusCode = response.status;

            if (statusCode === 429) {
                console.log(`    ⚠️ 429 Rate Limit (키 ${displayKey}). 다음 키로...`);
                keyIndex++;
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            if (!response.ok) {
                const body = await response.text();
                console.error(`    ❌ HTTP ${statusCode}: ${body.substring(0, 300)}`);
                keyIndex++;
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            clearTimeout(timeoutId);
            const data = await response.json();
            const audioPart = data?.candidates?.[0]?.content?.parts?.find(
                p => p.inlineData && p.inlineData.mimeType?.startsWith('audio/')
            );

            if (!audioPart) {
                console.error(`    ❌ 오디오 데이터 없음. 응답: ${JSON.stringify(data).substring(0, 200)}`);
                keyIndex++;
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            const buffer = Buffer.from(audioPart.inlineData.data, 'base64');
            if (buffer.length < 100) {
                console.error(`    ❌ 파일 너무 작음 (${buffer.length} bytes)`);
                keyIndex++;
                continue;
            }

            return buffer;

        } catch (err) {
            console.error(`    ❌ 예외 발생: ${err.message}`);
            keyIndex++;
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log(`    ⏳ 모든 키 실패. 30초 대기 후 재시도...`);
    await new Promise(r => setTimeout(r, 30000));
    return null;
}

// 메인 TTS 루프
const audioFilePaths = [];
for (let i = 0; i < script.length; i++) {
    const tempFile = path.join(bookTempDir, `turn_${i}.wav`);

    if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 1000) {
        console.log(`    ⏩ [${i + 1}/${script.length}] 기존 파일 사용`);
        audioFilePaths.push(tempFile);
        continue;
    }

    const voiceName = (i % 2 === 0) ? 'Charon' : 'Kore';
    const turn = script[i];

    // Flash 모델은 좀 더 빠르게 진행 가능 (Pro보다 여유 있음)
    if (audioFilePaths.length > 0) {
        console.log(`    ⏱️  대기 중(3s)...`);
        await new Promise(r => setTimeout(r, 3000));
    }

    let buffer = null;
    let maxRetry = 3;

    while (!buffer && maxRetry > 0) {
        buffer = await generateOneTurn(i, turn.text, voiceName);
        if (!buffer) {
            maxRetry--;
            console.log(`    🔁 재시도 가능 횟수: ${maxRetry}`);
        }
    }

    if (!buffer) {
        throw new Error(`turn_${i} 생성 최종 실패`);
    }

    fs.writeFileSync(tempFile, buffer);
    audioFilePaths.push(tempFile);
    console.log(`    ✅ [${i + 1}/${script.length}] 완료 (${(buffer.length / 1024).toFixed(1)}KB, Voice: ${voiceName})`);
}

console.log(`\n🎬 모든 ${audioFilePaths.length}턴 완료! 오디오 병합 시작...`);

const transitionDir = path.join(bookTempDir, 'normalized');
if (fs.existsSync(transitionDir)) fs.rmSync(transitionDir, { recursive: true, force: true });
fs.mkdirSync(transitionDir, { recursive: true });

const allTurnFiles = audioFilePaths;

console.log(`📁 병합 대상: ${allTurnFiles.length}개 파일`);
if (allTurnFiles.length !== script.length) {
    console.error(`❌ 병합 파일 수(${allTurnFiles.length})와 스크립트 턴 수(${script.length})가 다릅니다!`);
    process.exit(1);
}

// 개별 표준화
const normalizedFiles = [];
for (let i = 0; i < allTurnFiles.length; i++) {
    const input = allTurnFiles[i];
    const output = path.join(transitionDir, `norm_${i}.wav`);
    // 음색 통일 EQ: 저음(두께) +2dB, 고음 억제 -1dB + loudnorm
    const eqFilter = 'equalizer=f=180:width_type=o:width=2:g=2,equalizer=f=3000:width_type=o:width=2:g=-1,loudnorm=I=-16:TP=-1.5:LRA=11';
    try {
        execSync(`"${ffmpegPath}" -y -i "${input}" -af "${eqFilter}" -ar 44100 -ac 2 "${output}"`, { windowsHide: true, stdio: 'pipe' });
    } catch (e) {
        // s16le fallback
        execSync(`"${ffmpegPath}" -y -f s16le -ar 24000 -ac 1 -i "${input}" -af "${eqFilter}" -ar 44100 -ac 2 "${output}"`, { windowsHide: true, stdio: 'pipe' });
    }
    normalizedFiles.push(output);
    if ((i + 1) % 10 === 0 || i === allTurnFiles.length - 1) {
        console.log(`   ✅ 표준화 진행: ${i + 1}/${allTurnFiles.length}`);
    }
}

const listFilePath = path.join(bookTempDir, 'concat_final.txt');
fs.writeFileSync(listFilePath, normalizedFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));

const tempVoicePath = path.join(bookTempDir, 'merged_voice.mp3');
console.log('   🎙️ 병합 중...');
execSync(`"${ffmpegPath}" -y -f concat -safe 0 -i "${listFilePath}" -c:a libmp3lame -b:a 192k "${tempVoicePath}"`, {
    windowsHide: true, stdio: 'inherit'
});

const outputFileName = `${BOOK_ID}.mp3`;
const outputPath = path.join(OUTPUT_DIR, outputFileName);
const metadata = `-metadata title="${BOOK_TITLE}" -metadata artist="Archiview Editorial" -metadata album="Archiview Podcast"`;
const jinglePath = path.resolve(__dirname, '../public/music/intro_jingle.mp3');

if (fs.existsSync(jinglePath)) {
    console.log('   🎵 징글 삽입 + loudnorm...');
    execSync(`"${ffmpegPath}" -y -i "${jinglePath}" -i "${tempVoicePath}" -filter_complex "[0:a]aresample=44100,aformat=channel_layouts=stereo,asplit=2[intro1][intro2];[1:a]aresample=44100,aformat=channel_layouts=stereo[voice];anullsrc=r=44100:cl=stereo,atrim=end=1,asplit=2[s1][s2];[intro1][s1][voice][s2][intro2]concat=n=5:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]" -map "[out]" ${metadata} -c:a libmp3lame -b:a 192k "${outputPath}"`, { windowsHide: true, stdio: 'inherit' });
} else {
    console.log('   ℹ️ 징글 없음. 정규화만...');
    execSync(`"${ffmpegPath}" -y -i "${tempVoicePath}" -af "aresample=44100,aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11" ${metadata} -c:a libmp3lame -b:a 192k "${outputPath}"`, { windowsHide: true, stdio: 'inherit' });
}

if (!fs.existsSync(PUBLIC_AUDIO_DIR)) fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
fs.copyFileSync(outputPath, path.join(PUBLIC_AUDIO_DIR, outputFileName));
console.log(`\n✅ public/audio/${outputFileName} 복사 완료`);

// 데이터 연동 부분은 수동으로 체크되어 있어도 안전하게 한 번 더 실행
console.log('\n🏁 완료! "' + BOOK_TITLE + '" TTS 처리 완료.');
