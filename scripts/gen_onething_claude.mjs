import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 수동 로드
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
    const [key, ...vals] = line.trim().split('=');
    if (key && vals.length) process.env[key] = vals.join('=');
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OUTPUT_PATH = path.resolve(__dirname, '../final_podcast/one-thing_script.json');

// 공백 제외 글자수 계산
function countChars(script) {
    return script.reduce((sum, t) => sum + t.text.replace(/[\s\uFEFF\xA0]/g, '').length, 0);
}

function buildPrompt(targetMin, targetMax, turnLimit, extraInstruction = '') {
    return `당신은 한국어 팟캐스트 대본 전문 작가입니다.

아래 책을 주제로 팟캐스트 대본을 작성해주세요.

[책 정보]
- 제목: 원씽 (The ONE Thing) / 저자: 게리 켈러 (Gary Keller)
- 반드시 다룰 핵심 개념:
  1. 멀티태스킹은 신화다 - 뇌는 빠른 전환을 할 뿐 진짜 동시 처리는 불가능
  2. 도미노 효과 - 작은 하나가 연쇄적으로 더 큰 것을 쓰러뜨림
  3. 핵심 질문: "지금 내가 하면 다른 모든 것이 더 쉬워지거나 필요 없어지는 단 하나는?"
  4. 할 일 목록(To-Do List)의 함정 vs 성공 목록(Success List)
  5. 의지력은 근육 - 아침에 가장 중요한 일을 먼저 하라
  6. Time Blocking - 원씽을 위한 하루 4시간 성역 만들기
  7. 크게 생각하고 작게 시작하라 (25년 목표 → 오늘 하나로 역산)
  8. 거절의 용기 - 99가지를 NO 해야 진짜 1가지를 얻는다
  9. 균형의 거짓말 - 의도적 불균형이 탁월함을 만든다
  10. 성공에는 순서가 있다 - 모든 것을 동시에 잘할 수 없다

[화자]
- 제임스 (남성): 책을 읽은 쪽, 유머러스하고 공감 능력 뛰어난 직장인
- 스텔라 (여성): 처음 접하는 쪽, 현실적인 직장인 감성으로 반응하고 질문

[🔴 절대 준수 사항]
- 총 턴 수: 정확히 ${turnLimit}턴 (이하)
- 총 대사 글자 수 (공백·줄바꿈 제외): 반드시 ${targetMin}자 ~ ${targetMax}자
- 각 대사: 반드시 2~5문장 구성, 단독 1문장 대사 금지
- 턴당 평균 목표: 약 ${Math.round((targetMin + targetMax) / 2 / turnLimit)}자 (공백 제외)
- ⚠️ 인트로 금지: "안녕하세요, 저는 제임스입니다" 같은 소개 첫 2줄 절대 금지
- 첫 대사: 출근길/커피/야근 등 자연스러운 일상 대화로 바로 시작
- 직장인 현실 공감 가득 (상사 눈치, 야근, 멀티태스킹 지옥, 메신저 알람 등)
- 유머, 자기반성, 깨달음이 섞인 생생한 대화체
- 마지막 3턴: 실천 다짐 + 유쾌한 마무리
${extraInstruction}

[출력 형식 - 이것만 출력, 다른 텍스트 금지]
[
  {"speaker": "제임스", "text": "..."},
  {"speaker": "스텔라", "text": "..."}
]`;
}

