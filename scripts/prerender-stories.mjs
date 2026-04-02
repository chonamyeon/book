/**
 * prerender-stories.mjs
 * 빌드 후 실행: 24개 /story/ 페이지를 정적 HTML로 프리렌더링
 * Googlebot이 JS 실행 없이도 전체 텍스트를 읽을 수 있게 함
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { adsenseBooks } from '../src/data/adsense/books.js';

// ── 빌드된 index.html에서 CSS/JS asset 태그 추출 ─────────────────────────────
const indexHtml = readFileSync('build_output/index.html', 'utf-8');
const linkTags   = (indexHtml.match(/<link [^>]+>/g) || []).join('\n  ');
const scriptTags = (indexHtml.match(/<script type="module"[^>]*><\/script>/g) || []).join('\n  ');

// ── 유틸리티 ─────────────────────────────────────────────────────────────────
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripTags(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** fullReview에서 SEO용 섹션 배열 추출 */
function extractSections(fullReview = '') {
  if (!fullReview) return [];

  // HTML 형식
  if (fullReview.includes('<h2')) {
    const sections = [];
    const re = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|<div class="ebook-cover"|$)/g;
    let m;
    while ((m = re.exec(fullReview)) !== null) {
      const title = stripTags(m[1]);
      const body  = m[2];
      const paras = [];
      const pRe = /<p[^>]*>([\s\S]*?)<\/p>/g;
      let pm;
      while ((pm = pRe.exec(body)) !== null) {
        const text = stripTags(pm[1]);
        if (text.length > 30) paras.push(text);
      }
      const bqRe = /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g;
      let bm;
      while ((bm = bqRe.exec(body)) !== null) {
        const text = stripTags(bm[1]);
        if (text.length > 20) paras.push(`"${text}"`);
      }
      if (title) sections.push({ title, paras });
    }
    return sections;
  }

  // ■ 구분 형식
  return fullReview.split('■').filter(s => s.trim()).map(section => {
    const lines = section.split('\n').filter(l => l.trim() && !l.startsWith('---'));
    return { title: lines[0] || '', paras: lines.slice(1) };
  });
}

/** 섹션 배열 → HTML 문자열 */
function sectionsToHtml(sections) {
  return sections.map(({ title, paras }) => `
    <section>
      <h2 style="font-size:20px;font-weight:900;color:#111;margin:2rem 0 0.75rem;line-height:1.3">${escapeHtml(title)}</h2>
      ${paras.map(p => `<p style="margin:0 0 1rem;color:#374151;line-height:1.8;font-size:15px">${escapeHtml(p)}</p>`).join('\n      ')}
    </section>`).join('\n');
}

/** FAQ → HTML 문자열 */
function faqToHtml(faq = []) {
  if (!faq.length) return '';
  return `
  <section style="margin-top:3rem;border-top:1px solid #f0f0f0;padding-top:2rem">
    <h2 style="font-size:20px;font-weight:900;color:#111;margin-bottom:1.5rem">독자들이 가장 많이 물어본 질문</h2>
    ${faq.map(({ q, a }) => `
    <div style="margin-bottom:1.5rem">
      <h3 style="font-size:15px;font-weight:700;color:#111;margin-bottom:0.5rem">Q. ${escapeHtml(q)}</h3>
      <div>
        <p style="color:#4b5563;line-height:1.8;font-size:14px;margin:0">${escapeHtml(a)}</p>
      </div>
    </div>`).join('')}
  </section>`;
}

