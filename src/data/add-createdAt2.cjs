const fs = require('fs');
const file = 'c:/Users/admin/Desktop/book/the-archive/src/data/celebrities.js';
let content = fs.readFileSync(file, 'utf8');

const titles = ['뇌 욕망의 비밀을 풀다', '싱크 어게인', '생각에 관한 생각', '당신의 뇌는 최적화를 원한다'];
const timeBase = Date.now();

try {
    titles.forEach((t, i) => {
        const titleIndex = content.indexOf(`"title": "${t}"`);
        if(titleIndex > -1) {
            const actionGuideStr = `"actionGuide": [`;
            const actionGuideIndex = content.indexOf(actionGuideStr, titleIndex);
            if (actionGuideIndex > -1) {
                const actionGuideEnd = content.indexOf(`]`, actionGuideIndex) + 1;
                content = content.slice(0, actionGuideEnd) + `,\n                        "createdAt": ${timeBase - (i * 1000)}` + content.slice(actionGuideEnd);
            }
        }
    });
    fs.writeFileSync(file, content);
    console.log("Updated celebrities.js with createdAt.");
} catch(e) {
    console.error(e);
}
