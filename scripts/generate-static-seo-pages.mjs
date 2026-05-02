import fs from 'node:fs';
import path from 'node:path';
import { celebrities } from '../src/data/celebrities.js';

const SITE_URL = 'https://archiview.store';
const outDir = 'build_output';
const indexPath = path.join(outDir, 'index.html');
const sitemapPath = path.join(outDir, 'sitemap.xml');
const defaultImage = `${SITE_URL}/images/hero_expert_v5.png`;

const pageSeo = {
  '/': {
    title: '아카이뷰 ARCHIVIEW | 출퇴근 15분 책 요약 오디오 독서',
    description: '아카이뷰는 바쁜 직장인을 위한 책 핵심 요약, 오디오 독서, 맞춤 도서 추천 플랫폼입니다. 출퇴근 15분으로 지식을 빠르게 쌓아보세요.',
    keywords: '아카이뷰, ARCHIVIEW, 책 요약, 오디오북, 오디오 독서, 출퇴근 독서, 직장인 자기계발, 도서 추천, 책 핵심 요약',
  },
  '/editorial': {
    title: '에디토리얼 | 아카이뷰 도서 큐레이션',
    description: '자기계발, 경제, 경영, 인문, 심리 분야의 도서 인사이트와 아카이뷰 에디터 추천 콘텐츠를 확인하세요.',
    keywords: '아카이뷰 에디토리얼, 도서 큐레이션, 책 추천, 자기계발 책, 경제 경영 도서, 인문 심리 책 추천',
  },
  '/insights': {
    title: '지식 인사이트 | 유튜브·도서 핵심 요약 - 아카이뷰',
    description: '책과 영상에서 꼭 필요한 핵심만 모은 지식 인사이트. 바쁜 하루에도 빠르게 듣고 읽는 아카이뷰 콘텐츠입니다.',
    keywords: '지식 인사이트, 유튜브 요약, 영상 핵심 요약, 책 인사이트, 자기계발 영상, 경제 영상 요약, 직장인 지식 콘텐츠',
  },
  '/library': {
    title: '나만의 지식 서재 | 독서 기록과 맞춤 추천 - 아카이뷰',
    description: '저장한 도서, 청취 기록, 독서 챌린지와 맞춤 큐레이션을 한 곳에서 관리하는 아카이뷰 지식 서재입니다.',
    keywords: '지식 서재, 독서 기록, 독서 챌린지, 읽은 책 관리, 오디오북 기록, 맞춤 도서 추천, 아카이뷰 서재',
  },
  '/profile': {
    title: '프로필 | 알림·이어듣기·맞춤 독서 설정 - 아카이뷰',
    description: '독서 성향, 알림, 이어듣기와 개인화 설정을 관리하고 나에게 맞는 아카이뷰 콘텐츠를 이어서 확인하세요.',
    keywords: '독서 알림, 이어듣기, 오디오북 설정, 개인화 추천, 독서 성향, 출퇴근 알림, 아카이뷰 프로필',
  },
  '/quiz': {
    title: '독서 성향 진단 | 나에게 맞는 책 추천 - 아카이뷰',
    description: '짧은 질문으로 나의 독서 성향을 분석하고 목표에 맞는 책과 오디오 요약 콘텐츠를 추천받으세요.',
    keywords: '독서 성향 테스트, 책 추천 테스트, 맞춤 도서 추천, 독서 취향 진단, 자기계발 책 추천, 아카이뷰 진단',
  },
  '/reading-notes': {
    title: '기록노트 | 책 인사이트와 독서 메모 - 아카이뷰',
    description: '책과 오디오 콘텐츠에서 얻은 인사이트를 정리하고 나만의 성장 기록으로 남기는 아카이뷰 기록노트입니다.',
    keywords: '독서 메모, 책 기록, 독서 노트, 인사이트 기록, 오디오북 메모, 자기계발 기록, 아카이뷰 기록노트',
  },
  '/review-board': {
    title: '리뷰 보드 | 도서 후기와 핵심 인사이트 - 아카이뷰',
    description: '아카이뷰 사용자가 남긴 도서 리뷰와 핵심 인사이트를 확인하고 나에게 맞는 책을 찾아보세요.',
    keywords: '도서 리뷰, 책 후기, 독서 후기, 책 핵심 인사이트, 북리뷰, 아카이뷰 리뷰 보드',
  },
  '/membership': {
    title: '멤버십 | 프리미엄 책 요약과 오디오 독서 - 아카이뷰',
    description: '더 많은 책 요약, 오디오 콘텐츠, 개인화 추천을 이용할 수 있는 아카이뷰 멤버십 안내 페이지입니다.',
    keywords: '아카이뷰 멤버십, 프리미엄 오디오북, 책 요약 구독, 도서 요약 서비스, 자기계발 구독, 독서 플랫폼',
  },
  '/about': {
    title: '아카이뷰 소개 | 바쁜 사람을 위한 15분 오디오 독서',
    description: '아카이뷰는 사놓고 읽지 못한 책과 영상 콘텐츠를 15분 핵심 요약으로 바꿔주는 지식 루틴 서비스입니다.',
    keywords: '아카이뷰 소개, 15분 독서, 오디오 독서 플랫폼, 출퇴근 자기계발, 책 요약 서비스, 지식 루틴',
  },
  '/contact': {
    title: '문의하기 | 제휴·서비스 문의 - 아카이뷰',
    description: '아카이뷰 서비스 제휴, 이용 문의, 피드백을 남길 수 있는 공식 문의 페이지입니다.',
    keywords: '아카이뷰 문의, 서비스 문의, 제휴 문의, 독서 플랫폼 제휴, 오디오북 서비스 문의',
  },
  '/privacy': {
    title: '개인정보처리방침 | 아카이뷰',
    description: '아카이뷰 개인정보 수집, 이용, 보관, 보호 정책을 안내하는 개인정보처리방침 페이지입니다.',
    keywords: '아카이뷰 개인정보처리방침, 개인정보 보호, 서비스 정책, 개인정보 수집 이용',
  },
};

