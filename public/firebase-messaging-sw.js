importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyDRenQjyt9gknve6tUItfUnaGjfoEZx-8s',
    authDomain: 'archiview.store',
    projectId: 'book-site-123',
    storageBucket: 'book-site-123.firebasestorage.app',
    messagingSenderId: '176157090689',
    appId: '1:176157090689:web:107f25429239f25ffd7e80',
});

const messaging = firebase.messaging();

// ─── 출퇴근 알림 스케줄러 ───────────────────────────────────────────────────
const scheduledTimers = {};

function cancelTimer(key) {
    if (scheduledTimers[key] != null) {
        clearTimeout(scheduledTimers[key]);
        delete scheduledTimers[key];
    }
}

function scheduleOne(hhmm, label, key, commuteDays) {
    const [h, m] = hhmm.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(h, m, 0, 0);

    if (target <= now) target.setDate(target.getDate() + 1);

    for (let i = 0; i < 7; i++) {
        const dayIdx = (target.getDay() + 6) % 7;
        if (commuteDays.includes(dayIdx)) break;
        target.setDate(target.getDate() + 1);
    }

    const delay = target.getTime() - Date.now();

    scheduledTimers[key] = setTimeout(() => {
        delete scheduledTimers[key];

        const body = key === 'go'
            ? '출근길 팟캐스트가 준비됐어요. 탭해서 바로 들어보세요.'
            : '퇴근길 팟캐스트가 준비됐어요. 탭해서 바로 들어보세요.';

        self.registration.showNotification(`🎧 ${label} 콘텐츠 준비됐어요!`, {
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: `${key}-${Date.now()}`,
            renotify: true,
            data: { url: `${self.location.origin}/?autoplay=${key}`, autoplay: key },
        });

        // 다음 날 동일 시간 재예약
        scheduleOne(hhmm, label, key, commuteDays);
    }, delay);
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'SCHEDULE_NOTIFICATIONS') {
        const { commuteGo, commuteBack, commuteDays } = e.data;
        cancelTimer('go');
        cancelTimer('back');
        if (commuteGo)   scheduleOne(commuteGo,   '출근길', 'go',   commuteDays);
        if (commuteBack) scheduleOne(commuteBack,  '퇴근길', 'back', commuteDays);
    }
    if (e.data.type === 'CANCEL_NOTIFICATIONS') {
        cancelTimer('go');
        cancelTimer('back');
    }
});
// ────────────────────────────────────────────────────────────────────────────

// 앱이 꺼진 상태에서 FCM 수신
messaging.onBackgroundMessage((payload) => {
    const { title, body, icon } = payload.notification || {};
    const link = (payload.fcmOptions && payload.fcmOptions.link) || `${self.location.origin}/`;
    self.registration.showNotification(title || '아카이뷰', {
        body: body || '오늘의 콘텐츠를 확인하세요!',
        icon: icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: link },
    });
});

// pending intent 보관 (앱이 frozen 상태여서 postMessage/BroadcastChannel 못 받을 때 대비)
let pendingNotifIntent = null;

self.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'GET_PENDING_INTENT') {
        const reply = pendingNotifIntent && (Date.now() - pendingNotifIntent.ts < 60000)
            ? { intent: pendingNotifIntent.intent }
            : { intent: null };
        pendingNotifIntent = null;
        if (e.ports && e.ports[0]) e.ports[0].postMessage(reply);
    }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const targetUrl = (e.notification.data && (e.notification.data.url || e.notification.data.link))
        || `${self.location.origin}/`;

    let autoplayIntent = null;
    try { autoplayIntent = new URL(targetUrl).searchParams.get('autoplay'); } catch {}
    if (!autoplayIntent && e.notification.data?.autoplay) {
        autoplayIntent = e.notification.data.autoplay;
    }
    // tag는 `go-타임스탬프` · `commute-back-…` 형태 — 일부 환경에서 data 유실 시 폴백
    if (!autoplayIntent && typeof e.notification.tag === 'string') {
        const tag = e.notification.tag;
        if (tag === 'go' || tag === 'back') autoplayIntent = tag;
        else if (/^go-\d/.test(tag) || tag.includes('-go-')) autoplayIntent = 'go';
        else if (/^back-\d/.test(tag) || tag.includes('-back-')) autoplayIntent = 'back';
    }
    if (!autoplayIntent && typeof e.notification.title === 'string') {
        if (e.notification.title.includes('출근')) autoplayIntent = 'go';
        else if (e.notification.title.includes('퇴근')) autoplayIntent = 'back';
    }
    const finalUrl = autoplayIntent
        ? `${self.location.origin}/?autoplay=${autoplayIntent}&ap_n=${Date.now()}`
        : targetUrl;

    // frozen 앱을 위해 pending intent 저장
    if (autoplayIntent) {
        pendingNotifIntent = { intent: autoplayIntent, ts: Date.now() };
    }

    const pingBroadcast = () => {
        if (!autoplayIntent || typeof BroadcastChannel === 'undefined') return;
        try {
            const bc = new BroadcastChannel('archiview-autoplay');
            bc.postMessage({ type: 'FCM_AUTOPLAY', intent: autoplayIntent });
            bc.close();
        } catch (_e) { /* ignore */ }
    };

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            const originOk = (url) => {
                try {
                    return new URL(url).origin === self.location.origin;
                } catch {
                    return false;
                }
            };
            const ours = list.filter((c) => originOk(c.url));
            ours.sort((a, b) => Number(b.focused) - Number(a.focused));
            const client = ours[0];

            if (client) {
                const pingAutoplay = () => {
                    if (autoplayIntent) {
                        client.postMessage({ type: 'FCM_AUTOPLAY', intent: autoplayIntent });
                    }
                };
                const runPing = () => {
                    pingAutoplay();
                    pingBroadcast();
                };
                const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                return Promise.resolve(client.focus())
                    .then(() => {
                        if (autoplayIntent && 'navigate' in client) {
                            return client.navigate(finalUrl).catch(() => {});
                        }
                    })
                    .then(() => delay(40))
                    .then(() => runPing())
                    .then(() => {
                        if (!autoplayIntent) return undefined;
                        return delay(180).then(() =>
                            clients.openWindow(finalUrl).catch(() => {})
                        );
                    })
                    .catch(() => runPing());
            }
            return clients.openWindow(finalUrl);
        }).catch(() => clients.openWindow(finalUrl))
    );
});
