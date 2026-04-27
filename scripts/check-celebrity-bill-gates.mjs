import { chromium } from 'playwright';

const url = 'https://archiview.store/celebrity/bill-gates';
const forbiddenTitles = ['성공하는 기업들의 8가지 습관', '우리는 왜 잠을 자야 할까'];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3500);
  const bodyText = await page.locator('body').innerText();

  const found = forbiddenTitles.filter((title) => bodyText.includes(title));
  if (found.length > 0) {
    console.error(`FAIL: forbidden titles still visible: ${found.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log('PASS: forbidden titles are not visible on bill-gates page');
  }
} finally {
  await browser.close();
}