// ── 메인 루프 ────────────────────────────────────────────────────────────────
let count = 0;
for (const book of adsenseBooks) {
  const dir = `build_output/story/${book.id}`;
  mkdirSync(dir, { recursive: true });

  const canonical   = `https://archiview.store/story/${book.id}`;
  const title       = `${book.title} - 아카이뷰 비평 & 인사이트 분석 | ArchiView`;
  const description = `『${book.title}』(${book.author}) 비평과 실전 인사이트. ${book.desc || ''} 단순 요약이 아닌 독창적인 관점으로 분석합니다.`;

  const mainSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "headline": `${book.title} - 아카이뷰 비평 & 인사이트`,
        "description": description,
        "image": book.cover || "https://archiview.store/images/hero_expert_v5.png",
        "datePublished": "2024-01-01T00:00:00Z",
        "author": { "@type": "Organization", "name": "아카이뷰(ArchiView)", "url": "https://archiview.store" },
        "publisher": { 
          "@type": "Organization", 
          "name": "아카이뷰(ArchiView)", 
          "url": "https://archiview.store",
          "logo": {
            "@type": "ImageObject",
            "url": "https://archiview.store/favicon.ico"
          }
        },
        "url": canonical,
        "inLanguage": "ko",
        "mainEntityOfPage": { "@type": "WebPage", "@id": canonical }
      },
      ...((book.faq?.length > 0) ? [{
        "@type": "FAQPage",
        "mainEntity": book.faq.map(item => ({
          "@type": "Question",
          "name": item.q,
          "acceptedAnswer": { "@type": "Answer", "text": item.a }
        }))
      }] : [])
    ]
  };

  const sections     = extractSections(book.fullReview);
  const contentHtml  = sectionsToHtml(sections);
  const faqHtml      = faqToHtml(book.faq);

  const relatedBooks = adsenseBooks
    .filter(b => b.id !== book.id && b.category === book.category)
    .slice(0, 3);
  const relatedHtml = relatedBooks.length ? `
  <section style="margin-top:3rem;border-top:1px solid #f0f0f0;padding-top:2rem">
    <h2 style="font-size:18px;font-weight:900;color:#111;margin-bottom:1rem">같은 카테고리 도서</h2>
    ${relatedBooks.map(r => `<p><a href="/story/${encodeURIComponent(r.id)}" style="color:#d97706;text-decoration:none;font-weight:700">${escapeHtml(r.title)}</a> — ${escapeHtml(r.author)}</p>`).join('')}
  </section>` : '';

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(book.title)}, ${escapeHtml(book.author)}, ${escapeHtml(book.category)}, 책비평, 인사이트분석, 아카이뷰">
  <meta property="og:title" content="${escapeHtml(book.title)} 비평 &amp; 인사이트 | 아카이뷰">
  <meta property="og:description" content="${escapeHtml(book.desc || '')}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="아카이뷰(ArchiView)">
  <link rel="canonical" href="${canonical}">
  <script type="application/ld+json">${JSON.stringify(mainSchema)}</script>
  ${linkTags}
  <!-- Google Consent Mode v2: AdSense 스크립트 로드 전 반드시 선행 -->
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{'analytics_storage':'denied','ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','wait_for_update':800});gtag('set','url_passthrough',true);</script>
  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7628221060447189" crossorigin="anonymous"></script>
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-1WBL218LEF"></script>
  <script>gtag('js',new Date());gtag('config','G-1WBL218LEF');</script>
