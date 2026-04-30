/**
 * 출퇴근 알림 진입 단일 통로 검증 (main.jsx + registerCommuteNotificationListeners).
 * Run: node scripts/verify-notification-inline.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const main = readFileSync(join(root, '..', 'src', 'main.jsx'), 'utf8');
const reg = readFileSync(join(root, '..', 'src', 'utils', 'registerCommuteNotificationListeners.js'), 'utf8');
const html = readFileSync(join(root, '..', 'index.html'), 'utf8');

let failed = false;
function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed = true;
  }
}

ok(main.includes('registerCommuteNotificationListeners'), 'main.jsx registers commute listeners');
ok(reg.includes('applyCommuteNotificationIntent'), 'register uses applyCommuteNotificationIntent');
ok(reg.includes('FCM_AUTOPLAY'), 'register handles FCM_AUTOPLAY');
ok(reg.includes('archiview-autoplay'), 'register subscribes BroadcastChannel archiview-autoplay');
ok(!html.includes('notify-intent.js'), 'index.html does not load legacy notify-intent.js');

if (failed) process.exit(1);
console.log('verify-notification-inline: OK');
