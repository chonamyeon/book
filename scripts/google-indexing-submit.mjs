import fs from 'node:fs';
import crypto from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/indexing';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const getArg = (name, fallback = null) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : fallback;
};

const sitemapPath = getArg('--sitemap', 'public/sitemap.xml');
const credentialsPath = getArg('--credentials', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'upheld-dragon-488101-q7-ef15269bb6cb.json');
const submit = hasFlag('--submit');
const type = getArg('--type', 'URL_UPDATED');
const limit = Number(getArg('--limit', submit ? 200 : 20));
const only = getArg('--only', 'all');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base64url = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

function readUrls() {
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  let urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim());
  if (only === 'review') urls = urls.filter((url) => url.includes('/review/'));
  if (only === 'youtube') urls = urls.filter((url) => url.includes('/yt-podcast/'));
  if (only === 'core') urls = urls.filter((url) => !url.includes('/review/') && !url.includes('/yt-podcast/'));
  return urls.slice(0, limit);
}

function readServiceAccount() {
  const json = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  if (json.type !== 'service_account' || !json.client_email || !json.private_key) {
    throw new Error(`Invalid service account file: ${credentialsPath}`);
  }
  return json;
}

function createJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsigned)
    .sign(serviceAccount.private_key);
  return `${unsigned}.${base64url(signature)}`;
}

async function getAccessToken(serviceAccount) {
  const jwt = createJwt(serviceAccount);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function publishUrl(accessToken, url) {
  const res = await fetch(PUBLISH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, type }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const urls = readUrls();
const reviewCount = urls.filter((url) => url.includes('/review/')).length;
const youtubeCount = urls.filter((url) => url.includes('/yt-podcast/')).length;

console.log(JSON.stringify({
  mode: submit ? 'submit' : 'dry-run',
  sitemapPath,
  credentialsPath,
  type,
  only,
  limit,
  total: urls.length,
  reviewCount,
  youtubeCount,
  firstUrls: urls.slice(0, 5),
}, null, 2));

if (!submit) {
  console.log('Dry-run only. Add --submit to send URL_UPDATED notifications to Google Indexing API.');
  process.exit(0);
}

const serviceAccount = readServiceAccount();
const accessToken = await getAccessToken(serviceAccount);
const results = [];

for (let i = 0; i < urls.length; i += 1) {
  const url = urls[i];
  const result = await publishUrl(accessToken, url);
  results.push({ url, ...result });
  const status = result.ok ? 'OK' : 'FAIL';
  console.log(`[${i + 1}/${urls.length}] ${status} ${result.status} ${url}`);
  if (!result.ok) console.log(JSON.stringify(result.data));
  await sleep(250);
}

const ok = results.filter((r) => r.ok).length;
const failed = results.length - ok;
fs.writeFileSync('indexing-api-results.json', JSON.stringify({ createdAt: new Date().toISOString(), ok, failed, results }, null, 2), 'utf8');
console.log(JSON.stringify({ ok, failed, resultsPath: 'indexing-api-results.json' }, null, 2));
