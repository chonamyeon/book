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
        <div className="bg-[#0a0a0c] min-h-screen font-display flex flex-col items-center justify-start py-12 px-4 overflow-x-hidden">
            {/* Close Button */}
            <button
                onClick={() => navigate(-1)}
                className="fixed top-6 right-6 z-50 size-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-gold hover:text-primary transition-all shadow-2xl backdrop-blur-md group"
            >
                <span className="material-symbols-outlined transition-transform group-hover:rotate-90">close</span>
            </button>

            {/* Instruction Overlay */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 text-center space-y-2"
            >
                <div className="text-gold text-[10px] font-black uppercase tracking-[0.4em]">E-Book Review</div>
                <h1 className="text-white/30 text-[10px] font-light tracking-widest uppercase">좌우로 넘겨서 지적인 시간을 기록해보세요</h1>
            </motion.div>

            {/* FlipBook Wrapper - Controlled Size for stable rendering */}
            <div className="relative w-full max-w-[90vw] md:max-w-4xl flex flex-col items-center">
                <div className="w-full flex justify-center items-center py-4">
                    <HTMLFlipBook
                        width={350}
                        height={500}
                        size="stretch"
                        minWidth={280}
                        maxWidth={450}
                        minHeight={400}
                        maxHeight={650}
                        maxShadowOpacity={0.6}
                        showCover={true}
                        mobileScrollSupport={true}
                        clickEventForward={true}
                        usePortrait={window.innerWidth < 768}
                        startPage={0}
                        drawShadow={true}
                        flippingTime={800}
                        useMouseEvents={true}
                        ref={bookRef}
                        className="editorial-book shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
                    >
                        {/* Cover */}
                        <PageCover title={targetBook.title} author={targetBook.author} cover={targetBook.cover} />

                        {/* Summary / Intro Page */}
                        <Page number="1">
                            <div className="space-y-4">
                                <div className="h-0.5 w-10 bg-gold"></div>
                                <h3 className="text-xl font-serif text-[#1a1a1a] font-bold">Synopsis</h3>
                                <p className="italic text-black/70 leading-relaxed font-serif text-sm">"{targetBook.desc}"</p>
                                <div className="pt-6">
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
                                {chunk}
                            </Page>
                        ))}

                        {/* Back Cover */}
                        <div className="bg-[#1a1c20] w-full h-full flex flex-col items-center justify-center p-12 text-center" data-density="hard">
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/leather.png')" }}></div>
                            <div className="z-10 space-y-6 font-serif">
                                <div className="text-gold/40 text-3xl italic mb-4">Fin.</div>
                                <p className="text-white/30 text-[10px] leading-relaxed italic">
                                    "우리가 읽는 책이 우리 머리를 주먹으로 <br />한 대 쳐서 우리를 깨우지 않는다면, <br />왜 그 책을 읽는가?" <br />
                                    - 프란츠 카프카
                                </p>
                                <div className="pt-8">
                                    <div className="inline-block px-3 py-1.5 border border-white/5 rounded-full text-[8px] text-white/10 tracking-widest uppercase">
                                        Archide Editorial No. 24
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-black/40 to-transparent"></div>
                        </div>
                    </HTMLFlipBook>
                </div>
            </div>

            {/* Controls - More visible and responsive */}
            <div className="mt-8 flex gap-6 z-20">
                <button
                    onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
                    className="size-14 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold/30 transition-all active:scale-90"
                >
                    <span className="material-symbols-outlined text-3xl">keyboard_arrow_left</span>
                </button>
                <button
                    onClick={() => bookRef.current?.pageFlip()?.flipNext()}
                    className="size-14 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold/30 transition-all active:scale-90"
                >
                    <span className="material-symbols-outlined text-3xl">keyboard_arrow_right</span>
                </button>
            </div>

            <style>{`
                .editorial-book {
                   outline: 1px solid rgba(255,255,255,0.05);
                }
                .stf__parent {
                   background-color: transparent !important;
                }
                canvas {
                   display: none !important; /* Fix for some react-pageflip versions showing canvas */
                }
            `}</style>
        </div>
    );
}
