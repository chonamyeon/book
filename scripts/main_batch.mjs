/**
 * main_batch.mjs  ─  통합 배치 실행기
 * 
 * 사용법:
 *   node scripts/main_batch.mjs --target=all          # 전체 실행
 *   node scripts/main_batch.mjs --target=a            # 배치 a만
 *   node scripts/main_batch.mjs --target=a,b,c        # 여러 배치 선택
 *   node scripts/main_batch.mjs --list                # 배치 목록 출력
 *   node scripts/main_batch.mjs --stats               # 리뷰 통계만 출력
 * 
 * npm scripts:
 *   npm run expand              → --target=all
 *   npm run expand -- --target=a,b
 *   npm run stats               → 통계 확인
 */

import { applyReviewsById, applyReviewsByTitle } from './utils/updateReview.mjs';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ──────────────────────────────────────────────
// 배치 레지스트리: 각 배치의 ID, 설명, 담당 파일
// ──────────────────────────────────────────────
const BATCH_REGISTRY = {
    a: { desc: 'Sapiens · Factfulness · Demian', file: './batches/expand_batch_a.mjs' },
    b: { desc: 'Almond · Vegetarian(RM)', file: './batches/expand_batch_b.mjs' },
    c: { desc: 'Ubermensch · Sayno', file: './batches/expand_batch_c.mjs' },
    d: { desc: '돈의심리학 · 스토너', file: './batches/expand_batch_d.mjs' },
    e: { desc: '너의이름은 · 호모데우스', file: './batches/expand_batch_e.mjs' },
    f: { desc: '레버리지 · 원씽', file: './batches/expand_batch_f.mjs' },
    g: { desc: '채식주의자 · 소년이온다 (제목기반)', file: './batches/expand_batch_g.mjs' },
    h: { desc: '1984(킹) · 위대한개츠비', file: './batches/expand_batch_h.mjs' },
    i: { desc: '작별하지않는다 · 흰 · 희랍어시간', file: './batches/expand_i.mjs' },
    j: { desc: '이방인 · 호밀밭 · 존재의가벼움 · 노르웨이숲', file: './batches/expand_j.mjs' },
    k: { desc: '이처럼사소한것들 · 돈의속성', file: './batches/expand_k.mjs' },
    l: { desc: '21가지제언 · 8가지습관 · 모스크바신사 · 잠 · 클라라 · 헤일메리', file: './batches/expand_l.mjs' },
};

// ──────────────────────────────────────────────
// CLI 파싱
// ──────────────────────────────────────────────
const args = Object.fromEntries(
    process.argv.slice(2)
        .filter(a => a.startsWith('--'))
        .map(a => {
            const [k, v] = a.slice(2).split('=');
            return [k, v ?? true];
        })
);

// ──────────────────────────────────────────────
// stats 전용 모드
// ──────────────────────────────────────────────
if (args.stats) {
    const { default: checkStats } = await import('./utils/checkStats.mjs').catch(() => null) ?? {};
    // checkStats가 자체 실행 스크립트이므로 직접 스폰
    const { spawnSync } = await import('child_process');
    spawnSync('node', [path.resolve(__dirname, 'utils/checkStats.mjs')], { stdio: 'inherit' });
    process.exit(0);
}

// ──────────────────────────────────────────────
// list 모드
// ──────────────────────────────────────────────
if (args.list) {
    console.log('\n📋 등록된 배치 목록\n');
    for (const [id, meta] of Object.entries(BATCH_REGISTRY)) {
        console.log(`  [${id}]  ${meta.desc}`);
    }
    console.log('\n사용: node scripts/main_batch.mjs --target=a,b,c\n');
    process.exit(0);
}

// ──────────────────────────────────────────────
// target 결정
// ──────────────────────────────────────────────
if (!args.target) {
    console.error('❌  --target 옵션이 필요합니다. (예: --target=all 또는 --target=a,b,c)');
    console.error('    목록 확인: node scripts/main_batch.mjs --list');
    process.exit(1);
}

const targets =
    args.target === 'all'
        ? Object.keys(BATCH_REGISTRY)
        : args.target.split(',').map(s => s.trim());

const invalid = targets.filter(t => !BATCH_REGISTRY[t]);
if (invalid.length) {
    console.error(`❌  알 수 없는 배치 ID: ${invalid.join(', ')}`);
    console.error('    목록 확인: node scripts/main_batch.mjs --list');
    process.exit(1);
}

// ──────────────────────────────────────────────
// 실행
// ──────────────────────────────────────────────
console.log(`\n🚀 실행할 배치: [${targets.join(', ')}]\n`);
const startAll = Date.now();
let totalUpdated = 0;

// 병렬 실행 (Promise.all)
await Promise.all(
    targets.map(async (id) => {
        const { desc, file } = BATCH_REGISTRY[id];
        const absFile = path.resolve(__dirname, file);
        const start = Date.now();
        try {
            const mod = await import(absFile + `?t=${Date.now()}`); // cache-bust
            // 각 배치 모듈은 default export로 { updated, skipped } 반환하거나
            // 또는 자체 실행 후 결과를 전역에 기록
            const result = mod.default ? await mod.default() : { updated: 0, skipped: [] };
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.log(`  ✅ [${id}] ${desc}  →  ${result.updated ?? '?'}건 갱신  (${elapsed}s)`);
            totalUpdated += result.updated ?? 0;
        } catch (err) {
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.error(`  ❌ [${id}] ${desc}  →  오류 발생 (${elapsed}s)`, err.message);
        }
    })
);

const totalElapsed = ((Date.now() - startAll) / 1000).toFixed(1);
console.log(`\n✨ 완료: 총 ${totalUpdated}건 갱신  (${totalElapsed}s 소요)\n`);
