import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const keys = [
    { name: '1번(유료)', key: process.env.VITE_GEMINI_API_KEY },
    { name: '2번', key: process.env.VITE_GEMINI_API_KEY2 },
    { name: '3번', key: process.env.VITE_GEMINI_API_KEY3 },
    { name: '4번', key: process.env.VITE_GEMINI_API_KEY4 },
    { name: '5번', key: process.env.VITE_GEMINI_API_KEY5 },
    { name: '6번', key: process.env.VITE_GEMINI_API_KEY6 },
    { name: '7번', key: process.env.VITE_GEMINI_API_KEY7 },
    { name: '8번', key: process.env.VITE_GEMINI_API_KEY8 },
    { name: '9번', key: process.env.VITE_GEMINI_API_KEY9 },
].filter(k => !!k.key);

const models = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'];

console.log('키 | Flash TTS | Pro TTS');
console.log('---|-----------|--------');

for (const k of keys) {
    const results = [];
    for (const m of models) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k.key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: '안녕' }] }], generationConfig: { responseModalities: ['audio'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } } } })
        });
        if (res.ok) {
            results.push('✅ 가능');
        } else {
            const data = await res.json();
            const details = data.error?.details || [];
            const quotaInfo = details.find(d => d.violations);
            if (quotaInfo) {
                const v = quotaInfo.violations[0];
                const quotaId = v.quotaId || '';
                const quotaValue = v.quotaValue || '?';
                const tier = quotaId.includes('FreeTier') ? '무료' : '유료';
                results.push(`❌ (${tier}, 일일 ${quotaValue}회)`);
            } else {
                results.push(`❌ (${res.status})`);
            }
        }
    }
    console.log(`${k.name} | ${results[0]} | ${results[1]}`);
}
