/**
 * run_batch.mjs — batch_queue.json의 책을 순서대로 처리
 *
 * 사용법:
 *   node scripts/podcast/run_batch.mjs
 *
 * batch_queue.json 형식:
 *   [{ id, title, author, summary, celebId, status }]
 *   status: "pending" | "done" | "error"
 *
 * - pending 항목만 처리
 * - 완료/오류 시 status 자동 업데이트
 * - 하나 실패해도 나머지 계속 진행
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runPodcast } from './run_podcast.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUEUE_FILE = path.resolve(__dirname, '../../batch_queue.json');

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

async function main() {
  if (!fs.existsSync(QUEUE_FILE)) {
    console.error('batch_queue.json not found:', QUEUE_FILE);
    process.exit(1);
  }

  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  const pending = queue.filter(b => b.status !== 'done');

  if (pending.length === 0) {
    console.log('No pending books. All done!');
    console.log('(Reset status to "pending" in batch_queue.json to rerun)');
    process.exit(0);
  }

  console.log(`\n=== Batch: ${pending.length} books to process ===\n`);

  const totalStart = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < queue.length; i++) {
    const book = queue[i];
    if (book.status === 'done') continue;

    const idx = queue.filter((b, j) => j <= i && b.status !== 'done').length;
    console.log(`\n[${idx}/${pending.length}] ${book.id}`);

    const bookInfo = {
      id: book.id,
      title: book.title,
      author: book.author,
      summary: book.summary || `${book.title} (${book.author})`,
    };

    try {
      await runPodcast(bookInfo, { celebId: book.celebId || null });
      book.status = 'done';
      delete book.error;
      successCount++;
    } catch (err) {
      console.error(`  ERROR [${book.id}]: ${err.message}`);
      book.status = 'error';
      book.error = err.message;
      failCount++;
    }

    // 진행상황 즉시 저장 (중단돼도 완료분 보존)
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
  }

  const elapsed = formatElapsed(Date.now() - totalStart);
  console.log('\n' + '='.repeat(55));
  console.log(`Batch done! (${elapsed})`);
  console.log(`  Success: ${successCount}  /  Error: ${failCount}`);
  if (failCount > 0) {
    console.log('  Error items remain as "error" in batch_queue.json');
    console.log('  Change status back to "pending" to retry.');
  }
  console.log('\nNext steps:');
  console.log('  1. firebase deploy --only hosting');
  console.log('  2. Admin dashboard -> sync scripts');
  console.log('='.repeat(55) + '\n');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
