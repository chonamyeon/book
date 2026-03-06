import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const key = process.env.VITE_GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash-preview-tts';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

const testText = "근데 진짜 이 책에서 제일 인상 깊었던 게 미스터 마켓이야. 들었어?";

console.log('테스트 텍스트:', testText);
console.log('키:', key?.substring(0, 10) + '...');

const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: testText }] }],
        generationConfig: {
            responseModalities: ['audio'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Puck' }
                }
            }
        }
    })
});

console.log('HTTP 상태:', res.status);
const body = await res.text();
if (res.ok) {
    const data = JSON.parse(body);
    const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    console.log('성공! 오디오 크기:', part ? Buffer.from(part.inlineData.data, 'base64').length : '없음', 'bytes');
} else {
    console.log('에러 응답:', body.substring(0, 500));
}
