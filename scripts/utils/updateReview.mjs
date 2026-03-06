/**
 * updateReview.mjs
 * celebrities.js 파일에서 특정 bookId의 review를 교체하는 공통 유틸
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../src/data/celebrities.js');

/**
 * ID 기반으로 리뷰 교체
 * @param {Record<string, string>} reviews - { bookId: reviewText }
 * @returns {{ updated: number, skipped: string[] }}
 */
export function applyReviewsById(reviews) {
    let raw = fs.readFileSync(DATA_PATH, 'utf8');
    let updatedCount = 0;
    const skipped = [];

    for (const [bookId, newReview] of Object.entries(reviews)) {
        const regex = new RegExp(
            `(id:\\s*["']${bookId}["'][\\s\\S]*?review:\\s*\`)([\\s\\S]*?)(\`)`,
            'g'
        );
        let matched = false;
        raw = raw.replace(regex, (match, pre, _old, suf) => {
            matched = true;
            updatedCount++;
            return pre + newReview + suf;
        });
        if (!matched) skipped.push(bookId);
    }

    fs.writeFileSync(DATA_PATH, raw, 'utf8');
    return { updated: updatedCount, skipped };
}

/**
 * 제목 기반으로 리뷰 교체
 * @param {Record<string, string>} reviews - { title: reviewText }
 * @returns {{ updated: number, skipped: string[] }}
 */
export function applyReviewsByTitle(reviews) {
    let raw = fs.readFileSync(DATA_PATH, 'utf8');
    let updatedCount = 0;
    const skipped = [];

    for (const [title, newReview] of Object.entries(reviews)) {
        const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(
            `(title:\\s*["'\`]${escaped}["'\`][\\s\\S]*?review:\\s*\`)([\\s\\S]*?)(\`)`,
            'g'
        );
        let matched = false;
        raw = raw.replace(regex, (match, pre, _old, suf) => {
            matched = true;
            updatedCount++;
            return pre + newReview + suf;
        });
        if (!matched) skipped.push(title);
    }

    fs.writeFileSync(DATA_PATH, raw, 'utf8');
    return { updated: updatedCount, skipped };
}

/**
 * 현재 모든 책 리뷰 길이 통계 출력
 */
export function printStats() {
    const { celebrities } = await import('../../src/data/celebrities.js');
    const results = [];

    for (const c of celebrities) {
        for (const b of c.books ?? []) {
            if (b.review) {
                results.push({ celeb: c.name, title: b.title, chars: b.review.length });
            }
        }
    }

    results.sort((a, b) => a.chars - b.chars);
    let under = 0;

    for (const r of results) {
        const icon = r.chars >= 4000 ? '🟢' : r.chars >= 2000 ? '🟡' : '🔴';
        if (r.chars < 4000) under++;
        console.log(`${icon} ${r.chars}자 | ${r.celeb} - ${r.title}`);
    }

    const avg = Math.round(results.reduce((s, r) => s + r.chars, 0) / results.length);
    console.log(`\n총 ${results.length}권 | 평균 ${avg}자 | 4000자 미만 ${under}권`);
}