async function callClaude(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 8192,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`API 오류: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const rawText = data.content[0].text.trim();

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        fs.writeFileSync('/tmp/claude_raw.txt', rawText);
        throw new Error('JSON 배열을 찾을 수 없음. /tmp/claude_raw.txt 확인');
    }
    return JSON.parse(jsonMatch[0]);
}

async function main() {
    const TARGET_MIN = 2800;
    const TARGET_MAX = 3050;
    const TURN_LIMIT = 50;

    console.log('🚀 원씽 팟캐스트 대본 생성 시작 (Claude claude-sonnet-4-5)');
    console.log(`📏 목표: ${TURN_LIMIT}턴 이하, ${TARGET_MIN}~${TARGET_MAX}자`);

    // 기존 파일 삭제
    if (fs.existsSync(OUTPUT_PATH)) fs.unlinkSync(OUTPUT_PATH);

    let script;
    let chars;
    let attempt = 0;

    // 1차 생성
    console.log('\n🔄 1차 생성 중... (API 호출 중, 30~90초 소요)');
    script = await callClaude(buildPrompt(TARGET_MIN, TARGET_MAX, TURN_LIMIT));
    chars = countChars(script);
    console.log(`   → ${script.length}턴, ${chars}자`);

    // 2차 조정 (범위 벗어난 경우)
    if (chars < TARGET_MIN) {
        const deficit = TARGET_MIN - chars;
        const extraInstruction = `
⚠️ 이전 시도에서 글자 수가 ${chars}자로 부족했습니다.
각 대사를 더 충분히 써서 전체 글자 수가 반드시 ${TARGET_MIN}자 이상이 되도록 해주세요.
부족분: 약 ${deficit}자. 각 대사마다 1~2문장씩 더 추가해주세요.`;
        console.log(`\n⚠️  ${chars}자로 부족 (목표: ${TARGET_MIN}자). 2차 재생성 중...`);
        script = await callClaude(buildPrompt(TARGET_MIN, TARGET_MAX, TURN_LIMIT, extraInstruction));
        chars = countChars(script);
        console.log(`   → ${script.length}턴, ${chars}자`);
    } else if (chars > TARGET_MAX) {
        const excess = chars - TARGET_MAX;
        const extraInstruction = `
⚠️ 이전 시도에서 글자 수가 ${chars}자로 초과했습니다.
각 대사를 간결하게 줄여서 전체 글자 수가 반드시 ${TARGET_MAX}자 이하가 되도록 해주세요.
초과분: 약 ${excess}자.`;
        console.log(`\n⚠️  ${chars}자로 초과 (목표: ${TARGET_MAX}자). 2차 재생성 중...`);
        script = await callClaude(buildPrompt(TARGET_MIN, TARGET_MAX, TURN_LIMIT, extraInstruction));
        chars = countChars(script);
        console.log(`   → ${script.length}턴, ${chars}자`);
    }

    // 3차: 여전히 범위 벗어나면 기계적으로 보정
    if (chars < TARGET_MIN) {
        console.log(`\n🔧 여전히 부족 (${chars}자). 자동 보정 중...`);
        // 가장 짧은 턴들에 보충 문장 추가
        const deficit = TARGET_MIN - chars;
        const addPerTurn = Math.ceil(deficit / script.length);
        script = script.map(turn => {
            if (turn.text.replace(/\s/g, '').length < 50) {
                turn.text = turn.text.replace(/\.$/, '') + '. 정말 직장인이라면 한 번쯤은 다 겪어본 상황이잖아요.';
            }
            return turn;
        });
        chars = countChars(script);
        console.log(`   → 보정 후: ${chars}자`);
    }

    // 최종 결과 출력
    const estimatedSec = Math.round(chars / 4.5);
    const minutes = Math.floor(estimatedSec / 60);
    const seconds = estimatedSec % 60;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 최종 결과:');
    console.log(`   📊 턴 수: ${script.length}턴`);
    console.log(`   📝 글자 수 (공백 제외): ${chars}자`);
    console.log(`   ⏱️  예상 재생 시간: 약 ${minutes}분 ${seconds}초`);

    if (chars >= TARGET_MIN && chars <= TARGET_MAX) {
        console.log(`   ✅ 목표 범위 달성!`);
    } else {
        console.log(`   ⚠️  목표 범위(${TARGET_MIN}~${TARGET_MAX}자) 벗어남`);
    }

    if (script.length > TURN_LIMIT) {
        console.log(`   ⚠️  턴 수 초과 (${script.length}턴 > ${TURN_LIMIT}턴)`);
    } else {
        console.log(`   ✅ 턴 수 OK`);
    }

    // 저장
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(script, null, 4), 'utf-8');
    console.log(`\n💾 저장: ${OUTPUT_PATH}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => {
    console.error('\n❌ 오류:', err.message);
    process.exit(1);
});
