import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';
import Footer from '../components/Footer';
import KakaoAdFit from '../components/KakaoAdFit';
import { ADSENSE_CATEGORIES, adsenseBooks as staticBooks } from '../data/adsense/books';

const CATEGORY_COLORS = {
  '자기계발': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  '경제':    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  '경영':    { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    dot: 'bg-blue-500' },
  '인문':    { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  dot: 'bg-purple-500' },
  '심리':    { bg: 'bg-pink-500/10',    border: 'border-pink-500/30',    text: 'text-pink-400',    dot: 'bg-pink-500' },
};

export default function ReviewBoard() {
  useEffect(() => {
    document.title = "리뷰 라이브러리 - Whiteboard 도서 인사이트";
    window.scrollTo(0, 0);
  }, []);

  const books = staticBooks;

  const combinedBooks = ADSENSE_CATEGORIES.map(cat => ({
    ...cat,
    books: books.filter(b => b.category === cat.label),
    color: CATEGORY_COLORS[cat.label] || CATEGORY_COLORS['자기계발'],
  }));

  return (
    <div className="bg-white text-slate-900 font-sans antialiased min-h-screen flex flex-col">
      <Helmet>
        <title>리뷰 라이브러리 | Whiteboard 도서 인사이트</title>
        <meta name="description" content="자기계발·경제·경영·인문·심리 분야 베스트셀러 25권의 핵심 인사이트를 Whiteboard 리뷰 라이브러리에서 만나보세요." />
        <meta property="og:title" content="리뷰 라이브러리 | Whiteboard 도서 인사이트" />
        <meta property="og:description" content="세계적 베스트셀러 25권 엄선 — 자기계발·경제·경영·인문·심리 핵심 인사이트 컬렉션" />
        <meta property="og:url" content="https://archiview.shop/review-board" />
        <link rel="canonical" href="https://archiview.shop/review-board" />
      </Helmet>
      <TopNavigation type="main" />

      <main className="flex-grow pb-28 pt-20">
        <div className="max-w-[900px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-[15px] font-bold text-slate-900">리뷰 라이브러리</h1>
              <span className="text-[11px] text-slate-400 font-medium">{books.length}권</span>
            </div>
          </div>

          {combinedBooks.map((cat, catIdx) => (
            <div key={cat.key} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${cat.color.dot}`}></div>
                <h2 className={`text-[13px] font-bold ${cat.color.text}`}>{cat.label}</h2>
              </div>

              <div className="space-y-0">
                {cat.books.map((book, idx) => (
                  <Link
                    key={book.id}
                    to={`/story/${book.id}`}
                    className="flex items-start gap-4 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors group px-2 -mx-2 rounded"
                  >
                    <span className="text-slate-300 font-bold text-sm w-5 text-right flex-shrink-0 pt-1">{idx + 1}</span>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-[14px] font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{book.title}</h3>
                          <p className="text-[12px] text-slate-500 mt-0.5">{book.author}</p>
                        </div>
                        <div className={`hidden sm:flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold border transition-all whitespace-nowrap flex-shrink-0 rounded-sm ${cat.color.border} ${cat.color.text}`}>
                          글보기
                          <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                        </div>
                      </div>
                      {book.desc && <p className="text-[12px] text-slate-400 mt-1.5 line-clamp-1">{book.desc}</p>}
                    </div>
                  </Link>
                ))}
              </div>

              {catIdx === 1 && (
                <div className="py-4 flex justify-center">
                  <KakaoAdFit unit="DAN-8TOvfml5bpBYgcZ0" width="320" height="100" />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
}
