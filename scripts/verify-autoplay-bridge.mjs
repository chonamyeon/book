/**
 * Node sanity check for autoplay intent helpers (no browser APIs).
 * Run: node scripts/verify-autoplay-bridge.mjs
 */
import { isValidAutoplayIntent } from '../src/utils/autoplayBridge.js';

let failed = false;
function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed = true;
  }
}

ok(isValidAutoplayIntent('go'), 'go valid');
ok(isValidAutoplayIntent('back'), 'back valid');
ok(!isValidAutoplayIntent(''), 'empty invalid');
ok(!isValidAutoplayIntent('x'), 'random invalid');

if (failed) process.exit(1);
console.log('verify-autoplay-bridge: OK');
