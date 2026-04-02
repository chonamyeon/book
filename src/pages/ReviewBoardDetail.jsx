import React, { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookData } from '../hooks/useBookData';
import { motion } from 'framer-motion';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';

export default function ReviewBoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAllBooks } = useBookData();

  const allBooks = useMemo(() => {
    const merged = getAllBooks();
    return merged.filter((book, i, arr) => arr.findIndex(b => b.title === book.title) === i);
  }, [getAllBooks]);

  const book = useMemo(() => {
      return allBooks.find(b => b.id === id || b.title.toLowerCase().replace(/\s+/g, '-') === id);
  }, [allBooks, id]);

  useEffect(() => {
    if (book) {
      document.title = `${book.title} 리뷰 및 핵심 요약 - 아카이뷰`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", book.desc || `${book.title}에 대한 깊이 있는 리뷰와 인사이트를 확인하세요.`);
      window.scrollTo(0, 0);
    }
  }, [book]);

  const getFullReviewText = (book) => {
    if (!book) return "";
    let finalTexts = [];
    const tmp = document.createElement("DIV");
    
    // 1. Review HTML
    if (book.review) {
      try {
        tmp.innerHTML = book.review;
        let text = tmp.textContent || tmp.innerText || "";
        text = text.replace(/\[.*?\]/g, '').trim();
        if (text) finalTexts.push("### 도서 리뷰\n" + text);
      } catch (e) {
        console.error(e);
      }
    }

    // 2. e-Book / Original Content
    if (book.ebookText) {
      try {
        tmp.innerHTML = book.ebookText;
        let eText = tmp.textContent || tmp.innerText || "";
        eText = eText.replace(/\[.*?\]/g, '').trim();
        if (eText) finalTexts.push("### 핵심 텍스트\n" + eText);
      } catch (e) {
        console.error(e);
      }
    }

    // 3. Podcast Script (High word count)
    if (book.podcastScript) {
        finalTexts.push("### 오디오 스크립트 전문\n" + book.podcastScript);
    }
    
    // 4. Insights
    if (book.insights && Array.isArray(book.insights) && book.insights.length > 0) {
        finalTexts.push("### 💡 핵심 인사이트\n" + book.insights.map((ins, i) => `${i+1}. ${ins.title}\n${ins.description}`).join("\n\n"));
    }
    
    // 5. Action Guide
    if (book.actionGuide && Array.isArray(book.actionGuide) && book.actionGuide.length > 0) {
        finalTexts.push("### 🎯 액션 플랜\n" + book.actionGuide.map((act, i) => `${i+1}. ${act.title}\n${act.description}`).join("\n\n"));
    }
    
    // 6. Description (Fallback base)
    if (book.description && book.description.length > 30) finalTexts.push("### 작품 요약\n" + book.description);

    if (finalTexts.length === 0) {
      return book.desc || "이 도서의 심층 리뷰와 핵심 인사이트가 준비되어 있습니다.";
    }

    return finalTexts.join("\n\n------------------------\n\n");
  };

  if (!book) {
      return (
          <div className="bg-black text-white min-h-screen flex items-center justify-center">
              <p>도서를 찾을 수 없습니다.</p>
          </div>
      );
  }

  return (
    <div className="bg-black text-white font-sans antialiased min-h-screen flex flex-col relative selection:bg-indigo-500/30">
      {/* Header */}
      <TopNavigation type="sub" />
      <div className="bg-[#101218] px-2 py-4 border-b border-white/5 flex items-center justify-between">
          <h1 className="text-[17px] font-black tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-[20px]">menu_book</span>
              리뷰 라이브러리 문서
          </h1>
      </div>

      <main className="flex-grow px-1 py-8 space-y-6 pb-32">
        <motion.article 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-zinc-900 border border-white/5 shadow-2xl overflow-hidden"
        >
            <div className="p-5 pb-3">
                <div className="flex flex-col pt-1">
                    {book.category && (
                        <div className="mb-2">
                            <span className="bg-white/10 text-[10px] font-black text-white px-2.5 py-1 rounded-sm">
                                {book.category}
                            </span>
                        </div>
                    )}
                    <div>
                        <h1 className="text-[22px] font-black text-white leading-snug mb-2 tracking-tight">{book.title}</h1>
                        <p className="text-[13px] text-gray-400 font-bold mb-4">{book.author}</p>
                    </div>
                </div>
            </div>

            <div className="bg-black/50 p-5 border-t border-white/5 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                
                {/* Image removed for SEO/Adsense reasons */}
                
                <p className="text-[14px] text-gray-300 leading-[1.8] font-medium break-keep whitespace-pre-wrap">
                    {getFullReviewText(book)}
                </p>
            </div>
            
            <div className="p-5 bg-zinc-900 flex justify-center border-t border-white/5">
                <button onClick={() => navigate(`/story/${book.id}`)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-colors w-full shadow-lg">
                    이 도서의 15분 팟캐스트 듣기
                </button>
            </div>
        </motion.article>
      </main>

      <BottomNavigation />
    </div>
  );
}
