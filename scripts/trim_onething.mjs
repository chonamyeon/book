/**
 * API 재호출 없이 기존 대본을 50턴 이하, 2800~3000자로 조정
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_PATH = path.resolve(__dirname, '../final_podcast/one-thing_script.json');
const SCRIPTS_FILE = path.resolve(__dirname, '../src/data/bookScripts.js');

const TARGET_MIN = 2500;
const TARGET_MAX = 2700;

function countChars(script) {
    return script.reduce((s, t) => s + t.text.replace(/[\s\uFEFF\xA0]/g, '').length, 0);
}

// 텍스트를 목표 글자 수 비율로 문장 단위로 자르기
function trimToRatio(text, targetRatio) {
    // 문장 분리: . ! ? 뒤 공백 기준
    const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
    const originalLen = text.replace(/\s/g, '').length;
    const targetLen = Math.max(Math.round(originalLen * targetRatio), 35);

    let result = '';
    for (const s of sentences) {
        const combined = (result + s).replace(/\s/g, '').length;
        if (result && combined > targetLen && result.replace(/\s/g, '').length >= 35) break;
        result += s;
    }
    return result.trim();
}

let script = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf-8'));
let chars = countChars(script);
console.log(`원본: ${script.length}턴, ${chars}자`);

// ── Step 1: 51턴 → 1턴 제거 (중간에서 가장 짧은 턴 제거) ──
if (script.length > 50) {
    const candidates = script
        .map((t, i) => ({ i, len: t.text.replace(/\s/g, '').length }))
        .slice(7, -5) // 처음 7 + 마지막 5는 보호
        .sort((a, b) => a.len - b.len);
    const removeIdx = candidates[0].i;
    script.splice(removeIdx, 1);
    console.log(`턴 ${removeIdx + 1} 제거 → ${script.length}턴`);
}

// ── Step 2: 4353자 → 2800~3000자로 각 대사 비율 축소 ──
chars = countChars(script);
const ratio = (TARGET_MIN + TARGET_MAX) / 2 / chars; // 목표 중앙값 비율
console.log(`글자 수 조정 비율: ${(ratio * 100).toFixed(1)}% (${chars}자 → 목표 ~${Math.round(chars * ratio)}자)`);

script = script.map(turn => ({
    ...turn,
    text: trimToRatio(turn.text, ratio)
}));

chars = countChars(script);
console.log(`1차 조정 후: ${script.length}턴, ${chars}자`);

// ── Step 3: 미세 보정 (여전히 범위 벗어나면) ──
if (chars > TARGET_MAX) {
    // 가장 긴 턴들 추가 트리밍
    const overBy = chars - TARGET_MAX;
    const perTurnCut = Math.ceil(overBy / script.length);
    script = script.map(turn => {
        const len = turn.text.replace(/\s/g, '').length;
        if (len > 80) {
            return { ...turn, text: trimToRatio(turn.text, (len - perTurnCut) / len) };
        }
        return turn;
    });
    chars = countChars(script);
    console.log(`2차 조정 후: ${chars}자`);
}

// ── 최종 저장 ──
const estimatedSec = Math.round(chars / 4.5);
const min = Math.floor(estimatedSec / 60);
const sec = estimatedSec % 60;

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ 최종 결과:');
console.log(`   📊 턴 수: ${script.length}턴  ${script.length <= 50 ? '✅' : '⚠️'}`);
console.log(`   📝 글자 수: ${chars}자  ${chars >= TARGET_MIN && chars <= TARGET_MAX ? '✅' : '⚠️ (범위 벗어남)'}`);
console.log(`   ⏱️  예상 시간: 약 ${min}분 ${sec}초`);

fs.writeFileSync(SCRIPT_PATH, JSON.stringify(script, null, 4), 'utf-8');
console.log(`   💾 저장 완료`);

// ── bookScripts.js 동기화 ──
console.log('\n🔄 bookScripts.js 동기화...');
let bsContent = fs.readFileSync(SCRIPTS_FILE, 'utf-8');
const formatted = script.map(t => ({
    role: t.speaker === '제임스' ? 'A' : 'B',
    text: t.text
}));
const entry = JSON.stringify(formatted, null, 8);
const entryRegex = /["']?one-thing["']?\s*:\s*\[[\s\S]*?\],?/g;
if (bsContent.match(entryRegex)) {
    bsContent = bsContent.replace(entryRegex, `"one-thing": ${entry},`);
} else {
    const last = bsContent.lastIndexOf('};');
    if (last !== -1) {
        bsContent = bsContent.slice(0, last) + `    "one-thing": ${entry},\n` + bsContent.slice(last);
    }
}
fs.writeFileSync(SCRIPTS_FILE, bsContent, 'utf-8');
console.log('   ✅ bookScripts.js 업데이트 완료');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
