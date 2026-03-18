/**
 * Agent 3: 작가 (Writer)
 * 설계자의 흐름 + few-shot 예시를 참고해 실제 대사를 작성한다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_MD = fs.readFileSync(path.join(__dirname, '../SKILL.md'), 'utf-8');
const PERSONA = fs.readFileSync(path.join(__dirname, '../resources/persona.md'), 'utf-8');

// 상황극 100가지 — 순서대로 사용 (인덱스 파일로 추적)
const SITUATIONS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../resources/situations.json'), 'utf-8')
);
const SITUATION_INDEX_FILE = path.join(__dirname, '../resources/situation_index.json');

function pickSituation() {
  let idx = 0;
  try {
    const data = JSON.parse(fs.readFileSync(SITUATION_INDEX_FILE, 'utf-8'));
    idx = (data.current || 0) % SITUATIONS.length;
  } catch { idx = 0; }
  fs.writeFileSync(SITUATION_INDEX_FILE, JSON.stringify({ current: idx + 1 }));
  return { situation: SITUATIONS[idx], index: idx + 1 };
}

// Few-shot 예시 로드
const EXAMPLE_OPENING = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../examples/good_opening.json'), 'utf-8')
);
const EXAMPLE_TIKTAKA = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../examples/good_tiktaka.json'), 'utf-8')
);
const EXAMPLE_CLOSING = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../examples/good_closing.json'), 'utf-8')
);

function formatExampleTurns(examples) {
  return examples.map(ex =>
    `[${ex.source}]\n` +
    ex.turns.map(t => `${t.speaker}: ${t.text}`).join('\n')
  ).join('\n\n');
}

/**
 * @param {Anthropic} client
 * @param {object} analysisResult - Agent 1 출력
 * @param {object} flowResult - Agent 2 출력
 * @returns {Promise<Array<{speaker: string, text: string}>>}
 */
export async function runWriter(client, analysisResult, flowResult) {
  console.log('  ✍️  [Agent 3] 작가 실행 중...');

  const { situation, index } = pickSituation();
  console.log(`  🎭 오프닝 상황극 #${index}: ${situation.substring(0, 40)}...`);

  const systemPrompt = `${SKILL_MD}

---

당신은 팟캐스트 대본 작가입니다.

가장 중요한 것: 두 친구가 진짜로 즐겁게 수다 떠는 느낌이어야 한다.
청취자가 "어, 나 친구들 대화 엿듣는 것 같은데?" 싶어야 성공이다.
정보 전달이 목적이 아니라, 같이 웃고 공감하는 것이 먼저다.

이렇게 써야 한다:
- 제임스가 뭔가 말하면 스텔라가 "야 그거 우리 팀장님 얘기잖아!" 하고 터지는 반응
- "아 잠깐, 나 그거 겪었어" 하고 자기 이야기 꺼내는 자연스러운 전환
- 진지한 얘기 하다가 갑자기 웃긴 비유 나오는 리듬감

이러면 안 된다:
- 제임스가 설명하면 스텔라가 "오 그렇군요. 그다음은요?" 하는 인터뷰 형식
- "이 책의 세 번째 인사이트는~" 같은 목차 읽기
- 정보는 전달됐는데 재미가 없는 대화`;

  const userPrompt = `<book_context>
${JSON.stringify(analysisResult, null, 2)}
</book_context>

<conversation_flow>
${JSON.stringify(flowResult, null, 2)}
</conversation_flow>

<persona>
${PERSONA}
</persona>

<opening_situation>
오프닝은 반드시 아래 상황극으로 시작해라.
이 상황을 두 친구가 실제로 겪은 것처럼 자연스럽게 대화로 풀고, 거기서 오늘 읽을 책으로 흘러들어가라.

상황: ${situation}
</opening_situation>

<few_shot_examples>
아래 예시들은 품질이 검증된 실제 대본이다.
이 톤과 리듬을 정확히 참고해서 써라.

=== 잘 된 오프닝 예시 ===
${formatExampleTurns(EXAMPLE_OPENING.examples)}

=== 잘 된 티키타카 예시 ===
${formatExampleTurns(EXAMPLE_TIKTAKA.examples)}

=== 잘 된 클로징 예시 ===
${formatExampleTurns(EXAMPLE_CLOSING.examples)}
</few_shot_examples>

<writing_rules>
핵심: 친구끼리 노는 에너지. 정보보다 재미가 먼저다.

1. 반말 필수 — "~요", "~습니다" 절대 금지
   O: "맞아", "완전", "그렇지", "야", "아 진짜?", "웃기지 않아?"
   X: "맞아요", "그렇죠", "공감이에요"
2. 짧게 치고받아라 — 한 문장 50자 이내, 자주 교대
3. 영문 약어 금지 — AI→에이아이, CEO→씨이오
4. 연기 지시어 금지 — [웃음], (사이) 등
5. 제임스 먼저, 스텔라가 이어받는 교대 패턴
6. 강의 형식 금지 — 한 사람이 길게 혼자 설명하면 실패
7. 의견 충돌 구간에서 두 사람이 살짝 다른 생각을 갖다가 자연스럽게 합의
8. 청취자에게 직접 말 거는 것 절대 금지 — "청취자분들", "여러분" 사용 금지
   두 사람이 자기들끼리 얘기하는 거다. 청취자는 그걸 엿듣는 구조
</writing_rules>

<task>
위 흐름과 예시를 참고해 팟캐스트 대본을 작성하라.
JSON Array만 출력하라. 다른 텍스트 없음.
형식: [{"speaker": "제임스", "text": "..."}, {"speaker": "스텔라", "text": "..."}, ...]
</task>`;

  let script;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let raw = response.content[0].text.trim();
    raw = raw.replace(/<thinking>[\s\S]*?<\/antml:thinking>/gi, '')
             .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
    raw = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
    const jsonStart = raw.indexOf('[');
    const jsonEnd = raw.lastIndexOf(']') + 1;
    if (jsonStart === -1 || jsonEnd === 0) {
      console.log(`  ⚠️ [Agent 3] JSON 없음, 재시도 ${attempt}/3`);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    try {
      script = JSON.parse(raw.substring(jsonStart, jsonEnd));
      break;
    } catch (e) {
      console.log(`  ⚠️ [Agent 3] JSON 파싱 실패, 재시도 ${attempt}/3`);
      if (attempt === 3) throw new Error(`[Agent 3] JSON 파싱 3회 실패: ${e.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const charCount = script.map(t => t.text).join('').length;
  console.log(`  ✅ [Agent 3] 완료 — ${script.length}턴, ${charCount}자`);
  return script;
}
