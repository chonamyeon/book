#!/usr/bin/env node
/**
 * fix-timestamps-dp.cjs
 *
 * 동적 프로그래밍으로 무음 목록에서 최적 경계를 선택하여 타임스탬프 재생성.
 * silencedetect 0.3s 임계값 사용 → DP로 N-1개 경계 최적 선택.
 *
 * 사용: node scripts/fix-timestamps-dp.cjs <bookId>
 *   예: node scripts/fix-timestamps-dp.cjs 은하수를-여행하는-히치하이커를-위한-안내서
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_AUDIO = path.join(ROOT, 'public/audio');
const OUTPUT_DIR = path.join(ROOT, 'public/timestamps');

const bookId = process.argv[2];
if (!bookId) {
    console.error('사용법: node scripts/fix-timestamps-dp.cjs <bookId>');
    process.exit(1);
}

// ── 1. MP3 파일 확인 ──────────────────────────────────────────────
const mp3Path = path.join(PUBLIC_AUDIO, `${bookId}.mp3`);
if (!fs.existsSync(mp3Path)) {
    console.error(`MP3 없음: ${mp3Path}`);
    process.exit(1);
}

// ── 2. 기존 timestamps JSON에서 스크립트 텍스트 로드 ─────────────
const tsPath = path.join(OUTPUT_DIR, `${bookId}.json`);
if (!fs.existsSync(tsPath)) {
    console.error(`timestamps JSON 없음: ${tsPath}`);
    process.exit(1);
}
const existing = JSON.parse(fs.readFileSync(tsPath, 'utf8'));
const script = existing.segments; // [{index, speaker, text, ...}]
const N = script.length;
console.log(`대본 세그먼트: ${N}개`);

// ── 3. ffprobe로 총 길이 ─────────────────────────────────────────
const totalDuration = parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp3Path}"`, { encoding: 'utf8' }).trim()
);
console.log(`총 길이: ${totalDuration.toFixed(2)}s`);

// ── 4. silencedetect (0.3s 임계값) ───────────────────────────────
console.log('silencedetect 실행 중 (noise=-35dB, duration=0.3s)...');
const raw = execSync(
    `ffmpeg -i "${mp3Path}" -af "silencedetect=noise=-35dB:duration=0.3" -f null - 2>&1`,
    { encoding: 'utf8' }
);

const silences = [];
const re = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
let m;
while ((m = re.exec(raw)) !== null) {
    const end = parseFloat(m[1]);
    const dur = parseFloat(m[2]);
    silences.push({ mid: end - dur / 2, duration: dur, end });
}
console.log(`감지된 무음: ${silences.length}개`);

// ── 5. 글자 수 비례로 예상 경계 계산 ──────────────────────────────
const chars = script.map(s => s.text ? s.text.length : 50);
const totalChars = chars.reduce((a, b) => a + b, 0);
let cum = 0;
// expectedBoundaries[i] = i번째와 i+1번째 세그먼트 사이의 예상 경계 시간
const expectedBoundaries = [];
for (let i = 0; i < N - 1; i++) {
    cum += chars[i];
    expectedBoundaries.push((cum / totalChars) * totalDuration);
}

console.log('예상 경계 시간:');
expectedBoundaries.forEach((t, i) => {
    console.log(`  경계 ${i}: ${t.toFixed(2)}s`);
});

// ── 6. DP로 최적 경계 선택 ────────────────────────────────────────
// 목표: silences 배열에서 N-1개를 선택하여 expectedBoundaries와의 가중 거리 합 최소화
// 가중치: 길이가 긴 무음일수록 비용 감소 (긴 무음 = 화자 교체 가능성 높음)

const M = silences.length;
const B = N - 1; // 필요한 경계 수

if (M < B) {
    console.error(`무음(${M}개)이 경계(${B}개)보다 적습니다. 글자 수 비례 폴백 사용.`);
    useFallback();
    process.exit(0);
}

// 비용 함수: 경계 i에 무음 j를 사용할 때의 비용
// - 거리 패널티: (무음 중간점 - 예상 경계)^2 / (평균 세그먼트 길이)^2
// - 길이 보너스: 긴 무음일수록 비용 감소
const avgSegDur = totalDuration / N;

function cost(boundaryIdx, silenceIdx) {
    const expected = expectedBoundaries[boundaryIdx];
    const sil = silences[silenceIdx];
    const dist = Math.abs(sil.mid - expected);
    const normalized = dist / avgSegDur;
    // 거리 패널티 (거리가 2배 평균 구간을 넘으면 매우 높은 비용)
    const distCost = normalized * normalized;
    // 길이 보너스: duration이 길수록 최대 0.3 감소
    const maxDur = Math.max(...silences.map(s => s.duration));
    const lenBonus = (sil.duration / maxDur) * 0.3;
    return distCost - lenBonus;
}

// dp[i][j] = 첫 i개 경계를 silences[0..j]에서 선택했을 때의 최소 비용
// (i=1..B, j=0..M-1)
// 공간 최적화: 이전 행만 유지

console.log(`DP 실행 중 (${B}개 경계 × ${M}개 무음)...`);

// dp[j] = 현재까지 i개 경계를 할당했을 때, 마지막 선택이 무음 j인 최소 비용
let dp = new Float64Array(M).fill(Infinity);
let parent = Array.from({ length: B }, () => new Int32Array(M).fill(-1));

// 1번째 경계 초기화
for (let j = 0; j < M; j++) {
    dp[j] = cost(0, j);
}

// 2번째~ 경계 전이
for (let i = 1; i < B; i++) {
    const newDp = new Float64Array(M).fill(Infinity);
    // 누적 최소값 추적 (j' < j 조건을 O(M) 순회로 처리)
    let bestPrev = Infinity;
    let bestPrevIdx = -1;

    for (let j = i; j < M - (B - 1 - i); j++) {
        // j' < j 중 dp[j'] 최소값 갱신
        if (j > 0) {
            const prevVal = dp[j - 1];
            if (prevVal < bestPrev) {
                bestPrev = prevVal;
                bestPrevIdx = j - 1;
            }
        }
        if (bestPrevIdx >= 0 && bestPrev < Infinity) {
            const c = bestPrev + cost(i, j);
            if (c < newDp[j]) {
                newDp[j] = c;
                parent[i][j] = bestPrevIdx;
            }
        }
    }
    dp = newDp;
}

// 마지막 경계에서 최솟값 찾기
let minCost = Infinity, lastSilIdx = -1;
for (let j = B - 1; j < M; j++) {
    if (dp[j] < minCost) {
        minCost = dp[j];
        lastSilIdx = j;
    }
}

if (lastSilIdx < 0) {
    console.error('DP 해 없음. 폴백 사용.');
    useFallback();
    process.exit(0);
}

// 역추적
const chosen = new Array(B);
chosen[B - 1] = lastSilIdx;
for (let i = B - 2; i >= 0; i--) {
    chosen[i] = parent[i + 1][chosen[i + 1]];
}

console.log('\n선택된 경계:');
chosen.forEach((silIdx, bi) => {
    const sil = silences[silIdx];
    const exp = expectedBoundaries[bi];
    const diff = (sil.mid - exp).toFixed(2);
    console.log(`  경계 ${bi}: ${sil.mid.toFixed(3)}s (예상 ${exp.toFixed(2)}s, 오차 ${diff}s, 무음길이 ${sil.duration.toFixed(3)}s)`);
});

// ── 7. 오차 큰 경계 보간 후처리 ──────────────────────────────────
// 오차 > MAX_DEVIATION 인 경계는 앞뒤 신뢰 앵커 사이에서 글자 수 비례로 보간
const MAX_DEVIATION = 3.0; // 초 단위

const rawBoundaries = chosen.map(idx => silences[idx].mid);
const boundaries = [...rawBoundaries];

function isReliable(bi) {
    return Math.abs(rawBoundaries[bi] - expectedBoundaries[bi]) <= MAX_DEVIATION;
}

// 신뢰 구간이 아닌 경계를 앞뒤 앵커 사이에서 보간
// 경계 bi는 세그먼트 bi와 bi+1 사이의 경계 (즉, boundary bi 이후 = 세그먼트 bi+1 시작)
let bi = 0;
while (bi < B) {
    if (isReliable(bi)) { bi++; continue; }

    // 왼쪽 앵커: bi 직전의 신뢰 경계 (-1이면 시작 0s)
    const biLeft = bi - 1;
    const tLeft = biLeft < 0 ? 0 : rawBoundaries[biLeft];

    // 오른쪽 앵커: bi 이후 첫 신뢰 경계 (B이면 끝 totalDuration)
    let biRight = B; // B = 없음 → totalDuration
    for (let r = bi + 1; r < B; r++) {
        if (isReliable(r)) { biRight = r; break; }
    }
    const tRight = biRight >= B ? totalDuration : rawBoundaries[biRight];

    // 앵커 사이의 세그먼트: segStart = biLeft+1, segEnd = biRight (인덱스)
    // 경계 bi (bi_left < bi < bi_right)에 대해:
    //   시간 = tLeft + (cum_chars / total_chars) * (tRight - tLeft)
    // cum_chars = chars[biLeft+1] + ... + chars[bi]  (bi까지 포함)
    // total_chars = chars[biLeft+1] + ... + chars[biRight]  (biRight까지 포함)
    const segStart = biLeft + 1; // 첫 번째 포함 세그먼트
    const segEnd = biRight;      // 마지막 포함 세그먼트 (경계 biRight 이전)

    // totalCharsSpan = segStart ~ segEnd 세그먼트 글자 수 합
    const totalCharsSpan = chars.slice(segStart, segEnd + 1).reduce((a, b) => a + b, 0);
    const rangeDur = tRight - tLeft;

    let cumC = 0;
    for (let bi2 = bi; bi2 < biRight; bi2++) {
        // bi2는 경계 인덱스, bi2 경계 = 세그먼트 bi2와 bi2+1 사이
        // 세그먼트 segStart ~ bi2 (포함)의 글자 수 누적
        cumC += chars[bi2]; // bi2 세그먼트 글자 수 (segStart부터 시작했으므로 맞음)
        const t = tLeft + (cumC / totalCharsSpan) * rangeDur;
        console.log(`  ⚠ 경계 ${bi2} 보간: ${t.toFixed(3)}s (원래 ${rawBoundaries[bi2].toFixed(3)}s, 오차 ${(rawBoundaries[bi2]-expectedBoundaries[bi2]).toFixed(2)}s → 개선 ${(t-expectedBoundaries[bi2]).toFixed(2)}s)`);
        boundaries[bi2] = parseFloat(t.toFixed(3));
    }

    bi = biRight + 1;
}

// 단조증가 보정
for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i] <= boundaries[i - 1]) {
        boundaries[i] = boundaries[i - 1] + 0.05;
    }
}

console.log('\n최종 경계 (보간 적용 후):');
boundaries.forEach((t, bi) => {
    const dev = (t - expectedBoundaries[bi]).toFixed(2);
    console.log(`  경계 ${bi}: ${t.toFixed(3)}s (오차 ${dev}s)`);
});

const segments = [];
let prev = 0;
for (let i = 0; i < N; i++) {
    const end = i < boundaries.length ? boundaries[i] : totalDuration;
    segments.push({
        index: i,
        speaker: script[i].speaker,
        start: parseFloat(prev.toFixed(3)),
        end: parseFloat(end.toFixed(3)),
        text: script[i].text
    });
    prev = end;
}

// ── 8. JSON 저장 ─────────────────────────────────────────────────
const output = { method: 'silencedetect-dp', bookId, segments };
fs.writeFileSync(tsPath, JSON.stringify(output, null, 2), 'utf8');

console.log(`\n✓ 저장 완료: ${tsPath}`);
console.log(`  방법: silencedetect-dp`);
console.log(`  세그먼트: ${N}개`);
console.log(`  총 길이: ${totalDuration.toFixed(2)}s`);

// ── 폴백: 글자 수 비례 균등 분배 ─────────────────────────────────
function useFallback() {
    let cumF = 0;
    const segF = script.map((s, i) => {
        const start = cumF;
        const ratio = (s.text ? s.text.length : 50) / totalChars;
        cumF += ratio * totalDuration;
        return {
            index: i,
            speaker: s.speaker,
            start: parseFloat(start.toFixed(3)),
            end: parseFloat(Math.min(cumF, totalDuration).toFixed(3)),
            text: s.text
        };
    });
    const out = { method: 'char-proportional', bookId, segments: segF };
    fs.writeFileSync(tsPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('폴백 JSON 저장 완료.');
}
