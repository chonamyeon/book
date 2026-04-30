/** Safari/iPad/iPhone 계열 — 알림 딥링크 후 비동기 play()는 사용자 제스처가 유실되어 차단되는 경우가 많음 */
export function isIOSLike() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/i.test(ua)) return true;
    // iPadOS 13+ "데스크톱 사이트 요청" 등
    if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
    return false;
}
