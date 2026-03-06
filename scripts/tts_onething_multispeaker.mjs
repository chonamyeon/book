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

// API 키 목록
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
const TTS_MODEL = 'gemini-2.5-pro-preview-tts';
const TARGET_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`;

const TEMP_BASE_DIR = path.resolve(__dirname, '../temp_audio');
const OUTPUT_DIR = path.resolve(__dirname, '../final_podcast');
const PUBLIC_AUDIO_DIR = path.resolve(__dirname, '../public/audio');
const bookTempDir = path.join(TEMP_BASE_DIR, `${BOOK_ID}_multispeaker`);

// ffmpeg
const { default: ffmpegInstaller } = await import('@ffmpeg-installer/ffmpeg');
const ffmpegPath = ffmpegInstaller.path;

if (!fs.existsSync(bookTempDir)) fs.mkdirSync(bookTempDir, { recursive: true });

// 스크립트 로드
const scriptPath = path.join(OUTPUT_DIR, `${BOOK_ID}_script.json`);
const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
console.log(`📜 스크립트 로드 완료: 총 ${script.length}턴`);

// 멀티스피커 TTS 호출 (최대 3회 재시도)
async function generateMultiSpeaker(text, chunkIndex) {
    for (let attempt = 0; attempt < API_KEYS.length * 2; attempt++) {
        const key = API_KEYS[keyIndex % API_KEYS.length];
        const displayKey = (keyIndex % API_KEYS.length) + 1;

        console.log(`\n🎙️ [청크 ${chunkIndex}] 멀티스피커 TTS 호출... (키 ${displayKey}번, 시도 ${attempt + 1})`);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 300초 타임아웃

            const systemText = [
                'VOICE CONSISTENCY ANCHOR',
                '',
                'You are generating speech from two fixed speakers. Speaker identities must remain identical across all batches.',
                '',
                'Speaker A - 제임스 (Charon):',
                '- Gender: male',
                '- Pitch: medium-low',
                '- Tone: calm and stable',
                '- Pacing: steady and controlled',
                '- Emotion: full expressive acting allowed — laugh, surprise, excitement, sadness, etc.',
                '- Vocal texture: warm and deep',
                '',
                'Speaker B - 스텔라 (Kore):',
                '- Gender: female',
                '- Pitch: high',
                '- Tone: bright and energetic',
                '- Pacing: lively and consistent',
                '- Emotion: full expressive acting allowed — laugh, surprise, excitement, sadness, etc.',
                '- Vocal texture: clear and bright',
                '',
                'Constraints:',
                '- Emotional expression and acting MUST follow the script naturally',
                '- Do NOT change the core vocal texture or pitch baseline between batches',
                '- Voice identity (who they are) must remain constant — only emotional coloring changes',
                '- Voice characteristics must remain constant across all batches',
                '',
                'Batch Consistency Rule:',
                'Every audio output must sound like the same person acting — same voice, different emotions.',
                'Voice identity consistency is mandatory. Emotional range is encouraged.',
                '',
                'You are a professional voice actor. When given a script, perform only the dialogue as audio.',
                "Never speak instructions or say 'understood' or similar responses.",
            ].join('\n');

            const response = await fetch(`${TARGET_URL}?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemText }] },
                    contents: [{ parts: [{ text }] }],
                    generationConfig: {
                        responseModalities: ['audio'],
                        speechConfig: {
                            multiSpeakerVoiceConfig: {
                                speakerVoiceConfigs: [
                                    { speaker: '제임스', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
                                    { speaker: '스텔라', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                                ]
                            }
                        }
                    }
                })
            });

            const statusCode = response.status;

            if (statusCode === 429) {
                console.log(`⚠️ 429 Rate Limit (키 ${displayKey}). 다음 키로...`);
                keyIndex++;
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            if (!response.ok) {
                const body = await response.text();
                console.error(`❌ HTTP ${statusCode}: ${body.substring(0, 500)}`);
                keyIndex++;
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            clearTimeout(timeoutId);
            const data = await response.json();
            const audioPart = data?.candidates?.[0]?.content?.parts?.find(
                p => p.inlineData && p.inlineData.mimeType?.startsWith('audio/')
            );

            if (!audioPart) {
                console.error(`❌ 오디오 데이터 없음. 응답: ${JSON.stringify(data).substring(0, 300)}`);
                keyIndex++;
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            const buffer = Buffer.from(audioPart.inlineData.data, 'base64');
            console.log(`✅ [청크 ${chunkIndex}] 오디오 생성 완료 (${(buffer.length / 1024).toFixed(1)}KB)`);
            return { buffer, mimeType: audioPart.inlineData.mimeType };

        } catch (err) {
            console.error(`❌ 예외 발생: ${err.message}`);
            keyIndex++;
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    throw new Error('모든 API 키 실패');
}

// 메인 실행 (15턴씩 분할)
const CHUNK_SIZE = 15;
const chunks = [];
for (let i = 0; i < script.length; i += CHUNK_SIZE) {
    chunks.push(script.slice(i, i + CHUNK_SIZE));
}

console.log(`\n🚀 멀티스피커 TTS 시작... 총 ${chunks.length}개 청크로 분할 (최대 15턴씩)`);
const chunkFiles = [];

for (let i = 0; i < chunks.length; i++) {
    const chunkScript = chunks[i];
    const voicePrefix = `이 대본의 화자 제임스는 '차분하고 묵직한 중저음의 남성 Charon'이고, 스텔라는 '밝고 에너지 넘치는 하이톤의 여성 Kore'입니다.\n이 두 사람의 목소리 톤과 텐션을 대화 끝까지 절대 변경하지 말고 엄격하게 유지해서 연기해 주세요. 대본 시작!\n\n`;
    const chunkText = voicePrefix + chunkScript.map(turn => `${turn.speaker}: ${turn.text}`).join('\n');
    console.log(`\n============== 청크 ${i + 1}/${chunks.length} ==============`);

    // 생성된 파일 있는지 체크 (재개 기능)
    const normalizedPath = path.join(bookTempDir, `norm_chunk_${i}.wav`);
    if (fs.existsSync(normalizedPath)) {
        console.log(`⏩ 기존 청크 파일 사용: ${normalizedPath}`);
        chunkFiles.push(normalizedPath);
        continue;
    }

    const { buffer, mimeType } = await generateMultiSpeaker(chunkText, i + 1);

    // mimeType이 pcm인 경우 확장자를 pcm으로 하고 ffmpeg 변환 시 포맷을 명시
    const isPcm = mimeType.includes('pcm');
    const ext = isPcm ? 'pcm' : (mimeType.includes('mp3') ? 'mp3' : 'wav');
    const rawAudioPath = path.join(bookTempDir, `raw_chunk_${i}.${ext}`);
    fs.writeFileSync(rawAudioPath, buffer);
    console.log(`💾 원본 오디오 저장: ${rawAudioPath} (MIME: ${mimeType})`);

    // 음색 통일 EQ: 저음(두께) +2dB, 고음 억제 -1dB + loudnorm
    const eqFilter = 'equalizer=f=180:width_type=o:width=2:g=2,equalizer=f=3000:width_type=o:width=2:g=-1,loudnorm=I=-16:TP=-1.5:LRA=11';
    if (isPcm) {
        // 보통 Gemini pcm은 s16le, 24000Hz 임
        execSync(`"${ffmpegPath}" -y -f s16le -ar 24000 -ac 1 -i "${rawAudioPath}" -af "${eqFilter}" -ar 44100 -ac 2 "${normalizedPath}"`, { windowsHide: true, stdio: 'pipe' });
    } else {
        execSync(`"${ffmpegPath}" -y -i "${rawAudioPath}" -af "${eqFilter}" -ar 44100 -ac 2 "${normalizedPath}"`, { windowsHide: true, stdio: 'pipe' });
    }

    console.log(`✅ [청크 ${i + 1}] 오디오 정규화 완료`);
    chunkFiles.push(normalizedPath);

    await new Promise(r => setTimeout(r, 3000)); // 휴식
}

// 청크 파일들 병합
const fileListPath = path.join(bookTempDir, 'filelist.txt');
fs.writeFileSync(fileListPath, chunkFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));

const mergedVoicePath = path.join(bookTempDir, 'merged_voice.wav');
console.log('\n🔗 10턴 단위 청크들을 하나로 병합 중...');
execSync(`"${ffmpegPath}" -y -f concat -safe 0 -i "${fileListPath}" -c copy "${mergedVoicePath}"`, { windowsHide: true, stdio: 'inherit' });

// 징글 + 본문 + 징글 병합
const outputPath = path.join(OUTPUT_DIR, `${BOOK_ID}.mp3`);
const metadata = `-metadata title="${BOOK_TITLE}" -metadata artist="Archiview Editorial" -metadata album="Archiview Podcast"`;
const jinglePath = path.resolve(__dirname, '../public/music/intro_jingle.mp3');

if (fs.existsSync(jinglePath)) {
    console.log('\n🎵 징글 삽입 + loudnorm...');
    execSync(
        `"${ffmpegPath}" -y -i "${jinglePath}" -i "${mergedVoicePath}" ` +
        `-filter_complex "[0:a]aresample=44100,aformat=channel_layouts=stereo,asplit=2[intro1][intro2];` +
        `[1:a]aresample=44100,aformat=channel_layouts=stereo[voice];` +
        `anullsrc=r=44100:cl=stereo,atrim=end=1,asplit=2[s1][s2];` +
        `[intro1][s1][voice][s2][intro2]concat=n=5:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]" ` +
        `-map "[out]" ${metadata} -c:a libmp3lame -b:a 192k "${outputPath}"`,
        { windowsHide: true, stdio: 'inherit' }
    );
} else {
    console.log('\nℹ️ 징글 없음. 정규화만...');
    execSync(
        `"${ffmpegPath}" -y -i "${mergedVoicePath}" ` +
        `-af "loudnorm=I=-16:TP=-1.5:LRA=11" ${metadata} -c:a libmp3lame -b:a 192k "${outputPath}"`,
        { windowsHide: true, stdio: 'inherit' }
    );
}

// public/audio 복사
if (!fs.existsSync(PUBLIC_AUDIO_DIR)) fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
fs.copyFileSync(outputPath, path.join(PUBLIC_AUDIO_DIR, `${BOOK_ID}.mp3`));

console.log(`\n✅ 완료!`);
console.log(`   📁 final_podcast/${BOOK_ID}.mp3`);
console.log(`   📁 public/audio/${BOOK_ID}.mp3`);
console.log(`\n🏁 "${BOOK_TITLE}" 멀티스피커 TTS 처리 완료.`);