</head>
<body>
<div id="root">
  <!-- 프리렌더링된 콘텐츠: React 로드 전 Googlebot이 읽는 전체 텍스트 -->
  <div style="background:#fff;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">

    <!-- Header -->
    <header style="position:sticky;top:0;z-index:50;background:rgba(255,255,255,0.9);backdrop-filter:blur(8px);border-bottom:1px solid #f0f0f0;padding:0 16px">
      <div style="max-width:900px;margin:0 auto;height:64px;display:flex;align-items:center;justify-content:space-between">
        <a href="/" style="font-size:18px;font-weight:900;color:#111;text-decoration:none">ArchiView</a>
        <nav style="display:flex;gap:8px;overflow-x:auto" aria-label="카테고리 메뉴">
          <a href="/category/SELF_DEV" style="font-size:12px;color:#6b7280;text-decoration:none;padding:4px 8px;white-space:nowrap">자기계발</a>
          <a href="/category/ECONOMY"  style="font-size:12px;color:#6b7280;text-decoration:none;padding:4px 8px;white-space:nowrap">경제</a>
          <a href="/category/MANAGEMENT" style="font-size:12px;color:#6b7280;text-decoration:none;padding:4px 8px;white-space:nowrap">경영</a>
          <a href="/category/HUMANITIES" style="font-size:12px;color:#6b7280;text-decoration:none;padding:4px 8px;white-space:nowrap">인문</a>
          <a href="/category/PSYCHOLOGY" style="font-size:12px;color:#6b7280;text-decoration:none;padding:4px 8px;white-space:nowrap">심리</a>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main style="max-width:900px;margin:0 auto;padding:16px 16px 80px">
      
      <!-- Copyright Clarification Banner -->
      <div style="margin-bottom:2rem;padding:24px;background:#f8fafc;border:1px solid #f1f5f9;border-radius:24px;text-align:center">
        <p style="font-size:13px;color:#64748b;line-height:1.7;font-weight:500;margin:0;word-break:keep-all">
          <span style="display:inline-block;padding:2px 8px;background:#e2e8f0;color:#475569;font-size:10px;font-weight:900;border-radius:6px;margin-bottom:8px;margin-right:8px;vertical-align:middle">NOTICE</span>
          아카이뷰의 도서 비평은 원저작물의 저작권을 존중하며, 교육 및 비평 목적으로 작성된 <strong style="color:#1e293b">독창적인 분석 콘텐츠</strong>입니다. 
          우리는 저자의 핵심 사상을 새로운 시각으로 재해석하여 독자들에게 전달하며, 원저작권자의 권리를 침해하지 않음을 명확히 밝힙니다.
        </p>
      </div>

      <article>

        <!-- Hero -->
        <header style="margin-bottom:2rem">
          <p style="font-size:12px;color:#d97706;font-weight:700;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px">
            ${escapeHtml(book.category)} · 아카이뷰 비평 & 인사이트
          </p>
          <h1 itemprop="headline" style="font-size:28px;font-weight:900;color:#111;line-height:1.3;margin:0 0 12px">
            ${escapeHtml(book.title)}
          </h1>
          <p style="font-size:14px;color:#9ca3af;font-weight:600;margin:0 0 16px">
            ${escapeHtml(book.author)} <span style="margin:0 8px">|</span> ${escapeHtml(book.category)}
          </p>
          <p itemprop="description" style="font-size:16px;color:#4b5563;font-style:italic;line-height:1.7;margin:0;border-left:3px solid #fbbf24;padding-left:16px">
            "${escapeHtml(book.desc || '')}"
          </p>
        </header>

        <!-- 에디터 서문 -->
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin-bottom:2rem">
          <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 8px;text-transform:uppercase;letter-spacing:.1em">아카이뷰 에디터의 관점</p>
          <p style="font-size:15px;color:#374151;line-height:1.8;margin:0">
            이 책을 단순히 요약하는 것은 아카이뷰의 방식이 아닙니다. 아카이뷰는 ${escapeHtml(book.title)}이 왜 지금 이 시대에 읽혀야 하는지, 저자의 핵심 논증은 무엇인지, 그리고 이를 당신의 삶에 어떻게 적용할 수 있는지를 독창적인 관점으로 비평합니다.
          </p>
        </div>

        <!-- 본문 -->
        <div itemprop="articleBody">
          ${contentHtml}
        </div>

        <!-- FAQ -->
        ${faqHtml}

        <!-- 관련 도서 -->
        ${relatedHtml}

      </article>
    </main>

    <!-- Footer -->
    <footer style="border-top:1px solid #f0f0f0;padding:40px 16px;text-align:center">
      <p style="font-size:14px;font-weight:900;color:#111;margin:0 0 16px">ARCHIVIEW</p>
      <nav style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin-bottom:16px" aria-label="카테고리 탐색">
        <a href="/category/SELF_DEV" style="font-size:12px;color:#6b7280;text-decoration:none">자기계발</a>
        <a href="/category/ECONOMY"  style="font-size:12px;color:#6b7280;text-decoration:none">경제</a>
        <a href="/category/MANAGEMENT" style="font-size:12px;color:#6b7280;text-decoration:none">경영</a>
        <a href="/category/HUMANITIES" style="font-size:12px;color:#6b7280;text-decoration:none">인문</a>
        <a href="/category/PSYCHOLOGY" style="font-size:12px;color:#6b7280;text-decoration:none">심리</a>
      </nav>
      <nav style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin-bottom:24px" aria-label="법적 정보">
        <a href="/about"   style="font-size:11px;color:#9ca3af;text-decoration:none">서비스 소개</a>
        <a href="/contact" style="font-size:11px;color:#9ca3af;text-decoration:none">문의하기</a>
        <a href="/privacy" style="font-size:11px;color:#9ca3af;text-decoration:none">개인정보처리방침</a>
        <a href="/terms"   style="font-size:11px;color:#9ca3af;text-decoration:none">이용약관</a>
      </nav>
      <p style="font-size:10px;color:#d1d5db;font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin:0">
        © 2026 ARCHIVIEW. ALL RIGHTS RESERVED.
      </p>
    </footer>

  </div>
</div>
${scriptTags}
</body>
</html>`;

  writeFileSync(`${dir}/index.html`, html, { encoding: 'utf-8' });
  count++;
  process.stdout.write(`\r  ✓ ${count}/${adsenseBooks.length} — ${book.id}`);
}

console.log(`\n\n✅ 프리렌더링 완료: ${count}개 story 페이지 생성`);
