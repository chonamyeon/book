import { useEffect, useRef } from 'react';

export default function AdSenseAd({ slot = '3894555730', format = 'auto', className = '' }) {
  const insRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      if (insRef.current && insRef.current.offsetWidth > 0) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      }
    } catch (e) {
      // adsbygoogle not ready
    }
  }, []);

  return (
    <div className={`overflow-hidden text-center ${className}`} aria-label="광고">
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-8121712799499251"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
