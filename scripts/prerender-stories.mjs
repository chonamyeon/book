import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { bookInsights } from '../src/data/bookInsights.js';
import { ensureHtml, stripHtml } from '../src/utils/ebookContent.js';

const site = 'https://archiview.shop';
const indexHtml = readFileSync('build_output/index.html', 'utf-8');
const linkTags = (indexHtml.match(/<link [^>]+>/g) || []).join('\n  ');
const scriptTags = (indexHtml.match(/<script type="module"[^>]*><\/script>/g) || []).join('\n  ');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function excerpt(html = '', fallback = '') {
  const text = stripHtml(html || fallback);
  return text.length > 150 ? `${text.slice(0, 147)}...` : text;
}

function categoryLabel(book) {
  return book.category || book.section || '도서 인사이트';
}

function relatedBooks(book) {
  return bookInsights
    .filter((item) => item.id !== book.id && categoryLabel(item) === categoryLabel(book))
    .slice(0, 3);
}

function pageHtml(book) {
  const canonical = `${site}/story/${encodeURIComponent(book.id)}`;
  const contentHtml = ensureHtml(book.ebookText || book.content || book.fullReview || book.review || '');
  const description = excerpt(contentHtml, book.desc || book.description || '');
  const title = `${book.title} | Whiteboard 도서 인사이트`;
  const related = relatedBooks(book);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: book.cover ? `${site}${book.cover}` : `${site}/images/hero_expert_v5.png`,
    datePublished: '2026-01-01T00:00:00Z',
    dateModified: new Date().toISOString().slice(0, 10) + 'T00:00:00Z',
    author: { '@type': 'Organization', name: 'Whiteboard', url: site },
    publisher: {
      '@type': 'Organization',
      name: 'Whiteboard',
      url: site,
      logo: { '@type': 'ImageObject', url: `${site}/favicon.ico` },
    },
    url: canonical,
    inLanguage: 'ko',
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  };

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(book.title)}, ${escapeHtml(book.author)}, 도서 인사이트, 북리뷰, 책 추천, Whiteboard">
  <meta name="robots" content="index, follow">
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="Whiteboard">
  <meta property="og:image" content="${book.cover ? `${site}${book.cover}` : `${site}/images/hero_expert_v5.png`}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${canonical}">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  ${linkTags}
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{'analytics_storage':'denied','ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','wait_for_update':800});gtag('set','url_passthrough',true);</script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8121712799499251" crossorigin="anonymous"></script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-1WBL218LEF"></script>
  <script>gtag('js',new Date());gtag('config','G-1WBL218LEF');</script>
</head>
<body>
<div id="root">
  <div style="background:#fff;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111">
    <header style="position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid #eee">
      <div style="max-width:900px;margin:0 auto;height:64px;padding:0 16px;display:flex;align-items:center;justify-content:space-between">
        <a href="/" style="font-size:18px;font-weight:900;color:#111;text-decoration:none">Whiteboard</a>
        <nav style="display:flex;gap:16px;font-size:13px;font-weight:700">
          <a href="/library" style="color:#555;text-decoration:none">Library</a>
          <a href="/about" style="color:#555;text-decoration:none">About</a>
          <a href="/contact" style="color:#555;text-decoration:none">Contact</a>
        </nav>
      </div>
    </header>
    <main style="max-width:900px;margin:0 auto;padding:56px 16px 88px">
      <article>
        <header style="margin-bottom:48px">
          <h1 style="font-size:clamp(32px,6vw,56px);font-weight:900;line-height:1.12;margin:0 0 12px;letter-spacing:0">${escapeHtml(book.title)}</h1>
          <p style="font-size:15px;color:#9ca3af;font-weight:700;margin:0 0 24px">${escapeHtml(book.author)} <span style="margin:0 10px;color:#ddd">|</span> ${escapeHtml(categoryLabel(book))}</p>
          ${book.desc ? `<p style="font-size:20px;color:#374151;font-style:italic;line-height:1.7;margin:0">"${escapeHtml(book.desc)}"</p>` : ''}
        </header>
        <div class="ebook-content-wrapper" style="font-size:18px;line-height:2;color:#222;word-break:keep-all">
          ${contentHtml}
        </div>
        ${related.length ? `
        <section style="margin-top:64px;border-top:1px solid #eee;padding-top:32px">
          <h2 style="font-size:20px;font-weight:900;margin:0 0 16px">같이 읽기 좋은 인사이트</h2>
          ${related.map((item) => `<p style="margin:0 0 10px"><a href="/story/${encodeURIComponent(item.id)}" style="color:#b45309;text-decoration:none;font-weight:800">${escapeHtml(item.title)}</a> <span style="color:#9ca3af">${escapeHtml(item.author)}</span></p>`).join('')}
        </section>` : ''}
      </article>
    </main>
    <footer style="border-top:1px solid #eee;padding:40px 16px;text-align:center;color:#9ca3af;font-size:12px">
      <p style="font-weight:900;color:#111;letter-spacing:.16em;margin:0 0 12px">WHITEBOARD</p>
      <p style="margin:0">© 2026 Whiteboard. All rights reserved.</p>
    </footer>
  </div>
