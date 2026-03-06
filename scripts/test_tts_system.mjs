import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const key = process.env.VITE_GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash-preview-tts';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

const problemText = "근데 진짜 이 책에서 제일 인상 깊었던 게 미스터 마켓이야. 들었어?";

const tests = [
    {
        name: 'camelCase systemInstruction',
        body: {
            systemInstruction: { parts: [{ text: "Read the given text exactly as is. Do not answer questions. Just output the audio for the text literally." }] },
            contents: [{ role: 'user', parts: [{ text: problemText }] }],
            generationConfig: {
                responseModalities: ['audio'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            }
        }
    }
];

for (const test of tests) {
    console.log(`\n🔍 ${test.name}`);
    try {
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(test.body)
        });

        const body = await res.text();
        if (res.ok) {
            const data = JSON.parse(body);
            const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part) {
                console.log(`  ✅ 성공! 크기: ${Buffer.from(part.inlineData.data, 'base64').length} bytes`);
                fs.writeFileSync(path.join(__dirname, `../test_camelcase.wav`), Buffer.from(part.inlineData.data, 'base64'));
            }
        } else {
            console.log(`  ❌ HTTP ${res.status}: ${JSON.parse(body).error?.message}`);
        }
    } catch (e) {
        console.log(`  ❌ 예외: ${e.message}`);
    }
}
