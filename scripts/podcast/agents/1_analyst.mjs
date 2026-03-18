/**
 * Agent 1: 분석가 (Analyst) — Gemini
 * 도서 내용을 분석해 직장인에게 울림을 주는 핵심 인사이트 3개를 추출한다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callGemini } from './gemini_helper.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_MD = fs.readFileSync(path.join(__dirname, '../SKILL.md'), 'utf-8');
const HUMOR_BANK = fs.readFileSync(path.join(__dirname, '../resources/humor_bank.md'), 'utf-8');

/**
 * @param {*} _client  (미사용 — Gemini 직접 호출)
 * @param {{ title: string, author: string, summary: string }} bookInfo
 * @returns {Promise<object>} insights JSON
 */
export async function runAnalyst(_client, bookInfo) {
  console.log('  🔍 [Agent 1] 분석가 실행 중...');

  const systemPrompt = `${SKILL_MD}

---

당신은 도서 분석 전문가입니다.
주어진 책에서 직장인의 일상을 바꿀 수 있는 핵심 인사이트를 찾아내는 것이 역할입니다.
분석 결과는 다음 에이전트(대화 설계자)가 활용합니다.
반드시 JSON만 출력하라. 다른 텍스트 없음.`;

  const userPrompt = `<book_info>
제목: ${bookInfo.title}
저자: ${bookInfo.author}
핵심 내용: ${bookInfo.summary}
</book_info>

<humor_reference>
${HUMOR_BANK}
</humor_reference>

<task>
이 책에서 직장인에게 진짜 울림을 줄 수 있는 인사이트 3가지를 분석하라.
아래 JSON 형식으로만 출력하라. 다른 텍스트 없음.
</task>

<output_format>
{
  "book": "책 제목",
  "author": "저자",
  "insights": [
    {
      "concept": "핵심 개념 이름",
      "explanation": "이 개념이 말하는 것 (1~2문장)",
      "workplace_parallel": "직장인의 어떤 상황과 연결되는가",
      "humor_angle": "이 주제에서 뽑을 수 있는 유머 포인트",
      "deeper_truth": "표면 아래의 인과적 통찰 (왜 이게 중요한가)",
      "suggested_turns": "대화에서 몇 번째 전후로 다루면 좋을지"
    }
  ],
  "opening_hook": "청취자가 첫 10초 안에 공감할 직장인 상황 한 줄",
  "closing_vision": "이 책의 가르침을 실천한 사람과 그렇지 않은 사람의 1년 후 차이"
}
</output_format>`;

  let analysisResult;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let raw = await callGemini(systemPrompt, userPrompt, 8000);
    raw = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}') + 1;
    if (jsonStart === -1 || jsonEnd === 0) {
      console.log(`  ⚠️ [Agent 1] JSON 없음, 재시도 ${attempt}/3`);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    try {
      analysisResult = JSON.parse(raw.substring(jsonStart, jsonEnd));
      break;
    } catch (e) {
      console.log(`  ⚠️ [Agent 1] JSON 파싱 실패 (${e.message.slice(0, 60)}), 재시도 ${attempt}/3`);
      if (attempt === 3) throw new Error(`[Agent 1] JSON 파싱 3회 실패: ${e.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`  ✅ [Agent 1] 완료 — 인사이트 ${analysisResult.insights.length}개 추출`);
  analysisResult.insights.forEach((ins, i) => {
    console.log(`     [${i + 1}] ${ins.concept}: ${ins.workplace_parallel.substring(0, 50)}...`);
  });

  return analysisResult;
}
