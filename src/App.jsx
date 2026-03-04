import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AudioProvider } from './contexts/AudioContext';
import MiniPlayer from './components/MiniPlayer';
import ProtectedRoute from './components/ProtectedRoute';

// 코드 스플리팅: 각 페이지를 별도 청크로 분리 (초기 번들 크기 대폭 감소)
const Home = lazy(() => import('./pages/Home'));
const Editorial = lazy(() => import('./pages/Editorial'));
const Result = lazy(() => import('./pages/Result'));
const Celebrity = lazy(() => import('./pages/Celebrity'));
const Quiz = lazy(() => import('./pages/Quiz'));
const Library = lazy(() => import('./pages/Library'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Login = lazy(() => import('./pages/Login'));
const About = lazy(() => import('./pages/About'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Contact = lazy(() => import('./pages/Contact'));
const ReviewDetail = lazy(() => import('./pages/ReviewDetail'));
const ReadingNotes = lazy(() => import('./pages/ReadingNotes'));
const Membership = lazy(() => import('./pages/Membership'));

// 페이지 로딩 중 스켈레톤 (레이아웃 깨짐 방지)
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background-dark">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      <p className="text-gold/60 text-xs font-bold tracking-widest uppercase">Loading</p>
    </div>
  </div>
);

// 모든 모바일용 페이지를 감싸는 레이아웃 컴포넌트
const MobileLayout = ({ children }) => (
  <div className="max-w-[430px] mx-auto min-h-screen bg-background-light dark:bg-background-dark shadow-2xl relative overflow-hidden">
    {children}
  </div>
);

export default function App() {
  return (
    <AudioProvider>
      <Router>
        <div className="min-h-screen bg-slate-950">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/test" element={<MobileLayout><div>Hello World</div></MobileLayout>} />
              <Route path="/" element={<MobileLayout><Home /></MobileLayout>} />
              <Route path="/editorial" element={<MobileLayout><Editorial /></MobileLayout>} />
              <Route path="/result" element={<ProtectedRoute><MobileLayout><Result /></MobileLayout></ProtectedRoute>} />
              <Route path="/celebrity/:id" element={<MobileLayout><Celebrity /></MobileLayout>} />
              <Route path="/celebrity" element={<MobileLayout><Celebrity /></MobileLayout>} />
              <Route path="/quiz" element={<MobileLayout><Quiz /></MobileLayout>} />
              <Route path="/library" element={<ProtectedRoute><MobileLayout><Library /></MobileLayout></ProtectedRoute>} />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <MobileLayout><Profile /></MobileLayout>
                </ProtectedRoute>
              } />
              <Route path="/membership" element={<MobileLayout><Membership /></MobileLayout>} />

              {/* 관리자 페이지는 MobileLayout으로 감싸지 않아 가로가 무제한으로 확장됨 */}
              <Route path="/admin" element={<AdminDashboard />} />

              <Route path="/login" element={<MobileLayout><Login /></MobileLayout>} />
              <Route path="/about" element={<MobileLayout><About /></MobileLayout>} />
              <Route path="/privacy" element={<MobileLayout><PrivacyPolicy /></MobileLayout>} />
              <Route path="/contact" element={<MobileLayout><Contact /></MobileLayout>} />
              <Route path="/review/:id" element={<MobileLayout><ReviewDetail /></MobileLayout>} />
              <Route path="/reading-notes" element={<ProtectedRoute><MobileLayout><ReadingNotes /></MobileLayout></ProtectedRoute>} />
            </Routes>
          </Suspense>
          <MiniPlayer />
        </div>
      </Router>
    </AudioProvider>
  );
}
