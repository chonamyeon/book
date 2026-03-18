#!/usr/bin/env node
const { execSync } = require('child_process');
const mp3 = 'public/audio/leverage.mp3';

const raw = execSync(
  `ffmpeg -i "${mp3}" -af "silencedetect=noise=-30dB:duration=0.05" -f null - 2>&1`,
  { encoding: 'utf8' }
);

const silences = [];
const re = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
let m;
while ((m = re.exec(raw)) !== null) {
  const end = parseFloat(m[1]), dur = parseFloat(m[2]);
  const start = end - dur;
  silences.push({ start, end, dur, mid: (start + end) / 2 });
}

const dialogueSilences = silences.filter(s => s.mid > 6.06).sort((a,b) => a.mid - b.mid);
console.log('인트로 이후 무음 수:', dialogueSilences.length);

// 히스토그램: 0.05s 단위 구간
const buckets = {};
for (const s of dialogueSilences) {
  const b = Math.floor(s.dur / 0.05) * 0.05;
  const k = b.toFixed(2);
  buckets[k] = (buckets[k] || 0) + 1;
}
console.log('\n무음 길이 분포 (0.05s 구간):');
Object.entries(buckets).sort((a,b) => parseFloat(a[0]) - parseFloat(b[0])).forEach(([k,v]) => {
  console.log(`  ${k}s ~ ${(parseFloat(k)+0.05).toFixed(2)}s : ${'█'.repeat(Math.min(v, 40))} (${v})`);
});

// 상위 85개 무음을 시간순 나열 → 연속된 간격 확인
const top85 = [...dialogueSilences].sort((a,b) => b.dur - a.dur).slice(0,85).sort((a,b) => a.mid - b.mid);
console.log('\n상위 85개 무음 (시간순) - 간격 분석:');
for (let i = 0; i < top85.length; i++) {
  const s = top85[i];
  const gap = i > 0 ? (s.mid - top85[i-1].mid).toFixed(1) : '-';
  console.log(`  [${i}] ${s.mid.toFixed(2)}s  dur=${s.dur.toFixed(3)}s  (이전과 간격: ${gap}s)`);
}
