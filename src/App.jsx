import React, { lazy, Suspense, memo, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import { AudioProvider } from './contexts/AudioContext';
import { applyCommuteNotificationIntent } from './utils/applyCommuteNotificationIntent';
import MiniPlayer from './components/MiniPlayer';
import PodcastScriptModal from './components/PodcastScriptModal';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
// 메인/에디토리얼: 가장 많이 진입하는 페이지 — lazy 없이 즉시 로드
import Test4 from './pages/Test4';
import Editorial from './pages/Editorial';
import KnowledgeInsights from './pages/KnowledgeInsights';

// 청크 로드 실패 시 자동 새로고침 (시간 기반 1회) + 오류 fallback
const lazyWithRetry = (factory) =>
  lazy(() =>
    factory().catch((err) => {
      console.error('[Chunk load error]', err);
      const now = Date.now();
      const lastRetry = parseInt(sessionStorage.getItem('chunk_retry_at') || '0', 10);
      // 마지막 retry로부터 8초 이상 지났으면 → 재시도 (캐시 우회 리로드)
      if (now - lastRetry > 8000) {
        sessionStorage.setItem('chunk_retry_at', String(now));
        window.location.href = window.location.pathname + '?_r=' + now;
        return new Promise(() => {});
      }
      // 8초 이내 재실패 → 오류 화면
      sessionStorage.removeItem('chunk_retry_at');
      return { default: () => (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
          <div className="text-center space-y-4">
            <p className="text-3xl">📡</p>
            <h1 className="text-white font-black text-base">페이지를 불러올 수 없습니다</h1>
            <p className="text-slate-500 text-sm">네트워크 연결을 확인하고 다시 시도해주세요</p>
            <button
              onClick={() => { sessionStorage.removeItem('chunk_retry_at'); window.location.href = window.location.pathname; }}
              className="px-6 py-3 bg-amber-400 text-black font-black text-sm rounded-2xl"
            >
              다시 시도
            </button>
          </div>
        </div>
      )};
    })
  );

// ──────────────────────────────────────────────
// 코드 스플리팅: 각 페이지 lazy 로드
// ──────────────────────────────────────────────
// Test4, Editorial은 위에서 static import
const Test5         = lazyWithRetry(() => import('./pages/Test5'));
const Result        = lazyWithRetry(() => import('./pages/Result'));
const Celebrity     = lazyWithRetry(() => import('./pages/Celebrity'));
const Quiz          = lazyWithRetry(() => import('./pages/Quiz'));
const Library       = lazyWithRetry(() => import('./pages/LibraryLanding'));
const Profile       = lazyWithRetry(() => import('./pages/ProfileLanding'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const Login         = lazyWithRetry(() => import('./pages/Login'));
const About         = lazyWithRetry(() => import('./pages/About'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const Contact       = lazyWithRetry(() => import('./pages/Contact'));
const ReviewDetail  = lazyWithRetry(() => import('./pages/ReviewDetail'));
const YtPodcast     = lazyWithRetry(() => import('./pages/YtPodcast'));
const ReadingNotes  = lazyWithRetry(() => import('./pages/ReadingNotesLanding'));
const Membership    = lazyWithRetry(() => import('./pages/Membership'));
const CategoryBooks = lazyWithRetry(() => import('./pages/CategoryBooks'));
const ReviewBoard   = lazyWithRetry(() => import('./pages/ReviewBoard'));
const ReviewBoardDetail = lazyWithRetry(() => import('./pages/ReviewBoardDetail'));

// 페이지 로딩 — 아카이뷰 브랜드 웨이브 바 (index.html .av-loader CSS 재사용)
const PageLoader = memo(() => (
  <div className="av-loader">
    <div className="av-loader-bars">
      <span /><span /><span /><span />
      <span /><span /><span />
    </div>
    <div className="av-loader-label">ARCHIVIEW</div>
  </div>
));
PageLoader.displayName = 'PageLoader';

const MobileLayout = memo(({ children }) => (
  <div className="max-w-[430px] mx-auto min-h-[100dvh] bg-background-light dark:bg-background-dark shadow-2xl relative flex flex-col">
    {children}
  </div>
));
MobileLayout.displayName = 'MobileLayout';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const AutoplayVideoKeeper = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const kick = () => {
      // Notification deep-link + podcast autoplay 진입 시 일부 브라우저에서
      // hero autoplay video가 정지 상태로 남는 현상을 방지한다.
      const videos = document.querySelectorAll('video[autoplay]');
      videos.forEach((v) => {
        try {
          v.muted = true;
          v.defaultMuted = true;
          v.playsInline = true;
          if (v.paused) v.play().catch(() => {});
        } catch {}
      });
    };

    kick();
    const t1 = setTimeout(kick, 250);
    const t2 = setTimeout(kick, 900);
    const onVisible = () => { if (document.visibilityState === 'visible') kick(); };
    const onFocus = () => kick();
    const onPageShow = () => kick();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [pathname, search]);

  return null;
};

export default function App() {
  const [deferGlobalUi, setDeferGlobalUi] = useState(false);

  useEffect(() => {
    const activate = () => setDeferGlobalUi(true);
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(activate, { timeout: 1200 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(activate, 800);
    return () => clearTimeout(t);
  }, []);

  // 전역 포그라운드 출퇴근 타이머 — iOS는 앱이 열려있을 때 SW 알림 배너를 표시하지 않으므로
  // 클라이언트에서 직접 시간을 체크해 오버레이를 트리거해야 함 (모든 페이지에서 동작)
  useEffect(() => {
    const FG_KEY = '_commute_fg_last';
    const check = () => {
      try {
        if (localStorage.getItem('commute_on') !== 'true') return;
        const go   = localStorage.getItem('commute_go');
        const back = localStorage.getItem('commute_back');
        const days = JSON.parse(localStorage.getItem('commute_days') || '[0,1,2,3,4]');
        const now  = new Date();
        const dayIdx = (now.getDay() + 6) % 7;
        if (!days.includes(dayIdx)) return;
        const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        let intent = null;
        if (hhmm === go)   intent = 'go';
        else if (hhmm === back) intent = 'back';
        if (!intent) return;
        const key = `${intent}:${now.toDateString()}:${hhmm}`;
        if (sessionStorage.getItem(FG_KEY) === key) return;
        sessionStorage.setItem(FG_KEY, key);
        applyCommuteNotificationIntent(intent);
      } catch {}
    };
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  // 포그라운드 FCM 핸들러: 앱이 열려있을 때도 알림 표시 (동적 import로 메인 번들 분리)
  useEffect(() => {
    let unsub = null;
    const setup = async () => {
      try {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        if (!('serviceWorker' in navigator)) return;
        const { isSupported, getMessaging, onMessage } = await import('firebase/messaging');
        const { app } = await import('./firebase');
        const supported = await isSupported();
        if (!supported) return;
        const messaging = getMessaging(app);
        unsub = onMessage(messaging, (payload) => {
          const title = payload.notification?.title || '아카이뷰';
          const body = payload.notification?.body || '';
          const link = payload.fcmOptions?.link || payload.data?.link || payload.data?.url || '/';
          const autoplay =
            payload.data?.autoplay ||
            (() => {
              try { return new URL(link, window.location.origin).searchParams.get('autoplay'); } catch { return null; }
            })();
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              body,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              data: { link, url: link, autoplay },
              tag: autoplay === 'go' || autoplay === 'back' ? `commute-${autoplay}-${Date.now()}` : `commute-${Date.now()}`,
              renotify: true,
            });
          }).catch(() => {});
        });
      } catch {}
    };
    setup();
    return () => { if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    // 네비게이션 탭 반응속도: 앱 시작 직후 네비 페이지 선로드
    const prefetchNavPages = () => {
      import('./pages/LibraryLanding');
      import('./pages/ReadingNotesLanding');
      import('./pages/ProfileLanding');
    };
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(prefetchNavPages, { timeout: 400 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(prefetchNavPages, 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <ErrorBoundary>
      <AudioProvider>
        <Router>
          <ScrollToTop />
          <AutoplayVideoKeeper />
          <div className="min-h-screen bg-slate-950">
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<MobileLayout><Test4 /></MobileLayout>} />
                  <Route path="/test4" element={<MobileLayout><Test4 /></MobileLayout>} />
                  <Route path="/test5" element={<MobileLayout><Test5 /></MobileLayout>} />
                  <Route path="/editorial" element={<MobileLayout><Editorial /></MobileLayout>} />
                  <Route path="/result" element={<ProtectedRoute><MobileLayout><Result /></MobileLayout></ProtectedRoute>} />
                  <Route path="/celebrity/:id" element={<MobileLayout><Celebrity /></MobileLayout>} />
                  <Route path="/celebrity" element={<MobileLayout><Celebrity /></MobileLayout>} />
                  <Route path="/quiz" element={<ProtectedRoute><MobileLayout><Quiz /></MobileLayout></ProtectedRoute>} />
                  <Route path="/library" element={<MobileLayout><Library /></MobileLayout>} />
                  <Route path="/profile" element={<MobileLayout><Profile /></MobileLayout>} />
                  <Route path="/membership" element={<MobileLayout><Membership /></MobileLayout>} />
                  <Route path="/category/:id" element={<MobileLayout><CategoryBooks /></MobileLayout>} />
                  <Route path="/admin/*" element={<AdminDashboard />} />
                  <Route path="/login" element={<MobileLayout><Login /></MobileLayout>} />
                  <Route path="/about" element={<MobileLayout><About /></MobileLayout>} />
                  <Route path="/privacy" element={<MobileLayout><PrivacyPolicy /></MobileLayout>} />
                  <Route path="/contact" element={<MobileLayout><Contact /></MobileLayout>} />
                  <Route path="/review/:id" element={<MobileLayout><ReviewDetail /></MobileLayout>} />
                  <Route path="/yt-podcast/:id" element={<YtPodcast />} />
                  <Route path="/review-board" element={<MobileLayout><ReviewBoard /></MobileLayout>} />
                  <Route path="/review-board/:id" element={<MobileLayout><ReviewBoardDetail /></MobileLayout>} />
                  <Route path="/reading-notes" element={<MobileLayout><ReadingNotes /></MobileLayout>} />
                  <Route path="/insights" element={<MobileLayout><KnowledgeInsights /></MobileLayout>} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
            {deferGlobalUi && (
              <>
                <ErrorBoundary fallback={null}>
                  <MiniPlayer />
                </ErrorBoundary>
                <ErrorBoundary fallback={null}>
                  <PodcastScriptModal />
                </ErrorBoundary>
              </>
            )}
          </div>
        </Router>
      </AudioProvider>
    </ErrorBoundary>
  );
}
