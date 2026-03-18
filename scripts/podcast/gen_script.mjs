/**
 * gen_script.mjs — 대본 생성 오케스트레이터
 *
 * Agent 1 (분석가) → Agent 2 (설계자) → Agent 3 (작가) → Agent 4 (비평가) → Agent 5 (전처리기)
 *
 * CLI 사용:
 *   node scripts/podcast/gen_script.mjs --id "book-id" --title "제목" --author "저자" --summary "요약"
 *
 * 함수 import:
 *   import { generateScript } from './scripts/podcast/gen_script.mjs';
 *   const script = await generateScript(client, bookInfo);
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

import { runAnalyst } from './agents/1_analyst.mjs';
import { runArchitect } from './agents/2_architect.mjs';
import { runWriter } from './agents/3_writer.mjs';
import { runCritic } from './agents/4_critic.mjs';
import { runPreprocessor } from './agents/5_preprocessor.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../final_podcast');

/**
 * 대본 생성 메인 함수 (run_podcast.mjs에서 import해서 사용)
 * @param {Anthropic} client
 * @param {{ id: string, title: string, author: string, summary: string }} bookInfo
 * @returns {Promise<Array<{speaker: string, text: string}>>}
 */
export async function generateScript(client, bookInfo) {
  console.log('\n[1/5] 분석가 — 도서 인사이트 추출');
  const analysisResult = await runAnalyst(client, bookInfo);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${bookInfo.id}_analysis.json`),
    JSON.stringify(analysisResult, null, 2)
  );

  console.log('\n[2/5] 설계자 — 대화 흐름 설계');
  const flowResult = await runArchitect(client, analysisResult);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${bookInfo.id}_flow.json`),
    JSON.stringify(flowResult, null, 2)
  );

  console.log('\n[3/5] 작가 — 대사 작성');
  let script = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const draft = await runWriter(client, analysisResult, flowResult);
      if (draft.length >= 20) { script = draft; break; }
      console.log(`  ⚠️  대본 너무 짧음 (${draft.length}턴). 재시도 ${attempt}/3`);
    } catch (err) {
      console.log(`  ❌ 작가 오류: ${err.message}. 재시도 ${attempt}/3`);
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  if (!script) throw new Error('대본 생성 3회 모두 실패');

  console.log('\n[4/5] 비평가 — 품질 검토 + 수정');
  const revised = await runCritic(client, script, analysisResult);

  console.log('\n[5/5] 전처리기 — TTS 발음 교정');
  const finalScript = runPreprocessor(revised);

  // 저장
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${bookInfo.id}_script.json`),
    JSON.stringify(finalScript, null, 2)
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${bookInfo.id}_script.txt`),
    finalScript.map((t, i) => `[${i}] ${t.speaker}\n${t.text}`).join('\n\n')
  );

  const totalChars = finalScript.map(t => t.text).join('').length;
  console.log(`\n  📄 최종: ${finalScript.length}턴 | ${totalChars}자`);

  return finalScript;
}

// ─── CLI 직접 실행 ────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter(a => a.startsWith('--'))
      .map((a, i, arr) => [a.slice(2), arr[i + 1]])
      .filter((_, i) => i % 2 === 0)
  );

  if (!args.id || !args.title || !args.author) {
    console.error('사용법: node gen_script.mjs --id "id" --title "제목" --author "저자" [--summary "요약"]');
    process.exit(1);
  }

  const bookInfo = {
    id: args.id,
    title: args.title,
    author: args.author,
    summary: args.summary || `${args.title} (${args.author})`,
  };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  console.log(`\n🎙️  대본 생성: ${bookInfo.title}`);
  generateScript(client, bookInfo)
    .then(() => console.log('\n✅ 완료'))
    .catch(err => { console.error('❌', err.message); process.exit(1); });
}