const categorySeo = {
  SELF_DEV: ['자기계발 도서 요약 | 성공 습관과 성장 루틴 - 아카이뷰', '성장, 습관, 목표 달성에 도움이 되는 자기계발 도서 핵심 요약과 오디오 콘텐츠를 확인하세요.', '자기계발 도서, 성공 습관, 성장 루틴, 자기계발 책 요약, 목표 달성, 직장인 자기계발'],
  ECONOMY: ['경제 도서 요약 | 돈 공부와 투자 인사이트 - 아카이뷰', '경제 흐름, 돈 공부, 투자 관점을 빠르게 이해할 수 있는 경제 도서 핵심 요약을 확인하세요.', '경제 도서, 돈 공부, 투자 인사이트, 경제 책 요약, 재테크 책, 부자 습관, 금융 지식'],
  MANAGEMENT: ['경영 도서 요약 | 리더십과 비즈니스 전략 - 아카이뷰', '리더십, 조직관리, 비즈니스 전략에 도움이 되는 경영 도서 인사이트를 확인하세요.', '경영 도서, 리더십 책, 비즈니스 전략, 조직관리, 경영 책 요약, 직장인 리더십'],
  HUMANITIES: ['인문 도서 요약 | 역사 철학 사회 인사이트 - 아카이뷰', '역사, 철학, 사회, 인간 이해를 넓히는 인문 도서 핵심 요약을 확인하세요.', '인문 도서, 역사 책 요약, 철학 책, 사회 인사이트, 인문학 책 추천, 교양 도서'],
  PSYCHOLOGY: ['심리 도서 요약 | 마음 관계 행동 이해 - 아카이뷰', '마음, 관계, 의사결정, 행동 변화를 이해하는 심리 도서 요약 콘텐츠입니다.', '심리 도서, 마음 관리, 관계 심리, 행동 심리학, 의사결정, 심리 책 요약'],
  BURNOUT: ['번아웃 회복 도서 요약 | 직장인 마음관리 - 아카이뷰', '지친 직장인을 위한 회복, 마음관리, 루틴 재설계 도서 인사이트를 확인하세요.', '번아웃 회복, 직장인 마음관리, 회복탄력성, 스트레스 관리, 마음 치유 책, 번아웃 도서'],
};

const bookById = new Map();
for (const celeb of celebrities || []) {
  for (const book of celeb.books || []) {
    if (book.id && !bookById.has(book.id)) bookById.set(book.id, book);
  }
}

