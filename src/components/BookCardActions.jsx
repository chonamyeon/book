import React from 'react';
import { Link } from 'react-router-dom';
import { useAudio } from '../contexts/AudioContext';

/**
 * 공유 북카드 액션 버튼 컴포넌트
 * 4개 버튼: 리뷰 디테일 | ▶ 재생 | 서재 추가 | 도서 구매
 * 이 컴포넌트를 수정하면 모든 페이지에 동시 적용됩니다.
 */
export default function BookCardActions({ book, className = '' }) {
    const { openScriptModal, podcastPlaying, podcastInfo } = useAudio();

    const isPlaying = podcastPlaying && podcastInfo?.id === book.id;
    const audioUrl = book.podcastFile || book.voiceAudioUrl || book.audioUrl || `/audio/${book.id}.mp3`;
    const purchaseUrl = book.purchaseLink ||
        `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=All&SearchWord=${encodeURIComponent(book.title)}`;

    const addToLibrary = (e) => {
        e.stopPropagation();
        const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
        if (saved.some(b => b.title === book.title)) {
            alert('이미 서재에 보관된 도서입니다.');
            return;
        }
        const updated = [...saved, { id: book.id, title: book.title, author: book.author, cover: book.cover }];
        localStorage.setItem('savedBooks', JSON.stringify(updated));
        window.dispatchEvent(new Event('savedBooksUpdated'));
        alert('서재에 보관되었습니다. ✅');
    };

    const handlePlay = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openScriptModal(book.id, audioUrl, book.title, book.cover);
    };

    return (
        <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
            {/* 1. 리뷰 디테일 */}
            <Link
                to={`/review/${book.id}?tab=ebook`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center py-2 rounded-none bg-white/5 border border-white/10 text-[10px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
            >
                리뷰 디테일
            </Link>

            {/* 2. ▶ 재생 */}
            <button
                onClick={handlePlay}
                className={`flex items-center justify-center gap-1 py-2 rounded-none border text-[10px] font-black transition-all whitespace-nowrap ${
                    isPlaying
                        ? 'bg-orange-500 text-white border-orange-500 animate-pulse'
                        : 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
                }`}
            >
                <span>{isPlaying ? '⏸' : '▶'}</span>
                <span>{isPlaying ? '재생중' : '재생'}</span>
            </button>

            {/* 3. 서재 추가 */}
            <button
                onClick={addToLibrary}
                className="flex items-center justify-center py-2 rounded-none bg-white/5 border border-white/10 text-[10px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
            >
                서재 추가
            </button>

            {/* 4. 도서 구매 */}
            <a
                href={purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center py-2 rounded-none bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] font-black text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all whitespace-nowrap"
            >
                도서 구매
            </a>
        </div>
    );
}
