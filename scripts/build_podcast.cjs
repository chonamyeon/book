#!/usr/bin/env node
/**
 * build_podcast.cjs
 *
 * WAV 파일 1개 → 인트로/아웃트로 합성 → MP3 + 타임스탬프 JSON 자동 생성
 *
 * 사용법:
 *   node scripts/build_podcast.cjs <book-id>
 *
 * WAV 파일 위치:
 *   temp_audio/<book-id>/input/ 폴더에 WAV 파일 1개 넣기
 *
 * 출력:
 *   public/audio/<book-id>.mp3
 *   public/timestamps/<book-id>.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const bookId  = process.argv[2];

if (!bookId) {
    console.error('사용법: node scripts/build_podcast.cjs <book-id>');
    console.error('예시:   node scripts/build_podcast.cjs intelligent-investor');
    process.exit(1);
}

const INPUT_DIR  = path.join(ROOT, 'temp_audio', bookId, 'input');
const WORK_DIR   = path.join(ROOT, 'temp_audio', bookId, 'work');
const AUDIO_OUT  = path.join(ROOT, 'public', 'audio', `${bookId}.mp3`);
const TS_OUT     = path.join(ROOT, 'public', 'timestamps', `${bookId}.json`);
const INTRO_FILE = path.join(ROOT, 'public', 'music', 'intro_jingle.mp3');
const OUTRO_FILE = INTRO_FILE; // 인트로 = 아웃트로 동일 파일

[WORK_DIR, path.join(ROOT, 'public', 'audio'), path.join(ROOT, 'public', 'timestamps')]
    .forEach(d => fs.mkdirSync(d, { recursive: true }));

function run(cmd) {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function getDuration(filePath) {
    return parseFloat(
        run(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`).trim()
    );
}

// ── 1. WAV 파일 1개 찾기 ──────────────────────────────────────────────────
if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ 입력 폴더 없음: ${INPUT_DIR}`);
    console.error(`   temp_audio/${bookId}/input/ 폴더에 WAV 파일 1개를 넣어주세요.`);
    process.exit(1);
}

const wavFiles = fs.readdirSync(INPUT_DIR).filter(f => /\.(wav|WAV)$/.test(f));
if (wavFiles.length === 0) {
    console.error(`❌ WAV 파일이 없습니다: ${INPUT_DIR}`);
    process.exit(1);
}
if (wavFiles.length > 1) {
    console.warn(`⚠  WAV 파일이 ${wavFiles.length}개입니다. 첫 번째 파일만 사용합니다: ${wavFiles[0]}`);
}

const srcWav = path.join(INPUT_DIR, wavFiles[0]);
console.log(`\n📂 [${bookId}] 입력: ${wavFiles[0]}`);

// ── 2. 대본 턴 수 가져오기 (silencedetect 기준점) ────────────────────────
let numTurns = null;
try {
    const bsPath = path.join(ROOT, 'src', 'data', 'bookScripts.js');
    if (fs.existsSync(bsPath)) {
        const raw = fs.readFileSync(bsPath, 'utf8');
        const m = raw.match(new RegExp(`"${bookId}"\\s*:\\s*(\\[[\\s\\S]*?\\])(?=\\s*,\\s*"|\\s*\\})`));
        if (m) numTurns = JSON.parse(m[1]).length;
    }
} catch {}
console.log(numTurns ? `   대본 턴 수: ${numTurns}` : '   대본 없음 → silence 기반 자동 감지');

// ── 3. WAV 볼륨 정규화 ───────────────────────────────────────────────────
console.log('\n🔧 볼륨 정규화 중...');
const normWav = path.join(WORK_DIR, 'normalized.wav');
run(
    `ffmpeg -y -i "${srcWav}" ` +
    `-af "loudnorm=I=-16:TP=-1.5:LRA=11" ` +
    `-ar 44100 -ac 1 "${normWav}"`
);
console.log('   완료');

// ── 4. Silencedetect로 턴 경계 찾기 ─────────────────────────────────────
console.log('\n🔍 턴 경계 감지 중...');
const totalDur = getDuration(normWav);

const silenceRaw = run(
    `ffmpeg -i "${normWav}" -af "silencedetect=noise=-38dB:duration=0.4" -f null - 2>&1`
);

const silences = [];
const re = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
let m;
while ((m = re.exec(silenceRaw)) !== null) {
    const end = parseFloat(m[1]), dur = parseFloat(m[2]);
    silences.push({ mid: parseFloat((end - dur / 2).toFixed(3)), duration: dur });
}
console.log(`   무음 구간 ${silences.length}개 감지`);

// ── 5. 경계 선택 → 세그먼트 분할 ────────────────────────────────────────
let boundaries = [];

if (numTurns && numTurns > 1 && silences.length > 0) {
    // 대본 턴 수 기준: 글자 수 비율로 예상 위치 계산 후 가장 가까운 무음 선택
    // (대본 없으면 감지된 무음 전부 사용)
    const needed = numTurns - 1;
    const step   = totalDur / numTurns;
    const used   = new Set();

    boundaries = Array.from({ length: needed }, (_, i) => {
        const expected = step * (i + 1);
        const radius   = step * 0.4;
        let bestDist   = Infinity, bestMid = expected, bestIdx = -1;

        silences.forEach((s, idx) => {
            if (used.has(idx)) return;
            const dist = Math.abs(s.mid - expected);
            if (dist < radius && dist < bestDist) {
                bestDist = dist; bestMid = s.mid; bestIdx = idx;
            }
        });

        if (bestIdx >= 0) used.add(bestIdx);
        return bestMid;
    });

    // 단조증가 보정
    for (let i = 1; i < boundaries.length; i++) {
        if (boundaries[i] <= boundaries[i - 1])
            boundaries[i] = parseFloat((boundaries[i - 1] + 0.1).toFixed(3));
    }
} else {
    // 감지된 무음 전부 경계로 사용
    boundaries = silences.map(s => s.mid);
}

// 세그먼트 구성 (WAV 기준 시간 — 인트로 offset은 아래에서 추가)
const wavSegments = [];
let prev = 0;
for (const b of boundaries) {
    wavSegments.push({ start: parseFloat(prev.toFixed(3)), end: b });
    prev = b;
}
wavSegments.push({ start: parseFloat(prev.toFixed(3)), end: parseFloat(totalDur.toFixed(3)) });

// ── 6. 인트로 offset 적용 → 최종 타임스탬프 ─────────────────────────────
const introDur = fs.existsSync(INTRO_FILE) ? getDuration(INTRO_FILE) : 0;
const outroDur = introDur; // 같은 파일

console.log(`\n⏱  타임스탬프 (인트로 ${introDur}s 포함):`);
const segments = wavSegments.map((seg, i) => {
    const start = parseFloat((seg.start + introDur).toFixed(3));
    const end   = parseFloat((seg.end   + introDur).toFixed(3));
    console.log(`   턴 ${i + 1} [${i % 2 === 0 ? '제임스' : '스텔라'}]: ${start}s ~ ${end}s`);
    return {
        index:   i,
        speaker: i % 2 === 0 ? '제임스' : '스텔라',
        start,
        end,
        text: null
    };
});

// ── 7. MP3 합성 (인트로 + WAV + 아웃트로) ────────────────────────────────
console.log('\n🎙  MP3 합성 중...');
const listPath = path.join(WORK_DIR, 'concat_list.txt');
const listLines = [];
if (fs.existsSync(INTRO_FILE)) listLines.push(`file '${INTRO_FILE.replace(/\\/g, '/')}'`);
listLines.push(`file '${normWav.replace(/\\/g, '/')}'`);
if (fs.existsSync(OUTRO_FILE)) listLines.push(`file '${OUTRO_FILE.replace(/\\/g, '/')}'`);
fs.writeFileSync(listPath, listLines.join('\n'), 'utf8');

run(
    `ffmpeg -y -f concat -safe 0 -i "${listPath}" ` +
    `-c:a libmp3lame -q:a 2 -ar 44100 "${AUDIO_OUT}"`
);
console.log(`   ✅ ${AUDIO_OUT}`);

// ── 8. 타임스탬프 JSON 저장 ───────────────────────────────────────────────
fs.writeFileSync(TS_OUT, JSON.stringify({
    method: 'silencedetect',
    bookId,
    introDuration: introDur,
    outroDuration: outroDur,
    segments
}, null, 2), 'utf8');
console.log(`   ✅ ${TS_OUT}`);

const totalFinal = introDur + totalDur + outroDur;
console.log(`\n✨ 완료! [${bookId}] ${segments.length}턴 / 총 ${totalFinal.toFixed(1)}초\n`);
