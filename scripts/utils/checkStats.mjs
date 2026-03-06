/**
 * checkStats.mjs
 * 모든 책 리뷰 글자수 통계를 한눈에 출력하는 유틸
 * 
 * 실행: node scripts/utils/checkStats.mjs
 */
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, '../../src/data/celebrities.js');

// Dynamic import workaround for non-module JS data files
const raw = readFileSync(dataPath, 'utf8');
const match = raw.match(/export const celebrities\s*=\s*(\[[\s\S]*\]);?\s*$/m);
if (!match) {
    console.error('celebrities 배열을 찾을 수 없습니다.');
    process.exit(1);
}

const celebrities = eval(match[1]); // safe: local file only
const results = [];

for (const c of celebrities) {
    for (const b of c.books ?? []) {
        if (b.review !== undefined) {
            results.push({
                celeb: c.name,
                title: b.title,
                id: b.id ?? '(no id)',
                chars: b.review.length,
            });
        }
    }
}

results.sort((a, b) => a.chars - b.chars);

let under1000 = 0, under2000 = 0, under4000 = 0, over4000 = 0;

console.log('\n══════════════════════════════════════════════════');
console.log('  📚 리뷰 글자수 통계');
console.log('══════════════════════════════════════════════════\n');

for (const r of results) {
    const icon = r.chars >= 4000 ? '🟢' : r.chars >= 2000 ? '🟡' : r.chars >= 1000 ? '🔸' : '🔴';
    if (r.chars >= 4000) over4000++;
    else if (r.chars >= 2000) under4000++;
    else if (r.chars >= 1000) under2000++;
    else under1000++;
    console.log(`${icon} ${String(r.chars).padStart(5)}자  ${r.celeb.padEnd(20)} ${r.title}`);
}

const avg = Math.round(results.reduce((s, r) => s + r.chars, 0) / results.length);

console.log('\n──────────────────────────────────────────────────');
console.log(`총 ${results.length}권 | 평균 ${avg}자`);
console.log(`🟢 4000자+: ${over4000}권  🟡 2000자+: ${under4000}권  🔸 1000자+: ${under2000}권  🔴 1000자미만: ${under1000}권`);
console.log('══════════════════════════════════════════════════\n');
