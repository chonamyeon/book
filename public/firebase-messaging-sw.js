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
            tag: key,
            renotify: true,
            data: { url: `${self.location.origin}/?autoplay=${key}` },
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

// 알림 클릭 처리
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const targetUrl = (e.notification.data && (e.notification.data.url || e.notification.data.link))
        || `${self.location.origin}/`;

    let autoplayIntent = null;
    try { autoplayIntent = new URL(targetUrl).searchParams.get('autoplay'); } catch {}

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                let sameOrigin = false;
                try { sameOrigin = new URL(client.url).origin === self.location.origin; } catch {}
                if (sameOrigin) {
                    if ('navigate' in client) {
                        return client
                            .navigate(targetUrl)
                            .then((c) => (c || client).focus())
                            .catch(() => {
                                if (autoplayIntent) {
                                    client.postMessage({ type: 'FCM_AUTOPLAY', intent: autoplayIntent });
                                }
                                return client.focus();
                            });
                    }
                    if (autoplayIntent) {
                        client.postMessage({ type: 'FCM_AUTOPLAY', intent: autoplayIntent });
                    }
                    return client.focus();
                }
            }
            return clients.openWindow(targetUrl);
        })
    );
});
