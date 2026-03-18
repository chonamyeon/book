const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { GoogleAuth } = require('google-auth-library');

const GCP_TTS_KEY = defineSecret('GCP_TTS_KEY');

const ALLOWED_ORIGINS = [
    'https://book-site-123.web.app',
    'https://book-psi-sage.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
];

exports.generateTTS = onRequest(
    { secrets: [GCP_TTS_KEY], region: 'asia-northeast3', timeoutSeconds: 300 },
    async (req, res) => {
        // CORS
        const origin = req.headers.origin;
        if (ALLOWED_ORIGINS.includes(origin)) {
            res.set('Access-Control-Allow-Origin', origin);
        }
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return res.status(204).send('');
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

        const { text, speakerA, speakerB, voiceA, voiceB } = req.body;
        if (!text) return res.status(400).json({ error: 'text 필드가 없습니다' });

        try {
            // 서비스 계정으로 OAuth 토큰 발급
            const serviceAccount = JSON.parse(GCP_TTS_KEY.value());
            const auth = new GoogleAuth({
                credentials: serviceAccount,
                scopes: ['https://www.googleapis.com/auth/cloud-platform'],
            });
            const client = await auth.getClient();
            const tokenResponse = await client.getAccessToken();
            const accessToken = tokenResponse.token;

            // Cloud TTS API 호출
            const ttsRes = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: { text },
                    voice: {
                        languageCode: 'ko-KR',
                        name: voiceA || 'Charon',
                        model_name: 'gemini-2.5-pro-tts',
                    },
                    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
                }),
            });

            if (!ttsRes.ok) {
                const err = await ttsRes.json().catch(() => ({}));
                return res.status(ttsRes.status).json({ error: err?.error?.message || `TTS API 오류 ${ttsRes.status}` });
            }

            const data = await ttsRes.json();
            return res.json({ audioContent: data.audioContent });
        } catch (e) {
            console.error('generateTTS error:', e);
            return res.status(500).json({ error: e.message });
        }
    }
);

// 멀티스피커 버전 (제임스+스텔라 동시)
exports.generateTTSMulti = onRequest(
    { secrets: [GCP_TTS_KEY], region: 'asia-northeast3', timeoutSeconds: 300 },
    async (req, res) => {
        const origin = req.headers.origin;
        if (ALLOWED_ORIGINS.includes(origin)) {
            res.set('Access-Control-Allow-Origin', origin);
        }
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return res.status(204).send('');
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

        const { text, speakerA, speakerB, voiceA, voiceB } = req.body;
        if (!text) return res.status(400).json({ error: 'text 필드가 없습니다' });

        try {
            const serviceAccount = JSON.parse(GCP_TTS_KEY.value());
            const auth = new GoogleAuth({
                credentials: serviceAccount,
                scopes: ['https://www.googleapis.com/auth/cloud-platform'],
            });
            const client = await auth.getClient();
            const tokenResponse = await client.getAccessToken();
            const accessToken = tokenResponse.token;

            const allTurns = text.split('\n').filter(Boolean).map(line => {
                const colonIdx = line.indexOf(': ');
                const spk = colonIdx !== -1 ? line.slice(0, colonIdx).trim() : '';
                const utterance = colonIdx !== -1 ? line.slice(colonIdx + 2).trim() : line.trim();
                return {
                    voice: spk === speakerA ? (voiceA || 'Puck') : (voiceB || 'Kore'),
                    text: utterance,
                };
            });

            // 턴별 개별 TTS 호출 (병렬 10개씩)
            const BATCH = 10;
            const audioBuffers = [];
            for (let i = 0; i < allTurns.length; i += BATCH) {
                const batch = allTurns.slice(i, i + BATCH);
                const results = await Promise.all(batch.map(turn =>
                    fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            input: { text: turn.text },
                            voice: { languageCode: 'ko-KR', name: turn.voice },
                            audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
                        }),
                    })
                ));

                for (const ttsRes of results) {
                    if (!ttsRes.ok) {
                        const err = await ttsRes.json().catch(() => ({}));
                        return res.status(ttsRes.status).json({ error: err?.error?.message || `TTS API 오류 ${ttsRes.status}` });
                    }
                    const data = await ttsRes.json();
                    audioBuffers.push(Buffer.from(data.audioContent, 'base64'));
                }
            }

            // LINEAR16 PCM 버퍼 합치기
            const combined = Buffer.concat(audioBuffers);
            return res.json({ audioContent: combined.toString('base64') });
        } catch (e) {
            console.error('generateTTSMulti error:', e);
            return res.status(500).json({ error: e.message });
        }
    }
);
