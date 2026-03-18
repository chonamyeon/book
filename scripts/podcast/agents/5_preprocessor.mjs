/**
 * Agent 5: TTS 전처리기 (Preprocessor)
 * LLM 없이 rule-based로 처리한다.
 * 발음 교정 + 긴 문장 경고.
 */

import { preprocessForTTS, warnLongSentences } from '../resources/pronunciation.mjs';

/**
 * @param {Array<{speaker: string, text: string}>} script
 * @returns {Array<{speaker: string, text: string}>}
 */
export function runPreprocessor(script) {
  console.log('  🔧 [Agent 5] 전처리기 실행 중...');

  // 발음 교정 적용
  const processed = preprocessForTTS(script);

  // 긴 문장 경고 (수정하지 않고 알림만)
  warnLongSentences(processed);

  // 변경된 항목 수 카운트
  let changed = 0;
  for (let i = 0; i < script.length; i++) {
    if (script[i].text !== processed[i].text) changed++;
  }

  console.log(`  ✅ [Agent 5] 완료 — ${changed}개 턴 발음 교정 적용`);
  return processed;
}
