/**
 * run_podcast.mjs — 팟캐스트 원커맨드 자동화
 *
 * 실행 한 번으로:
 *   1. 대본 생성 (5단계 에이전트)
 *   2. TTS 생성 (Gemini 멀티스피커)
 *   3. 오디오 처리 (EQ + 징글)
 *   4. celebrities.js 자동 업데이트
 *   5. 다음 할 일 안내 출력
 *
 * 사용법:
 *   node scripts/podcast/run_podcast.mjs \
 *     --id "atomic-habits" \
 *     --title "아주 작은 습관의 힘" \
 *     --author "제임스 클리어" \
 *     --celeb-id "james-clear" \
 *     --summary "1%의 작은 변화가 복리로 쌓여..."
 *
 * 옵션:
 *   --skip-script   : 대본 생성 건너뜀 (이미 _script.json 있을 때)
 *   --skip-tts      : TTS 생성 건너뜀 (이미 .mp3 있을 때)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

import { generateScript } from './gen_script.mjs';
import { generateTTS } from './gen_tts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const OUTPUT_DIR = path.join(ROOT, 'final_podcast');
const CELEBS_FILE = path.join(ROOT, 'src/data/celebrities.js');

// ─── CLI 인자 파싱 ────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { flags: new Set() };
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) continue;
    const key = args[i].slice(2);
    // 다음이 값인지 플래그인지 판단
    if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
      result[key] = args[i + 1];
      i++;
    } else {
      result.flags.add(key);
    }
  }
  return result;
}

// ─── celebrities.js 업데이트 ─────────────────────────────────
function updateCelebrities(bookId, celebId) {
  const targetId = celebId || bookId;

  if (!fs.existsSync(CELEBS_FILE)) {
    console.log('  ⚠️  celebrities.js 없음 — 수동으로 추가하세요');
    return false;
  }

  let content = fs.readFileSync(CELEBS_FILE, 'utf-8');
  const podcastFile = `/audio/${bookId}.mp3`;

  // 이미 연동된 경우 스킵
  if (content.includes(`podcastFile: "${podcastFile}"`)) {
    console.log('  ⏩ celebrities.js 이미 연동됨 — 스킵');
    return true;
  }

  // 셀럽 ID로 항목 찾기
  const idPattern = new RegExp(`(id:\\s*["']${targetId}["'],)`, 'g');
  if (!idPattern.test(content)) {
    console.log(`  ⚠️  celebrities.js에서 id="${targetId}" 항목을 찾지 못함`);
    console.log(`     수동으로 아래 내용을 추가하세요:`);
    console.log(`     isPodcast: true,`);
    console.log(`     podcastFile: "${podcastFile}",`);
    return false;
  }

  // isPodcast + podcastFile 삽입
  content = content.replace(
    new RegExp(`(id:\\s*["']${targetId}["'],)`, 'g'),
    `$1\n        isPodcast: true,\n        podcastFile: "${podcastFile}",`
  );

  fs.writeFileSync(CELEBS_FILE, content, 'utf-8');
  console.log(`  ✅ celebrities.js 업데이트: id="${targetId}" → podcastFile="${podcastFile}"`);
  return true;
}

// ─── 경과 시간 포맷 ──────────────────────────────────────────
function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}초`;
  return `${Math.floor(s / 60)}분 ${s % 60}초`;
}

// ─── 핵심 로직 (단일 책 처리) — export해서 run_batch.mjs에서도 사용 ──
export async function runPodcast(bookInfo, { skipScript = false, skipTts = false, celebId = null } = {}) {
  const startTime = Date.now();

  console.log('\n' + '='.repeat(55));
  console.log(`[팟캐스트 자동화] ${bookInfo.title} — ${bookInfo.author}`);
  console.log(`ID: ${bookInfo.id}`);
  console.log('='.repeat(55));

  // ── STEP 1: 대본 생성 ──────────────────────────────────────
  let script;
  const scriptPath = path.join(OUTPUT_DIR, `${bookInfo.id}_script.json`);

  if (skipScript && fs.existsSync(scriptPath)) {
    console.log('\n[STEP 1] 대본 생성 건너뜀 (skip-script)');
    script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
    const chars = script.map(t => t.text).join('').length;
    console.log(`   기존 대본: ${script.length}턴 | ${chars}자`);
  } else {
    console.log('\n[STEP 1/4] 대본 생성 (5단계 에이전트)');
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY 없음. .env 확인');
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    script = await generateScript(client, bookInfo);
  }

  // ── STEP 2: TTS 생성 ───────────────────────────────────────
  const mp3Path = path.join(OUTPUT_DIR, `${bookInfo.id}.mp3`);

  if (skipTts && fs.existsSync(mp3Path)) {
    console.log('\n[STEP 2] TTS 생성 건너뜀 (skip-tts)');
  } else {
    console.log('\n[STEP 2/4] TTS 생성 (Gemini 멀티스피커)');
    await generateTTS(bookInfo, script);
  }

  // ── STEP 3: celebrities.js 업데이트 ───────────────────────
  console.log('\n[STEP 3/4] celebrities.js 업데이트');
  updateCelebrities(bookInfo.id, celebId);

  // ── STEP 4: static data 동기화 안내 ─────────────────────────
  console.log('\n[STEP 4/4] static data 스크립트 동기화');
  console.log('   Admin 대시보드 -> "스크립트 동기화" 버튼 클릭');

  // ── 완료 요약 ──────────────────────────────────────────────
  const elapsed = formatElapsed(Date.now() - startTime);
  const mp3Size = fs.existsSync(mp3Path)
    ? `${(fs.statSync(mp3Path).size / 1024 / 1024).toFixed(1)}MB`
    : '?';

  console.log('\n' + '='.repeat(55));
  console.log(`완료! (${elapsed})`);
  console.log(`   final_podcast/${bookInfo.id}.mp3 (${mp3Size})`);
  console.log(`   final_podcast/${bookInfo.id}_script.json`);
  console.log('='.repeat(55) + '\n');
}

// ─── CLI 직접 실행 ────────────────────────────────────────────
async function main() {
  const args = parseArgs();

  if (!args.id || !args.title || !args.author) {
    console.error(`
사용법:
  node scripts/podcast/run_podcast.mjs \\
    --id "book-id" --title "책 제목" --author "저자" \\
    [--celeb-id "id"] [--summary "요약"] [--skip-script] [--skip-tts]
`);
    process.exit(1);
  }

  const bookInfo = {
    id: args.id,
    title: args.title,
    author: args.author,
    summary: args.summary || `${args.title} (${args.author})`,
  };

  await runPodcast(bookInfo, {
    skipScript: args.flags.has('skip-script'),
    skipTts: args.flags.has('skip-tts'),
    celebId: args['celeb-id'] || null,
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('\n오류:', err.message);
    process.exit(1);
  });
}
