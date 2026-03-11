#!/usr/bin/env node
/**
 * extract_timestamps.mjs
 *
 * Gemini가 오디오를 듣고 전사(transcription) → 대본과 텍스트 매칭 → 정확한 타임스탬프 추출
 *
 * 사용법:
 *   node scripts/extract_timestamps.mjs <book-id>
 *
 * WAV/MP3 위치: temp_audio/<book-id>/input/ 에 파일 1개
 * 출력:         public/timestamps/<book-id>.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

const bookId = process.argv[2];
if (!bookId) {
    console.error('사용법: node scripts/extract_timestamps.mjs <book-id>');
    console.error('예시:   node scripts/extract_timestamps.mjs intelligent-investor');
    process.exit(1);
}

const INPUT_DIR = path.join(ROOT, 'temp_audio', bookId, 'input');
const TS_OUT    = path.join(ROOT, 'public', 'timestamps', `${bookId}.json`);
const BS_PATH   = path.join(ROOT, 'src', 'data', 'bookScripts.js');

fs.mkdirSync(path.dirname(TS_OUT), { recursive: true });

// ── 1. 오디오 파일 찾기 ───────────────────────────────────────────────────
const audioFiles = fs.existsSync(INPUT_DIR)
    ? fs.readdirSync(INPUT_DIR).filter(f => /\.(wav|WAV|mp3|MP3)$/.test(f))
    : [];

if (audioFiles.length === 0) {
    console.error(`❌ 오디오 파일 없음: ${INPUT_DIR}`);
    process.exit(1);
}

const audioPath = path.join(INPUT_DIR, audioFiles[0]);
const mimeType  = audioFiles[0].toLowerCase().endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
const sizeMB    = (fs.statSync(audioPath).size / 1024 / 1024).toFixed(1);
console.log(`\n📂 [${bookId}] 입력: ${audioFiles[0]} (${sizeMB}MB)`);

// ── 2. 대본 불러오기 ──────────────────────────────────────────────────────
let script = [];
try {
    const raw = fs.readFileSync(BS_PATH, 'utf8');
    const m = raw.match(new RegExp(`"${bookId}"\\s*:\\s*(\\[[\\s\\S]*?\\])(?=\\s*,\\s*"|\\s*\\})`));
    if (m) script = JSON.parse(m[1]);
} catch {}

if (script.length === 0) {
    console.error('❌ bookScripts.js에 대본이 없습니다. 먼저 대본을 등록하세요.');
    process.exit(1);
}
console.log(`   대본 턴 수: ${script.length}`);

// ── 3. Gemini 전사 요청 ───────────────────────────────────────────────────
const apiKey = process.env.VITE_GEMINI_API_KEY;
if (!apiKey) { console.error('❌ VITE_GEMINI_API_KEY 없음'); process.exit(1); }

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

console.log('\n🤖 Gemini 오디오 전사 중... (시간이 걸릴 수 있습니다)');

const audioData = fs.readFileSync(audioPath).toString('base64');

const prompt = `이 오디오를 전체 전사(transcription)해주세요.
제임스(남성)와 스텔라(여성)가 번갈아 대화하는 팟캐스트입니다.

각 발화마다 시작 시간과 텍스트를 아래 JSON 형식으로만 출력하세요. 다른 설명 없이 JSON만:

[
  {"start": 5.2, "speaker": "제임스", "text": "실제로 말한 내용"},
  {"start": 18.0, "speaker": "스텔라", "text": "실제로 말한 내용"},
  ...
]

규칙:
- start는 소수점 1자리 (초 단위)
- 오프닝 음악/인트로는 건너뛰고 첫 발화부터
- 말이 겹치거나 짧은 추임새도 포함
- 한국어 그대로 전사`;

let transcribed = [];
try {
    const result = await model.generateContent([
        { inlineData: { mimeType, data: audioData } },
        prompt
    ]);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('JSON 형식 응답 없음');
    transcribed = JSON.parse(jsonMatch[0]);
    console.log(`   Gemini 전사 완료: ${transcribed.length}개 발화 감지`);
} catch (e) {
    console.error('❌ Gemini 전사 실패:', e.message);
    process.exit(1);
}

// ── 4. 텍스트 유사도로 대본 턴과 매칭 ────────────────────────────────────
function similarity(a, b) {
    // 공백/특수문자 제거 후 공통 글자 비율
    const clean = s => s.replace(/[^가-힣a-zA-Z0-9]/g, '');
    const ca = clean(a), cb = clean(b);
    if (!ca || !cb) return 0;
    let matches = 0;
    const shorter = ca.length < cb.length ? ca : cb;
    const longer  = ca.length < cb.length ? cb : ca;
    for (const ch of shorter) {
        if (longer.includes(ch)) matches++;
    }
    return matches / longer.length;
}

console.log('\n🔗 대본 매칭 중...');

const segments = script.map((turn, i) => {
    // 이 턴의 예상 화자
    const expectedSpeaker = turn.role === 'B' ? '스텔라' : '제임스';

    // 텍스트 앞 50자로 매칭
    const sample = turn.text.slice(0, 50);

    // 같은 화자 발화 중 가장 유사한 것 선택
    let bestScore = -1, bestMatch = null;
    transcribed.forEach(t => {
        if (t.speaker !== expectedSpeaker) return;
        const score = similarity(sample, t.text);
        if (score > bestScore) { bestScore = score; bestMatch = t; }
    });

    // 매칭 안 되면 순서로 fallback
    if (!bestMatch || bestScore < 0.15) {
        const sameSpeak = transcribed.filter(t => t.speaker === expectedSpeaker);
        const idx = Math.floor(i / 2);
        bestMatch = sameSpeak[idx] || transcribed[i] || null;
        console.log(`   턴 ${i + 1} [${expectedSpeaker}]: 텍스트 매칭 실패 → 순서 사용 (${bestMatch?.start}s)`);
    } else {
        console.log(`   턴 ${i + 1} [${expectedSpeaker}]: ${bestMatch.start}s (유사도 ${(bestScore * 100).toFixed(0)}%)`);
    }

    const nextTurn = transcribed.find(t => t.start > (bestMatch?.start ?? 0));

    return {
        index:   i,
        speaker: expectedSpeaker,
        start:   bestMatch?.start ?? null,
        end:     nextTurn?.start ?? null,
        text:    turn.text,
        role:    turn.role
    };
});

// ── 5. 저장 ───────────────────────────────────────────────────────────────
fs.writeFileSync(TS_OUT, JSON.stringify({
    method:   'gemini-transcription-match',
    bookId,
    segments
}, null, 2), 'utf8');

console.log(`\n✅ 저장 완료: ${TS_OUT}`);
console.log(`   ${segments.length}턴 / 첫 발화: ${segments[0]?.start}s\n`);
