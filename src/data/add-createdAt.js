const fs = require('fs');
const file = 'c:/Users/admin/Desktop/book/the-archive/src/data/celebrities.js';
let content = fs.readFileSync(file, 'utf8');

const titles = ['뇌 욕망의 비밀을 풀다', '싱크 어게인', '생각에 관한 생각', '당신의 뇌는 최적화를 원한다'];
const timeBase = Date.now();

let parsed;
try {
    // The file exports `export const celebrities = [...]`
    // Let's parse it manually or just use regex more carefully.
    // It's safer to find the title string, then find the closing bracket of the object.
    titles.forEach((t, i) => {
        const titleIndex = content.indexOf(`"title": "${t}"`);
        if(titleIndex > -1) {
            // we are inside the book object. Let's find the closing brace for actionGuide or the book object.
            // Since we know the structure of these 4 books (from `add-4-books.js`), they all end with `actionGuide` array closing bracket `]` then `}`.
            // Let's find the actionGuide array end:
            const actionGuideStr = `"actionGuide": [`;
            const actionGuideIndex = content.indexOf(actionGuideStr, titleIndex);
            if (actionGuideIndex > -1) {
                const actionGuideEnd = content.indexOf(`]`, actionGuideIndex) + 1;
                // Insert createdAt right before the closing brace of the book object OR after actionGuide
                content = content.slice(0, actionGuideEnd) + `,\n                        "createdAt": ${timeBase - (i * 1000)}` + content.slice(actionGuideEnd);
            }
        }
    });
    fs.writeFileSync(file, content);
    console.log("Updated celebrities.js with createdAt.");
} catch(e) {
    console.error(e);
}
