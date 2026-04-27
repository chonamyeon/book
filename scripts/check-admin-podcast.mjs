import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:4173/admin/podcast';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
const pageErrors = [];

page.on('console', (msg) => {
  consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
});

page.on('pageerror', (err) => {
  pageErrors.push(err.message);
});

const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const title = await page.title();
const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '');

await page.screenshot({ path: 'admin-podcast-check.png', fullPage: true });

console.log(JSON.stringify({
  url,
  status: response?.status() ?? null,
  title,
  bodyPreview: bodyText,
  pageErrors,
  consoleLogs
}, null, 2));

await browser.close();
