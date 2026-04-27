import { useState, useEffect, useRef } from 'react';
import { getCalendarDayKey, getNextSeoulMidnightAfter } from '../data/personalization';

/**
 * 서울 YYYYMMDD. 자정 지나면 숫자가 바뀌고 **setState로 반드시 리렌더** → Today useMemo 재계산.
 * (useSyncExternalStore만으로는 환경에 따라 구독이 약할 수 있어 2초 폴링을 병행)
 */
export function useSeoulCalendarDayKey() {
    const [ymd, setYmd] = useState(() => getCalendarDayKey());
    const midnightRef = useRef(null);

    useEffect(() => {
        const bump = () => {
            setYmd((prev) => {
                const n = getCalendarDayKey();
                return n !== prev ? n : prev;
            });
        };

        bump();
        const poll = setInterval(bump, 2000);

        const scheduleMidnight = () => {
            if (midnightRef.current != null) {
                clearTimeout(midnightRef.current);
                midnightRef.current = null;
            }
            const next = getNextSeoulMidnightAfter();
            const delay = Math.max(80, next - Date.now() + 300);
            midnightRef.current = setTimeout(() => {
                bump();
                scheduleMidnight();
            }, delay);
        };
        scheduleMidnight();

        const onVis = () => {
            if (document.visibilityState === 'visible') bump();
        };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('focus', bump);
        window.addEventListener('pageshow', bump);

        return () => {
            clearInterval(poll);
            if (midnightRef.current != null) clearTimeout(midnightRef.current);
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('focus', bump);
            window.removeEventListener('pageshow', bump);
        };
    }, []);

    return ymd;
}

export const useKoreaDayTick = useSeoulCalendarDayKey;
