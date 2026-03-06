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

// 문제가 되는 텍스트
const problemText = "근데 진짜 이 책에서 제일 인상 깊었던 게 미스터 마켓이야. 들었어?";

// 방법별 테스트
const tests = [
    {
        name: '방법1: system_instruction 추가',
        body: {
            system_instruction: { parts: [{ text: "주어진 텍스트를 그대로 읽어주세요. 절대로 텍스트를 추가하거나 수정하지 마세요." }] },
            contents: [{ parts: [{ text: problemText }] }],
            generationConfig: {
                responseModalities: ['audio'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            }
        }
    },
    {
        name: '방법2: role:user 명시적 표시',
        body: {
            contents: [{ role: 'user', parts: [{ text: problemText }] }],
            generationConfig: {
                responseModalities: ['audio'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            }
        }
    },
    {
        name: '방법3: 텍스트 앞에 마커 추가',
        body: {
            contents: [{ parts: [{ text: `[TTS 낭독] ${problemText}` }] }],
            generationConfig: {
                responseModalities: ['audio'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            }
        }
    },
    {
        name: '방법4: v1alpha API 버전 사용 (v1beta 대신)',
        altUrl: `https://generativelanguage.googleapis.com/v1alpha/models/${MODEL}:generateContent?key=${key}`,
        body: {
            contents: [{ parts: [{ text: problemText }] }],
            generationConfig: {
                responseModalities: ['audio'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            }
        }
    },
];

for (const test of tests) {
    const url = test.altUrl || BASE_URL;
    console.log(`\n🔍 ${test.name}`);

    try {
        const res = await fetch(url, {
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
                fs.writeFileSync(path.join(__dirname, `../test_method_${tests.indexOf(test) + 1}.wav`), Buffer.from(part.inlineData.data, 'base64'));
            } else {
                console.log(`  ⚠️ 응답 왔지만 오디오 없음: ${body.substring(0, 200)}`);
            }
        } else {
            const parsed = JSON.parse(body);
            console.log(`  ❌ HTTP ${res.status}: ${parsed.error?.message}`);
        }
    } catch (e) {
        console.log(`  ❌ 예외: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 3000));
}
console.log('\n완료!');
