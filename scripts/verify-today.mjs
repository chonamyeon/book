/**
 * Node에서 Today 짝 로직 검증 (배포 전 `npm run test:today`)
 */
import { getTodayContents, dayIndexFromYmd } from '../src/data/personalization.js';

function assert(cond, msg) {
    if (!cond) {
        console.error('FAIL:', msg);
        process.exit(1);
    }
}

const d1 = dayIndexFromYmd(20260101);
const d2 = dayIndexFromYmd(20260102);
assert(d2 === d1 + 1, `연속 날짜 dayIndex +1: ${d1} → ${d2}`);

const books60 = Array.from({ length: 60 }, (_, i) => ({ id: `b${i}`, title: `T${i}` }));
const vids10 = Array.from({ length: 10 }, (_, i) => ({ id: `v${i}`, youtubeUrl: `https://youtu.be/x${i}` }));

const ymdA = 20220410;
const ymdB = 20220411;
const diA = dayIndexFromYmd(ymdA);
const diB = dayIndexFromYmd(ymdB);
assert(diB === diA + 1, '샘플 이틀 dayIndex +1');

const slotA = diA % 30;
const slotB = diB % 30;
const iA = slotA * 2;
const iB = slotB * 2;
const tA = getTodayContents(books60, vids10, null, ymdA);
const tB = getTodayContents(books60, vids10, null, ymdB);
assert(tA.todayBooks[0].id === `b${iA}` && tA.todayBooks[1].id === `b${iA + 1}`, `60권 dayA sl=${slotA} → b${iA},b${iA + 1}`);
assert(tB.todayBooks[0].id === `b${iB}` && tB.todayBooks[1].id === `b${iB + 1}`, `60권 dayB sl=${slotB} → b${iB},b${iB + 1}`);

const vslotA = diA % 5;
const vslotB = diB % 5;
const viA = vslotA * 2;
const viB = vslotB * 2;
assert(tA.todayVideos[0].id === `v${viA}` && tB.todayVideos[0].id === `v${viB}` && viB !== viA, '10영상 이틀 짝 다름(5일주기 대비)');

// 빈 id 는 __w_i 로 유지
const messy = [{ title: 'A' }, { id: 'x', title: 'B' }, { id: 'x' }];
const m = getTodayContents(messy, [], null, 20260101);
assert(m.todayBooks.length === 2, '빈 id 권+중복 id 처리 후 2권');
assert(m.todayBooks[0].title === 'A' && m.todayBooks[1].id === 'x', '빈 id+중복');

console.log('OK: verify-today — dayIndex, 60권, 10영상, dedupe');
