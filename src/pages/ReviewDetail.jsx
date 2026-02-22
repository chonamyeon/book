import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { motion, AnimatePresence } from 'framer-motion';
import { celebrities } from '../data/celebrities';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { useAudio } from '../contexts/AudioContext';
import Footer from '../components/Footer';

// Page components for the flipbook
const PageCover = React.forwardRef((props, ref) => {
    return (
        <div className="bg-[#1a1c20] w-full h-full shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-6 border-l-4 border-gold/20" ref={ref} data-density="hard">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/leather.png')" }}></div>
            <div className="z-10 text-center space-y-4">
                <div className="w-32 md:w-48 aspect-[2/3] mx-auto shadow-[0_20px_40px_rgba(0,0,0,0.8)] rounded-md overflow-hidden border border-white/10">
                    <img src={props.cover} alt="Cover" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                    <h2 className="serif-title text-xl md:text-3xl text-white font-bold tracking-tight">{props.title}</h2>
                    <p className="text-gold text-[10px] md:text-sm font-light uppercase tracking-[0.3em]">{props.author}</p>
                </div>
                <div className="pt-4 flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-gold/50 animate-bounce text-sm">swipe_left</span>
                    <p className="text-[8px] text-white/30 uppercase tracking-widest leading-none">Open to Read</p>
                </div>
            </div>
            <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-black/40 to-transparent"></div>
        </div>
    );
});

const Page = React.forwardRef((props, ref) => {
    return (
        <div className="bg-[#fcfaf2] w-full h-full p-6 md:p-10 flex flex-col shadow-inner relative" ref={ref}>
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/paper-fibers.png')" }}></div>

            <div className="z-10 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6 md:mb-10 border-b border-black/5 pb-2">
                    <span className="text-[8px] text-black/40 font-bold uppercase tracking-widest">The archiview</span>
                    <span className="text-[8px] text-black/40 font-bold">{props.number}</span>
                </div>

                <div className="flex-1 overflow-hidden">
                    <div className="prose prose-xs md:prose-sm max-w-none">
                        <p className="text-[#2a2a2a] text-sm md:text-base leading-relaxed font-serif whitespace-pre-wrap selection:bg-gold/20">
                            {props.children}
                        </p>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-black/5 flex justify-center italic text-[9px] text-black/20">
                    Archiview Book Curation
                </div>
            </div>
            <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/[0.02] to-transparent"></div>
        </div>
    );
});

