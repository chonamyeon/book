/**
 * test_voice_puck.mjs
 * Puck(남/제임스) + Kore(여/스텔라) 보이스 안정성 테스트
 * 4턴 짧은 대본 → 병합 → test_voice_output.mp3 생성
 *
 * 실행: node scripts/test_voice_puck.mjs
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env 로드
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const { config } = await import('dotenv');
    config({ path: envPath });
}

// 모든 키를 로테이션으로 사용
const API_KEYS = [
    process.env.VITE_GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY2,
    process.env.VITE_GEMINI_API_KEY3,
    process.env.VITE_GEMINI_API_KEY4,
    process.env.VITE_GEMINI_API_KEY5,
    process.env.VITE_GEMINI_API_KEY6,
    process.env.VITE_GEMINI_API_KEY7,
    process.env.VITE_GEMINI_API_KEY8,
].filter(Boolean);

if (API_KEYS.length === 0) {
    console.error('❌ API 키가 없습니다. .env 파일을 확인하세요.');
    process.exit(1);
}
console.log(`🔑 사용 가능한 API 키: ${API_KEYS.length}개\n`);
let keyIndex = 0;

const TEMP_DIR = path.resolve(__dirname, '../temp_audio/voice_test');
const OUT_FILE = path.resolve(__dirname, '../public/audio/test_voice_output.mp3');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// 테스트용 4턴 대본 (짝수=제임스/Puck, 홀수=스텔라/Kore)
const TEST_SCRIPT = [
    { speaker: '제임스', text: '요즘 번아웃이라는 말을 너무 자주 듣는 것 같아. 특히 직장인들 사이에서는 거의 일상어가 됐잖아.' },
    { speaker: '스텔라', text: '맞아. 나도 요즘 퇴근하고 나서도 머릿속에서 일이 사라지지 않더라고. 쉬는 건데 쉬는 느낌이 안 들어.' },
    { speaker: '제임스', text: '그게 바로 번아웃의 신호래. 에너지가 방전된 상태인데도 계속 뭔가를 해야 한다는 강박이 남아있는 거지.' },
    { speaker: '스텔라', text: '그럼 어떻게 해야 해? 그냥 무조건 쉬면 되는 건 아닌 것 같던데.' },
];

const TTS_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';

console.log('🚀 보이스 테스트 시작 (Puck + Kore)\n');
console.log(`📋 테스트 대본: ${TEST_SCRIPT.length}턴`);
console.log(`🎙️  남성(제임스): Puck`);
console.log(`🎙️  여성(스텔라): Kore\n`);

const audioFiles = [];

for (let i = 0; i < TEST_SCRIPT.length; i++) {
    const turn = TEST_SCRIPT[i];
    const voiceName = (i % 2 === 0) ? 'Puck' : 'Kore';
    const tempFile = path.join(TEMP_DIR, `turn_${i}.wav`);

    console.log(`  [${i + 1}/${TEST_SCRIPT.length}] ${turn.speaker} (${voiceName}) → "${turn.text.substring(0, 30)}..."`);

    let success = false;
    for (let attempt = 0; attempt < API_KEYS.length * 2; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`    ↩️  재시도 (attempt ${attempt + 1}, 키 ${keyIndex + 1})...`);
                await new Promise(r => setTimeout(r, 5000));
            }

            const response = await fetch(`${TTS_URL}?key=${API_KEYS[keyIndex]}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: turn.text }] }],
                    generationConfig: {
                        responseModalities: ['audio'],
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
                        }
                    }
                })
            });

            if (response.status === 429) {
                keyIndex = (keyIndex + 1) % API_KEYS.length;
                console.log(`    ⏳ 429 Rate limit → 키 ${keyIndex + 1}번으로 교체`);
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            if (!response.ok) {
                const body = await response.text();
                throw new Error(`HTTP ${response.status}: ${body.substring(0, 200)}`);
            }

            const data = await response.json();
            const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (!audioPart) throw new Error('응답에 오디오 데이터 없음');

            const buffer = Buffer.from(audioPart.inlineData.data, 'base64');
            if (buffer.length < 100) throw new Error('오디오 데이터가 너무 작음');

            fs.writeFileSync(tempFile, buffer);
            audioFiles.push(tempFile);
            success = true;
            console.log(`    ✅ 완료 (${(buffer.length / 1024).toFixed(1)}KB)`);
            break;
        } catch (err) {
            console.error(`    ❌ 실패: ${err.message}`);
            keyIndex = (keyIndex + 1) % API_KEYS.length;
        }
    }

    if (!success) {
        console.error(`\n💥 ${i + 1}번 턴 생성 실패. 테스트 중단.`);
        process.exit(1);
    }

    // 턴 사이 대기 (Rate limit 방지)
    if (i < TEST_SCRIPT.length - 1) {
        await new Promise(r => setTimeout(r, 8000));
    }
}

// 병합
console.log('\n🔗 오디오 병합 중...');
try {
    const normalizedFiles = [];
    for (let ni = 0; ni < audioFiles.length; ni++) {
        const normOut = path.join(TEMP_DIR, `norm_${ni}.wav`);
        execSync(
            `"${ffmpegInstaller.path}" -y -f s16le -ar 24000 -ac 1 -i "${audioFiles[ni]}" -ar 44100 -ac 2 "${normOut}"`,
            { stdio: 'pipe' }
        );
        normalizedFiles.push(normOut);
    }

    const listFile = path.join(TEMP_DIR, 'concat_list.txt');
    fs.writeFileSync(listFile, normalizedFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
    execSync(
        `"${ffmpegInstaller.path}" -y -f concat -safe 0 -i "${listFile}" -c:a libmp3lame -b:a 192k "${OUT_FILE}"`,
        { stdio: 'pipe' }
    );

    const sizeMB = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2);
    console.log(`✅ 병합 완료!`);
    console.log(`\n🎉 테스트 성공!`);
    console.log(`📁 출력 파일: public/audio/test_voice_output.mp3 (${sizeMB}MB)`);
    console.log(`\n▶️  재생해서 제임스(Puck) 목소리가 처음부터 끝까지 일정한지 확인하세요.`);
} catch (err) {
    console.error(`\n💥 병합 실패: ${err.message}`);
    process.exit(1);
}
