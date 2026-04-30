/**
 * 출퇴근 알림 진입 단일 통로:
 * - 서비스 워커 postMessage(FCM_AUTOPLAY)
 * - BroadcastChannel(archiview-autoplay)
 * - 포그라운드 복귀 시 SW pending intent 쿼리 (iOS notificationclick 타이밍 대응)
 * → 모두 applyCommuteNotificationIntent 로만 처리
 */
import { applyCommuteNotificationIntent } from './applyCommuteNotificationIntent';

/** @type {BroadcastChannel | null} */
let commuteBc = null;

const GUARD = '__ARCHIVIEW_COMMUTE_REGISTERED';
const COMMUTE_SW_URL = '/sw.js?v=20260430-commute-fix-1';

/** SW 한 개에 GET_PENDING_INTENT 전송하고 응답 처리 */
function queryOne(sw) {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = (ev) => {
        const intent = ev?.data?.intent;
        if (intent) applyCommuteNotificationIntent(intent);
    };
    sw.postMessage({ type: 'GET_PENDING_INTENT' }, [port2]);
}

/** 등록된 모든 SW(sw.js + firebase-messaging-sw.js)에 GET_PENDING_INTENT 전송 */
function querySwPendingIntent() {
    if (!('serviceWorker' in navigator)) return;
    // controller(현재 제어 중인 SW) 먼저 시도
    const controller = navigator.serviceWorker.controller;
    if (controller) queryOne(controller);

    // 등록된 모든 SW에도 전송 (firebase-messaging-sw.js는 controller와 다를 수 있음)
    navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
            const sw = reg.active || reg.installing || reg.waiting;
            if (sw && sw !== controller) queryOne(sw);
        });
    }).catch(() => {
        // fallback: ready 대기
        navigator.serviceWorker.ready.then((reg) => {
            const sw = reg.active;
            if (sw && sw !== controller) queryOne(sw);
        }).catch(() => {});
    });
}

export function registerCommuteNotificationListeners() {
    if (typeof window === 'undefined') return;
    if (window[GUARD]) return;
    window[GUARD] = true;

    // SW → 앱: FCM_AUTOPLAY postMessage 수신
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (ev) => {
            const d = ev?.data;
            if (!d || d.type !== 'FCM_AUTOPLAY') return;
            applyCommuteNotificationIntent(d.intent);
        });
        navigator.serviceWorker.register(COMMUTE_SW_URL).catch(() => {});
    }

    // BroadcastChannel 수신
    try {
        commuteBc = new BroadcastChannel('archiview-autoplay');
        commuteBc.onmessage = (ev) => {
            applyCommuteNotificationIntent(ev?.data?.intent);
        };
    } catch {
        commuteBc = null;
    }

    // 초기 로드 시 1회 쿼리 (알림 탭으로 앱이 cold-start된 경우 복구)
    querySwPendingIntent();

    // 백그라운드에서 복귀 시에도 쿼리 — 앱이 frozen 상태였다면
    // BroadcastChannel/postMessage 를 못 받았을 수 있으므로 SW pending intent 재확인
    const onVisible = () => {
        if (document.visibilityState !== 'visible') return;
        // 약간의 딜레이: 브라우저가 SW를 활성화하고 notificationclick이 완료될 시간 보장
        setTimeout(querySwPendingIntent, 200);
        setTimeout(querySwPendingIntent, 800);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', () => setTimeout(querySwPendingIntent, 200));
    window.addEventListener('pageshow', () => setTimeout(querySwPendingIntent, 200));
}
