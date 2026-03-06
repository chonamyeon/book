/**
 * appendReview.mjs
 * 기존 리뷰의 【지혜의 갈무리】 앞에 추가 섹션을 삽입합니다.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_PATH = path.resolve(__dirname, '../../src/data/celebrities.js');

/**
 * bookId 기준으로 기존 review에 appendText를 삽입
 * 삽입 위치: "---\n【지혜의 갈무리】" 직전
 */
export function appendById(additions) {
    let raw = fs.readFileSync(DATA_PATH, 'utf8');
    let count = 0;

    for (const [bookId, appendText] of Object.entries(additions)) {
        // review 블록 전체를 캡처
        const regex = new RegExp(
            `(id:\\s*["']${bookId}["'][\\s\\S]*?review:\\s*\`)([\\s\\S]*?)(\`)`,
            'g'
        );
        raw = raw.replace(regex, (match, pre, existing, suf) => {
            if (existing.includes(appendText.slice(0, 30))) return match; // 중복 방지

            // 갈무리 구분선 앞에 삽입, 없으면 끝에 추가
            const insertPoint = existing.lastIndexOf('\n---\n');
            let newReview;
            if (insertPoint !== -1) {
                newReview =
                    existing.slice(0, insertPoint) +
                    '\n\n' + appendText +
                    existing.slice(insertPoint);
            } else {
                newReview = existing + '\n\n' + appendText;
            }
            count++;
            console.log(`  ✅ ${bookId}: ${existing.length}자 → ${newReview.length}자 (+${newReview.length - existing.length}자)`);
            return pre + newReview + suf;
        });
    }

    fs.writeFileSync(DATA_PATH, raw, 'utf8');
    return count;
}

/** 제목 기준 */
export function appendByTitle(additions) {
    let raw = fs.readFileSync(DATA_PATH, 'utf8');
    let count = 0;

    for (const [title, appendText] of Object.entries(additions)) {
        const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(
            `(title:\\s*["'\`]${esc}["'\`][\\s\\S]*?review:\\s*\`)([\\s\\S]*?)(\`)`,
            'g'
        );
        raw = raw.replace(regex, (match, pre, existing, suf) => {
            if (existing.includes(appendText.slice(0, 30))) return match;
            const insertPoint = existing.lastIndexOf('\n---\n');
            let newReview;
            if (insertPoint !== -1) {
                newReview = existing.slice(0, insertPoint) + '\n\n' + appendText + existing.slice(insertPoint);
            } else {
                newReview = existing + '\n\n' + appendText;
            }
            count++;
            console.log(`  ✅ "${title}": ${existing.length}자 → ${newReview.length}자 (+${newReview.length - existing.length}자)`);
            return pre + newReview + suf;
        });
    }

    fs.writeFileSync(DATA_PATH, raw, 'utf8');
    return count;
}
