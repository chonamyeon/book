import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const keys = [
    { name: '3번', key: process.env.VITE_GEMINI_API_KEY3 },
    { name: '4번', key: process.env.VITE_GEMINI_API_KEY4 },
    { name: '5번', key: process.env.VITE_GEMINI_API_KEY5 },
    { name: '6번', key: process.env.VITE_GEMINI_API_KEY6 },
    { name: '7번', key: process.env.VITE_GEMINI_API_KEY7 },
    { name: '8번', key: process.env.VITE_GEMINI_API_KEY8 },
    { name: '9번', key: process.env.VITE_GEMINI_API_KEY9 },
].filter(k => !!k.key);

for (const k of keys) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-tts:generateContent?key=${k.key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: '안녕' }] }], generationConfig: { responseModalities: ['audio'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } } } })
    });
    if (res.ok) console.log(`${k.name}: ✅ Pro TTS 사용 가능!`);
    else console.log(`${k.name}: ❌ ${res.status}`);
}
