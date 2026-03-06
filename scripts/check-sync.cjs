const fs = require('fs');
const bookId = process.argv[2] || '은하수를-여행하는-히치하이커를-위한-안내서';
const d = JSON.parse(fs.readFileSync(`public/timestamps/${bookId}.json`, 'utf8'));

console.log('방법:', d.method, '| 총', d.segments.length, '세그먼트\n');

d.segments.forEach(s => {
    if (s.start === null) return;
    const dur = (s.end - s.start).toFixed(1);
    const chars = s.text ? s.text.length : 0;
    const ratio = chars > 0 ? (chars / dur).toFixed(1) : 'N/A';
    const preview = s.text ? s.text.substring(0, 20) : '(없음)';
    console.log(`[${String(s.index).padStart(2)}] ${String(dur).padStart(5)}s | ${String(chars).padStart(3)}자 | ${String(ratio).padStart(5)}자/s | ${preview}`);
});
