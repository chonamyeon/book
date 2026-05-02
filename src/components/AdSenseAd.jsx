import { useEffect, useRef } from 'react';

export default function AdSenseAd({ slot = '3894555730', format = 'auto', className = '' }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // adsbygoogle not loaded
    }
  }, []);

  return (
    <div className={`overflow-hidden ${className}`} aria-label="광고">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '100px' }}
        data-ad-client="ca-pub-8121712799499251"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
