import puppeteer from 'puppeteer-core';

async function main() {
    const browser = await puppeteer.connect({
        browserURL: 'http://127.0.0.1:9222',
        defaultViewport: null
    });

    const pages = await browser.pages();
    const elPage = pages.find(p => p.url().includes('elevenlabs.io'));
    if (!elPage) { console.error('❌ 탭 없음'); return; }

    // 모든 input 유형 요소의 위치/크기/내용 출력
    const result = await elPage.evaluate(() => {
        const sels = ['textarea', 'input[type="text"]', 'input:not([type])', '[contenteditable="true"]', '[data-slate-editor="true"]'];
        const all = [];
        for (const sel of sels) {
            document.querySelectorAll(sel).forEach(el => {
                const r = el.getBoundingClientRect();
                const s = window.getComputedStyle(el);
                all.push({
                    tag: el.tagName,
                    sel,
                    x: Math.round(r.left),
                    y: Math.round(r.top + window.scrollY),
                    w: Math.round(r.width),
                    h: Math.round(r.height),
                    display: s.display,
                    visibility: s.visibility,
                    placeholder: el.placeholder || el.getAttribute('placeholder') || '',
                    value: (el.value || el.innerText || '').substring(0, 30),
                });
            });
        }
        all.sort((a, b) => a.y - b.y);
        return all;
    });

    console.log(`\n총 ${result.length}개 발견:\n`);
    result.forEach((el, i) => {
        console.log(`[${i}] ${el.tag} | x=${el.x} y=${el.y} w=${el.w} h=${el.h} | display=${el.display} | placeholder="${el.placeholder.substring(0,40)}" | value="${el.value}"`);
    });

    browser.disconnect();
}

main();
