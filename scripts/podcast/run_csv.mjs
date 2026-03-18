/**
 * run_csv.mjs — CSV 파일을 읽어서 팟캐스트 일괄 생성
 *
 * 사용법:
 *   node scripts/podcast/run_csv.mjs podcast_queue.csv
 *
 * CSV 형식 (Admin에서 다운로드):
 *   id, title, author, summary, celebId
 *
 * 워크플로우:
 *   1. Admin 도서 탭 → "PODCAST CSV" 버튼 → podcast_queue.csv 다운로드
 *   2. 엑셀로 열어 summary 컬럼 채우기 (celebId는 id와 다를 때만)
 *   3. 파일을 프로젝트 루트에 저장
 *   4. make_podcast.bat 더블클릭 → CSV 경로 입력 또는 자동 감지
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { runPodcast } from './run_podcast.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');

// ── CSV 파싱 (BOM + 멀티라인 quoted 필드 완전 지원) ─────────
function parseCSV(filePath) {
  let raw = fs.readFileSync(filePath, 'utf-8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  raw = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 전체 텍스트를 문자 단위로 파싱 (멀티라인 quoted 필드 처리)
  const records = [];
  let pos = 0;

  while (pos < raw.length) {
    const fields = [];
    // 각 레코드 파싱
    while (pos < raw.length) {
      if (raw[pos] === '"') {
        // quoted field
        let field = '';
        pos++; // 여는 따옴표 건너뜀
        while (pos < raw.length) {
          if (raw[pos] === '"') {
            if (raw[pos + 1] === '"') { field += '"'; pos += 2; }
            else { pos++; break; } // 닫는 따옴표
          } else {
            field += raw[pos++];
          }
        }
        fields.push(field);
      } else {
        // unquoted field
        let field = '';
        while (pos < raw.length && raw[pos] !== ',' && raw[pos] !== '\n') {
          field += raw[pos++];
        }
        fields.push(field.trim());
      }
      // 필드 구분자
      if (pos < raw.length && raw[pos] === ',') { pos++; continue; }
      break;
    }
    // 줄 끝 건너뜀
    if (pos < raw.length && raw[pos] === '\n') pos++;
    if (fields.length > 0 && fields.some(f => f.trim())) records.push(fields);
  }

  if (records.length < 2) return [];
  const headers = records[0].map(h => h.trim());

  return records.slice(1).map(values => {
    const obj = {};
    headers.forEach((h, i) => {
      let v = (values[i] || '').trim();
      // summary는 1500자 제한 (Agent 1 토큰 절약)
      if (h === 'summary' && v.length > 1500) v = v.slice(0, 1500);
      obj[h] = v;
    });
    return obj;
  }).filter(row => row.id && !row.id.startsWith('#') && !row.id.startsWith('-'));
}

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}초`;
  return `${Math.floor(s / 60)}분 ${s % 60}초`;
}

// ── 메인 ────────────────────────────────────────────────────
async function main() {
  // CSV 파일 경로: 인자 또는 루트의 podcast_queue.csv 자동 감지
  let csvPath = process.argv[2];
  if (!csvPath) {
    const auto = path.join(ROOT, 'podcast_queue.csv');
    if (fs.existsSync(auto)) {
      csvPath = auto;
      console.log(`CSV 자동 감지: podcast_queue.csv`);
    } else {
      console.error('사용법: node scripts/podcast/run_csv.mjs <CSV파일경로>');
      console.error('또는 프로젝트 루트에 podcast_queue.csv 파일을 놓으세요.');
      process.exit(1);
    }
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`파일 없음: ${csvPath}`);
    process.exit(1);
  }

  const books = parseCSV(csvPath);

  if (books.length === 0) {
    console.log('처리할 책이 없습니다. CSV 내용을 확인하세요.');
    process.exit(0);
  }

  // summary 없는 행 경고
  const noSummary = books.filter(b => !b.summary);
  if (noSummary.length > 0) {
    console.log(`\n주의: summary가 비어있는 항목 ${noSummary.length}개 — 기본값(제목+저자) 사용`);
    noSummary.forEach(b => console.log(`  - ${b.id}: ${b.title}`));
  }

  console.log(`\n총 ${books.length}권 처리 시작`);
  books.forEach((b, i) => console.log(`  ${i + 1}. [${b.id}] ${b.title} — ${b.author}`));

  const totalStart = Date.now();
  let successCount = 0;
  const failed = [];

  // ── STEP 1: 책별 대본 + TTS ──────────────────────────────
  console.log('\n[STEP 1/3] 대본 + TTS 생성');
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`\n  [${i + 1}/${books.length}] ${book.title}`);
    try {
      await runPodcast(
        {
          id: book.id,
          title: book.title,
          author: book.author,
          summary: book.summary || `${book.title} (${book.author})`,
        },
        { celebId: book.celebId || null }
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
      cwd: ROOT, stdio: 'inherit',
    });
  } catch (err) {
    console.error('  ERROR: 동기화 실패 —', err.message);
  }

  // ── STEP 3: Firebase deploy ──────────────────────────────
  console.log('\n[STEP 3/3] Firebase 배포...');
  try {
    execSync('firebase deploy --only hosting', {
      cwd: ROOT, stdio: 'inherit',
    });
  } catch (err) {
    console.error('  ERROR: 배포 실패 —', err.message);
    console.log('  수동으로 실행: firebase deploy --only hosting');
  }

  const elapsed = formatElapsed(Date.now() - totalStart);
  console.log('\n==============================================');
  console.log(`전체 완료! (${elapsed})`);
  console.log(`성공: ${successCount}권 / 실패: ${failed.length}권`);
  console.log('==============================================\n');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
