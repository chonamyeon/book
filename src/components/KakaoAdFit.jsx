import React, { useEffect, useRef } from 'react';

const KakaoAdFit = ({ unit, width = "320", height = "100", disabled }) => {
  const adRef = useRef(null);

  useEffect(() => {
    if (disabled) return;

    // SPA 환경에서 페이지 이동 시 광고가 로드되지 않는 문제를 해결하기 위해
    // 광고 스크립트가 이미 로드되어 있더라도, ins 태그가 렌더링된 후 
    // 전역 객체를 통해 광고 로드를 시도하거나 스크립트를 재호출합니다.
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
    script.async = true;
    
    // adRef를 사용하여 해당 도구의 자식으로 스크립트를 추가하여 매번 실행되게 함
    if (adRef.current) {
        adRef.current.innerHTML = ''; // 기존 내용 청소
        const ins = document.createElement('ins');
        ins.className = 'kakao_ad_area';
        ins.style.display = 'none';
        ins.setAttribute('data-ad-unit', unit);
        ins.setAttribute('data-ad-width', width);
        ins.setAttribute('data-ad-height', height);
        
        adRef.current.appendChild(ins);
        adRef.current.appendChild(script);

        // Ensure the ad script is re-executed for SPA navigation
        // This checks if the global 'kakaoAdFit' object exists and re-initializes if needed.
        // This is a common pattern for re-rendering AdFit in SPAs.
        if (window.kakaoAdFit && typeof window.kakaoAdFit.display === 'function') {
            window.kakaoAdFit.display();
        }
    }
    
    return () => {
        if (adRef.current) adRef.current.innerHTML = '';
    };
  }, [unit, width, height, disabled]);

  return (
    <div ref={adRef} className="flex justify-center my-8 overflow-hidden ad-container" style={{ minHeight: `${height}px` }}>
      {/* useEffect에서 동적으로 생성됨 */}
    </div>
  );
};

export default KakaoAdFit;