</div>
${scriptTags}
</body>
</html>`;
}

let count = 0;
for (const book of bookInsights) {
  const dir = `build_output/story/${book.id}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, pageHtml(book), 'utf-8');
  count++;
  process.stdout.write(`\r  ${count}/${bookInsights.length} ${book.id}`);
}

const storyIndex = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>도서 인사이트 전체 목록 | Whiteboard</title>
  <meta name="description" content="Whiteboard 도서 인사이트 전체 목록입니다. 책의 핵심 주장, 배경 맥락, 비판적 관점, 실천 아이디어를 모았습니다.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${site}/story/">
</head>
<body>
  <main style="max-width:900px;margin:0 auto;padding:48px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <h1 style="font-size:36px;margin:0 0 24px">도서 인사이트 전체 목록</h1>
    <p style="color:#666;margin:0 0 32px">중복을 제외한 ${bookInsights.length}개의 관리자 제작 독서 콘텐츠입니다.</p>
    <ul style="list-style:none;padding:0;margin:0;display:grid;gap:14px">
      ${bookInsights.map((book) => `<li><a href="/story/${encodeURIComponent(book.id)}" style="font-size:18px;font-weight:800;color:#111;text-decoration:none">${escapeHtml(book.title)}</a> <span style="color:#999">${escapeHtml(book.author)}</span></li>`).join('\n      ')}
    </ul>
  </main>
</body>
</html>`;
mkdirSync('build_output/story', { recursive: true });
writeFileSync('build_output/story/index.html', storyIndex, 'utf-8');
mkdirSync('public/story', { recursive: true });
writeFileSync('public/story/index.html', storyIndex, 'utf-8');

const staticUrls = [
  ['', 'weekly', '1.0'],
  ['story/', 'weekly', '0.8'],
  ['about', 'monthly', '0.7'],
  ['contact', 'monthly', '0.6'],
  ['library', 'weekly', '0.7'],
  ['editorial', 'weekly', '0.7'],
  ['category/SELF_DEV', 'weekly', '0.65'],
  ['category/ECONOMY', 'weekly', '0.65'],
  ['category/MANAGEMENT', 'weekly', '0.65'],
  ['category/HUMANITIES', 'weekly', '0.65'],
  ['category/PSYCHOLOGY', 'weekly', '0.65'],
  ['membership', 'monthly', '0.6'],
  ['review-board', 'weekly', '0.65'],
  ['reading-notes', 'weekly', '0.5'],
  ['quiz', 'monthly', '0.5'],
  ['privacy', 'yearly', '0.4'],
  ['privacy-policy', 'yearly', '0.4'],
  ['terms', 'yearly', '0.4'],
  ['disclaimer', 'yearly', '0.4'],
];
const today = new Date().toISOString().slice(0, 10);
const sitemapUrls = [
  ...staticUrls.map(([path, changefreq, priority]) => ({
    loc: `${site}/${path}`,
    changefreq,
    priority,
  })),
  ...bookInsights.map((book) => ({
    loc: `${site}/story/${encodeURIComponent(book.id)}`,
    changefreq: 'monthly',
    priority: '0.9',
  })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(({ loc, changefreq, priority }) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join('\n\n')}\n</urlset>\n`;
writeFileSync('build_output/sitemap.xml', sitemap, 'utf-8');
writeFileSync('public/sitemap.xml', sitemap, 'utf-8');

console.log(`\n\nPrerender complete: generated ${count} story pages without duplicates`);
