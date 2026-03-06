import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const keys = [
    { name: '1번', key: process.env.VITE_GEMINI_API_KEY },
    { name: '2번', key: process.env.VITE_GEMINI_API_KEY2 },
    { name: '3번', key: process.env.VITE_GEMINI_API_KEY3 },
    { name: '4번', key: process.env.VITE_GEMINI_API_KEY4 },
    { name: '5번', key: process.env.VITE_GEMINI_API_KEY5 },
    { name: '6번', key: process.env.VITE_GEMINI_API_KEY6 },
    { name: '7번', key: process.env.VITE_GEMINI_API_KEY7 },
    { name: '8번', key: process.env.VITE_GEMINI_API_KEY8 },
].filter(k => !!k.key);

const models = [
    'gemini-2.5-flash-preview-tts',
    'gemini-2.5-pro-preview-tts'
];

async function checkQuota(keyInfo, model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyInfo.key}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: '안녕' }] }],
                generationConfig: {
                    responseModalities: ["audio"],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
                    }
                }
            })
        });

        if (res.ok) {
            return '✅ 사용 가능 (할당량 남음)';
        } else {
            const data = await res.json();
            const status = data.error?.status || res.status;
            if (res.status === 429) {
                // 할당량 정보 추출
                const violation = data.error?.details?.find(d => d.violations)?.violations?.[0];
                const quotaId = violation?.quotaId || 'unknown';
                const quotaValue = violation?.quotaValue || '?';
                return `❌ 할당량 소진 (${quotaId}, limit: ${quotaValue})`;
            } else if (res.status === 404) {
                return `⚠️ 모델 미지원 (404)`;
            } else {
                return `⚠️ 에러 (${res.status}: ${status})`;
            }
        }
    } catch (err) {
        return `💥 연결 실패: ${err.message}`;
    }
}

console.log('========================================');
console.log('🔍 API 키별 TTS 할당량 확인 시작');
console.log(`   시간: ${new Date().toLocaleString('ko-KR')}`);
console.log('========================================\n');

for (const keyInfo of keys) {
    console.log(`🔑 [${keyInfo.name}] (${keyInfo.key.substring(0, 10)}...)`);
    for (const model of models) {
        const modelShort = model.includes('flash') ? 'Flash TTS' : 'Pro TTS';
        const result = await checkQuota(keyInfo, model);
        console.log(`   ${modelShort}: ${result}`);
    }
    console.log('');
}

console.log('========================================');
console.log('🏁 확인 완료');
console.log('========================================');
