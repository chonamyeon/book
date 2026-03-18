#!/usr/bin/env node
/**
 * fix-timestamps-leverage.cjs
 * 상위 N개 무음(길이순) + 최소 3초 간격 조건으로 70개 경계 선택
 * → 전체 오디오에 고르게 분산된 가장 긴 무음들을 경계로 사용
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const mp3 = path.join(ROOT, 'public/audio/leverage.mp3');
const INTRO_END = 6.06;

// .env 로드
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) process.env[k.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const PROJECT_ID = 'book-site-123';

async function fetchScript() {
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/scripts/leverage?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.fields?.lines?.arrayValue?.values || []).map(v => {
    const f = v.mapValue?.fields || {};
    return {
      speaker: f.speaker?.stringValue || (f.role?.stringValue === 'B' ? '스텔라' : '제임스'),
      text: f.text?.stringValue || ''
    };
  });
}

async function main() {
  console.log('스크립트 로드 중...');
  const script = await fetchScript();
  console.log(`  ${script.length}턴`);

  const totalDur = parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp3}"`, { encoding: 'utf8' }).trim()
  );
  console.log(`  오디오 길이: ${totalDur.toFixed(1)}s`);

  // silencedetect: 0.30s 이상 무음 (인트로 이후)
  console.log('\nsilencedetect 실행 중...');
  const raw = execSync(
    `ffmpeg -i "${mp3}" -af "silencedetect=noise=-30dB:duration=0.30" -f null - 2>&1`,
    { encoding: 'utf8' }
  );

  const allSilences = [];
  const re = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const end = parseFloat(m[1]), dur = parseFloat(m[2]);
    const start = end - dur;
    allSilences.push({ start, end, dur, mid: (start + end) / 2 });
  }

  const silences = allSilences
    .filter(s => s.start > INTRO_END)
    .sort((a, b) => b.dur - a.dur); // 길이 내림차순
  console.log(`  인트로 이후 무음: ${silences.length}개 (길이순 정렬)`);

  // 상위 N개 무음을 3초 최소 간격 조건으로 그리디 선택 → 70개
  const MIN_GAP = 3.0;
  const selected = [];

  for (const s of silences) {
    if (selected.length >= script.length - 1) break;
    // 이미 선택된 무음과 3초 이상 떨어져 있어야 함
    const tooClose = selected.some(sel => Math.abs(sel.mid - s.mid) < MIN_GAP);
    if (!tooClose) {
      selected.push(s);
    }
  }

  // 시간순 정렬
  selected.sort((a, b) => a.mid - b.mid);
  console.log(`\n경계 ${selected.length}개 선택`);
  console.log(`  첫 경계: ${selected[0]?.mid.toFixed(2)}s`);
  console.log(`  마지막 경계: ${selected[selected.length - 1]?.mid.toFixed(2)}s`);

  if (selected.length < script.length - 1) {
    console.log(`  ⚠ 경계가 ${script.length - 1}개보다 적음 (${selected.length}개). MIN_GAP을 줄여야 함.`);
  }

  // 세그먼트 생성
  const segments = [];
  for (let i = 0; i < script.length; i++) {
    const start = i === 0 ? INTRO_END : selected[i - 1]?.mid ?? INTRO_END;
    const end = i < selected.length ? selected[i]?.mid ?? totalDur : totalDur;
    segments.push({
      index: i,
      speaker: script[i].speaker,
      start: parseFloat(start.toFixed(3)),
      end: parseFloat(end.toFixed(3)),
      text: script[i].text
    });
  }

  // 검증
  const durations = segments.map(s => s.end - s.start);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const short = segments.filter((_, i) => durations[i] < 2).length;
  const long = segments.filter((_, i) => durations[i] > 25).length;
  console.log(`\n검증: 평균 ${avg.toFixed(1)}s | 2s 미만: ${short}개 | 25s 초과: ${long}개`);

  // 저장
  const outPath = path.join(ROOT, 'public/timestamps/leverage.json');
  fs.writeFileSync(outPath, JSON.stringify({
    method: 'silencedetect-top70-mingap',
    bookId: 'leverage',
    segments
  }, null, 2), 'utf8');
  console.log(`\n✓ 로컬 저장: ${outPath}`);

  // Firestore 업데이트
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const patchUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/timestamps/leverage?key=${apiKey}`;
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        method: { stringValue: 'silencedetect-top70-mingap' },
        bookId: { stringValue: 'leverage' },
        segments: {
          arrayValue: {
            values: segments.map(s => ({
              mapValue: {
                fields: {
                  index: { integerValue: String(s.index) },
                  speaker: { stringValue: s.speaker },
                  start: { doubleValue: s.start },
                  end: { doubleValue: s.end },
                  text: { stringValue: s.text }
                }
              }
            }))
          }
        }
      }
    })
  });
  console.log(patchRes.ok ? '✓ Firestore 업데이트 완료' : `✗ Firestore 오류: ${patchRes.status}`);
}

main().catch(e => { console.error(e); process.exit(1); });
