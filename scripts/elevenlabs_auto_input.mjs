import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPT_PATH = path.resolve(__dirname, '../final_podcast/one-thing_script.json');

const NAMES = ['Hunmin', 'Jason', 'Chungman', 'Enceladus', 'Kore', 'Noble', 'Butler'];
const BTN_TO_TEXT = 22;

async function main() {
    console.log('--- 🚀 일레븐랩스 자동 입력기 v49-final ---');

    try {
        const browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null
        });

        const pages = await browser.pages();
        const elPage = pages.find(p => p.url().includes('elevenlabs.io'));
        if (!elPage) { console.error('❌ 일레븐랩스 탭 없음'); return; }

        const rawData = fs.readFileSync(SCRIPT_PATH, 'utf8');
        const script = JSON.parse(rawData);
        console.log(`📖 대본 로드: 총 ${script.length}개`);

        // DOM 순서로 스피커 버튼 핸들 수집
        const allBtnHandles = await elPage.$$('button');
        const speakerHandles = [];
        for (const h of allBtnHandles) {
            const txt = await h.evaluate(el => el.innerText.trim());
            if (txt.length < 100 && NAMES.some(n => txt.includes(n))) {
                speakerHandles.push(h);
            }
        }
        console.log(`🔍 스피커 버튼: ${speakerHandles.length}개`);

        for (let i = 0; i < script.length; i++) {
            const speaker = script[i].speaker;
            const text = script[i].text.trim();

            console.log(`\n⏳ [${i + 1}/${script.length}] "${speaker}"`);

            const handle = speakerHandles[i];
            if (!handle) { console.error(`❌ [${i + 1}] 버튼 없음`); break; }

            // scrollIntoView 후 위치 안정화 대기
            await handle.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));

            let box = null;
            let prevY = -9999;
            let stableCount = 0;
            for (let j = 0; j < 20; j++) {
                await new Promise(r => setTimeout(r, 100));
                box = await handle.boundingBox();
                if (!box) continue;
                if (Math.abs(box.y - prevY) < 1) {
                    stableCount++;
                    if (stableCount >= 3) break;
                } else {
                    stableCount = 0;
                }
                prevY = box.y;
            }

            if (!box) {
                console.warn(`⚠️ [${i + 1}] 위치 불명. 재시도...`);
                i--; await new Promise(r => setTimeout(r, 1000)); continue;
            }

            const clickX = box.x + 60;
            const clickY = box.y + box.height + BTN_TO_TEXT;

            console.log(`   📍 btnY=${Math.round(box.y)} clickY=${Math.round(clickY)}`);

            await elPage.mouse.click(clickX, clickY);
            await new Promise(r => setTimeout(r, 300));
            await elPage.keyboard.type(text, { delay: 0 }); // 최고속
            console.log(`   ✅ 완료`);
            await new Promise(r => setTimeout(r, 400));
        }

        console.log('\n✨ 모든 대사 입력 완료!');
        browser.disconnect();
    } catch (err) {
        console.error('❌ 에러:', err);
    }
}

main();