const escapeAttr = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const slugToText = (slug) =>
  decodeURIComponent(slug || '')
    .replace(/^top70-/, '')
    .replace(/-/g, ' ')
    .trim();

function seoForPath(routePath) {
  if (routePath.startsWith('/category/')) {
    const id = routePath.split('/').pop();
    const [title, description, keywords] = categorySeo[id] || ['분야별 도서 요약 | 책 추천과 오디오 독서 - 아카이뷰', '관심 분야별로 정리된 아카이뷰 도서 요약과 오디오 콘텐츠를 확인하세요.', '분야별 도서 추천, 책 요약, 오디오 독서, 북리뷰, 아카이뷰 콘텐츠'];
    return { title, description, keywords };
  }

  if (routePath.startsWith('/review/')) {
    const id = routePath.split('/').pop();
    const book = bookById.get(id);
    const name = book?.title || slugToText(id);
    return {
      title: `${name} 리뷰 및 핵심 요약 | 아카이뷰`,
      description: `${name}의 핵심 메시지, 주요 인사이트, 오디오 요약을 한 번에 확인하는 아카이뷰 리뷰 페이지입니다.`,
      keywords: `${name}, 도서 리뷰, 책 요약, 북리뷰, 핵심 요약, 오디오북, 독서 인사이트, 아카이뷰`,
    };
  }

  if (routePath.startsWith('/yt-podcast/')) {
    const videoId = routePath.split('/').pop();
    return {
      title: '유튜브 핵심 요약 팟캐스트 | 영상 인사이트 - 아카이뷰',
      description: '유튜브 영상의 핵심 내용을 오디오 팟캐스트로 빠르게 듣고, 직장인에게 필요한 인사이트만 골라 확인하세요.',
      keywords: `유튜브 요약, 영상 요약, 유튜브 팟캐스트, 영상 핵심정리, 오디오 요약, 직장인 인사이트, ${videoId}, 아카이뷰`,
    };
  }

  return pageSeo[routePath] || pageSeo['/'];
}

function buildHeadTags(routePath, seo) {
  const canonical = `${SITE_URL}${routePath === '/' ? '/' : routePath}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seo.title,
    description: seo.description,
    url: canonical,
    keywords: seo.keywords,
    isPartOf: {
      '@type': 'WebSite',
      name: 'ARCHIVIEW',
      alternateName: '아카이뷰',
      url: SITE_URL,
    },
    inLanguage: 'ko-KR',
  };

  return [
    `<title>${escapeAttr(seo.title)}</title>`,
    `<meta name="description" content="${escapeAttr(seo.description)}">`,
    `<meta name="keywords" content="${escapeAttr(seo.keywords)}" />`,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    `<meta property="og:title" content="${escapeAttr(seo.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(seo.description)}" />`,
    `<meta property="og:image" content="${escapeAttr(defaultImage)}" />`,
    `<meta name="twitter:title" content="${escapeAttr(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(defaultImage)}" />`,
    `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`,
  ].join('\n  ');
}

function applySeo(html, routePath) {
  const seo = seoForPath(routePath);
  let next = html
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[\s\S]*?>\s*/g, '')
    .replace(/<meta name="keywords"[\s\S]*?>\s*/g, '')
    .replace(/<link rel="canonical"[\s\S]*?>\s*/g, '')
    .replace(/<meta property="og:url"[\s\S]*?>\s*/g, '')
    .replace(/<meta property="og:title"[\s\S]*?>\s*/g, '')
    .replace(/<meta property="og:description"[\s\S]*?>\s*/g, '')
    .replace(/<meta property="og:image"[\s\S]*?>\s*/g, '')
    .replace(/<meta name="twitter:title"[\s\S]*?>\s*/g, '')
    .replace(/<meta name="twitter:description"[\s\S]*?>\s*/g, '')
    .replace(/<meta name="twitter:image"[\s\S]*?>\s*/g, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');

  next = next.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n  ${buildHeadTags(routePath, seo)}`);
  return next;
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
let written = 0;

for (const url of urls) {
  const parsed = new URL(url);
  const routePath = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '');
  if (routePath === '/' || routePath === '/challenge') continue;
  const targetDir = path.join(outDir, ...routePath.split('/').filter(Boolean));
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), applySeo(indexHtml, routePath), 'utf8');
  written += 1;
}

console.log(`Generated ${written} static SEO route pages.`);
