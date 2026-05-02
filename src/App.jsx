import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import { AudioProvider } from './contexts/AudioContext';
import MiniPlayer from './components/MiniPlayer';
import PodcastScriptModal from './components/PodcastScriptModal';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsent from './components/CookieConsent';
import SidebarLayout from './components/SidebarLayout';

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

// 404 Not Found
const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
    <div className="text-center space-y-5 max-w-sm">
      <p className="text-6xl font-black text-amber-400">404</p>
      <h1 className="text-white font-black text-xl tracking-tight">페이지를 찾을 수 없습니다</h1>
      <p className="text-slate-500 text-sm leading-relaxed break-keep">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.<br />
        아래 버튼을 눌러 메인으로 돌아가세요.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 text-black font-black text-sm rounded-2xl hover:bg-amber-300 transition-colors"
      >
        메인으로 돌아가기
      </a>
    </div>
  </div>
);

// 코드 스플리팅
import Home from './pages/Home';
import StaticReview from './pages/AdSense/StaticReview';

const Editorial     = lazyWithRetry(() => import('./pages/Editorial'));
const Result        = lazyWithRetry(() => import('./pages/Result'));
const Celebrity     = lazyWithRetry(() => import('./pages/Celebrity'));
const Quiz          = lazyWithRetry(() => import('./pages/Quiz'));
const Library       = lazyWithRetry(() => import('./pages/Library'));
const Profile       = lazyWithRetry(() => import('./pages/Profile'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const Login         = lazyWithRetry(() => import('./pages/Login'));
const About         = lazyWithRetry(() => import('./pages/About'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const Contact       = lazyWithRetry(() => import('./pages/Contact'));
const ReviewDetail  = lazyWithRetry(() => import('./pages/ReviewDetail'));
const ReadingNotes  = lazyWithRetry(() => import('./pages/ReadingNotes'));
const Membership    = lazyWithRetry(() => import('./pages/Membership'));
const CategoryBooks = lazyWithRetry(() => import('./pages/CategoryBooks'));
const ReviewBoard   = lazyWithRetry(() => import('./pages/ReviewBoard'));
const ReviewBoardDetail = lazyWithRetry(() => import('./pages/ReviewBoardDetail'));
const Terms         = lazyWithRetry(() => import('./pages/Terms'));
const Disclaimer    = lazyWithRetry(() => import('./pages/Disclaimer'));
const Test4         = lazyWithRetry(() => import('./pages/Test4'));


// 페이지 로딩 스피너
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      <p className="text-amber-400/60 text-xs font-bold tracking-widest uppercase">Loading</p>
    </div>
  </div>
);

const MobileLayout = ({ children }) => (
  <div className="w-full min-h-screen bg-white relative flex flex-col">
    {children}
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AudioProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen bg-white">
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<MobileLayout><Home /></MobileLayout>} />
                  <Route path="/editorial" element={<SidebarLayout><MobileLayout><Editorial /></MobileLayout></SidebarLayout>} />
                  <Route path="/result" element={<ProtectedRoute><SidebarLayout><MobileLayout><Result /></MobileLayout></SidebarLayout></ProtectedRoute>} />
                  <Route path="/celebrity/:id" element={<SidebarLayout><MobileLayout><Celebrity /></MobileLayout></SidebarLayout>} />
                  <Route path="/celebrity" element={<SidebarLayout><MobileLayout><Celebrity /></MobileLayout></SidebarLayout>} />
                  <Route path="/quiz" element={<SidebarLayout><MobileLayout><Quiz /></MobileLayout></SidebarLayout>} />
                  <Route path="/library" element={<SidebarLayout><MobileLayout><Library /></MobileLayout></SidebarLayout>} />
                  <Route path="/profile" element={<ProtectedRoute><SidebarLayout><MobileLayout><Profile /></MobileLayout></SidebarLayout></ProtectedRoute>} />
                  <Route path="/membership" element={<SidebarLayout><MobileLayout><Membership /></MobileLayout></SidebarLayout>} />
                  <Route path="/category/:id" element={<SidebarLayout><MobileLayout><CategoryBooks /></MobileLayout></SidebarLayout>} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/login" element={<MobileLayout><Login /></MobileLayout>} />
                  <Route path="/about" element={<SidebarLayout><MobileLayout><About /></MobileLayout></SidebarLayout>} />
                  <Route path="/privacy" element={<SidebarLayout><MobileLayout><PrivacyPolicy /></MobileLayout></SidebarLayout>} />
                  <Route path="/privacy-policy" element={<SidebarLayout><MobileLayout><PrivacyPolicy /></MobileLayout></SidebarLayout>} />
                  <Route path="/terms" element={<SidebarLayout><MobileLayout><Terms /></MobileLayout></SidebarLayout>} />
                  <Route path="/disclaimer" element={<SidebarLayout><MobileLayout><Disclaimer /></MobileLayout></SidebarLayout>} />
                  <Route path="/contact" element={<SidebarLayout><MobileLayout><Contact /></MobileLayout></SidebarLayout>} />
                  <Route path="/review/:id" element={<ProtectedRoute><SidebarLayout><MobileLayout><ReviewDetail /></MobileLayout></SidebarLayout></ProtectedRoute>} />
                  <Route path="/review-board" element={<SidebarLayout><MobileLayout><ReviewBoard /></MobileLayout></SidebarLayout>} />
                  <Route path="/review-board/:id" element={<SidebarLayout><MobileLayout><ReviewBoardDetail /></MobileLayout></SidebarLayout>} />
                  <Route path="/story/:id" element={<StaticReview />} />
                  <Route path="/reading-notes" element={<SidebarLayout><MobileLayout><ReadingNotes /></MobileLayout></SidebarLayout>} />
                  <Route path="/test4" element={<MobileLayout><Test4 /></MobileLayout>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <MiniPlayer />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <PodcastScriptModal />
            </ErrorBoundary>
            <CookieConsent />
          </div>
        </Router>
      </AudioProvider>
    </ErrorBoundary>
  );
}
