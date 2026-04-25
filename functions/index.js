const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { GoogleAuth } = require('google-auth-library');
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();

const GCP_TTS_KEY = defineSecret('GCP_TTS_KEY');

// ── 출퇴근 알림 스케줄러 (매 분 실행, KST 기준) ──────────────────────
exports.sendCommuteAlerts = onSchedule(
    { schedule: '* * * * *', timeZone: 'Asia/Seoul', region: 'asia-northeast3' },
    async () => {
        const db = admin.firestore();
        const messaging = admin.messaging();

        // 현재 KST 시각 HH:MM
        const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC → KST
        const hh = String(now.getUTCHours()).padStart(2, '0');
        const mm = String(now.getUTCMinutes()).padStart(2, '0');
        const hhmm = `${hh}:${mm}`;
        // 현재 요일 (0=월 ~ 6=일, KST)
        const dayIdx = (now.getUTCDay() + 6) % 7;

        // commuteAlarm: true 이고 fcmToken 있는 유저만 조회
        const snap = await db.collection('users')
            .where('commuteAlarm', '==', true)
            .get();

        // 오늘의 추천 콘텐츠 (personalization.js와 동일한 날짜 시드 셔플)
        const seededShuffle = (arr, seed) => {
            const s = [...arr];
            let h = seed;
            for (let i = s.length - 1; i > 0; i--) {
                h = ((h * 1664525 + 1013904223) | 0) >>> 0;
                const j = h % (i + 1);
                [s[i], s[j]] = [s[j], s[i]];
            }
            return s;
        };
        const todaySeed = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();

        const makeBookInfo = (b) => {
            const title = b.title || '오늘의 추천 콘텐츠';
            const sid = b.id || (b.title || '').toLowerCase().replace(/\s+/g, '-');
            const link = sid ? `https://archiview.store/review/${sid}?tab=podcast&autoplay=1` : 'https://archiview.store/';
            return { title, link };
        };

        let goBook  = { title: '오늘의 추천 콘텐츠', link: 'https://archiview.store/' };
        let backBook = { title: '오늘의 추천 콘텐츠', link: 'https://archiview.store/' };
        try {
            const wfSnap = await db.collection('site_config').doc('weekly_focus').get();
            if (wfSnap.exists) {
                const books = (wfSnap.data().books || []).filter(b => b.id || b.title);
                if (books.length > 0) {
                    const shuffled = seededShuffle(books, todaySeed + 2); // lowBooks 셔플 (페르소나 없음)
                    goBook   = makeBookInfo(shuffled[0]);
                    backBook = makeBookInfo(shuffled[1] || shuffled[0]);
                }
            }
        } catch {}

        const sends = [];
        snap.forEach(docSnap => {
            const d = docSnap.data();
            if (!d.fcmToken) return;

            const days = Array.isArray(d.commuteDays) ? d.commuteDays : [0,1,2,3,4];
            if (!days.includes(dayIdx)) return;

            let label = null;
            let book = null;
            if (d.commuteGo === hhmm)   { label = '출근길'; book = goBook; }
            else if (d.commuteBack === hhmm) { label = '퇴근길'; book = backBook; }
            if (!label) return;

            sends.push(
                messaging.send({
                    token: d.fcmToken,
                    notification: {
                        title: `🎧 ${label} 콘텐츠 준비됐어요!`,
                        body: `「${book.title}」지금 바로 들어보세요.`,
                    },
                    webpush: {
                        notification: { icon: 'https://archiview.store/icon-192.png' },
                        fcmOptions: { link: book.link },
                    },
                }).catch(() => {})
            );
        });

        await Promise.all(sends);
        console.log(`[commuteAlert] ${hhmm} | ${sends.length}명 발송`);
    }
);

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
