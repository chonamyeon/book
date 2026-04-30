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

        // src/data/personalization.js 와 동일: 전원 위클리 순서로 짝만 이동(자정 기준)
        const seoulYmd = () => {
            const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
            const p = fmt.formatToParts(new Date());
            const y = +p.find((x) => x.type === 'year').value;
            const m = +p.find((x) => x.type === 'month').value;
            const d = +p.find((x) => x.type === 'day').value;
            return y * 10000 + m * 100 + d;
        };
        const dayIndexFromYmd = (ymd) => {
            const y = Math.floor(ymd / 10000);
            const m = Math.floor((ymd % 10000) / 100);
            const d = ymd % 100;
            return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2020, 0, 1)) / 86400000);
        };
        // 붙은 짝 (0,1)(2,3)…, 링 없음 — 클라 pickDisjointPairBlock 과 동일
        const pickDisjointPairBlock = (ordered, dayIndex) => {
            const n = ordered.length;
            if (n === 0) return [];
            if (n === 1) return [ordered[0]];
            const pairCount = Math.floor(n / 2);
            const slot = dayIndex % pairCount;
            const i = slot * 2;
            return [ordered[i], ordered[i + 1]];
        };
        const todayYmd = seoulYmd();
        const dayIdxKst = dayIndexFromYmd(todayYmd);

        const dedupeBooks = (arr) => {
            const seen = new Set();
            const a = arr || [];
            const out = [];
            for (let i = 0; i < a.length; i++) {
                const b = a[i];
                const k = String(b.id || b.title || '').trim() || `__w_${i}`;
                if (seen.has(k)) continue;
                seen.add(k);
                out.push(b);
            }
            return out;
        };

        /** 클라이언트 getTodayContents 와 동일: 전원 순서·날짜 짝 (퀴즈 분기 없음) */
        const getTodayBooks = (books) => {
            return pickDisjointPairBlock(dedupeBooks(books), dayIdxKst);
        };

        const makeBookInfo = (b, isGo) => {
            const title = b.title || '오늘의 추천 콘텐츠';
            const link = `https://archiview.store/?autoplay=${isGo ? 'go' : 'back'}`;
            return { title, link };
        };

        // weekly_focus 책 목록 로드
        let allBooks = [];
        try {
            const wfSnap = await db.collection('site_config').doc('weekly_focus').get();
            if (wfSnap.exists) {
                allBooks = (wfSnap.data().books || []).filter(b => b.id || b.title);
            }
        } catch {}

        console.log(`[commuteAlert] ${hhmm} | commuteAlarm=true 유저 수: ${snap.size}`);
        const sends = [];
        snap.forEach(docSnap => {
            const d = docSnap.data();
            // 모든 유저 상태 로깅 (디버깅용)
            console.log(`[commuteAlert] uid=${docSnap.id} commuteGo=${d.commuteGo} commuteBack=${d.commuteBack} days=${JSON.stringify(d.commuteDays)} hasFcmToken=${!!d.fcmToken} dayIdx=${dayIdx} hhmm=${hhmm}`);

            if (!d.fcmToken) {
                console.log(`[commuteAlert] fcmToken 없음 → 스킵: uid=${docSnap.id}`);
                return;
            }

            const days = Array.isArray(d.commuteDays) ? d.commuteDays : [0,1,2,3,4];
            if (!days.includes(dayIdx)) {
                console.log(`[commuteAlert] 요일 불일치 → 스킵: uid=${docSnap.id} dayIdx=${dayIdx} days=${JSON.stringify(days)}`);
                return;
            }

            let label = null;
            let isGo = false;
            if (d.commuteGo === hhmm)        { label = '출근길'; isGo = true; }
            else if (d.commuteBack === hhmm) { label = '퇴근길'; isGo = false; }
            if (!label) return;

            const todayBooks = allBooks.length > 0 ? getTodayBooks(allBooks) : [];
            const bookData = isGo ? todayBooks[0] : todayBooks[1];
            const book = bookData ? makeBookInfo(bookData, isGo) : { title: '오늘의 추천 콘텐츠', link: `https://archiview.store/?autoplay=${isGo ? 'go' : 'back'}` };
            const autoplay = isGo ? 'go' : 'back';

            sends.push(
                messaging.send({
                    token: d.fcmToken,
                    notification: {
                        title: `🎧 ${label} 콘텐츠 준비됐어요!`,
                        body: `「${book.title}」지금 바로 들어보세요.`,
                    },
                    webpush: {
                        headers: {
                            Urgency: 'high',
                            TTL: '300',
                        },
                        notification: {
                            icon: 'https://archiview.store/icon-192.png',
                            // 동일 타입(go/back) 알림이 서로 덮이지 않도록 매 발송마다 고유 tag (테스트·연속 알림 대응)
                            tag: `commute-${autoplay}-${Date.now()}`,
                            renotify: true,
                        },
                        data: {
                            url: book.link,
                            link: book.link,
                            autoplay,
                        },
                        fcmOptions: { link: book.link },
                    },
                    data: {
                        autoplay,
                        url: book.link,
                        link: book.link,
                    },
                }).then(() => {
                    console.log(`[commuteAlert] FCM 발송 성공: uid=${docSnap.id}`);
                }).catch((err) => {
                    console.error(`[commuteAlert] FCM 발송 실패: uid=${docSnap.id} token=${d.fcmToken?.slice(0,20)}... error=${err.code} ${err.message}`);
                    if (err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-registration-token') {
                        return db.collection('users').doc(docSnap.id).set({
                            fcmToken: admin.firestore.FieldValue.delete(),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        }, { merge: true });
                    }
                })
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
