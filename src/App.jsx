import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import { AudioProvider } from './contexts/AudioContext';
import MiniPlayer from './components/MiniPlayer';
import PodcastScriptModal from './components/PodcastScriptModal';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// 청크 로드 실패 시 자동 새로고침 (1회) + 오류 fallback
const lazyWithRetry = (factory) =>
  lazy(() =>
    factory().catch((err) => {
      console.error('[Chunk load error]', err);
      // 이미 새로고침 시도한 경우 fallback 컴포넌트 반환
      if (sessionStorage.getItem('chunk_retry')) {
        return { default: () => (
          <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
            <div className="text-center space-y-4">
              <p className="text-3xl">📡</p>
              <h1 className="text-white font-black text-base">페이지를 불러올 수 없습니다</h1>
              <p className="text-slate-500 text-sm">네트워크 연결을 확인하고 다시 시도해주세요</p>
              <button
                onClick={() => { sessionStorage.removeItem('chunk_retry'); window.location.reload(); }}
                className="px-6 py-3 bg-amber-400 text-black font-black text-sm rounded-2xl"
              >
                다시 시도
              </button>
            </div>
          </div>
        )};
      }
      sessionStorage.setItem('chunk_retry', '1');
      window.location.reload();
      return new Promise(() => {}); // reload 대기
    })
  );

// 코드 스플리팅
const Home          = lazyWithRetry(() => import('./pages/Home'));
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
  <div className="max-w-[430px] mx-auto min-h-[100dvh] bg-background-light dark:bg-background-dark shadow-2xl relative overflow-hidden flex flex-col">
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
          <div className="min-h-screen bg-slate-950">
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/test" element={<MobileLayout><div className="p-8 text-white">Hello World</div></MobileLayout>} />
                  <Route path="/" element={<MobileLayout><Home /></MobileLayout>} />
                  <Route path="/editorial" element={<MobileLayout><Editorial /></MobileLayout>} />
                  <Route path="/result" element={<ProtectedRoute><MobileLayout><Result /></MobileLayout></ProtectedRoute>} />
                  <Route path="/celebrity/:id" element={<MobileLayout><Celebrity /></MobileLayout>} />
                  <Route path="/celebrity" element={<MobileLayout><Celebrity /></MobileLayout>} />
                  <Route path="/quiz" element={<MobileLayout><Quiz /></MobileLayout>} />
                  <Route path="/library" element={<ProtectedRoute><MobileLayout><Library /></MobileLayout></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><MobileLayout><Profile /></MobileLayout></ProtectedRoute>} />
                  <Route path="/membership" element={<MobileLayout><Membership /></MobileLayout>} />
                  <Route path="/category/:id" element={<MobileLayout><CategoryBooks /></MobileLayout>} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/login" element={<MobileLayout><Login /></MobileLayout>} />
                  <Route path="/about" element={<MobileLayout><About /></MobileLayout>} />
                  <Route path="/privacy" element={<MobileLayout><PrivacyPolicy /></MobileLayout>} />
                  <Route path="/contact" element={<MobileLayout><Contact /></MobileLayout>} />
                  <Route path="/review/:id" element={<MobileLayout><ReviewDetail /></MobileLayout>} />
                  <Route path="/reading-notes" element={<ProtectedRoute><MobileLayout><ReadingNotes /></MobileLayout></ProtectedRoute>} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <MiniPlayer />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <PodcastScriptModal />
            </ErrorBoundary>
          </div>
        </Router>
      </AudioProvider>
    </ErrorBoundary>
  );
}
