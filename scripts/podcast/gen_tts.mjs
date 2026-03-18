/**
 * gen_tts.mjs — 범용 Gemini 멀티스피커 TTS (전체 1회 호출) + ffmpeg 오디오 처리
 *
 * 1. final_podcast/{id}_script.json 로드
 * 2. Gemini TTS — 전체 대본 1회 호출 (멀티스피커: 제임스=Charon, 스텔라=Kore)
 * 3. ffmpeg EQ + loudnorm
 * 4. 징글 삽입 → {id}.mp3
 * 5. public/audio/{id}.mp3 복사
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname, '../../');
const OUTPUT_DIR = path.resolve(SCRIPTS_DIR, 'final_podcast');
const TEMP_BASE_DIR = path.resolve(SCRIPTS_DIR, 'temp_audio');
const PUBLIC_AUDIO_DIR = path.resolve(SCRIPTS_DIR, 'public/audio');
const JINGLE_PATH = path.resolve(SCRIPTS_DIR, 'public/music/intro_jingle.mp3');

function getApiKeys() {
  const keys = [
    process.env.VITE_GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY2,
    process.env.VITE_GEMINI_API_KEY3,
    process.env.VITE_GEMINI_API_KEY4,
    process.env.VITE_GEMINI_API_KEY5,
    process.env.VITE_GEMINI_API_KEY6,
    process.env.VITE_GEMINI_API_KEY7,
    process.env.VITE_GEMINI_API_KEY8,
    process.env.VITE_GEMINI_API_KEY9,
  ].filter(Boolean);
  if (keys.length === 0) throw new Error('Gemini API 키 없음. .env 확인');
  console.log(`  🔑 API 키 ${keys.length}개 로드`);
  return keys;
}

async function getFfmpegPath() {
  const { default: installer } = await import('@ffmpeg-installer/ffmpeg');
  return installer.path;
}

const VOICE_SYSTEM = [
  'Speaker A - 제임스 (Charon): male, medium-low pitch, calm and stable, warm and deep',
  'Speaker B - 스텔라 (Kore): female, high pitch, bright and energetic, clear and bright',
  'Do NOT change vocal texture. Never speak instructions.',
].join('\n');

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const TTS_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`;
const EQ_FILTER = 'equalizer=f=180:width_type=o:width=2:g=2,equalizer=f=3000:width_type=o:width=2:g=-1,loudnorm=I=-16:TP=-1.5:LRA=11';

async function callTTS(scriptText, apiKeys, keyIndexRef) {
  const MAX_ATTEMPTS = Math.max(apiKeys.length * 2, 8);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const key = apiKeys[keyIndexRef.value % apiKeys.length];
    const keyNum = (keyIndexRef.value % apiKeys.length) + 1;
    console.log(`  🎙️ TTS 호출 (키 ${keyNum}, 시도 ${attempt + 1})`);

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 600_000); // 10분 타임아웃

      const res = await fetch(`${TTS_URL}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: VOICE_SYSTEM }] },
          contents: [{ parts: [{ text: scriptText }] }],
          generationConfig: {
            responseModalities: ['audio'],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  { speaker: '제임스', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
                  { speaker: '스텔라', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                ],
              },
            },
          },
        }),
      });

      clearTimeout(tid);

      if (res.status === 429) {
        keyIndexRef.value++;
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (res.status === 500 || res.status === 503) {
        const wait = 15000 + attempt * 10000;
        console.log(`  ⚠️ HTTP ${res.status} (서버 장애) — ${wait / 1000}초 후 재시도`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) {
        const body = await res.text();
        console.error(`  ❌ HTTP ${res.status}: ${body.slice(0, 200)}`);
        keyIndexRef.value++;
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      const data = await res.json();
      const audioPart = data?.candidates?.[0]?.content?.parts?.find(
        p => p.inlineData?.mimeType?.startsWith('audio/')
      );
      if (!audioPart) {
        console.error(`  ❌ 오디오 없음: ${JSON.stringify(data).slice(0, 200)}`);
        keyIndexRef.value++;
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const buf = Buffer.from(audioPart.inlineData.data, 'base64');
      console.log(`  ✅ TTS 완료 (${(buf.length / 1024 / 1024).toFixed(1)}MB)`);
      return { buffer: buf, mimeType: audioPart.inlineData.mimeType };

    } catch (err) {
      console.error(`  ❌ 예외: ${err.message}`);
      keyIndexRef.value++;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('TTS: 모든 시도 실패');
}

export async function generateTTS(bookInfo, scriptOverride = null) {
  const { id, title = id } = bookInfo;
  console.log(`\n  🎙️ TTS 시작: ${title}`);

  const script = scriptOverride ?? JSON.parse(
    fs.readFileSync(path.join(OUTPUT_DIR, `${id}_script.json`), 'utf-8')
  );
  console.log(`  📜 ${script.length}턴 → 1회 TTS 호출`);

  const apiKeys = getApiKeys();
  const ffmpegPath = await getFfmpegPath();
  const keyIndexRef = { value: 0 };

  const bookTempDir = path.join(TEMP_BASE_DIR, `${id}_tts`);
  fs.mkdirSync(bookTempDir, { recursive: true });
  fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });

  const scriptText = script.map(t => `${t.speaker}: ${t.text}`).join('\n');
  const { buffer, mimeType } = await callTTS(scriptText, apiKeys, keyIndexRef);

  // 원본 저장
  const isPcm = mimeType.includes('pcm');
  const ext = isPcm ? 'pcm' : (mimeType.includes('mp3') ? 'mp3' : 'wav');
  const rawPath = path.join(bookTempDir, `raw.${ext}`);
  fs.writeFileSync(rawPath, buffer);

  // EQ + loudnorm
  const normPath = path.join(bookTempDir, 'voice.wav');
  if (isPcm) {
    execSync(
      `"${ffmpegPath}" -y -f s16le -ar 24000 -ac 1 -i "${rawPath}" -af "${EQ_FILTER}" -ar 44100 -ac 2 "${normPath}"`,
      { windowsHide: true, stdio: 'pipe' }
    );
  } else {
    execSync(
      `"${ffmpegPath}" -y -i "${rawPath}" -af "${EQ_FILTER}" -ar 44100 -ac 2 "${normPath}"`,
      { windowsHide: true, stdio: 'pipe' }
    );
  }

  // 최종 MP3
  const finalMp3 = path.join(OUTPUT_DIR, `${id}.mp3`);
  const metadata = `-metadata title="${title}" -metadata artist="Archiview Editorial" -metadata album="Archiview Podcast"`;

  if (fs.existsSync(JINGLE_PATH)) {
    console.log('  🎵 징글 삽입 + loudnorm...');
    execSync(
      `"${ffmpegPath}" -y -i "${JINGLE_PATH}" -i "${normPath}" ` +
      `-filter_complex "[0:a]aresample=44100,aformat=channel_layouts=stereo,asplit=2[intro1][intro2];` +
      `[1:a]aresample=44100,aformat=channel_layouts=stereo[voice];` +
      `anullsrc=r=44100:cl=stereo,atrim=end=1,asplit=2[s1][s2];` +
      `[intro1][s1][voice][s2][intro2]concat=n=5:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]" ` +
      `-map "[out]" ${metadata} -c:a libmp3lame -b:a 192k "${finalMp3}"`,
      { windowsHide: true, stdio: 'pipe' }
    );
  } else {
    console.log('  ℹ️ 징글 없음 — loudnorm만 적용');
    execSync(
      `"${ffmpegPath}" -y -i "${normPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" ${metadata} -c:a libmp3lame -b:a 192k "${finalMp3}"`,
      { windowsHide: true, stdio: 'pipe' }
    );
  }

  const publicMp3 = path.join(PUBLIC_AUDIO_DIR, `${id}.mp3`);
  fs.copyFileSync(finalMp3, publicMp3);

  const sizeMB = (fs.statSync(finalMp3).size / 1024 / 1024).toFixed(1);
  console.log(`  ✅ TTS 완료: ${id}.mp3 (${sizeMB}MB)`);

  return finalMp3;
}

// ─── CLI 직접 실행 ─────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter(a => a.startsWith('--'))
      .map((a, i, arr) => [a.slice(2), arr[i + 1]])
      .filter((_, i) => i % 2 === 0)
  );

  if (!args.id) {
    console.error('사용법: node gen_tts.mjs --id "book-id" [--title "제목"]');
    process.exit(1);
  }

  generateTTS({ id: args.id, title: args.title || args.id })
    .then(mp3 => console.log(`\n✅ 완료: ${mp3}`))
    .catch(err => { console.error('❌', err.message); process.exit(1); });
}
