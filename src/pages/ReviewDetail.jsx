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
    const chunks = reviewText.match(/.{1,480}/g) || [reviewText];

    return (
        <div className="bg-[#0a0a0c] h-screen font-display flex flex-col overflow-hidden">
            {/* Top Navigation Bar */}
            <TopNavigation title="E-BOOK REVIEW" type="sub" />

            <main className="flex-1 w-full flex flex-col items-center justify-between py-6 px-4">
                {/* Visual Header inspired by sketch */}
                <div className="text-center space-y-1 mt-4">
                    <h1 className="text-white text-3xl font-bold tracking-tight">E-BOOK 리뷰</h1>
                    <div className="flex flex-col items-center gap-1 opacity-40">
                        <span className="text-gold text-[10px] font-black uppercase tracking-[0.4em]">E-BOOK REVIEW</span>
                        <span className="text-[10px] text-white font-light tracking-widest uppercase italic">페이지를 넘겨서 리뷰를 읽어보세요</span>
                    </div>
                </div>

                {/* FlipBook Area - Made Larger */}
                <div className="relative w-full max-w-[420px] flex-1 flex flex-col justify-center items-center">
                    <div className="w-full flex justify-center items-center">
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
                            className="editorial-book shadow-[0_40px_100px_rgba(0,0,0,0.9)]"
                        >
                            {/* Cover */}
                            <PageCover title={targetBook.title} author={targetBook.author} cover={targetBook.cover} />

                            {/* Summary / Intro Page */}
                            <Page number="1">
                                <div className="space-y-5">
                                    <div className="h-0.5 w-12 bg-gold"></div>
                                    <h3 className="text-2xl font-serif text-[#1a1a1a] font-bold tracking-tight">Synopsis</h3>
                                    <p className="italic text-black/70 leading-relaxed font-serif text-base">"{targetBook.desc}"</p>
                                    <div className="pt-10">
                                        <p className="text-xs font-serif text-black/60 leading-relaxed">
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
                                    <div className="text-gold/40 text-4xl italic mb-4">Fin.</div>
                                    <p className="text-white/30 text-xs leading-relaxed italic">
                                        "우리가 읽는 책이 우리 머리를 주먹으로 <br />한 대 쳐서 우리를 깨우지 않는다면, <br />왜 그 책을 읽는가?" <br />
                                        - 프란츠 카프카
                                    </p>
                                    <div className="pt-10 text-[10px] text-white/10 tracking-[0.4em] uppercase">
                                        Archide Archive 2024
                                    </div>
                                </div>
                                <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-black/40 to-transparent"></div>
                            </div>
                        </HTMLFlipBook>
                    </div>
                </div>

                {/* Bottom Flip Controls - More Prominent per sketch */}
                <div className="flex gap-12 pb-12">
                    <button
                        onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
                        className="size-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-gold hover:border-gold/30 hover:bg-white/10 transition-all active:scale-90"
                    >
                        <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
                    </button>
                    <button
                        onClick={() => bookRef.current?.pageFlip()?.flipNext()}
                        className="size-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-gold hover:border-gold/30 hover:bg-white/10 transition-all active:scale-90"
                    >
                        <span className="material-symbols-outlined text-3xl">arrow_forward_ios</span>
                    </button>
                </div>
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
