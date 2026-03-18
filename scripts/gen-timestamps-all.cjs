#!/usr/bin/env node
/**
 * gen-timestamps-all.cjs
 * 타임스탬프 없는 모든 MP3에 대해 silencedetect 기반 타임스탬프 생성
 * 파라미터: -25dB:0.15 (더 세밀한 감지)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'public/audio');
const TS_DIR = path.join(ROOT, 'public/timestamps');
const BS_PATH = path.join(ROOT, 'src/data/bookScripts.js');

if (!fs.existsSync(TS_DIR)) fs.mkdirSync(TS_DIR, { recursive: true });

const targets = process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3')).map(f => f.replace('.mp3', ''))
        .filter(id => !fs.existsSync(path.join(TS_DIR, `${id}.json`)));

const bsRaw = fs.readFileSync(BS_PATH, 'utf8');

function loadScript(bookId) {
    // 정규식으로 해당 bookId 배열 추출
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
    try {
        return parseFloat(execSync(
            `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
            { encoding: 'utf8' }
        ).trim());
    } catch { return null; }
}

function detectBoundaries(mp3Path, needed) {
    // 1차 시도: -25dB:0.15
    let raw = execSync(
        `ffmpeg -i "${mp3Path}" -af "silencedetect=noise=-25dB:duration=0.15" -f null - 2>&1`,
        { encoding: 'utf8' }
    );
    let silences = parseSilences(raw);

    // 2차: 부족하면 -20dB:0.1
    if (silences.length < needed) {
        raw = execSync(
            `ffmpeg -i "${mp3Path}" -af "silencedetect=noise=-20dB:duration=0.1" -f null - 2>&1`,
            { encoding: 'utf8' }
        );
        silences = parseSilences(raw);
    }
    return silences;
}

function parseSilences(raw) {
    const silences = [];
    const re = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
    let m;
    while ((m = re.exec(raw)) !== null) {
        const end = parseFloat(m[1]), dur = parseFloat(m[2]);
        silences.push({ end, dur, start: end - dur });
    }
    return silences;
}

function charRatioFallback(script, totalDur) {
    const totalChars = script.reduce((s, t) => s + t.text.length, 0);
    let acc = 0;
    return script.map((turn, i) => {
        const start = (acc / totalChars) * totalDur;
        acc += turn.text.length;
        const end = (acc / totalChars) * totalDur;
        return { index: i, speaker: turn.speaker, start: +start.toFixed(3), end: +end.toFixed(3), text: turn.text };
    });
}

for (const bookId of targets) {
    const mp3 = path.join(AUDIO_DIR, `${bookId}.mp3`);
    if (!fs.existsSync(mp3)) { console.log(`⏭  ${bookId}: MP3 없음`); continue; }

    const script = loadScript(bookId);
    const dur = getDuration(mp3);
    console.log(`\n▶ ${bookId} | script=${script?.length ?? 0} turns | dur=${dur?.toFixed(1)}s`);

    let segments, method;

    if (!script || script.length === 0) {
        console.log(`  ✗ 스크립트 없음 — 건너뜀`);
        continue;
    }

    const needed = script.length - 1;
    const silences = detectBoundaries(mp3, needed);
    console.log(`  silences found: ${silences.length}, needed: ${needed}`);

    if (silences.length >= needed * 0.6) {
        // silencedetect 사용
        const bounds = silences
            .sort((a, b) => b.dur - a.dur)
            .slice(0, needed)
            .sort((a, b) => a.start - b.start)
            .map(s => (s.start + s.end) / 2);

        segments = [];
        let prev = 0;
        for (let i = 0; i < bounds.length; i++) {
            segments.push({
                index: i,
                speaker: script[i].speaker,
                start: +prev.toFixed(3),
                end: +bounds[i].toFixed(3),
                text: script[i].text
            });
            prev = bounds[i];
        }
        segments.push({
            index: bounds.length,
            speaker: script[bounds.length]?.speaker || '제임스',
            start: +prev.toFixed(3),
            end: +(dur || prev + 10).toFixed(3),
            text: script[bounds.length]?.text || ''
        });
        method = 'silencedetect-25dB';
    } else {
        // 글자수 비율 fallback
        segments = charRatioFallback(script, dur);
        method = 'char-ratio';
    }

    const outPath = path.join(TS_DIR, `${bookId}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ method, bookId, segments }, null, 2));
    console.log(`  ✓ ${segments.length} segments → ${path.basename(outPath)} [${method}]`);
}

console.log('\n완료!');
