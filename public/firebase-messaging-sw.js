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

// 앱이 꺼진 상태에서 수신한 메시지 처리
messaging.onBackgroundMessage((payload) => {
    const { title, body, icon } = payload.notification || {};
    const link = (payload.fcmOptions && payload.fcmOptions.link) || 'https://archiview.store/';
    self.registration.showNotification(title || '아카이뷰', {
        body: body || '오늘의 콘텐츠를 확인하세요!',
        icon: icon || '/icon-192.png',
        badge: '/icon-192.png',
        data: { link },
    });
});

// 알림 클릭 시 해당 콘텐츠 페이지 열기
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const targetUrl = (e.notification.data && e.notification.data.link) || 'https://archiview.store/';
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                if (client.url === targetUrl && 'focus' in client) return client.focus();
            }
            return clients.openWindow(targetUrl);
        })
    );
});
