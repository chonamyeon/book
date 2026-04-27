const CACHE = 'archiview-v2';
const IMG_CACHE = 'archiview-img-v2';

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

self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    const { commuteGo, commuteBack, commuteDays } = e.data;
    // 기존 타이머 모두 취소 후 재등록
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
      tag: key,
      renotify: true,
      data: { url: `${self.location.origin}/?autoplay=${key}` },
    });

    // 이 키만 다음 날로 재예약 (다른 키 타이머는 건드리지 않음)
    scheduleOne(hhmm, label, key, otherHhmm, commuteDays);
  }, delay);
}

// 알림 클릭 처리
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) || `${self.location.origin}/`;

  let autoplayIntent = null;
  try { autoplayIntent = new URL(targetUrl).searchParams.get('autoplay'); } catch {}

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        let sameOrigin = false;
        try { sameOrigin = new URL(client.url).origin === self.location.origin; } catch {}
        if (sameOrigin) {
          // ① SPA에 ?autoplay= 쿼리로 직접 반영(가장 확실). postMessage만 쓰면 리스너/타이밍에 빠질 수 있음
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
