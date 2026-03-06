import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { extractTextFromFile } from './auto_podcast_pipeline.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOK_ID = 'intelligent-investor';
const JSON_OUTPUT = path.resolve(__dirname, `../final_podcast/${BOOK_ID}_script.json`);
const TXT_OUTPUT = path.resolve(__dirname, '../final_podcast/현명한투자자_대본.txt');

async function main() {
    console.log("📖 책 내용 추출 중...");
    let bookText = '';
    try {
        bookText = await extractTextFromFile(`${BOOK_ID}.txt`);
    } catch (e) {
        console.error("원본 텍스트를 불러오는데 실패했습니다.", e);
        bookText = "현명한 투자자 (The Intelligent Investor) - 벤저민 그레이엄. 투기 대신 가치투자에 대한 성찰을 담은 직장인들의 도서 리뷰.";
    }

    console.log("🤖 Claude API로 50턴 이하의 새로운 대본 생성 중...");

    const prompt = `당신은 오리지널 팟캐스트 대본을 쓰는 프로 작가입니다.

【이 팟캐스트의 핵심 정체성】
이 대본은 책을 소개하는 것이 아닙니다. 책 속 아이디어를 소재로 삼아, 제임스와 스텔라가 
자신들의 직장생활·일상·인간관계에 직접 대입해서 공감하고 토론하는 오리지널 토크 콘텐츠입니다.

【대화 스타일 및 구조】
- 친한 직장 동료 두 명이 퇴근 후 맥주 한 잔 하면서 하는 대화체.
- 책 내용보다는 현실 시나리오(투자 실패, 주식 앱, 상사, 야근 등)에 비유.
- "안녕하세요", "인사말" 등 방송 느낌의 인사는 생략하고 냅다 본론으로 শুরু.

【❗️가장 중요한 절대 규칙 (턴 수 제한)❗️】
- 반드시 제임스(남/인덱스0)로 시작하여 스텔라(여/인덱스1)와 완벽하게 번갈아 가며 진행하세요.
- 총 대화 턴(Turn) 수는 절대로 50턴을 넘어서는 안 됩니다. (최대 50턴 이하, 목표 46~50턴)
- 턴 수를 줄이기 위해 한 사람이 한 번 말할 때 호흡을 길게 가져가세요. (한 턴당 5~8문장 이상 길게 말해도 완벽하게 허용됨)
- 대사의 밀도를 높여서 깊은 이야기를 한 턴 안에 많이 담으세요.
- 절대로 [웃음], (한숨) 같은 지문 괄호를 쓰지 마세요.

형식:
[
  {"speaker": "제임스", "text": "..."},
  {"speaker": "스텔라", "text": "..."}
]

본문 텍스트:
${bookText.substring(0, 8000)}`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let script = null;

    try {
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = message.content[0].text;
        const jsonStart = text.indexOf('[');
        const jsonEnd = text.lastIndexOf(']') + 1;
        script = JSON.parse(text.substring(jsonStart, jsonEnd));

        const bannedKeywords = ["안녕하세요", "누구입니다", "에디토리얼", "진행", "반갑습니다", "제임스입니다"];
        while (script.length > 1) {
            const firstPara = script[0].text;
            if (bannedKeywords.some(k => firstPara.includes(k))) {
                script.splice(0, 2);
            } else {
                break;
            }
        }

        console.log(`✅ 생성 완료! 총 턴 수: ${script.length}턴`);

        // JSON 저장 (기존 파이프라인에서 인식하도록)
        fs.writeFileSync(JSON_OUTPUT, JSON.stringify(script, null, 2), 'utf-8');

        // TXT 저장 (고객 열람용)
        let textContent = `📚 현명한 투자자 (The Intelligent Investor) - 팟캐스트 대본 (50턴 버전)\n`;
        textContent += `===========================================================\n\n`;

        script.forEach((turn, idx) => {
            textContent += `[Turn ${idx} - ${turn.speaker}]\n${turn.text}\n\n`;
        });

        fs.writeFileSync(TXT_OUTPUT, textContent, 'utf-8');
        console.log(`✅ 텍스트 대본 업데이트 완료: ${TXT_OUTPUT}`);

    } catch (err) {
        console.error("대본 생성 실패:", err.message);
    }
}

main();
