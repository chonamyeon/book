#!/usr/bin/env node
/**
 * 품질 낮은 timestamp 파일을 char-ratio 방식으로 재생성
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TS_DIR = path.join(ROOT, 'public/timestamps');
const BS_PATH = path.join(ROOT, 'src/data/bookScripts.js');
const AUDIO_DIR = path.join(ROOT, 'public/audio');

const targets = process.argv.slice(2);
const bsRaw = fs.readFileSync(BS_PATH, 'utf8');

function loadScript(bookId) {
    const escaped = bookId.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const re = new RegExp(`"${escaped}"\\s*:\\s*(\\[[\\s\\S]*?\\])(?=\\s*[,}])`);
    const m = bsRaw.match(re);
    if (!m) return null;
    try {
        const arr = JSON.parse(m[1]);
        return arr.map(s => ({
            speaker: (s.role === 'B' || s.speaker === 'B' || s.speaker === '스텔라') ? '스텔라' : '제임스',
            text: s.text
        }));
    } catch { return null; }
}

function getDuration(filePath) {
    return parseFloat(execSync(
        `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
        { encoding: 'utf8' }
    ).trim());
}

for (const bookId of targets) {
    const mp3 = path.join(AUDIO_DIR, `${bookId}.mp3`);
    const script = loadScript(bookId);
    if (!script) { console.log(`✗ ${bookId}: no script`); continue; }
    const dur = getDuration(mp3);

    const totalChars = script.reduce((s, t) => s + t.text.length, 0);
    let acc = 0;
    const segments = script.map((turn, i) => {
        const start = (acc / totalChars) * dur;
        acc += turn.text.length;
        const end = (acc / totalChars) * dur;
        return { index: i, speaker: turn.speaker, start: +start.toFixed(3), end: +end.toFixed(3), text: turn.text };
    });

    const outPath = path.join(TS_DIR, `${bookId}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ method: 'char-ratio', bookId, segments }, null, 2));
    console.log(`✓ ${bookId}: ${segments.length} segments, avg ${(dur/segments.length).toFixed(1)}s`);
}
