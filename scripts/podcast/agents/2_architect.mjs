/**
 * Agent 2: 설계자 (Architect) — Gemini
 * 분석가의 인사이트를 받아 팟캐스트 대화의 흐름을 설계한다.
 * 실제 대사는 쓰지 않는다. 흐름만 설계.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callGemini } from './gemini_helper.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_MD = fs.readFileSync(path.join(__dirname, '../SKILL.md'), 'utf-8');
const PERSONA = fs.readFileSync(path.join(__dirname, '../resources/persona.md'), 'utf-8');

/**
 * @param {*} _client  (미사용 — Gemini 직접 호출)
 * @param {object} analysisResult - Agent 1의 출력
 * @returns {Promise<object>} conversation flow JSON
 */
export async function runArchitect(_client, analysisResult) {
  console.log('  🗺️  [Agent 2] 설계자 실행 중...');

  const systemPrompt = `${SKILL_MD}

---

당신은 팟캐스트 대화 구조 설계 전문가입니다.
분석가가 뽑은 인사이트를 받아서, 어떤 순서로 어떤 감정과 정보가 흘러야 하는지 설계하는 것이 역할입니다.
실제 대사는 절대 쓰지 않습니다. 흐름만 설계합니다.
반드시 JSON만 출력하라. 다른 텍스트 없음.`;

  const userPrompt = `<analyst_output>
${JSON.stringify(analysisResult, null, 2)}
</analyst_output>

<persona>
${PERSONA}
</persona>

<task>
위 인사이트를 바탕으로 팟캐스트 대화의 흐름을 설계하라.
대사를 쓰는 것이 아니라, 어떤 섹션에서 어떤 감정/정보/유머가 흘러야 하는지 스케치한다.

제약 조건:
- 제임스가 먼저 말하고 스텔라가 이어받는 교대 패턴
- 오프닝: 청취자가 즉각 공감할 직장인 상황으로 시작 → 자연스럽게 책 소개
- 중반부: 인사이트 3개를 섹션별로 전개. 각 섹션에 유머 포인트 1개 이상
- 적어도 1번은 두 화자가 의견이 살짝 달랐다가 합의하는 구간 필요
- 클로징: 구체적 실천 다짐 + 유쾌한 끝맺음 (다음 에피소드 기대감)

아래 JSON 형식으로만 출력하라. 다른 텍스트 없음.
</task>

<output_format>
{
  "total_turns_estimate": "예상 대화 턴 수 (45 전후)",
  "sections": [
    {
      "name": "섹션 이름 (예: 오프닝, 인사이트1, 클로징)",
      "turns_range": "예상 턴 범위 (예: 0~5)",
      "purpose": "이 섹션의 목적",
      "flow": "어떤 순서로 대화가 흘러야 하는가 (2~4문장)",
      "humor_point": "이 섹션에서 쓸 유머 포인트",
      "key_insight": "전달해야 할 핵심 메시지",
      "emotional_arc": "감정의 흐름 (예: 공감 → 통찰 → 실천 의지)"
    }
  ],
  "conflict_section": "두 화자가 의견 차이를 보이는 섹션 이름",
  "closing_action": "청취자가 내일 당장 실천할 수 있는 구체적 행동 1가지"
}
</output_format>`;

  let flowResult;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let raw = await callGemini(systemPrompt, userPrompt, 6000);
    raw = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}') + 1;
    if (jsonStart === -1 || jsonEnd === 0) {
      console.log(`  ⚠️ [Agent 2] JSON 없음, 재시도 ${attempt}/3`);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    try {
      flowResult = JSON.parse(raw.substring(jsonStart, jsonEnd));
      break;
    } catch (e) {
      console.log(`  ⚠️ [Agent 2] JSON 파싱 실패, 재시도 ${attempt}/3`);
      if (attempt === 3) throw new Error(`[Agent 2] JSON 파싱 3회 실패: ${e.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`  ✅ [Agent 2] 완료 — ${flowResult.sections.length}개 섹션 설계`);
  flowResult.sections.forEach(s => {
    console.log(`     [${s.turns_range}] ${s.name}: ${s.purpose.substring(0, 50)}`);
  });

  return flowResult;
}
