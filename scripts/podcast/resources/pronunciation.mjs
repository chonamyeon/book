// TTS 발음 교정 테이블
// Agent 5 (전처리기)에서 사용. LLM 없이 rule-based로 처리.

export const PRONUNCIATION_MAP = [
  // ─── 영문 약어 (TTS가 영어로 읽거나 뭉개짐) ───
  [/\bAI\b/g, '에이아이'],
  [/\bCEO\b/g, '씨이오'],
  [/\bCFO\b/g, '씨에프오'],
  [/\bCTO\b/g, '씨티오'],
  [/\bCOO\b/g, '씨오오'],
  [/\bHR\b/g, '에이치알'],
  [/\bMBA\b/g, '엠비에이'],
  [/\bKPI\b/g, '케이피아이'],
  [/\bOKR\b/g, '오케알'],
  [/\bROI\b/g, '알오아이'],
  [/\bESG\b/g, '이에스지'],
  [/\bIPO\b/g, '아이피오'],
  [/\bSNS\b/g, '에스엔에스'],
  [/\bTED\b/g, '테드'],
  [/\bIT\b/g, '아이티'],
  [/\bPPT\b/g, '피피티'],
  [/\bQR\b/g, '큐알'],
  [/\bNFT\b/g, '엔에프티'],
  [/\bLLM\b/g, '엘엘엠'],
  [/\bGPT\b/g, '지피티'],

  // ─── 숫자 + 단위 ───
  [/(\d+)\s*%/g, (_, n) => `${n}퍼센트`],
  [/(\d+)\s*배/g, (_, n) => `${n}배`],

  // ─── 연기 지시어 제거 (TTS가 그냥 읽어버림) ───
  [/\[.*?\]/g, ''],
  [/\(웃음\)/g, ''],
  [/\(잠시\s*침묵\)/g, ''],
  [/\(사이\)/g, ''],
  [/\(잠시\)/g, ''],
  [/\(멈춤\)/g, ''],

  // ─── 과도한 문장 부호 정리 ───
  [/\.{4,}/g, '...'],
  [/!{2,}/g, '!'],
  [/~{2,}/g, '~'],
  [/\?{2,}/g, '?'],
];

/**
 * 스크립트 전체에 발음 교정을 적용한다.
 * @param {Array<{speaker: string, text: string}>} script
 * @returns {Array<{speaker: string, text: string}>}
 */
export function preprocessForTTS(script) {
  return script.map(turn => ({
    ...turn,
    text: applyMap(turn.text),
  }));
}

/**
 * 단일 텍스트에 발음 교정 적용
 * @param {string} text
 * @returns {string}
 */
export function applyMap(text) {
  let result = text;
  for (const [pattern, replacement] of PRONUNCIATION_MAP) {
    result = typeof replacement === 'function'
      ? result.replace(pattern, replacement)
      : result.replace(pattern, replacement);
  }
  return result.trim();
}

/**
 * 긴 문장 경고 출력 (60자 초과 시)
 * @param {Array<{speaker: string, text: string}>} script
 */
export function warnLongSentences(script) {
  for (const [i, turn] of script.entries()) {
    const sentences = turn.text.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      if (s.length > 60) {
        console.warn(`  ⚠️  turn ${i} (${turn.speaker}) 긴 문장 ${s.length}자: "${s.substring(0, 45)}..."`);
      }
    }
  }
}
