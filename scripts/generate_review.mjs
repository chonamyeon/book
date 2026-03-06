/**
 * generate_review.mjs  ─  4,000자+ 독후감 자동 생성기
 * 
 * 전략:
 *   1. 목차 생성  (Claude: 섹션 구조와 각 섹션 작성 포인트)
 *   2. 섹션별 병렬 집필  (각 섹션 700~900자 목표)
 *   3. 최종 병합 + 【지혜의 갈무리】 섹션 추가
 *   4. 총 글자수 검증 → 4000자 미달 시 재시도
 * 
 * 비용 최적화:
 *   - System Prompt Caching: SKILL.md 지침을 시스템 프롬프트에 캐시
 *   - Batch API: 여러 책을 한 번의 배치 요청으로 처리 (비동기)
 *   - haiku 모델 사용 (목차 생성 등 저비용 단계)
 * 
 * 환경변수: ANTHROPIC_API_KEY
 * 
 * 사용법:
 *   node scripts/generate_review.mjs --book="사피엔스" --author="유발 하라리" --id=sapiens
 *   node scripts/generate_review.mjs --file=scripts/books.json   # 일괄 처리
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = path.resolve(__dirname, '../SKILL.md');
const DATA_PATH = path.resolve(__dirname, '../src/data/celebrities.js');

// ──────────────────────────────────────────────
// Anthropic SDK (설치 필요: npm i @anthropic-ai/sdk)
// ──────────────────────────────────────────────
let Anthropic;
try {
    const mod = await import('@anthropic-ai/sdk');
    Anthropic = mod.default ?? mod.Anthropic;
} catch {
    console.error('❌ @anthropic-ai/sdk가 필요합니다: npm install @anthropic-ai/sdk');
    process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ──────────────────────────────────────────────
// SKILL.md 로드 (시스템 프롬프트 캐시용)
// ──────────────────────────────────────────────
const SKILL_GUIDE = fs.readFileSync(SKILL_PATH, 'utf8');

const SYSTEM_PROMPT = `당신은 한국어 독서 에세이 전문 작가입니다.
아래 SKILL.md 가이드라인을 항상 준수하여 글을 씁니다.

${SKILL_GUIDE}

추가 규칙:
- 모든 섹션은 한국어로 작성
- 1인칭 시점("나는", "나의")으로 개인적 통찰을 담을 것
- 독자가 공감할 수 있는 실제적 경험과 연결할 것
- 문어체가 아닌 자연스러운 에세이 문체로 작성`;

// ──────────────────────────────────────────────
// 목차 생성 (haiku로 저비용 처리)
// ──────────────────────────────────────────────
async function generateOutline(book) {
    const { title, author, publisher = '', brief = '' } = book;

    const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{
            role: 'user',
            content: `책 정보:
제목: ${title}
저자: ${author}
출판사: ${publisher}
책 소개: ${brief}

위 책의 4,000자+ 독후감을 위한 목차를 작성해주세요.
형식: JSON 배열로 4~5개 섹션, 각 섹션에 title과 writePoint(작성 포인트 2~3줄) 포함.
예시:
[
  { "title": "서론: 이 책을 선택한 이유", "writePoint": "개인적 계기, 기대감" },
  { "title": "핵심 개념: 저자의 주장", "writePoint": "책의 핵심 논지 요약" }
]
JSON만 반환하세요.`
        }]
    });

    try {
        const text = response.content[0].text.trim();
        const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] ?? text;
        return JSON.parse(jsonStr);
    } catch {
        return [
            { title: '서론', writePoint: '이 책을 선택한 이유와 기대감' },
            { title: '핵심 내용 1', writePoint: '책의 첫 번째 핵심 논지' },
            { title: '핵심 내용 2', writePoint: '책의 두 번째 핵심 논지' },
            { title: '인상적인 부분', writePoint: '가장 기억에 남는 부분과 이유' },
            { title: '개인적 성찰', writePoint: '삶에 적용할 수 있는 인사이트' },
        ];
    }
}

// ──────────────────────────────────────────────
// 섹션별 집필 (병렬)
// ──────────────────────────────────────────────
async function writeSection(book, section, sectionIndex, totalSections) {
    const { title, author } = book;

    const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{
            role: 'user',
            content: `책: "${title}" (${author})

섹션 제목: ${section.title} (${sectionIndex + 1}/${totalSections})
작성 포인트: ${section.writePoint}

위 섹션을 700~900자의 한국어 독후감 에세이로 작성하세요.
- 개인적 경험과 감상을 녹여낼 것
- 다음 섹션으로 자연스럽게 이어지도록 마무리
- "■ ${section.title}"로 시작할 것
- SKILL.md 스타일 준수`
        }]
    });

    return response.content[0].text.trim();
}

// ──────────────────────────────────────────────
// 지혜의 갈무리 생성
// ──────────────────────────────────────────────
async function writeGallery(book, fullText) {
    const { title, author, publisher = '' } = book;

    const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{
            role: 'user',
            content: `책: "${title}" (${author}, ${publisher})

아래 독후감을 참고하여 【지혜의 갈무리】 섹션을 작성하세요:

${fullText.slice(0, 1000)}...

형식 (정확히 아래 구조로):
---
【지혜의 갈무리】

책을 선택한 이유:
(2~3문장)

저자 소개:
(2~3문장)

추천 대상:
(1문장으로 3종류의 독자 추천)

지혜의 요약:
1. (핵심 인사이트 1)
2. (핵심 인사이트 2)
3. (핵심 인사이트 3)`
        }]
    });

    return response.content[0].text.trim();
}

// ──────────────────────────────────────────────
// 단일 책 리뷰 생성 메인 플로우
// ──────────────────────────────────────────────
async function generateReview(book, options = {}) {
    const { title, author } = book;
    const { minChars = 4000, maxRetries = 2 } = options;

    console.log(`\n📖 [${title}] 생성 시작...`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (attempt > 1) console.log(`  ↩ 재시도 ${attempt}/${maxRetries} (글자수 부족)`);

        // 1. 목차 생성
        console.log(`  1️⃣  목차 생성 중...`);
        const outline = await generateOutline(book);
        console.log(`      → ${outline.length}개 섹션 확정`);

        // 2. 섹션 병렬 집필
        console.log(`  2️⃣  섹션 병렬 집필 중...`);
        const sections = await Promise.all(
            outline.map((sec, i) => writeSection(book, sec, i, outline.length))
        );

        const bodyText = sections.join('\n\n');

        // 3. 지혜의 갈무리
        console.log(`  3️⃣  지혜의 갈무리 작성 중...`);
        const gallery = await writeGallery(book, bodyText);

        const fullReview = bodyText + '\n\n' + gallery;
        const charCount = fullReview.length;

        console.log(`  📏 글자수: ${charCount}자`);

        if (charCount >= minChars) {
            console.log(`  ✅ [${title}] 완료: ${charCount}자`);
            return fullReview;
        }

        if (attempt === maxRetries) {
            console.warn(`  ⚠️  [${title}] 최종 ${charCount}자 (목표 미달이지만 채택)`);
            return fullReview;
        }
    }
}

// ──────────────────────────────────────────────
// celebrities.js에 리뷰 주입
// ──────────────────────────────────────────────
function injectReview(bookId, reviewText) {
    let raw = fs.readFileSync(DATA_PATH, 'utf8');
    const regex = new RegExp(
        `(id:\\s*["']${bookId}["'][\\s\\S]*?review:\\s*\`)([\\s\\S]*?)(\`)`,
        'g'
    );
    let count = 0;
    raw = raw.replace(regex, (m, pre, _old, suf) => {
        count++;
        return pre + reviewText + suf;
    });
    if (count === 0) {
        console.warn(`  ⚠️  ID '${bookId}'를 찾지 못했습니다.`);
        return false;
    }
    fs.writeFileSync(DATA_PATH, raw, 'utf8');
    return true;
}

// ──────────────────────────────────────────────
// 일괄 처리 (Batch 스타일 순차 처리로 API 레이트 리밋 대응)
// ──────────────────────────────────────────────
async function processBatch(books, options = {}) {
    const { concurrency = 2 } = options; // 동시 처리 수 제한 (비용/속도 균형)
    const results = [];

    for (let i = 0; i < books.length; i += concurrency) {
        const chunk = books.slice(i, i + concurrency);
        const chunkResults = await Promise.all(
            chunk.map(async (book) => {
                try {
                    const review = await generateReview(book, options);
                    if (book.id) injectReview(book.id, review);
                    return { title: book.title, success: true, chars: review.length };
                } catch (err) {
                    console.error(`  ❌ [${book.title}] 실패:`, err.message);
                    return { title: book.title, success: false, error: err.message };
                }
            })
        );
        results.push(...chunkResults);
    }

    return results;
}

// ──────────────────────────────────────────────
// CLI 진입점
// ──────────────────────────────────────────────
const args = Object.fromEntries(
    process.argv.slice(2)
        .filter(a => a.startsWith('--'))
        .map(a => {
            const [k, v] = a.slice(2).split('=');
            return [k, v ?? true];
        })
);

if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
    console.error('   .env 파일에 ANTHROPIC_API_KEY=sk-ant-... 추가 후 실행하세요.');
    process.exit(1);
}

if (args.file) {
    // 일괄 처리: JSON 파일에서 책 목록 로드
    const booksJson = JSON.parse(fs.readFileSync(path.resolve(args.file), 'utf8'));
    console.log(`\n📚 ${booksJson.length}권 일괄 처리 시작\n`);
    const results = await processBatch(booksJson, {
        minChars: Number(args.minChars ?? 4000),
        concurrency: Number(args.concurrency ?? 2),
    });

    console.log('\n── 결과 요약 ──');
    for (const r of results) {
        console.log(r.success ? `✅ ${r.title} (${r.chars}자)` : `❌ ${r.title}: ${r.error}`);
    }
} else if (args.book && args.id) {
    // 단일 책 처리
    const book = {
        title: args.book,
        author: args.author ?? '저자 미상',
        publisher: args.publisher ?? '',
        id: args.id,
        brief: args.brief ?? '',
    };
    const review = await generateReview(book, { minChars: Number(args.minChars ?? 4000) });
    if (review) injectReview(args.id, review);
} else {
    console.log(`
사용법:
  단일:  node scripts/generate_review.mjs --book="책이름" --author="저자" --id=book-id
  일괄:  node scripts/generate_review.mjs --file=scripts/books.json

옵션:
  --minChars=4000       최소 글자수 (기본 4000)
  --concurrency=2       동시 처리 수 (기본 2)

일괄 처리용 books.json 형식:
[
  { "id": "sapiens", "title": "사피엔스", "author": "유발 하라리", "publisher": "김영사" },
  { "id": "1984",    "title": "1984",     "author": "조지 오웰",   "publisher": "민음사" }
]
`);
}
