import React, { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { motion, AnimatePresence } from 'framer-motion';
import { celebrities } from '../data/celebrities';

// Page components for the flipbook
const PageCover = React.forwardRef((props, ref) => {
    return (
        <div className="bg-[#1a1c20] w-full h-full shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-8 border-l-4 border-gold/20" ref={ref} data-density="hard">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/leather.png')" }}></div>
            <div className="z-10 text-center space-y-6">
                <div className="w-48 aspect-[2/3] mx-auto shadow-[0_20px_40px_rgba(0,0,0,0.8)] rounded-md overflow-hidden border border-white/10">
                    <img src={props.cover} alt="Cover" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-2">
                    <h2 className="serif-title text-3xl text-white font-bold tracking-tight">{props.title}</h2>
                    <p className="text-gold text-sm font-light uppercase tracking-[0.3em]">{props.author}</p>
                </div>
                <div className="pt-8 flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-gold/50 animate-bounce">swipe_left</span>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest leading-none">Open to Read</p>
                </div>
            </div>
            <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-black/40 to-transparent"></div>
        </div>
    );
});

const Page = React.forwardRef((props, ref) => {
    return (
        <div className="bg-[#fcfaf2] w-full h-full p-10 flex flex-col shadow-inner relative" ref={ref}>
            {/* Subtle paper texture */}
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/paper-fibers.png')" }}></div>

            <div className="z-10 flex flex-col h-full">
                <div className="flex justify-between items-center mb-10 border-b border-black/5 pb-2">
                    <span className="text-[9px] text-black/40 font-bold uppercase tracking-widest">The Archive Editorial</span>
                    <span className="text-[9px] text-black/40 font-bold">{props.number}</span>
                </div>

                <div className="flex-1">
                    <div className="prose prose-sm max-w-none">
                        <p className="text-[#2a2a2a] text-lg leading-relaxed font-serif whitespace-pre-wrap selection:bg-gold/20">
                            {props.children}
                        </p>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-black/5 flex justify-center italic text-[10px] text-black/20">
                    Archide Book Curation
                </div>
            </div>

            {/* Page fold effect */}
            <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/[0.03] to-transparent"></div>
        </div>
    );
});

export default function ReviewDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const bookRef = useRef(null);

    // Book data mapping
    const bookMap = {
        "sapiens": "사피엔스",
        "1984": "1984",
        "demian": "데미안",
        "vegetarian": "채식주의자",
        "factfulness": "팩트풀니스",
        "almond": "아몬드"
    };

    const bookTitle = bookMap[id] || "사피엔스";

    let targetBook = null;
    celebrities.forEach(celeb => {
        const found = celeb.books.find(b => b.title === bookTitle);
        if (found) targetBook = found;
    });

    if (!targetBook) {
        return <div className="p-20 text-white text-center">리뷰를 찾을 수 없습니다.</div>;
    }

    // Split review into pages (roughly 400 chars per page for better layout)
    const reviewText = targetBook.review || targetBook.desc;
    const chunks = reviewText.match(/.{1,450}/g) || [reviewText];

    return (
        <div className="bg-[#0a0a0c] min-h-screen font-display flex flex-col items-center justify-center p-4">
            {/* Close Button */}
            <button
                onClick={() => navigate(-1)}
                className="fixed top-8 right-8 z-50 size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-gold hover:text-primary transition-all shadow-2xl backdrop-blur-md group"
            >
                <span className="material-symbols-outlined transition-transform group-hover:rotate-90">close</span>
            </button>

            {/* Instruction Overlay */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 text-center space-y-2 pointer-events-none"
            >
                <div className="text-gold text-[10px] font-black uppercase tracking-[0.4em]">E-Book Review</div>
                <h1 className="text-white/40 text-xs font-light tracking-widest uppercase">페이지를 넘겨서 리뷰를 읽어보세요</h1>
            </motion.div>

            {/* FlipBook Container */}
            <div className="relative w-full max-w-4xl aspect-[1.4/1] md:aspect-[1.6/1] flex justify-center items-center overflow-hidden py-10">
                <div className="shadow-[0_50px_100px_rgba(0,0,0,0.8)] rounded-md overflow-hidden">
                    <HTMLFlipBook
                        width={400}
                        height={600}
                        size="stretch"
                        minWidth={300}
                        maxWidth={500}
                        minHeight={400}
                        maxHeight={700}
                        maxShadowOpacity={0.5}
                        showCover={true}
                        mobileScrollSupport={true}
                        ref={bookRef}
                        className="editorial-book"
                    >
                        {/* Cover */}
                        <PageCover title={targetBook.title} author={targetBook.author} cover={targetBook.cover} />

                        {/* Summary / Intro Page */}
                        <Page number="1">
                            <div className="space-y-6">
                                <div className="h-0.5 w-12 bg-gold"></div>
                                <h3 className="text-2xl font-serif text-[#1a1a1a]">Synopsis</h3>
                                <p className="italic text-black/60 leading-relaxed font-serif">"{targetBook.desc}"</p>
                                <div className="pt-10">
                                    <p className="text-sm font-serif text-black/80">
                                        본 리뷰는 아카이드 에디터가 직접 도서를 탐독하고
                                        그 속에 담긴 사유의 흔적을 기록한 것입니다.
                                        시대적 가치와 개인적 통찰을 담은 페이지를 천천히 넘겨보세요.
                                    </p>
                                </div>
                            </div>
                        </Page>

                        {/* Content Pages */}
                        {chunks.map((chunk, idx) => (
                            <Page key={idx} number={idx + 2}>
                                {chunk}
                            </Page>
                        ))}

                        {/* Back Cover */}
                        <div className="bg-[#1a1c20] w-full h-full flex flex-col items-center justify-center p-12 text-center" data-density="hard">
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/leather.png')" }}></div>
                            <div className="z-10 space-y-6 font-serif">
                                <div className="text-gold/30 text-4xl italic mb-4">Fin.</div>
                                <p className="text-white/40 text-sm italic">
                                    "책은 우리 내부의 얼어붙은 바다를 깨는 도끼여야 한다." <br />
                                    - 프란츠 카프카
                                </p>
                                <div className="pt-10">
                                    <div className="inline-block px-4 py-2 border border-white/5 rounded-full text-[10px] text-white/20 tracking-widest uppercase">
                                        Archide Archive No. 12
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-black/40 to-transparent"></div>
                        </div>
                    </HTMLFlipBook>
                </div>
            </div>

            {/* Controls */}
            <div className="mt-12 flex gap-8">
                <button
                    onClick={() => bookRef.current.pageFlip().flipPrev()}
                    className="size-12 rounded-full border border-white/5 flex items-center justify-center text-white/20 hover:text-gold hover:border-gold/30 transition-all hover:bg-gold/5"
                >
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                    onClick={() => bookRef.current.pageFlip().flipNext()}
                    className="size-12 rounded-full border border-white/5 flex items-center justify-center text-white/20 hover:text-gold hover:border-gold/30 transition-all hover:bg-gold/5"
                >
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>

            <style>{`
                .editorial-book {
                   box-shadow: 0 0 50px rgba(0,0,0,0.5);
                }
                .stf__parent {
                   background-color: transparent !important;
                }
            `}</style>
        </div>
    );
}
