import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const key = process.env.VITE_GEMINI_API_KEY9;
const model = 'gemini-2.5-flash-preview-tts';
const scriptPath = 'c:/Users/admin/Desktop/book/the-archive/final_podcast/demian_script.json';
const tempDir = 'c:/Users/admin/Desktop/book/the-archive/temp_audio/demian';

const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));

// 다음 미완성 턴 찾기
let nextTurn = -1;
for (let i = 0; i < script.length; i++) {
    const f = path.join(tempDir, `turn_${i}.wav`);
    if (!fs.existsSync(f) || fs.statSync(f).size < 1000) {
        nextTurn = i;
        break;
    }
}

if (nextTurn === -1) {
    console.log('🎉 모든 대사가 이미 완료되었습니다! 병합 단계로 넘어가세요.');
    process.exit(0);
}

const turn = script[nextTurn];
// [절대 원칙] 인덱스 기반 고정: 짝수=Puck(제임스/남), 홀수=Kore(스텔라/여)
// speaker 이름 체크 제거 → 대본 오류 시에도 목소리 꼬임 방지
const voice = (nextTurn % 2 === 0) ? 'Puck' : 'Kore';

console.log(`🎙️ [${nextTurn + 1}/${script.length}] 생성 중... (${voice})`);

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: turn.text }] }],
        generationConfig: {
            responseModalities: ['audio'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
    })
});

if (!res.ok) {
    const err = await res.text();
    console.error(`❌ 실패 (${res.status}): ${err.substring(0, 200)}`);
    process.exit(1);
}

const data = await res.json();
const audio = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('audio/'));
if (!audio) { console.error('❌ 오디오 없음'); process.exit(1); }

const outFile = path.join(tempDir, `turn_${nextTurn}.wav`);
fs.writeFileSync(outFile, Buffer.from(audio.inlineData.data, 'base64'));
console.log(`✅ [${nextTurn + 1}/${script.length}] 완료! 저장: ${outFile}`);
console.log(`📊 남은 대사: ${script.length - nextTurn - 1}개`);
