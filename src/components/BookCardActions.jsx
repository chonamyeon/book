import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 공유 북카드 액션 버튼 컴포넌트
 * 4개 버튼: 리뷰 디테일 | ▶ 재생 | 서재 추가 | 도서 구매
 * 이 컴포넌트를 수정하면 모든 페이지에 동시 적용됩니다.
 */
export default function BookCardActions({ book, className = '' }) {
    const purchaseUrl = book.purchaseLink ||
        `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=All&SearchWord=${encodeURIComponent(book.title)}`;

    const safeId = book.id || book.title.toLowerCase().replace(/\s+/g, '-');

    const addToLibrary = (e) => {
        e.stopPropagation();
        const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
        if (saved.some(b => b.title === book.title)) {
            alert('이미 서재에 보관된 도서입니다.');
            return;
        }
        const updated = [...saved, { id: safeId, title: book.title, author: book.author, cover: book.cover }];
        localStorage.setItem('savedBooks', JSON.stringify(updated));
        window.dispatchEvent(new Event('savedBooksUpdated'));
        alert('서재에 보관되었습니다. ✅');
    };

    return (
        <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
            {/* 1. 리뷰 디테일 */}
            <Link
                to={`/review/${safeId}?tab=ebook`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1 py-2 rounded-none bg-white/5 border border-white/10 text-[10px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
            >
                <span className="material-symbols-outlined text-[14px]">menu_book</span>
                리뷰 디테일
            </Link>

            {/* 2. 팟캐스트 탭으로 이동 */}
            <Link
                to={`/review/${safeId}?tab=podcast`}
                onClick={(e) => e.stopPropagation()}
                className="group flex items-center justify-center gap-1 py-2 rounded-none bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 text-[10px] font-black transition-all whitespace-nowrap"
            >
                <span className="material-symbols-outlined text-[14px] group-hover:hidden group-active:hidden">graphic_eq</span>
                <div className="hidden group-hover:flex group-active:flex items-center justify-center gap-[1.5px] h-[14px] w-[14px]">
                    <div className="w-[1.5px] bg-current rounded-sm h-[6px] animate-wave-bar wave-delay-1" />
                    <div className="w-[1.5px] bg-current rounded-sm h-[10px] animate-wave-bar wave-delay-2" />
                    <div className="w-[1.5px] bg-current rounded-sm h-[14px] animate-wave-bar wave-delay-3" />
                    <div className="w-[1.5px] bg-current rounded-sm h-[8px] animate-wave-bar wave-delay-4" />
                    <div className="w-[1.5px] bg-current rounded-sm h-[4px] animate-wave-bar wave-delay-5" />
                </div>
                <span>팟캐스트</span>
            </Link>

            {/* 3. 서재 추가 */}
            <button
                onClick={addToLibrary}
                className="flex items-center justify-center gap-1 py-2 rounded-none bg-white/5 border border-white/10 text-[10px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
            >
                <span className="material-symbols-outlined text-[14px]">bookmark_add</span>
                서재 추가
            </button>

            {/* 4. 도서 구매 */}
            <a
                href={purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1 py-2 rounded-none bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] font-black text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all whitespace-nowrap"
            >
                <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
                도서 구매
            </a>
        </div>
    );
}
