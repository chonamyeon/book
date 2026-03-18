/**
 * Gemini API 호출 헬퍼 (텍스트 생성)
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error('ERROR: VITE_GEMINI_API_KEY 환경변수 없음');
}

/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {number} maxTokens
 * @returns {Promise<string>} 응답 텍스트
 */
export async function callGemini(systemPrompt, userPrompt, maxTokens = 8000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 1 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API 오류 ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
