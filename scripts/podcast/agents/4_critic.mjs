/**
 * Agent 4: 비평가 (Critic) — Gemini
 * 작성된 대본의 자연스러움과 가독성을 검토하고, 어색한 부분을 수정한다.
 * 숫자 규칙보다 '진짜 대화처럼 들리는가'를 기준으로 한다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callGemini } from './gemini_helper.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_MD = fs.readFileSync(path.join(__dirname, '../SKILL.md'), 'utf-8');

/**
 * 기계적 검증 — 명백한 오류만 체크 (재생성 트리거가 아닌 참고용)
 */
export function quickCheck(script) {
  const warnings = [];
  const errors = [];

  // speaker 교대 체크
  for (let i = 0; i < script.length; i++) {
    const expected = i % 2 === 0 ? '제임스' : '스텔라';
    if (script[i].speaker !== expected) {
      errors.push(`turn ${i}: speaker 순서 오류 (예상: ${expected}, 실제: ${script[i].speaker})`);
    }
  }

  // 너무 짧은 대사 경고
  for (let i = 0; i < script.length; i++) {
    if (script[i].text.length < 20) {
      warnings.push(`turn ${i}: 대사가 너무 짧음 (${script[i].text.length}자) — "${script[i].text}"`);
    }
  }

  // 영문 약어 잔재 체크
  const abbrPattern = /\b(AI|CEO|KPI|OKR|MBA|ROI|ESG|CFO|CTO|SNS|LLM|GPT)\b/;
  for (let i = 0; i < script.length; i++) {
    if (abbrPattern.test(script[i].text)) {
      warnings.push(`turn ${i}: 영문 약어 발견 — "${script[i].text.match(abbrPattern)[0]}"`);
    }
  }

  // 연기 지시어 잔재 체크
  const directivePattern = /\[.*?\]|\(웃음\)|\(사이\)|\(침묵\)/;
  for (let i = 0; i < script.length; i++) {
    if (directivePattern.test(script[i].text)) {
      warnings.push(`turn ${i}: 연기 지시어 발견 — 제거 필요`);
    }
  }

  return { errors, warnings };
}

/**
 * Gemini가 대본 전체를 리뷰하고 수정한 버전을 반환
 * @param {*} _client  (미사용 — Gemini 직접 호출)
 * @param {Array<{speaker: string, text: string}>} script
 * @param {object} analysisResult - 원래 의도 파악용
 * @returns {Promise<Array<{speaker: string, text: string}>>}
 */
export async function runCritic(_client, script, analysisResult) {
  console.log('  🎯 [Agent 4] 비평가 실행 중...');

  // 먼저 기계적 검증
  const { errors, warnings } = quickCheck(script);
  if (errors.length > 0) {
    console.log(`  ⚠️  [Agent 4] 오류 ${errors.length}개 발견:`);
    errors.forEach(e => console.log(`     ${e}`));
  }
  if (warnings.length > 0) {
    console.log(`  💡 [Agent 4] 경고 ${warnings.length}개:`);
    warnings.forEach(w => console.log(`     ${w}`));
  }

  const systemPrompt = `${SKILL_MD}

---

당신은 팟캐스트 대본 편집자입니다.
작가가 쓴 대본을 받아서, 청취자 입장에서 들었을 때 자연스러운지 검토하고 수정합니다.

가장 중요한 기준: TTS로 읽었을 때 자연스럽게 들리는가.
숫자(턴 수, 글자 수)보다 대화의 질이 우선입니다.
반드시 JSON Array만 출력하라. 다른 텍스트 없음.`;

  const userPrompt = `<original_intent>
이 팟캐스트의 핵심 인사이트:
${analysisResult.insights.map((ins, i) => `${i + 1}. ${ins.concept}: ${ins.explanation}`).join('\n')}
</original_intent>

<script_to_review>
${JSON.stringify(script, null, 2)}
</script_to_review>

<quick_check_results>
오류: ${errors.length > 0 ? errors.join(', ') : '없음'}
경고: ${warnings.length > 0 ? warnings.join(', ') : '없음'}
</quick_check_results>

<review_criteria>
1. 문장 가독성
   - TTS가 읽었을 때 끊어지지 않고 자연스럽게 흘러가는가?
   - 한 문장이 너무 길어서 호흡이 막히는 구간은 없는가?
   - 영문 약어나 연기 지시어가 남아있지 않은가?

2. 대화 자연스러움
   - "~입니다, ~합니다" 보고서 투 문장이 있지 않은가?
   - 진짜 대화처럼 주고받는가, 아니면 한 사람이 강의하는가?
   - 상대방 말에 반응하는 맞장구가 적절히 있는가?

3. 감정과 리듬
   - 유머 → 통찰 → 공감의 리듬이 살아있는가?

4. 클로징 완결성
   - 마지막 대사가 자연스럽게 끝나는가?

5. speaker 교대
   - 제임스 → 스텔라 순서가 맞는가?
</review_criteria>

<task>
위 기준으로 대본을 검토하고, 문제가 있는 부분을 수정하라.
수정된 완성 대본을 JSON Array로만 출력하라.
수정이 필요 없는 턴은 그대로 유지하라.

형식: [{"speaker": "제임스", "text": "..."}, ...]
다른 텍스트 없음.
</task>`;

  let revised = script;
  let raw = await callGemini(systemPrompt, userPrompt, 8000);
  raw = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
  const jsonStart = raw.indexOf('[');
  const jsonEnd = raw.lastIndexOf(']') + 1;

  if (jsonStart === -1 || jsonEnd === 0) {
    console.log('  ⚠️  [Agent 4] JSON 없음 — 원본 반환');
  } else {
    try {
      revised = JSON.parse(raw.substring(jsonStart, jsonEnd));
    } catch (e) {
      console.log(`  ⚠️  [Agent 4] JSON 파싱 실패 — 원본 반환 (${e.message.slice(0, 60)})`);
    }
  }

  const charCount = revised.map(t => t.text).join('').length;

  // 최종 검증
  const finalCheck = quickCheck(revised);
  const status = finalCheck.errors.length === 0 ? '✅' : '⚠️';

  console.log(`  ${status} [Agent 4] 완료 — ${revised.length}턴, ${charCount}자`);
  if (finalCheck.errors.length > 0) {
    console.log(`     남은 오류: ${finalCheck.errors.join(', ')}`);
  }

  return revised;
}