export default function ReviewDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const bookRef = useRef(null);
    const { isSpeaking, speakReview, stopAll } = useAudio();
    const [dimensions, setDimensions] = useState({ width: 340, height: 500 });

    useEffect(() => {
        const updateDimensions = () => {
            const w = window.innerWidth;
            if (w < 480) {
                setDimensions({ width: 320, height: 480 });
            } else {
                setDimensions({ width: 380, height: 580 });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);

        // Prevent body scroll when in reading mode
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('resize', updateDimensions);
            document.body.style.overflow = 'auto';
        };
    }, []);

    const bookMap = {
        "sapiens": "사피엔스",
        "1984": "1984",
        "demian": "데미안",
        "vegetarian": "채식주의자",
        "factfulness": "팩트풀니스",
        "almond": "아몬드",
        "leverage": "레버리지",
        "one-thing": "원씽",
        "ubermensch": "위버멘쉬",
        "sayno": "세이노의 가르침",
        "psychology": "돈의 심리학"
    };

    const bookTitle = bookMap[id] || "사피엔스";

    let targetBook = null;
    for (const celeb of celebrities) {
        const found = celeb.books.find(b => b.title === bookTitle);
        if (found) {
            targetBook = found;
            if (found.review) break;
        }
    }

    if (!targetBook) {
        return <div className="p-20 text-white text-center bg-background-dark min-h-screen">리뷰를 찾을 수 없습니다.</div>;
    }

    const reviewText = targetBook.review || targetBook.desc;
    // Chunk size optimized for smaller pages
    const chunks = reviewText.match(/[\s\S]{1,330}/g) || [reviewText];

    const handleClose = () => {
        stopAll();
        navigate('/editorial');
    };

    return (
        <div className="bg-[#0b0d0f] min-h-screen w-full font-display flex flex-col overflow-hidden relative z-[9999]">
            {/* Control Bar - Mobile Optimized */}
            <div className="fixed top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent z-[10000] px-4 flex items-center justify-between">
                <button
                    onClick={handleClose}
                    className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 active:scale-95"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>

                <div className="flex gap-2">
                    <button
                        onClick={() => speakReview(reviewText)}
                        className={`px-4 h-10 rounded-full flex items-center justify-center gap-2 transition-all active:scale-90 shadow-lg border ${isSpeaking ? 'bg-gold border-gold text-primary font-bold' : 'bg-white/5 border-white/20 text-white/80'}`}
                    >
                        <span className="material-symbols-outlined text-sm">
                            {isSpeaking ? 'pause' : 'record_voice_over'}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest">{isSpeaking ? 'Listening' : 'Listen'}</span>
                    </button>
                    <button
                        onClick={handleClose}
                        className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 active:scale-95"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            <main className="flex-1 w-full flex items-center justify-center relative touch-none pt-12">
                <div className="relative w-full flex items-center justify-center">

                    {/* Desktop Arrows */}
                    <button
                        onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
                        className="absolute left-12 z-50 size-16 rounded-full bg-white/5 border border-white/10 hidden md:flex items-center justify-center text-white/20 hover:text-gold transition-all"
                    >
                        <span className="material-symbols-outlined text-4xl">chevron_left</span>
                    </button>

                    <div className="relative flex justify-center items-center scale-95 sm:scale-100 md:scale-110">
                        <HTMLFlipBook
                            width={dimensions.width}
                            height={dimensions.height}
                            size="fixed"
                            minWidth={280}
                            maxWidth={420}
                            minHeight={400}
                            maxHeight={650}
                            maxShadowOpacity={0.3}
                            showCover={true}
                            mobileScrollSupport={true}
                            clickEventForward={true}
                            usePortrait={true}
                            startPage={0}
                            drawShadow={true}
                            flippingTime={600}
                            useMouseEvents={true}
                            ref={bookRef}
                            className="editorial-book shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
                        >
                            <PageCover title={targetBook.title} author={targetBook.author} cover={targetBook.cover} />

                            <Page number="1">
                                <div className="space-y-4">
                                    <div className="h-1 w-12 bg-gold"></div>
                                    <h3 className="text-2xl font-serif text-[#1a1a1a] font-bold">Synopsis</h3>
                                    <p className="italic text-black/70 leading-relaxed font-serif text-base">"{targetBook.desc}"</p>
                                    <div className="pt-8 border-t border-black/5">
                                        <p className="text-[11px] font-serif text-black/40 leading-relaxed">
                                            세상의 모든 위대한 사유는 한 권의 책에서 시작됩니다.
                                            아카이뷰 에디터가 포착한 문장의 빛을 따라
                                            당신만의 아카이브를 완성해보세요.
                                        </p>
                                    </div>
                                </div>
                            </Page>

                            {chunks.map((chunk, idx) => (
                                <Page key={idx} number={idx + 2}>
                                    {chunk}
                                </Page>
                            ))}

                            <div className="bg-[#1a1c20] w-full h-full flex flex-col items-center justify-center p-8 text-center" data-density="hard">
                                <div className="z-10 space-y-4 font-serif">
                                    <div className="text-gold/40 text-4xl italic mb-4">Fin.</div>
                                    <p className="text-white/20 text-[10px] leading-relaxed italic">
                                        "우리가 읽는 책이 우리 머리를 주먹으로 한 대 쳐서 깨우지 않는다면, <br />왜 그 책을 읽는가?" <br />
                                        - 프란츠 카프카
                                    </p>
                                    <div className="pt-6 text-[8px] text-white/5 tracking-[0.4em] uppercase">
                                        Archiview archiview
                                    </div>
                                </div>
                                <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-black/40 to-transparent"></div>
                            </div>
                        </HTMLFlipBook>
                    </div>

                    <button
                        onClick={() => bookRef.current?.pageFlip()?.flipNext()}
                        className="absolute right-12 z-50 size-16 rounded-full bg-white/5 border border-white/10 hidden md:flex items-center justify-center text-white/20 hover:text-gold transition-all"
                    >
                        <span className="material-symbols-outlined text-4xl">chevron_right</span>
                    </button>

                    {/* Mobile Tap Hints */}
                    <div className="absolute inset-x-0 bottom-4 flex justify-center md:hidden pointer-events-none">
                        <span className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-bold animate-pulse">Tap edges to flip</span>
                    </div>
                </div>
            </main>

            <style>{`
                .editorial-book { border-radius: 4px; overflow: visible !important; }
                .stf__parent { background-color: transparent !important; }
                .stf__block { background-color: transparent !important; }
                canvas { display: none !important; }
            `}</style>
            <div className="w-full bg-black">
                <Footer />
            </div>
        </div>
    );
}
