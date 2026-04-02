import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';
import Footer from '../components/Footer';
import KakaoAdFit from '../components/KakaoAdFit';
import { ADSENSE_CATEGORIES, adsenseBooks as staticBooks } from '../data/adsense/books';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const CATEGORY_COLORS = {
  '자기계발': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  '경제':    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  '경영':    { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    dot: 'bg-blue-500' },
  '인문':    { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  dot: 'bg-purple-500' },
  '심리':    { bg: 'bg-pink-500/10',    border: 'border-pink-500/30',    text: 'text-pink-400',    dot: 'bg-pink-500' },
};

export default function ReviewBoard() {
  // Firestore에서 title → 실제 document ID 매핑만 가져옴
  const [idMap, setIdMap] = useState({});

  useEffect(() => {
    document.title = "리뷰 라이브러리 - 아카이뷰 도서 인사이트";
    window.scrollTo(0, 0);

    const unsub = onSnapshot(collection(db, 'adsenseBooks'), (snap) => {
      try {
        const map = {};
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.title) map[data.title] = d.id;
        });
        setIdMap(map);
      } catch (e) {
        console.error('ReviewBoard Firestore error:', e);
      }
    });

    return () => unsub();
  }, []);

  // 표시 데이터는 staticBooks 그대로, 링크용 id만 Firestore에서 교체
  const books = staticBooks.map(b => ({
    ...b,
    id: idMap[b.title] || b.id,
  }));

  const combinedBooks = ADSENSE_CATEGORIES.map(cat => ({
    ...cat,
    books: books.filter(b => b.category === cat.label),
    color: CATEGORY_COLORS[cat.label] || CATEGORY_COLORS['자기계발'],
  }));

  return (
    <div className="bg-[#0c0e14] text-white font-sans antialiased min-h-screen flex flex-col">
      <Helmet>
        <title>리뷰 라이브러리 | 아카이뷰 도서 인사이트</title>
        <meta name="description" content="자기계발·경제·경영·인문·심리 분야 베스트셀러 25권의 핵심 인사이트를 아카이뷰 리뷰 라이브러리에서 만나보세요." />
        <meta property="og:title" content="리뷰 라이브러리 | 아카이뷰 도서 인사이트" />
        <meta property="og:description" content="세계적 베스트셀러 25권 엄선 — 자기계발·경제·경영·인문·심리 핵심 인사이트 컬렉션" />
        <meta property="og:url" content="https://archiview.store/review-board" />
        <link rel="canonical" href="https://archiview.store/review-board" />
      </Helmet>
      <TopNavigation type="sub" />

      {/* Page Header */}
      <div className="px-5 pt-6 pb-5 border-b border-white/5">
        <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Curated Reviews</p>
        <h1 className="text-[22px] font-black tracking-tight text-white leading-tight">리뷰 라이브러리</h1>
        <p className="text-white/40 text-[12px] mt-1 break-keep">
          자기계발 · 경제 · 경영 · 인문 · 심리 — {books.length}권 엄선
        </p>
      </div>

      <main className="flex-grow pb-28">
        {combinedBooks.map((cat, catIdx) => (
          <div key={cat.key}>
            {/* Category Section Header */}
            <div className={`flex items-center gap-3 px-5 py-3 border-b border-white/5 ${cat.color.bg}`}>
              <div className={`w-2 h-2 rounded-full ${cat.color.dot}`}></div>
              <h2 className={`text-[13px] font-black uppercase tracking-widest ${cat.color.text}`}>{cat.label}</h2>
              <span className="text-white/20 text-[11px] font-bold">{cat.sub}</span>
              <span className={`ml-auto text-[10px] font-black ${cat.color.text}`}>{cat.books.length}</span>
            </div>

            {/* Book List */}
            {cat.books.map((book, idx) => {
              const targetLink = book.link || `/story/${book.id}`;
              const isExternal = targetLink.startsWith('http');
              const CardTag = isExternal ? 'a' : Link;
              const cardProps = isExternal
                ? { href: targetLink }
                : { to: targetLink };

              return (
                <CardTag
                  key={book.id}
                  {...cardProps}
                  className="flex items-stretch border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Left color bar */}
                  <div className={`w-1 shrink-0 ${cat.color.dot} opacity-40 group-hover:opacity-100 transition-opacity`}></div>

                  {/* Gradient Cover */}
                  <div className={`w-14 h-[72px] shrink-0 bg-gradient-to-br ${book.gradient || 'from-zinc-800 to-black'} flex items-center justify-center my-3 ml-3 rounded-sm overflow-hidden`}>
                    <span className="material-symbols-outlined text-white/60 text-2xl group-hover:scale-110 transition-transform">{book.icon || 'book'}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[14px] font-black text-white leading-tight line-clamp-1 group-hover:text-orange-400 transition-colors">{book.title}</h3>
                        <p className="text-white/40 text-[11px] font-bold mt-0.5">{book.author}</p>
                      </div>
                      <span className={`text-[7px] font-black shrink-0 mt-0.5 px-1.5 py-0.5 rounded-sm border ${cat.color.border} ${cat.color.text} uppercase`}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-white/35 text-[11px] mt-2 line-clamp-2 leading-relaxed break-keep">{book.desc}</p>
                    <div className={`inline-flex items-center gap-1 mt-2 text-[10px] font-black ${cat.color.text}`}>
                      인사이트 보기
                      <span className="material-symbols-outlined text-[12px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                    </div>
                  </div>
                </CardTag>
              );
            })}

            {/* AdFit between categories */}
            {catIdx === 1 && (
              <div className="py-4 flex justify-center bg-black/20">
                <KakaoAdFit unit="DAN-8TOvfml5bpBYgcZ0" width="320" height="100" />
              </div>
            )}
          </div>
        ))}
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
}
