const CACHE = 'archiview-v2';
const IMG_CACHE = 'archiview-img-v2';

// FCM background handling is unified in this SW.
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

// 오래된 캐시 정리
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== IMG_CACHE).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // 해시 기반 정적 에셋 (JS/CSS): cache-first 영구 캐싱
  if (isSameOrigin && url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 이미지 (PNG/JPG/WEBP/SVG): cache-first, 별도 캐시 (LRU 효과)
  if (isSameOrigin && url.pathname.startsWith('/images/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const clone = res.clone();
            caches.open(IMG_CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // 비디오: 서비스워커 개입 안 함 — Range 요청을 브라우저/CDN이 직접 처리
  if (url.pathname.startsWith('/video/')) return;

  // 나머지: network-first (API, HTML 등)
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// 예약된 알림 타이머
const scheduledTimers = {};

// 알림 탭으로 생긴 pending intent (앱이 아직 준비 안 됐을 때 보관)
let pendingNotifIntent = null;

self.addEventListener('message', (e) => {
  if (!e.data) return;

  // 앱이 포그라운드로 돌아올 때 pending intent 조회 (iOS 대응)
  if (e.data.type === 'GET_PENDING_INTENT') {
    const reply = pendingNotifIntent && (Date.now() - pendingNotifIntent.ts < 60000)
      ? { intent: pendingNotifIntent.intent }
      : { intent: null };
    pendingNotifIntent = null; // 소비 후 초기화
    if (e.ports && e.ports[0]) e.ports[0].postMessage(reply);
    return;
  }

  if (e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    const { commuteGo, commuteBack, commuteDays } = e.data;
    cancelTimer('go');
    cancelTimer('back');
    if (commuteGo)   scheduleOne(commuteGo,   '출근길', 'go',   commuteBack, commuteDays);
    if (commuteBack) scheduleOne(commuteBack,  '퇴근길', 'back', commuteGo,   commuteDays);
  }
  if (e.data.type === 'CANCEL_NOTIFICATIONS') {
    cancelTimer('go');
    cancelTimer('back');
  }
});

function cancelTimer(key) {
  if (scheduledTimers[key] != null) {
    clearTimeout(scheduledTimers[key]);
    delete scheduledTimers[key];
  }
}

function scheduleOne(hhmm, label, key, otherHhmm, commuteDays) {
  const [h, m] = hhmm.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);

  // 이미 지났으면 내일로
  if (target <= now) target.setDate(target.getDate() + 1);

  // 설정된 요일이 될 때까지 하루씩 전진 (최대 7일)
  for (let i = 0; i < 7; i++) {
    const dayIdx = (target.getDay() + 6) % 7; // JS일=0 → 월=0 변환
    if (commuteDays.includes(dayIdx)) break;
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - Date.now();

  scheduledTimers[key] = setTimeout(() => {
    delete scheduledTimers[key];

    self.registration.showNotification(`🎧 ${label} 콘텐츠 준비됐어요!`, {
      body: key === 'go'
        ? '출근길 팟캐스트가 준비됐어요. 탭해서 바로 들어보세요.'
        : '퇴근길 팟캐스트가 준비됐어요. 탭해서 바로 들어보세요.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `${key}-${Date.now()}`,
      renotify: true,
      data: { url: `${self.location.origin}/?autoplay=${key}`, autoplay: key },
    });

    // 이 키만 다음 날로 재예약 (다른 키 타이머는 건드리지 않음)
    scheduleOne(hhmm, label, key, otherHhmm, commuteDays);
  }, delay);
}

// 알림 클릭 처리
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const payloadData = e.notification.data || {};
  const targetUrl = payloadData.url || payloadData.link || `${self.location.origin}/`;

  let autoplayIntent = payloadData.autoplay || null;
  if (!autoplayIntent) {
    try { autoplayIntent = new URL(targetUrl).searchParams.get('autoplay'); } catch {}
  }
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

  // pending intent 저장 (앱이 아직 준비 안 됐거나 iOS에서 matchAll이 빈 배열일 때 대비)
  if (autoplayIntent) {
    pendingNotifIntent = { intent: autoplayIntent, ts: Date.now() };
  }

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const ours = list.filter((c) => {
        try { return new URL(c.url).origin === self.location.origin; } catch { return false; }
      });

      const ping = () => {
        if (!autoplayIntent) return;
        // postMessage: 이미 실행 중인 탭에 직접 전달
        ours.forEach((c) => {
          try { c.postMessage({ type: 'FCM_AUTOPLAY', intent: autoplayIntent }); } catch (_) {}
        });
        // BroadcastChannel: iOS 포함 모든 탭에 브로드캐스트
        try {
          const bc = new BroadcastChannel('archiview-autoplay');
          bc.postMessage({ type: 'FCM_AUTOPLAY', intent: autoplayIntent });
          bc.close();
        } catch (_) {}
      };

      if (ours.length > 0) {
        // 앱이 열려있음: ping 즉시 + openWindow 병행
        // ping: 이미 화면에 보이는 탭에 즉시 오버레이
        // openWindow: iOS에서 기존 창 navigate, Android에서 새 창 (URL 파라미터로 확실히 처리)
        ping();
        return clients.openWindow(finalUrl).catch(() => {});
      }

      // 앱이 닫혀있음: 새 창 열기
      return clients.openWindow(finalUrl).catch(() => {});
    }).catch(() => clients.openWindow(finalUrl).catch(() => {}))
  );
});

// 앱이 꺼진 상태에서 FCM 수신
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || '아카이뷰';
  const body = payload?.notification?.body || '오늘의 콘텐츠를 확인하세요!';
  const link = payload?.fcmOptions?.link || payload?.data?.link || payload?.data?.url || `${self.location.origin}/`;
  const autoplay = payload?.data?.autoplay || null;

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: autoplay === 'go' || autoplay === 'back' ? `commute-${autoplay}-${Date.now()}` : `commute-${Date.now()}`,
    renotify: true,
    data: { url: link, autoplay },
  });
});
