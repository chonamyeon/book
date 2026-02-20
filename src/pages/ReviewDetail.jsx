import React, { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { motion, AnimatePresence } from 'framer-motion';
import { celebrities } from '../data/celebrities';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';

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

    const reviewText = targetBook.review || targetBook.desc;
    // Ensuring a long enough text is split into small chunks to guarantee 10+ pages
    // Using 450 chars per page
    const chunks = reviewText.match(/[\s\S]{1,450}/g) || [reviewText];

    return (
        <div className="bg-[#0a0a0c] h-screen font-display flex flex-col overflow-hidden relative">
            {/* Top Navigation Bar */}
            <TopNavigation title="E-BOOK REVIEW" type="sub" />

            <main className="flex-1 w-full flex flex-col items-center justify-between py-8 px-4 relative z-10">
                {/* Visual Header - Refined per request */}
                <div className="text-center mt-2">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-gold text-2xl font-black uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                            E-BOOK REVIEW
                        </span>
                        <span className="text-[10px] text-white/30 font-light tracking-[0.4em] uppercase italic">
                            Flip the pages to explore
                        </span>
                    </div>
                </div>

                {/* FlipBook Area - Larger & Centered with Side Navigation */}
                <div className="relative w-full max-w-[1000px] flex-1 flex items-center justify-center">

                    {/* Left Flip Control */}
                    <button
                        onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
                        className="absolute left-0 z-50 size-16 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold/40 hover:bg-black/60 transition-all active:scale-95 hidden md:flex"
                    >
                        <span className="material-symbols-outlined text-4xl">chevron_left</span>
                    </button>

                    <div className="relative w-full max-w-[420px] flex justify-center items-center">
                        <HTMLFlipBook
                            width={380}
                            height={580}
                            size="fixed"
                            minWidth={320}
                            maxWidth={420}
                            minHeight={500}
                            maxHeight={650}
                            maxShadowOpacity={0.4}
                            showCover={true}
                            mobileScrollSupport={true}
                            clickEventForward={true}
                            usePortrait={true}
                            startPage={0}
                            drawShadow={true}
                            flippingTime={800}
                            useMouseEvents={true}
                            ref={bookRef}
                            className="editorial-book shadow-[0_50px_120px_rgba(0,0,0,0.95)]"
                        >
                            {/* Cover */}
                            <PageCover title={targetBook.title} author={targetBook.author} cover={targetBook.cover} />

                            {/* Summary / Intro Page */}
                            <Page number="1">
                                <div className="space-y-6">
                                    <div className="h-1 w-16 bg-gold"></div>
                                    <h3 className="text-3xl font-serif text-[#1a1a1a] font-bold tracking-tight">Synopsis</h3>
                                    <p className="italic text-black/80 leading-relaxed font-serif text-lg">"{targetBook.desc}"</p>
                                    <div className="pt-12 border-t border-black/5">
                                        <p className="text-sm font-serif text-black/60 leading-relaxed">
                                            세상의 모든 위대한 사유는 한 권의 책에서 시작됩니다.
                                            아카이드 에디터가 포착한 문장의 빛을 따라
                                            당신만의 아카이브를 완성해보세요.
                                        </p>
                                    </div>
                                </div>
                            </Page>

                            {/* Content Pages */}
                            {chunks.map((chunk, idx) => (
                                <Page key={idx} number={idx + 2}>
                                    <div className="font-serif leading-relaxed text-[#2a2a2a] text-lg">
                                        {chunk}
                                    </div>
                                </Page>
                            ))}

                            {/* Back Cover */}
                            <div className="bg-[#1a1c20] w-full h-full flex flex-col items-center justify-center p-12 text-center" data-density="hard">
                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/leather.png')" }}></div>
                                <div className="z-10 space-y-6 font-serif">
                                    <div className="text-gold/40 text-5xl italic mb-6">Fin.</div>
                                    <p className="text-white/30 text-sm leading-relaxed italic">
                                        "우리가 읽는 책이 우리 머리를 주먹으로 <br />한 대 쳐서 우리를 깨우지 않는다면, <br />왜 그 책을 읽는가?" <br />
                                        - 프란츠 카프카
                                    </p>
                                    <div className="pt-12 text-xs text-white/10 tracking-[0.5em] uppercase">
                                        Archide Archive 2024
                                    </div>
                                </div>
                                <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-black/40 to-transparent"></div>
                            </div>
                        </HTMLFlipBook>
                    </div>

                    {/* Right Flip Control */}
                    <button
                        onClick={() => bookRef.current?.pageFlip()?.flipNext()}
                        className="absolute right-0 z-50 size-16 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold/40 hover:bg-black/60 transition-all active:scale-95 hidden md:flex"
                    >
                        <span className="material-symbols-outlined text-4xl">chevron_right</span>
                    </button>

                    {/* Mobile Controls Overlay */}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 pb-4 md:hidden z-50">
                        <button onClick={() => bookRef.current?.pageFlip()?.flipPrev()} className="size-12 rounded-full bg-black/50 text-white flex items-center justify-center">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button onClick={() => bookRef.current?.pageFlip()?.flipNext()} className="size-12 rounded-full bg-black/50 text-white flex items-center justify-center">
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>

                {/* Empty spacer for flex alignment */}
                <div className="h-16"></div>
            </main>

            {/* Bottom Navigation Dock */}
            <BottomNavigation />

            <style>{`
                .editorial-book {
                   border-radius: 4px;
                   overflow: visible !important;
                }
                .stf__parent {
                   background-color: transparent !important;
                }
                .stf__block {
                   background-color: transparent !important;
                }
                canvas {
                   display: none !important;
                }
            `}</style>
        </div>
    );
}
