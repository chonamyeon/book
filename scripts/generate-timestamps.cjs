#!/usr/bin/env node
/**
 * generate-timestamps.js
 *
 * 방법 A (개별 WAV 있을 때): 각 WAV 길이 → 누적 타임스탬프 (정확)
 * 방법 B (최종 MP3만 있을 때): silencedetect → 화자 경계 추출 (fallback)
 *
 * 사용법:
 *   node scripts/generate-timestamps.js intelligent-investor
 *   node scripts/generate-timestamps.js sapiens --force-silence
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMP_AUDIO = path.join(ROOT, 'temp_audio');
const FINAL_PODCAST = path.join(ROOT, 'final_podcast');
const PUBLIC_AUDIO = path.join(ROOT, 'public/audio');
const OUTPUT_DIR = path.join(ROOT, 'public/timestamps');

const bookId = process.argv[2];
const forceSilence = process.argv.includes('--force-silence');

if (!bookId) {
  console.error('Usage: node generate-timestamps.js <book-id> [--force-silence]');
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 스크립트 로드: final_podcast JSON → bookScripts.js 순서로 시도
let script = null;
const scriptPath = path.join(FINAL_PODCAST, `${bookId}_script.json`);
if (fs.existsSync(scriptPath)) {
  script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
} else {
  // bookScripts.js에서 추출 (role A/B → speaker 변환)
  const bsPath = path.join(ROOT, 'src/data/bookScripts.js');
  if (fs.existsSync(bsPath)) {
    const raw = fs.readFileSync(bsPath, 'utf8');
    // export const bookScripts = { ... } 에서 해당 bookId 배열 추출
    const m = raw.match(new RegExp(`"${bookId}"\\s*:\\s*(\\[[\\s\\S]*?\\])(?=\\s*,\\s*"[a-z]|\\s*\\})`));
    if (m) {
      const arr = JSON.parse(m[1]);
      script = arr.map(s => ({
        speaker: s.role === 'B' ? '스텔라' : '제임스',
        text: s.text
      }));
    }
  }
}
if (!script) {
  console.warn(`No script found for "${bookId}" — will generate timing-only JSON (no text)`);
  script = null; // silencedetect 전용으로 진행
}
console.log(`Loaded ${script ? script.length : 0} script segments for "${bookId}"`);

// WAV 파일 길이 가져오기 (ffprobe)
function getAudioDuration(filePath) {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf8' }
    ).trim();
    return parseFloat(result);
  } catch {
    return null;
  }
}

// silencedetect로 화자 경계 추출
function detectSegmentBoundaries(mp3Path, numSegments) {
  console.log(`Running silencedetect on ${path.basename(mp3Path)}...`);

  // 1차: 0.6s 이상 무음 = 화자 교체 경계
  const raw = execSync(
    `ffmpeg -i "${mp3Path}" -af "silencedetect=noise=-35dB:duration=0.6" -f null - 2>&1`,
    { encoding: 'utf8' }
  );

  const silences = [];
  const endRegex = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
  let m;
  while ((m = endRegex.exec(raw)) !== null) {
    silences.push({
      end: parseFloat(m[1]),
      duration: parseFloat(m[2]),
      start: parseFloat(m[1]) - parseFloat(m[2])
    });
  }

  if (silences.length === 0) {
    console.warn('No silences detected, cannot create boundaries');
    return null;
  }

  const totalDuration = getAudioDuration(mp3Path);

  // 화자 교체 = 긴 무음 기준으로 N-1개 경계 선택
  const needed = numSegments - 1;
  const boundaries = silences
    .sort((a, b) => b.duration - a.duration)
    .slice(0, needed)
    .sort((a, b) => a.start - b.start)
    .map(s => (s.start + s.end) / 2); // 무음 중간점

  console.log(`Found ${silences.length} silences, selected ${boundaries.length} boundaries`);

  // 세그먼트 경계 구성
  const segments = [];
  let prev = 0;
  for (let i = 0; i < boundaries.length; i++) {
    segments.push({ start: parseFloat(prev.toFixed(3)), end: parseFloat(boundaries[i].toFixed(3)) });
    prev = boundaries[i];
  }
  segments.push({ start: parseFloat(prev.toFixed(3)), end: parseFloat(totalDuration.toFixed(3)) });

  return segments;
}

// 방법 A: 개별 WAV 누적 타임스탬프
function generateFromWavs(normalizedDir) {
  const wavFiles = fs.readdirSync(normalizedDir)
    .filter(f => f.match(/^norm_\d+\.wav$/))
    .sort((a, b) => {
      const n = x => parseInt(x.match(/\d+/)[0]);
      return n(a) - n(b);
    });

  console.log(`Method A: Found ${wavFiles.length} WAV files`);

  let cursor = 0;
  const timings = [];
  for (const wav of wavFiles) {
    const dur = getAudioDuration(path.join(normalizedDir, wav));
    if (!dur) { console.warn(`  Skipping ${wav} (unreadable)`); continue; }
    timings.push({ start: parseFloat(cursor.toFixed(3)), end: parseFloat((cursor + dur).toFixed(3)) });
    cursor += dur;
  }
  return timings;
}

// 메인 로직
async function main() {
  const normalizedDir = path.join(TEMP_AUDIO, bookId, 'normalized');
  const hasWavs = fs.existsSync(normalizedDir) && fs.readdirSync(normalizedDir).some(f => f.endsWith('.wav'));

  let timings;
  let method;

  if (hasWavs && !forceSilence) {
    // 방법 A
    timings = generateFromWavs(normalizedDir);
    method = 'wav-durations';
  } else {
    // 방법 B: silencedetect
    const mp3Path = path.join(PUBLIC_AUDIO, `${bookId}.mp3`);
    if (!fs.existsSync(mp3Path)) {
      console.error(`No WAVs and no MP3 found at ${mp3Path}`);
      process.exit(1);
    }
    const numSegs = script ? script.length : 20; // 스크립트 없으면 20개 세그먼트로 추정
    timings = detectSegmentBoundaries(mp3Path, numSegs);
    method = 'silencedetect';
    if (!timings) process.exit(1);
  }

  // 스크립트와 타이밍 병합 (스크립트 없으면 timing-only)
  const output = timings.map((t, i) => {
    const seg = script ? script[i] : null;
    return {
      index: i,
      speaker: seg?.speaker || (i % 2 === 0 ? '제임스' : '스텔라'),
      start: t.start,
      end: t.end,
      text: seg?.text || null
    };
  });

  // 오디오에 없는 나머지 세그먼트 (타이밍 없음)
  if (script && script.length > timings.length) {
    const remaining = script.slice(timings.length).map((seg, i) => ({
      index: timings.length + i,
      speaker: seg.speaker,
      start: null,
      end: null,
      text: seg.text
    }));
    output.push(...remaining);
    console.log(`Note: ${remaining.length} segments have no audio yet (start/end = null)`);
  }

  const outPath = path.join(OUTPUT_DIR, `${bookId}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ method, bookId, segments: output }, null, 2), 'utf8');

  console.log(`\nGenerated: ${outPath}`);
  console.log(`  Method: ${method}`);
  console.log(`  Segments with audio: ${timings.length}/${script ? script.length : timings.length}`);
  if (timings.length > 0) {
    console.log(`  Total audio duration: ${timings[timings.length - 1].end}s`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
