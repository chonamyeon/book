/**
 * run_interactive.mjs — 여러 책을 대화식으로 입력 후 일괄 처리
 *
 * 1. 책 정보 입력 (반복)
 * 2. 확인 후 전체 실행
 * 3. 대본 생성 + TTS + celebrities.js 업데이트
 * 4. bookScripts.js 동기화
 * 5. firebase deploy
 */

import 'dotenv/config';
import readline from 'readline';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { runPodcast } from './run_podcast.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}초`;
  return `${Math.floor(s / 60)}분 ${s % 60}초`;
}

async function inputBooks() {
  const books = [];

  while (true) {
    console.log(`\n--- 책 ${books.length + 1} 입력 ---`);
    const id      = (await ask('책 ID (영문, 예: atomic-habits): ')).trim();
    if (!id) { console.log('ID를 입력해주세요.'); continue; }

    const title   = (await ask('책 제목: ')).trim();
    const author  = (await ask('저자: ')).trim();
    const summary = (await ask('핵심 요약 (짧게): ')).trim();
    const celebId = (await ask('Celeb ID (다를 경우만, 없으면 Enter): ')).trim();

    books.push({ id, title, author, summary, celebId: celebId || null });

    console.log(`\n  추가됨: [${id}] ${title} — ${author}`);
    const more = (await ask('책 추가? (y/n): ')).trim().toLowerCase();
    if (more !== 'y') break;
  }

  return books;
}

async function main() {
  console.log('\n==============================================');
  console.log('   Archiview Batch Podcast Generator');
  console.log('==============================================');
  console.log('처리할 책을 입력하세요. 다 입력하면 한번에 실행됩니다.\n');

  // 책 목록 입력
  const books = await inputBooks();

  if (books.length === 0) {
    console.log('입력된 책이 없습니다.');
    rl.close();
    return;
  }

  // 최종 확인
  console.log('\n==============================================');
  console.log(`총 ${books.length}권 처리 예정:`);
  books.forEach((b, i) => console.log(`  ${i + 1}. [${b.id}] ${b.title} — ${b.author}`));
  console.log('==============================================');

  const confirm = (await ask('\n시작할까요? (y/n): ')).trim().toLowerCase();
  rl.close();

  if (confirm !== 'y') {
    console.log('취소되었습니다.');
    return;
  }

  // ── STEP 1: 책별 대본 + TTS ──────────────────────────────
  console.log(`\n[STEP 1/3] 대본 + TTS 생성 (${books.length}권)`);
  const totalStart = Date.now();
  let successCount = 0;
  const failed = [];

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`\n  [${i + 1}/${books.length}] ${book.title}`);
    try {
      await runPodcast(
        { id: book.id, title: book.title, author: book.author, summary: book.summary },
        { celebId: book.celebId }
      );
      successCount++;
    } catch (err) {
      console.error(`  ERROR [${book.id}]: ${err.message}`);
      failed.push(book.id);
    }
  }

  console.log(`\n  완료: ${successCount}권 성공 / ${failed.length}권 실패`);
  if (failed.length > 0) console.log(`  실패: ${failed.join(', ')}`);

  // ── STEP 2: bookScripts.js 동기화 ──────────────────────
  console.log('\n[STEP 2/3] bookScripts.js 동기화...');
  try {
    execSync(`node "${path.join(ROOT, 'scripts/sync_scripts.mjs')}"`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('  ERROR: 동기화 실패 —', err.message);
  }

  // ── STEP 3: Firebase deploy ──────────────────────────────
  console.log('\n[STEP 3/3] Firebase 배포...');
  try {
    execSync('firebase deploy --only hosting', {
      cwd: ROOT,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('  ERROR: 배포 실패 —', err.message);
    console.log('  수동으로 실행: firebase deploy --only hosting');
  }

  const elapsed = formatElapsed(Date.now() - totalStart);
  console.log('\n==============================================');
  console.log(`완료! (${elapsed})`);
  console.log(`성공: ${successCount}권 / 실패: ${failed.length}권`);
  console.log('==============================================\n');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  rl.close();
  process.exit(1);
});
