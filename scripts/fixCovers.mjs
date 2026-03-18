import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manualTitles = {
    '21-lessons': '21세기를 위한 21가지 제언',
    'homo-deus': '호모 데우스',
    'human-acts': '소년이 온다 한강',
    'lightness-of-being': '참을 수 없는 존재의 가벼움',
    'little_prince': '어린 왕자',
    'son_square': '광장 최인훈',
    'stoner': '스토너 존 윌리엄스',
    'ubermensch': '차라투스트라는 이렇게 말했다',
    'yourname': '너의 이름은 소설',
    '어린_왕자': '어린 왕자'
};

async function main() {
    for (const [bookId, title] of Object.entries(manualTitles)) {
        console.log(`[FIX] Fetching cover for ${bookId} (Title: ${title})...`);

        let coverUrl = null;
        try {
            // Kyobo Search First
            const searchUrl = `https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(title)}`;
            const searchRes = await fetch(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const searchHtml = await searchRes.text();
            const $search = cheerio.load(searchHtml);
            const detailLink = $search('.prod_link').first().attr('href');

            if (detailLink) {
                const kyoboBookId = detailLink.split('/').pop().replace(/[^A-Z0-9]/gi, ''); 
                const url = `https://product.kyobobook.co.kr/api/gw/pdt/product/${kyoboBookId}/book-card`;
                const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.data && data.data.picutreUrl) {
                        coverUrl = data.data.picutreUrl;
                        console.log(` - Found cover from Kyobo: ${coverUrl}`);
                    }
                }
            }
        } catch(e) { console.error('Kyobo Error:', e.message); }

        if (!coverUrl) {
            try {
                const yesSearchUrl = `https://www.yes24.com/Product/Search?domain=ALL&query=${encodeURIComponent(title)}`;
                const yesSearchRes = await fetch(yesSearchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                const yesSearchHtml = await yesSearchRes.text();
                const $yesSearch = cheerio.load(yesSearchHtml);
                const yesDetailPath = $yesSearch('.gd_name').first().attr('href');

                if (yesDetailPath) {
                    const yesDetailUrl = yesDetailPath.startsWith('http') ? yesDetailPath : `https://www.yes24.com${yesDetailPath}`;
                    const yesDetailRes = await fetch(yesDetailUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    const yesDetailHtml = await yesDetailRes.text();
                    const $y = cheerio.load(yesDetailHtml);
                    const yCoverImg = $y('.gd_img img').first().attr('src');
                    if (yCoverImg) {
                        coverUrl = yCoverImg;
                        console.log(` - Found cover from YES24: ${coverUrl}`);
                    }
                }
            } catch(e) { console.error('Yes24 Error:', e.message); }
        }

        if (coverUrl) {
            try {
                const imgRes = await fetch(coverUrl);
                if (imgRes.ok) {
                    const dest = path.join(__dirname, `../public/images/covers/${bookId}.jpg`);
                    fs.writeFileSync(dest, Buffer.from(await imgRes.arrayBuffer()));
                    console.log(` - Saved! ${dest}`);
                }
            } catch(e) {
                console.error(' - Download Error!', e.message);
            }
        } else {
            console.log(` - Could not find cover for ${title}`);
        }
    }
}

main().catch(console.error);
