import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'archiview_cookie_consent';

function updateGoogleConsent(granted) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
  });
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!saved) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
    updateGoogleConsent(saved === 'all');
  }, []);

  const acceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'all');
    updateGoogleConsent(true);
    if (typeof window._initFbPixel === 'function') window._initFbPixel();
    setVisible(false);
  };

  const essentialOnly = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'essential');
    updateGoogleConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6" role="dialog" aria-live="polite" aria-label="쿠키 동의 안내">
      <div className="mx-auto max-w-2xl rounded-lg border border-slate-700 bg-slate-950 p-5 shadow-2xl md:p-6">
        <h2 className="text-sm font-black text-white">🍪 쿠키 및 광고 기술 사용 안내</h2>
        <p className="mt-3 text-xs leading-6 text-slate-300">
          Whiteboard는 사이트 품질 개선, 보안, <strong className="text-white">Google AdSense 광고 제공</strong> 및 측정을 위해 쿠키를 사용합니다.
          <strong className="text-white"> 전체 동의</strong>를 선택하면 Google이 관심 기반 광고를 표시할 수 있습니다.
          <strong className="text-white"> 필수만 허용</strong>을 선택하면 분석·광고 쿠키가 비활성화됩니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
          <Link to="/privacy" className="text-blue-300 underline hover:text-blue-200">
            개인정보처리방침
          </Link>
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 underline hover:text-blue-200"
          >
            Google 광고 설정
          </a>
          <a
            href="https://optout.networkadvertising.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 underline hover:text-blue-200"
          >
            광고 거부 (NAI)
          </a>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={essentialOnly}
            className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
          >
            필수만 허용
          </button>
          <button
            onClick={acceptAll}
            className="rounded-md bg-blue-500 px-5 py-2.5 text-xs font-black text-white hover:bg-blue-400"
          >
            전체 동의
          </button>
        </div>
      </div>
    </div>
  );
}
