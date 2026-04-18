import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { adsenseBooks } from '../../data/adsense/books';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

// prefetch 유틸리티는 src/utils/prefetch.js에서 관리
import { prefetchCache } from '../../utils/prefetch';
export { prefetchStory } from '../../utils/prefetch';
import { getGradientStyle } from '../../utils/gradientStyle';

function FaqSection({ faq }) {
  const [openIdx, setOpenIdx] = useState(null);
  if (!faq || faq.length === 0) return null;
  return (
    <section className="mt-20" aria-label="자주 묻는 질문">
      <div className="flex flex-col items-center mb-8">
        <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full mb-3 uppercase tracking-widest">FAQ</span>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 text-center">
          독자들이 가장 많이 물어본 질문
        </h2>
        <p className="text-gray-500 text-sm mt-3 text-center max-w-md">
          아카이뷰 에디터가 직접 답하는 핵심 질문 {faq.length}가지
        </p>
      </div>
      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
        {faq.map((item, i) => (
          <div key={i}>
            <button
              className="w-full text-left px-6 py-5 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              aria-expanded={openIdx === i}
            >
              <span className="font-bold text-gray-900 text-sm md:text-base leading-snug flex-1">
                Q. {item.q}
              </span>
              <span className={`mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 text-xs transition-transform duration-200 ${openIdx === i ? 'rotate-45' : ''}`}>
                +
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${openIdx === i ? 'max-h-96' : 'max-h-0'}`}
            >
              <p className="px-6 pb-6 text-gray-600 text-sm md:text-base leading-relaxed border-t border-gray-50 pt-4">
                {item.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const STORY_CACHE_PREFIX = 'archiview_story_cache_';
const loadStoryCache = (bookId) => {
  try {
    const raw = localStorage.getItem(STORY_CACHE_PREFIX + bookId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const saveStoryCache = (bookId, data) => {
  try { localStorage.setItem(STORY_CACHE_PREFIX + bookId, JSON.stringify(data)); } catch {}
};

export default function StaticReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const staticBook = adsenseBooks.find((b) => b.id === id);
  const cachedBook = loadStoryCache(id);

  const [book, setBook] = useState(cachedBook || staticBook || null);
  const [loading, setLoading] = useState(!cachedBook && !staticBook);
  // 채팅/FAQ 등 헤비 섹션은 메인 콘텐츠 렌더 후 defer
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchBook = async () => {
      try {
        // hover prefetch로 이미 fetch 중인 경우 재사용
        const dbData = prefetchCache.has(id)
          ? await prefetchCache.get(id)
          : await getDoc(doc(db, 'adsenseBooks', id)).then(s => s.exists() ? { ...s.data(), id } : null);

        if (dbData) {
          const localMatch = staticBook || adsenseBooks.find(b => b.title === dbData.title);
          const merged = { ...(localMatch || {}), ...dbData, id };
          setBook(prev => {
            if (prev && prev.fullReview && prev.fullReview === merged.fullReview) return prev;
            return merged;
          });
          saveStoryCache(id, merged);
        }
      } catch (e) {
        console.error("Firestore fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();

    // 헤비 섹션(채팅/FAQ)은 메인 콘텐츠 그린 뒤 idle time에 렌더
    const timerId = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(() => setShowDetails(true), { timeout: 400 })
      : setTimeout(() => setShowDetails(true), 200);

    return () => {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(timerId);
      else clearTimeout(timerId);
    };
  }, [id]);


  if (loading) return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="w-full h-12 bg-gray-100" />
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <div className="flex gap-5 mb-10">
          <div className="w-28 h-40 bg-gray-200 rounded-xl shrink-0" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-7 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-full mt-4" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
          </div>
        </div>
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-gray-100 rounded" style={{width: `${90 - i*5}%`}} />)}
        </div>
      </div>
    </div>
  );

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">도서를 찾을 수 없습니다.</h1>
          <Link to="/" className="text-blue-600 hover:underline">홈으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const sections = (book.fullReview || "").split('■').filter(s => s.trim());
  const script = book.script || [];
  const faq = book.faq || [];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans leading-relaxed pb-20">
      <Helmet>
        <title>{book.title} - 아카이뷰 비평 & 인사이트 분석 | ArchiView</title>
        <meta name="description" content={`『${book.title}』(${book.author})에 대한 아카이뷰 에디터의 비평과 실전 인사이트. ${book.desc} 단순 요약이 아닌 독창적인 관점으로 분석합니다.`} />
        <meta name="keywords" content={`${book.title}, ${book.author}, ${book.category}, 책비평, 인사이트분석, 아카이뷰`} />
        <meta property="og:title" content={`${book.title} 비평 & 인사이트 | 아카이뷰`} />
        <meta property="og:description" content={book.desc} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://archiview.shop/story/${book.id}`} />
        <meta property="og:site_name" content="아카이뷰(ArchiView)" />
        <meta property="og:image" content="https://archiview.shop/images/hero_expert_v5.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`https://archiview.shop/story/${book.id}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "headline": `${book.title} - 아카이뷰 비평 & 인사이트`,
              "description": book.desc,
              "image": book.cover || "https://archiview.shop/images/hero_expert_v5.png",
              "datePublished": book.publishedAt || "2026-01-01T00:00:00Z",
              "dateModified": new Date().toISOString().split('T')[0] + 'T00:00:00Z',
              "author": { "@type": "Organization", "name": "아카이뷰(ArchiView)", "url": "https://archiview.shop" },
              "publisher": { 
                "@type": "Organization", 
                "name": "아카이뷰(ArchiView)", 
                "url": "https://archiview.shop",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://archiview.shop/favicon.ico"
                }
              },
              "url": `https://archiview.shop/story/${book.id}`,
              "inLanguage": "ko",
              "mainEntityOfPage": { "@type": "WebPage", "@id": `https://archiview.shop/story/${book.id}` }
            },
            ...(faq.length > 0 ? [{
              "@type": "FAQPage",
              "mainEntity": faq.map(item => ({
                "@type": "Question",
                "name": item.q,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": item.a
                }
              }))
            }] : [])
          ]
        })}</script>
      </Helmet>

      {/* Copyright Clarification Banner */}
      <div className="w-full bg-slate-900 py-3 px-4 text-center border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
          <span className="inline-block px-2 py-0.5 bg-amber-400 text-black text-[10px] font-black rounded-md tracking-tighter">CONTENT POLICY</span>
          <p className="text-[11px] md:text-[13px] text-slate-300 font-medium leading-relaxed break-keep">
            아카이뷰의 모든 도서 비평은 원저작물의 저작권을 존중하며, <strong className="text-white">교육 및 비평 목적으로 작성된 독창적인 분석 콘텐츠</strong>임을 명시합니다.
          </p>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="w-full px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight text-gray-900 shrink-0">
            ArchiView
          </Link>
          <nav aria-label="카테고리 메뉴" className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <Link to="/about" className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap px-2 py-1">소개</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full pt-4">
        <div className="max-w-4xl mx-auto px-4 md:px-10">
          <div className="flex flex-row gap-5 items-start mb-10">
            {/* Static Review Cover */}
            <div
              className="w-28 h-40 md:w-48 md:h-64 flex-shrink-0 shadow-2xl rounded-xl overflow-hidden border border-white/10 flex flex-col items-center justify-center relative group"
              style={{ background: getGradientStyle(book.gradient) }}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
              <span className="material-symbols-outlined text-white text-4xl md:text-6xl mb-2 md:mb-4 drop-shadow-lg relative z-10">
                {book.icon || 'book'}
              </span>
              <div className="px-2 md:px-4 text-center relative z-10">
                <span className="text-[8px] md:text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] mb-1 block">Knowledge Library</span>
                <span className="text-xs md:text-sm font-bold text-white leading-tight drop-shadow-md line-clamp-2">{book.title}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>

            <div className="flex-1 text-left">
              <h1 className="text-xl md:text-5xl font-black text-gray-900 mb-2 tracking-tight leading-tight break-keep">
                {book.title}
              </h1>
              <p className="text-xs md:text-base text-gray-400 font-bold mb-4 tracking-wide">
                {book.author} <span className="text-gray-200 mx-2">|</span> {book.category}
              </p>
              <p className="text-xs md:text-xl text-gray-600 leading-relaxed font-semibold italic break-keep">
                "{book.desc}"
              </p>
            </div>
          </div>

          {/* Content Body */}
          <article className="border-b border-gray-100 pb-16">
            {book.fullReview && (/<[a-z][\s\S]*>/i.test(book.fullReview) || book.fullReview.includes('<')) ? (
              <div
                className="ebook-content-wrapper ebook-page prose prose-sm md:prose-lg prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: book.fullReview }}
              />
            ) : (
              <div className="prose prose-sm md:prose-lg prose-slate max-w-none">
                {sections.map((section, idx) => {
                  const lines = section.split('\n').filter(l => l.trim());
                  const title = lines[0];
                  const paragraphs = lines.slice(1);

                  return (
                    <section key={idx} className="mb-12">
                      <h2 className="text-xl md:text-3xl font-black text-gray-900 mb-6 flex items-center gap-3 tracking-tight">
                        <span className="w-2 h-8 bg-amber-400 rounded-full shrink-0"></span>
                        {title}
                      </h2>
                      <div className="space-y-5 text-[15px] md:text-xl text-gray-700 leading-[1.8] md:leading-loose">
                        {paragraphs.map((p, pIdx) => {
                          if (p.startsWith('---')) return <hr key={pIdx} className="my-14 border-gray-100" />;
                          if (p.startsWith('【지혜의 갈무리】')) return (
                            <div key={pIdx} className="bg-amber-50/50 p-8 rounded-3xl border border-amber-100/50 mt-16 mb-8">
                              <h3 className="text-2xl font-black text-gray-900 mb-4">{p}</h3>
                            </div>
                          );
                          
                          return <p key={pIdx} className="whitespace-pre-line break-keep font-medium opacity-90">{p}</p>;
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </article>

          {showDetails && <FaqSection faq={faq} />}

          {/* 에디터 프로필 (E-E-A-T 강화) */}
          <section className="mt-20 border-t border-gray-100 pt-12">
            <div className="flex items-center gap-2 mb-8">
              <span className="w-8 h-px bg-amber-500"></span>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Editor's Insight Profile</span>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {/* James Profile */}
              <div className={`bg-gray-50 rounded-[2.5rem] p-8 md:p-10 border border-gray-100 relative overflow-hidden group hover:shadow-xl hover:shadow-amber-900/5 transition-all duration-500 ${(['ECONOMY', 'MANAGEMENT'].includes(book.category) || (book.id.includes('부의-본질') || book.id.includes('머니'))) ? 'order-first' : 'order-last opacity-80'}`}>
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                  <span className="material-symbols-outlined text-[140px]">trending_up</span>
                </div>
                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg shrink-0">J</div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black text-slate-900">Editor James (제임스)</h3>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-md uppercase tracking-tighter">Business Expert</span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-4 tracking-tight">전략 경영 MBA · 12년차 비즈니스 컨설턴트</p>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6 break-keep">
                      제임스는 시장의 거시적 흐름 속에서 변하지 않는 성공의 원칙을 분석합니다. 수조 원 규모의 투자 프로젝트 기획부터 글로벌 비즈니스 전략까지 두루 거친 실전 지식을 바탕으로, 오늘 당신의 자산과 사업에 즉시 적용할 수 있는 통찰을 제안합니다.
                    </p>
                    <Link to="/about#editor-james" className="inline-flex items-center gap-2 text-xs font-black text-amber-600 hover:text-amber-700 transition-colors uppercase tracking-widest border-b-2 border-amber-200 pb-1">
                      전문에디터의 경력 더보기
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Stella Profile */}
              <div className={`bg-gray-50 rounded-[2.5rem] p-8 md:p-10 border border-gray-100 relative overflow-hidden group hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-500 ${(!(['ECONOMY', 'MANAGEMENT'].includes(book.category) || (book.id.includes('부의-본질') || book.id.includes('머니')))) ? 'order-first' : 'order-last opacity-80'}`}>
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                  <span className="material-symbols-outlined text-[140px]">psychology</span>
                </div>
                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg shrink-0">S</div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black text-slate-900">Editor Stella (스텔라)</h3>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded-md uppercase tracking-tighter">Humanities Expert</span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-4 tracking-tight">심리학 박사(Ph.D) · 행동 변화 전문가</p>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6 break-keep">
                      스텔라는 지혜의 기록이 실질적인 삶의 변화와 내면의 단단함으로 이어지는 과정을 연구합니다. 인류의 역사와 심리학적 근거를 바탕으로, 지친 현대 직장인들이 다시 일어서서 나아갈 수 있는 따뜻하고도 날카로운 삶의 태도를 가이드합니다.
                    </p>
                    <Link to="/about#editor-stella" className="inline-flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest border-b-2 border-blue-200 pb-1">
                      전문에디터의 경력 더보기
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Kakao-style Chat Section */}
          {showDetails && script && script.length > 0 && (
            <section className="mt-20">
              <div className="flex flex-col items-center mb-10">
                <span className="px-4 py-1.5 bg-amber-50 text-amber-600 text-xs font-bold rounded-full mb-3 uppercase tracking-widest">Insight Dialogue 2.0</span>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 text-center">
                  도서 심층 분석 대화
                </h2>
                <p className="text-gray-500 text-sm mt-3 text-center max-w-md">
                  전담 에디터 제임스와 스텔라가 들려주는<br/>현장의 목소리와 실전 인사이트를 만나보세요.
                </p>
              </div>

              <div className="bg-[#f0f0f0] rounded-[40px] p-6 md:p-10 shadow-inner overflow-hidden border border-gray-200">
                <div className="space-y-8">
                  {script.map((turn, i) => {
                    const isJames = i % 2 === 0;
                    return (
                      <div key={i} className={`flex ${isJames ? 'flex-row' : 'flex-row-reverse'} items-start gap-3`}>
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm border-2 border-white bg-white">
                          <img
                            src={isJames ? '/images/james101.jpg' : '/images/stella101.jpg'}
                            alt={isJames ? 'James' : 'Stella'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => { e.currentTarget.src = "https://ui-avatars.com/api/?name=" + (isJames ? "J" : "S") + "&background=random"; }}
                          />
                        </div>
                        <div className={`flex flex-col ${isJames ? 'items-start' : 'items-end'} max-w-[75%]`}>
                          <span className="text-[11px] font-bold text-gray-500 mb-1 px-1">
                            {isJames ? 'James / 에디터' : 'Stella / 에디터'}
                          </span>
                          <div 
                            className={`relative px-4 py-3 rounded-2xl text-[14px] md:text-md leading-relaxed shadow-sm ${
                              isJames 
                                ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100' 
                                : 'bg-amber-300 text-gray-900 rounded-tr-none'
                            }`}
                          >
                            {turn.text || turn.content || ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-12 py-6 border-t border-gray-200/50 text-center">
                  <p className="text-[11px] text-gray-400 font-medium">대화의 끝</p>
                </div>
              </div>
            </section>
          )}

        {/* Action Guide */}
        {book.actionGuide && (
          <div className="mt-24 bg-gray-50 rounded-3xl p-8 md:p-12 border border-blue-50">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-500">bolt</span>
              오늘의 실천 가이드
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {book.actionGuide.map((action, aIdx) => (
                <div key={aIdx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-gray-900 text-white text-[10px] flex items-center justify-center rounded-full font-bold">{aIdx + 1}</span>
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed pl-8">{action.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Books */}
        {(() => {
          const CATEGORY_SLUG = { ECONOMY: 'economy', SELF_DEV: 'self-dev', MANAGEMENT: 'management', HUMANITIES: 'humanities', PSYCHOLOGY: 'psychology' };
          const CATEGORY_LABEL = { ECONOMY: '경제', SELF_DEV: '자기계발', MANAGEMENT: '경영', HUMANITIES: '인문', PSYCHOLOGY: '심리' };
          const catSlug = CATEGORY_SLUG[book.category];
          const catLabel = CATEGORY_LABEL[book.category];

          // 같은 카테고리 우선, 부족하면 다른 카테고리로 보완해 항상 3개 확보
          const samecat = adsenseBooks.filter(b => b.id !== book.id && b.category === book.category);
          const others  = adsenseBooks.filter(b => b.id !== book.id && b.category !== book.category);
          const related = [...samecat, ...others].slice(0, 3);
          if (related.length === 0) return null;
          return (
            <div className="mt-20 border-t border-gray-100 pt-16">
              <div className="flex items-center justify-between mb-8 px-2">
                <h2 className="text-xl font-bold text-gray-900">당신을 위한 다른 통찰력</h2>
                {catSlug && (
                  <Link to={`/${catSlug}`} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                    {catLabel} 도서 더보기 <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 gap-6">
                {related.map(r => (
                  <div
                    key={r.id}
                    onClick={() => { window.scrollTo(0, 0); navigate(`/story/${r.id}`); }}
                    className="group flex gap-6 p-6 bg-white border border-gray-100 rounded-2xl hover:border-amber-200 hover:shadow-xl transition-all duration-300 cursor-pointer"
                  >
                    <div className="w-16 h-24 flex-shrink-0 rounded-lg shadow-lg overflow-hidden" style={{ background: getGradientStyle(r.gradient) }}>
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-2xl">{r.icon || 'book'}</span>
                      </div>
                    </div>
                    <div className="flex-1 py-1">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{CATEGORY_LABEL[r.category] || r.category}</span>
                      <h3 className="font-extrabold text-gray-900 group-hover:text-amber-600 transition-colors mt-0.5">{r.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 font-medium">{r.author}</p>
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* 카테고리 탐색 링크 */}
              <div className="mt-10 flex flex-wrap gap-2 justify-center">
                {Object.entries(CATEGORY_SLUG).map(([cat, slug]) => (
                  <Link key={slug} to={`/${slug}`}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${book.category === cat ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-amber-200 hover:text-amber-600'}`}>
                    {CATEGORY_LABEL[cat]}
                  </Link>
                ))}
                <Link to="/review-board" className="px-4 py-2 rounded-full text-xs font-bold border border-gray-200 text-gray-500 hover:border-amber-200 hover:text-amber-600 bg-gray-50 transition-colors">
                  전체 리뷰 보기
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Footer Link */}
        <footer className="mt-24 border-t border-gray-100 pt-16 pb-12">
          <p className="text-gray-400 text-xs mb-8 max-w-lg mx-auto leading-relaxed text-center">
            본 서비스는 전문적인 독서 큐레이션 및 인사이트 제공을 위해 독립적인 분석을 거쳐 제작되었습니다. 도서의 더 깊은 감동은 정식 출판물을 통해 확인하시길 권장합니다.
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-8">
            <Link to="/" className="inline-flex items-center gap-2 bg-black text-white px-8 py-3.5 rounded-full font-bold hover:bg-gray-800 transition-all text-sm shadow-lg">
              홈으로 이동하기
            </Link>
            <Link to="/about" className="inline-flex items-center gap-2 bg-gray-50 text-gray-700 px-8 py-3.5 rounded-full font-bold hover:bg-gray-100 transition-all text-sm">
              서비스 소개
            </Link>
          </div>
          <nav aria-label="법적 정보" className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-8">
            <Link to="/about" className="text-gray-400 hover:text-gray-900 text-xs font-medium">서비스 소개</Link>
            <Link to="/contact" className="text-gray-400 hover:text-gray-900 text-xs font-medium">문의하기</Link>
            <Link to="/privacy" className="text-gray-400 hover:text-gray-900 text-xs font-medium">개인정보처리방침</Link>
            <Link to="/terms" className="text-gray-400 hover:text-gray-900 text-xs font-medium">이용약관</Link>
          </nav>
          <p className="text-center text-[10px] text-gray-300 font-bold tracking-widest uppercase">
            © 2026 ArchiView Original Factory. All Rights Reserved.
          </p>
        </footer>
        </div>{/* max-w-4xl wrapper */}
      </main>
    </div>
  );
}
