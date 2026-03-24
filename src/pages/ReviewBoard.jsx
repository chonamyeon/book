import React, { useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useBookData } from '../hooks/useBookData';
import { motion } from 'framer-motion';
import BottomNavigation from '../components/BottomNavigation';

export default function ReviewBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAllBooks } = useBookData();

  const allBooks = useMemo(() => {
    const merged = getAllBooks();
    // Remove duplicates by title
    return merged.filter((book, i, arr) => arr.findIndex(b => b.title === book.title) === i);
  }, [getAllBooks]);

  useEffect(() => {
    // SEO 메타데이터 업데이트 (검색엔진/애드센스 친화형)
    document.title = "리뷰 라이브러리 - 아카이뷰 독점 도서 전체 해석 및 리뷰";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", "바쁜 직장인을 위한 고밀도 도서 리뷰 아카이브. 깊이 있는 독점 텍스트 인사이트를 전체 열람하고 성장의 길을 찾아보세요.");

    if (location.hash) {
      setTimeout(() => {
        const id = decodeURIComponent(location.hash.replace('#', ''));
        const element = document.getElementById(id);
        if (element) {
          // Add some offset for sticky header
          const y = element.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 300);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location, allBooks]);

  // Extract full plain text for SEO from the review and ebook
  const getFullReviewText = (book) => {
    let finalTexts = [];
    const tmp = document.createElement("DIV");
    
    if (book.review) {
      try {
        tmp.innerHTML = book.review;
        let text = tmp.textContent || tmp.innerText || "";
        text = text.replace(/\[.*?\]/g, '').trim();
        if (text) finalTexts.push(text);
      } catch (e) {
        console.error(e);
      }
    }

    if (book.ebookText) {
      try {
        tmp.innerHTML = book.ebookText;
        let eText = tmp.textContent || tmp.innerText || "";
        eText = eText.replace(/\[.*?\]/g, '').trim();
        if (eText) finalTexts.push(eText);
      } catch (e) {
        console.error(e);
      }
    }

    if (finalTexts.length === 0) {
      return book.desc || "도서 리뷰 및 인사이트가 준비되어 있습니다.";
    }

    return finalTexts.join("\n\n--- [ 이북 내용 포함 ] ---\n\n");
  };

  return (
    <div className="bg-black text-white font-sans antialiased min-h-screen flex flex-col relative selection:bg-indigo-500/30">
      {/* Header */}
      <div className="bg-[#101218] px-4 py-4 sticky top-0 z-50 border-b border-white/5 flex items-center justify-between" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h1 className="text-[18px] font-black tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-[20px]">library_books</span>
                리뷰 라이브러리
            </h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow px-5 py-8 space-y-6 pb-32">
        <div className="mb-6">
          <h2 className="text-[20px] font-black tracking-tight text-white mb-2 leading-tight">지성의 아카이브,<br/>깊이 있는 리뷰 컬렉션</h2>
          <p className="text-[12.5px] text-gray-400 font-medium leading-relaxed break-keep">
            성공의 길을 열어줄 수천 권의 책에서 직장인을 위해 엄선한 고밀도 도서 리뷰와 텍스트 인사이트를 한 곳에서 만나보세요. 
            원하는 도서를 클릭하면 전체 내용을 제한 없이 열람할 수 있습니다.
          </p>
        </div>

        <div className="space-y-5">
            {allBooks.map((book, idx) => (
            <motion.article 
                id={`book-${book.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx > 6 ? 0 : idx * 0.05 }}
                key={idx} 
                className="bg-zinc-900 border border-white/5 shadow-2xl overflow-hidden group hover:border-indigo-500/30 transition-colors"
                style={{ scrollMarginTop: '80px' }}
            >
                <Link to={`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`} className="block">
                    <div className="p-5 pb-3">
                        <div className="flex flex-col pt-1">
                            {book.category && (
                                <div className="mb-2">
                                    <span className="bg-white/10 text-[9px] font-black text-white px-2 py-0.5 rounded-sm">
                                        {book.category}
                                    </span>
                                </div>
                            )}
                            <div>
                                <h3 className="text-[17px] font-black text-white leading-snug mb-1 group-hover:text-indigo-400 transition-colors tracking-tight">{book.title}</h3>
                                <p className="text-[11px] text-gray-400 font-bold mb-2 truncate">{book.author}</p>
                                <p className="text-[11px] text-gray-500 font-medium break-keep leading-tight">{book.desc}</p>
                            </div>
                        </div>
                    </div>

                    {/* SEO Heavy Text Section */}
                    <div className="bg-black/50 p-4 border-t border-white/5 relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                        <p className="text-[12.5px] text-gray-300 leading-[1.7] font-medium break-keep whitespace-pre-wrap">
                            {getFullReviewText(book)}
                        </p>
                        <div className="mt-6 flex items-center justify-between">
                            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest bg-white/5 px-2 py-1">인사이트 읽기 (Read More)</span>
                            <span className="material-symbols-outlined text-indigo-400 text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </Link>
            </motion.article>
            ))}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
