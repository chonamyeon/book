/** 출퇴근 알림 → 메인 자동재생 브리지 (백그라운드 탭에서 React Router가 URL 갱신을 놓치는 경우 대비) */
export const AUTOPLAY_STORAGE_INTENT = 'archiview_autoplay_intent';
export const AUTOPLAY_STORAGE_TS = 'archiview_autoplay_ts';

export function isValidAutoplayIntent(v) {
    return v === 'go' || v === 'back';
}

/** 서비스워커 메시지·내부 트리거에서 호출: 저장 + 커스텀 이벤트 + navigate에 넘길 쿼리 */
export function stashAutoplayIntent(intent) {
    if (!isValidAutoplayIntent(intent)) return;
    try {
        sessionStorage.setItem(AUTOPLAY_STORAGE_INTENT, intent);
        sessionStorage.setItem(AUTOPLAY_STORAGE_TS, String(Date.now()));
    } catch {
        void 0;
    }
    try {
        window.dispatchEvent(new CustomEvent('archiview-autoplay-pending', { detail: { intent } }));
    } catch {
        void 0;
    }
}

export function readStashedAutoplayIntent(maxAgeMs = 180000) {
    try {
        const intent = sessionStorage.getItem(AUTOPLAY_STORAGE_INTENT);
        const ts = parseInt(sessionStorage.getItem(AUTOPLAY_STORAGE_TS) || '0', 10);
        if (!isValidAutoplayIntent(intent)) return null;
        if (Date.now() - ts > maxAgeMs) return null;
        return intent;
    } catch {
        return null;
    }
}

export function clearStashedAutoplayIntent() {
    try {
        sessionStorage.removeItem(AUTOPLAY_STORAGE_INTENT);
        sessionStorage.removeItem(AUTOPLAY_STORAGE_TS);
    } catch {
        void 0;
    }
}
