import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 실제 VITE_GEMINI_API_KEY를 사용
const keys = [
    { name: 'KEY1', val: process.env.VITE_GEMINI_API_KEY },
    { name: 'KEY2', val: process.env.VITE_GEMINI_API_KEY2 },
    { name: 'KEY4', val: process.env.VITE_GEMINI_API_KEY4 },
    { name: 'KEY8', val: process.env.VITE_GEMINI_API_KEY8 },
];

// targetKeyIndices = [0, 1, 3, 7] → 실제 키 인덱스 0,1,3,7 → KEY1,KEY2,KEY4,KEY8

const MODEL = 'gemini-2.5-flash-preview-tts';
const testText = "근데 진짜 이 책에서 제일 인상 깊었던 게 미스터 마켓이야. 들었어?";

console.log('Turn 20 텍스트 각 키로 테스트:');

for (const { name, val } of keys) {
    if (!val) {
        console.log(`${name}: 키 없음`);
        continue;
    }

    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${val}`;
    console.log(`\n${name} (${val.substring(0, 10)}...) 테스트:`);

    try {
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

        const body = await res.text();
        if (res.ok) {
            const data = JSON.parse(body);
            const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            console.log(`  ✅ 성공! 크기: ${part ? Buffer.from(part.inlineData.data, 'base64').length : '?'} bytes`);
        } else {
            const err = JSON.parse(body);
            console.log(`  ❌ HTTP ${res.status}: ${err.error?.message}`);
        }
    } catch (e) {
        console.log(`  ❌ 예외: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 3000));
}

console.log('\n완료!');
