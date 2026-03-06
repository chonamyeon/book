import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const key = process.env.VITE_GEMINI_API_KEY;
const testText = "안녕하세요! 테스트 중입니다.";

// 여러 모델명 시도
const models = [
    'gemini-2.5-flash-preview-tts',
    'gemini-2.0-flash-preview-tts',     // 이전 버전
    'gemini-2.5-flash-exp',
];

for (const model of models) {
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    console.log(`\n🔍 모델 테스트: ${model}`);

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

        console.log(`   HTTP: ${res.status}`);
        const body = await res.text();
        if (res.ok) {
            const data = JSON.parse(body);
            const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part) {
                const buf = Buffer.from(part.inlineData.data, 'base64');
                const fname = `test_${model.replace(/[^a-z0-9]/gi, '_')}.wav`;
                fs.writeFileSync(path.join(__dirname, '..', fname), buf);
                console.log(`   ✅ 성공! mimeType: ${part.inlineData.mimeType}, 크기: ${buf.length} bytes → ${fname}`);
            } else {
                console.log(`   ⚠️ 오디오 데이터 없음 응답: ${body.substring(0, 200)}`);
            }
        } else {
            console.log(`   ❌ 에러: ${body.substring(0, 300)}`);
        }
    } catch (e) {
        console.log(`   ❌ 예외: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 3000));
}
console.log('\n완료!');
