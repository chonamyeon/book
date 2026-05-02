import fs from 'node:fs';
import { celebrities } from '../src/data/celebrities.js';

const SITE_URL = 'https://archiview.store';
const PUBLIC_DIR = 'public';
const BUILD_DIR = 'build_output';
const UPDATED = new Date().toUTCString();

const bookById = new Map();
for (const celeb of celebrities || []) {
  for (const book of celeb.books || []) {
    if (book.id && !bookById.has(book.id)) bookById.set(book.id, book);
  }
}

const escapeXml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const slugToText = (slug) =>
  decodeURIComponent(slug || '')
    .replace(/^top70-/, '')
    .replace(/-/g, ' ')
    .trim();

function itemForUrl(url) {
  const { pathname } = new URL(url);
  if (pathname === '/') {
    return {
      title: '아카이뷰 ARCHIVIEW - 출퇴근 15분 책 요약 오디오 독서',
      description: '바쁜 직장인을 위한 책 핵심 요약, 오디오 독서, 맞춤 도서 추천 플랫폼입니다.',
      category: '메인',
    };
  }
  if (pathname === '/challenge') {
    return {
      title: '아카이뷰 출퇴근 메이트 7일 챌린지',
      description: '매일 15분, 출퇴근 시간을 나만의 성장 루틴으로 바꾸는 7일 독서 챌린지입니다.',
      category: '챌린지',
    };
  }
  if (pathname.startsWith('/review/')) {
    const id = pathname.split('/').pop();
    const book = bookById.get(id);
    const title = book?.title || slugToText(id);
    return {
      title: `${title} 리뷰 및 핵심 요약`,
      description: `${title}의 핵심 메시지, 주요 인사이트, 오디오 요약을 아카이뷰에서 확인하세요.`,
      category: '도서 리뷰',
    };
  }
  if (pathname.startsWith('/yt-podcast/')) {
    const id = pathname.split('/').pop();
    return {
      title: `유튜브 핵심 요약 팟캐스트 - ${id}`,
      description: '유튜브 영상의 핵심 내용을 오디오 팟캐스트로 빠르게 듣는 아카이뷰 콘텐츠입니다.',
      category: '유튜브 팟캐스트',
    };
  }
  const names = {
    '/editorial': ['에디토리얼 도서 큐레이션', '아카이뷰 에디터가 선별한 도서 인사이트와 추천 콘텐츠입니다.'],
    '/insights': ['지식 인사이트', '책과 영상에서 필요한 핵심만 모은 아카이뷰 지식 콘텐츠입니다.'],
    '/library': ['나만의 지식 서재', '저장한 도서, 청취 기록, 독서 챌린지를 관리하는 아카이뷰 서재입니다.'],
    '/quiz': ['독서 성향 진단', '나에게 맞는 책과 오디오 요약 콘텐츠를 추천받는 독서 성향 진단입니다.'],
  };
  const [title, description] = names[pathname] || ['아카이뷰 콘텐츠', '아카이뷰의 책 요약과 오디오 독서 콘텐츠입니다.'];
  return { title, description, category: '아카이뷰' };
}

function generate() {
  const sitemapPath = fs.existsSync(`${BUILD_DIR}/sitemap.xml`) ? `${BUILD_DIR}/sitemap.xml` : `${PUBLIC_DIR}/sitemap.xml`;
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => match[1])
    .filter((url) => !url.includes('/profile') && !url.includes('/privacy') && !url.includes('/contact') && !url.includes('/membership'));

  const items = urls.map((url) => {
    const item = itemForUrl(url);
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(item.description)}</description>
      <category>${escapeXml(item.category)}</category>
      <pubDate>${UPDATED}</pubDate>
    </item>`;
  });

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>아카이뷰 ARCHIVIEW</title>
    <link>${SITE_URL}/</link>
    <description>출퇴근 15분, 책 핵심 요약과 오디오 독서로 지식을 쌓는 아카이뷰 콘텐츠 피드입니다.</description>
    <language>ko</language>
    <lastBuildDate>${UPDATED}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>
`;

  fs.writeFileSync(`${PUBLIC_DIR}/rss.xml`, rss, 'utf8');
  if (fs.existsSync(BUILD_DIR)) fs.writeFileSync(`${BUILD_DIR}/rss.xml`, rss, 'utf8');
  console.log(`Generated rss.xml with ${items.length} items.`);
}

generate();
