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
      'functionality_storage': 'granted',
      'security_storage': 'granted',
    });
  } else {
    window.gtag('consent', 'update', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'functionality_storage': 'granted',
      'security_storage': 'granted',
    });
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!saved) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      updateGoogleConsent(saved === 'all');
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'all');
    updateGoogleConsent(true);
    if (typeof window._initFbPixel === 'function') window._initFbPixel();
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
      aria-modal="true"
      aria-live="polite"
      aria-label="쿠키 동의 안내"
    >
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 md:p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl mt-0.5" role="img" aria-label="쿠키">🍪</span>
          <div className="flex-1">
            <h2 className="text-white font-black text-sm mb-1">쿠키 및 개인정보 사용 동의</h2>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              아카이뷰는 더 나은 서비스 제공을 위해 쿠키를 사용합니다.{' '}
              <Link to="/privacy" className="text-amber-400 underline hover:text-amber-300">
                개인정보처리방침
              </Link>
            </p>
            {/* 목적별 안내 (TCF v2.3 권고사항) */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 mb-1">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>필수 기능 (항상 활성)</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block"></span>사이트 분석 (선택)</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block"></span>맞춤형 광고 (선택)</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block"></span>광고 성과 측정 (선택)</span>
            </div>
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
