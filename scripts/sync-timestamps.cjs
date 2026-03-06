#!/usr/bin/env node
/**
 * sync-timestamps.cjs
 *
 * 1. Firestore 'scripts' 컬렉션에서 각 책의 대본 가져오기
 * 2. public/audio/*.mp3가 있는 책만 처리
 * 3. 대본 세그먼트 수에 맞게 silencedetect 재실행 → timestamps JSON 갱신
 *
 * 사용: node scripts/sync-timestamps.cjs [bookId]
 *   bookId 없으면 전체 처리
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_AUDIO = path.join(ROOT, 'public/audio');
const TEMP_AUDIO = path.join(ROOT, 'temp_audio');
const OUTPUT_DIR = path.join(ROOT, 'public/timestamps');

const PROJECT_ID = 'book-site-123';
const API_KEY = 'AIzaSyDRenQjyt9gknve6tUItfUnaGjfoEZx-8s';

const targetBook = process.argv[2] || null;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Firestore REST API로 단일 문서 가져오기
async function fetchFirestoreDoc(collection, docId) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}?key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data;
}

// Firestore REST API로 컬렉션 전체 가져오기
async function fetchFirestoreCollection(collection) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?key=${API_KEY}&pageSize=100`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
}

// Firestore 필드 값 파싱
function parseField(field) {
    if (!field) return null;
    if (field.stringValue !== undefined) return field.stringValue;
    if (field.integerValue !== undefined) return parseInt(field.integerValue);
    if (field.booleanValue !== undefined) return field.booleanValue;
    if (field.arrayValue !== undefined) {
        return (field.arrayValue.values || []).map(parseField);
    }
    if (field.mapValue !== undefined) {
        const obj = {};
        for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
            obj[k] = parseField(v);
        }
        return obj;
    }
    return null;
}

function parseDocument(doc) {
    const obj = {};
    for (const [k, v] of Object.entries(doc.fields || {})) {
        obj[k] = parseField(v);
    }
    return obj;
}

// FFmpeg silencedetect로 세그먼트 경계 추출
function getAudioDuration(filePath) {
    try {
        return parseFloat(
            execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`, { encoding: 'utf8' }).trim()
        );
    } catch { return null; }
}

function detectBoundaries(mp3Path, numSegments, script) {
    const raw = execSync(
        `ffmpeg -i "${mp3Path}" -af "silencedetect=noise=-35dB:duration=0.3" -f null - 2>&1`,
        { encoding: 'utf8' }
    );

    const silences = [];
    const re = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
    let m;
    while ((m = re.exec(raw)) !== null) {
        const end = parseFloat(m[1]), dur = parseFloat(m[2]);
        silences.push({ mid: (end - dur / 2), duration: dur });
    }

    const totalDuration = getAudioDuration(mp3Path);

    if (silences.length === 0) {
        // 무음 없음 → 균등 분할
        const timings = [];
        for (let i = 0; i < numSegments; i++) {
            timings.push({
                start: parseFloat((i * totalDuration / numSegments).toFixed(3)),
                end: parseFloat(((i + 1) * totalDuration / numSegments).toFixed(3))
            });
        }
        return timings;
    }

    // 글자 수 비례로 각 경계의 예상 위치 계산
    const chars = script
        ? script.map(s => s.text ? s.text.length : 50)
        : Array(numSegments).fill(50);
    const totalChars = chars.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    const expectedBoundaries = [];
    for (let i = 0; i < numSegments - 1; i++) {
        cumulative += chars[i];
        expectedBoundaries.push((cumulative / totalChars) * totalDuration);
    }

    // 각 예상 경계에서 ±35% 반경 내 가장 가까운 무음을 선택 (greedy)
    const avgTurnDur = totalDuration / numSegments;
    const radius = avgTurnDur * 0.35;
    const used = new Set();

    const boundaries = expectedBoundaries.map(expected => {
        let bestDist = Infinity, bestMid = expected;
        silences.forEach((s, idx) => {
            if (used.has(idx)) return;
            const dist = Math.abs(s.mid - expected);
            if (dist <= radius && dist < bestDist) {
                bestDist = dist;
                bestMid = s.mid;
                // 임시 선택 (아래에서 확정)
            }
        });
        // 가장 가까운 인덱스 확정
        let bestIdx = -1;
        silences.forEach((s, idx) => {
            if (used.has(idx)) return;
            const dist = Math.abs(s.mid - expected);
            if (dist <= radius && Math.abs(s.mid - bestMid) < 0.001) bestIdx = idx;
        });
        if (bestIdx >= 0) used.add(bestIdx);
        return parseFloat(bestMid.toFixed(3));
    });

    // 경계가 단조증가하도록 보정
    for (let i = 1; i < boundaries.length; i++) {
        if (boundaries[i] <= boundaries[i - 1]) {
            boundaries[i] = parseFloat((boundaries[i - 1] + 0.1).toFixed(3));
        }
    }

    const timings = [];
    let prev = 0;
    for (const b of boundaries) {
        timings.push({ start: parseFloat(prev.toFixed(3)), end: b });
        prev = b;
    }
    timings.push({ start: parseFloat(prev.toFixed(3)), end: parseFloat(totalDuration.toFixed(3)) });

    return timings;
}

// 개별 WAV 누적 타임스탬프
function generateFromWavs(normalizedDir) {
    const wavFiles = fs.readdirSync(normalizedDir)
        .filter(f => f.match(/^norm_\d+\.wav$|^norm_chunk_\d+\.wav$/))
        .sort((a, b) => {
            const n = x => parseInt(x.match(/\d+/)[0]);
            return n(a) - n(b);
        });

    let cursor = 0;
    return wavFiles.map(wav => {
        const dur = getAudioDuration(path.join(normalizedDir, wav));
        if (!dur) return null;
        const timing = { start: parseFloat(cursor.toFixed(3)), end: parseFloat((cursor + dur).toFixed(3)) };
        cursor += dur;
        return timing;
    }).filter(Boolean);
}

async function processBook(bookId, script) {
    // ${bookId}.mp3 또는 ${bookId}_voice.mp3 중 존재하는 것 사용
    const mp3Path = fs.existsSync(path.join(PUBLIC_AUDIO, `${bookId}.mp3`))
        ? path.join(PUBLIC_AUDIO, `${bookId}.mp3`)
        : path.join(PUBLIC_AUDIO, `${bookId}_voice.mp3`);
    if (!fs.existsSync(mp3Path)) {
        console.log(`  ⚠ MP3 없음, 건너뜀`);
        return;
    }

    const numSegments = script.length;
    let timings, method;

    // WAV 파일 우선
    const normalizedDir = path.join(TEMP_AUDIO, bookId, 'normalized');
    const multispeakerDir = path.join(TEMP_AUDIO, `${bookId}_multispeaker`, 'normalized');
    const hasWavs = (d) => fs.existsSync(d) && fs.readdirSync(d).some(f => f.endsWith('.wav'));

    if (hasWavs(normalizedDir)) {
        timings = generateFromWavs(normalizedDir);
        method = 'wav-durations';
    } else if (hasWavs(multispeakerDir)) {
        timings = generateFromWavs(multispeakerDir);
        method = 'wav-durations(multispeaker)';
    } else {
        console.log(`  → silencedetect (${numSegments}턴 기준)`);
        timings = detectBoundaries(mp3Path, numSegments, script);
        method = 'silencedetect';
    }

    // 타임스탬프와 스크립트 병합
    const segments = script.map((seg, i) => ({
        index: i,
        speaker: seg.speaker || (i % 2 === 0 ? '제임스' : '스텔라'),
        start: timings[i]?.start ?? null,
        end: timings[i]?.end ?? null,
        text: seg.text
    }));

    const outPath = path.join(OUTPUT_DIR, `${bookId}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ method, bookId, segments }, null, 2), 'utf8');

    const withAudio = segments.filter(s => s.start !== null).length;
    console.log(`  ✓ ${method} | ${withAudio}/${numSegments}턴 | ${timings[timings.length - 1]?.end}s`);
}

async function main() {
    console.log('Firestore scripts 컬렉션 가져오는 중...\n');

    // 로컬 bookScripts도 포함
    const { bookScripts } = await import('../src/data/bookScripts.js');

    // Firestore에서 전체 scripts 컬렉션 가져오기
    let firestoreDocs = [];
    try {
        const docs = await fetchFirestoreCollection('scripts');
        firestoreDocs = docs.map(d => {
            const id = d.name.split('/').pop();
            const data = parseDocument(d);
            return { id, lines: data.lines || [] };
        });
        console.log(`Firestore: ${firestoreDocs.length}개 대본 발견\n`);
    } catch (e) {
        console.warn('Firestore 접근 실패:', e.message);
    }

    // 전체 책 목록 구성 (로컬 + Firestore)
    const allBooks = new Map();

    // 로컬 bookScripts 추가
    for (const [id, lines] of Object.entries(bookScripts)) {
        allBooks.set(id, lines.map(l => ({
            speaker: l.role === 'B' ? '스텔라' : '제임스',
            text: l.text
        })));
    }

    // Firestore 스크립트 추가 (로컬 없는 경우만)
    for (const { id, lines } of firestoreDocs) {
        if (!allBooks.has(id) && lines.length > 0) {
            allBooks.set(id, lines.map(l => ({
                speaker: l.speaker || (l.role === 'B' ? '스텔라' : '제임스'),
                text: l.text
            })));
        }
    }

    // 처리할 책 필터링
    const toProcess = targetBook
        ? [[targetBook, allBooks.get(targetBook)]]
        : [...allBooks.entries()];

    for (const [bookId, script] of toProcess) {
        if (!script) {
            console.log(`[${bookId}] 대본 없음, 건너뜀`);
            continue;
        }
        const mp3Path = path.join(PUBLIC_AUDIO, `${bookId}.mp3`);
        if (!fs.existsSync(mp3Path)) continue;

        console.log(`[${bookId}] ${script.length}턴`);
        await processBook(bookId, script);
    }

    console.log('\n완료!');
}

main().catch(e => { console.error(e); process.exit(1); });
