import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { setGoogleSession } from '../lib/localAuth';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

const BENEFITS = [
  { icon: 'bookmark', text: '독서 기록 영구 저장', sub: '읽은 책과 인사이트를 나만의 아카이브에' },
  { icon: 'recommend', text: '맞춤 도서 큐레이션', sub: '취향 분석 기반 personalized 추천' },
  { icon: 'headphones', text: '오디오 인사이트 전체 이용', sub: '이동 중에도 15분 핵심 요약 청취' },
  { icon: 'workspace_premium', text: '프리미엄 멤버십 혜택', sub: '전문 에디터의 심층 분석 콘텐츠 이용' },
];

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [googleReady, setGoogleReady] = useState(false);
  const googleBtnRef = useRef(null);

  const handleGoogleResponse = useCallback(
    async (response) => {
      setIsLoading(true);
      try {
        setGoogleSession(response.credential);
        if (window.fbq) window.fbq('track', 'CompleteRegistration', { method: 'Google' });
        navigate('/profile', { replace: true });
      } catch (e) {
        console.error('Auth Fail:', e);
        setIsLoading(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: '176157090689-b1cis9q41ikr4qd004nbvsst7l8lrjvm.apps.googleusercontent.com',
          callback: handleGoogleResponse,
          ux_mode: 'popup',
        });
        setIsLoading(false);
        setGoogleReady(true);
      } else {
        setTimeout(initGoogle, 300);
      }
    };
    initGoogle();
  }, [handleGoogleResponse]);

  useEffect(() => {
    if (googleReady && googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: '360',
        logo_alignment: 'left',
      });
    }
  }, [googleReady]);

  return (
    <div className="bg-white min-h-screen flex flex-col font-display text-slate-900">
      <TopNavigation title="무료 시작하기" type="sub" />
      <main className="flex-1 flex flex-col items-center justify-start px-5 pt-6 pb-10 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-[26px] font-black text-slate-900 tracking-tight leading-tight mb-2">
              지금 바로<br />
              <span className="text-blue-600">무료</span>로 시작하세요
            </h1>
            <p className="text-slate-500 text-[13px] font-medium">Google 계정으로 시작 (Vercel 미사용)</p>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="size-7 border-[2.5px] border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div
              ref={googleBtnRef}
              className="w-full flex justify-center py-2 bg-white rounded-2xl overflow-hidden shadow-xl min-h-[52px] mb-4"
            />
          )}
          <div className="space-y-2.5 mb-8">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-blue-600 text-[18px]">{b.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-slate-900 leading-tight">{b.text}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-slate-600 leading-relaxed">
            가입 시{' '}
            <span className="text-slate-400 underline cursor-pointer" onClick={() => navigate('/terms')}>
              이용약관
            </span>
            {' 및 '}
            <span className="text-slate-400 underline cursor-pointer" onClick={() => navigate('/privacy')}>
              개인정보처리방침
            </span>
            에 동의합니다.
          </p>
        </div>
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  );
}
