import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'archiview_cookie_consent';

function updateGoogleConsent(granted) {
  if (typeof window.gtag !== 'function') return;
  if (granted) {
    window.gtag('consent', 'update', {
      'analytics_storage': 'granted',
      'ad_storage': 'granted',
      'ad_user_data': 'granted',
      'ad_personalization': 'granted',
    });
  } else {
    window.gtag('consent', 'update', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
    });
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!saved) {
      // 300ms 지연 후 표시 (페이지 로드 완료 후)
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      // 이전 동의 기록이 있으면 Consent Mode 업데이트
      updateGoogleConsent(saved === 'all');
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'all');
    updateGoogleConsent(true);
    // Facebook Pixel: 전체 동의 시 초기화
    if (typeof window._initFbPixel === 'function') {
      window._initFbPixel();
    }
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'essential');
    updateGoogleConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
      role="dialog"
      aria-live="polite"
      aria-label="쿠키 동의 안내"
    >
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 md:p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl mt-0.5" role="img" aria-label="쿠키">🍪</span>
          <div>
            <h2 className="text-white font-black text-sm mb-1">쿠키 및 개인정보 사용 동의</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              아카이뷰는 서비스 개선과 맞춤형 광고(Google AdSense) 제공을 위해 쿠키를 사용합니다.
              '전체 동의' 시 분석·광고 쿠키가 활성화되며,{' '}
              <Link to="/privacy" className="text-amber-400 underline hover:text-amber-300">
                개인정보처리방침
              </Link>
              에서 자세한 내용을 확인하실 수 있습니다.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleEssentialOnly}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
          >
            필수만 허용
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 transition-colors shadow-lg"
          >
            전체 동의
          </button>
        </div>
      </div>
    </div>
  );
}
