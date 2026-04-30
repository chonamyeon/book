/**
 * 출퇴근 알림 탭의 유일한 네비 진입 API.
 * - 호출부: registerCommuteNotificationListeners (SW/Broadcast), Profile 포그라운드 알림 onclick
 * - 동작: 세션 스토리지에 의도 저장 후, 필요 시 `/?autoplay=` 로 document 전환
 */

import { stashAutoplayIntent, isValidAutoplayIntent } from './autoplayBridge';

let _lastApply = { t: 0, intent: '' };

/** 알림 탭 / SW 메시지 / Broadcast → 출퇴근 오버레이 진입 (어떤 라우트에 있든 동일) */
export function applyCommuteNotificationIntent(intent) {
    if (!isValidAutoplayIntent(intent)) return;
    const now = Date.now();
    if (intent === _lastApply.intent && now - _lastApply.t < 450) return;
    _lastApply = { t: now, intent };

    // 항상 stash: sessionStorage 저장 + archiview-autoplay-pending 이벤트 dispatch
    stashAutoplayIntent(intent);

    try {
        const u = new URL(window.location.href);
        if (u.pathname === '/' || u.pathname === '') {
            // 이미 홈에 있을 때: 이벤트만으로 처리 (리로드 없음)
            // Test4의 archiview-autoplay-pending 리스너가 setAutoplayIntent → 오버레이 표시
            return;
        }
    } catch {
        void 0;
    }

    // 다른 페이지에 있을 때만 홈으로 이동
    const dest = new URL(window.location.origin);
    dest.pathname = '/';
    dest.searchParams.set('autoplay', intent);
    dest.searchParams.set('ap_n', String(Date.now()));
    window.location.replace(dest.toString());
}
