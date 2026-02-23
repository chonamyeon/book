import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { motion, AnimatePresence } from 'framer-motion';
import { celebrities } from '../data/celebrities';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { useAudio } from '../contexts/AudioContext';
import Footer from '../components/Footer';
import { bookScripts } from '../data/bookScripts';

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
                    <div className="prose prose-xs md:prose-sm max-w-none pb-4">
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
    const { isSpeaking, activeAudioId, playPodcast, speakReview, stopAll } = useAudio();
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

    // Find the book by its ID across all celebrities
    let targetBook = null;
    let foundCeleb = null;
    for (const celeb of celebrities) {
        const found = celeb.books.find(b => b.id === id);
        if (found) {
            targetBook = found;
            foundCeleb = celeb;
            break;
        }
    }

    // Fallback: search by title if id search fails (for legacy links)
    if (!targetBook) {
        for (const celeb of celebrities) {
            const found = celeb.books.find(b => b.title.includes(id) || id.includes(b.id));
            if (found) {
                targetBook = found;
                foundCeleb = celeb;
                break;
            }
        }
    }

    if (!targetBook) {
        return <div className="p-20 text-white text-center bg-[#0b0d0f] min-h-screen flex items-center justify-center">
            <div className="space-y-4">
                <p className="text-xl font-serif">리뷰를 찾을 수 없습니다.</p>
                <button onClick={() => navigate('/editorial')} className="px-6 py-2 border border-white/20 rounded-full text-white/60 hover:text-white transition-colors">목록으로 돌아가기</button>
            </div>
        </div>;
    }

    const reviewText = targetBook.review || targetBook.desc;

    // Improved chunking for e-book experience: 
    // We aim for approx 400-500 characters per page in Korean to fill the space without overflow.
    const chunks = reviewText.split('\n').filter(p => p.trim() !== '').reduce((acc, para) => {
        const lastChunk = acc[acc.length - 1];
        const maxLength = 450; // Ideal characters per page for Korean font size/height

        if (!lastChunk || lastChunk.length + para.length > maxLength) {
            // If the paragraph itself is too long, split it
            if (para.length > maxLength) {
                const subChunks = para.match(new RegExp(`[\\s\\S]{1,${maxLength}}`, 'g')) || [para];
                return [...acc, ...subChunks];
            }
            return [...acc, para];
        } else {
            acc[acc.length - 1] = lastChunk + '\n\n' + para;
            return acc;
        }
    }, []) || [reviewText];

    const handleClose = () => {
        stopAll();
        navigate('/editorial');
    };

    const hasPodcast = !!bookScripts[id];

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
                        onClick={() => {
                            if (activeAudioId === `review-${id}`) {
                                stopAll();
                            } else {
                                if (hasPodcast) {
                                    playPodcast(bookScripts[id], `review-${id}`);
                                } else {
                                    speakReview(reviewText, id);
                                }
                            }
                        }}
                        className={`px-4 h-10 rounded-full flex items-center justify-center gap-2 transition-all active:scale-90 shadow-lg border ${(isSpeaking && activeAudioId === `review-${id}`) ? 'bg-gold border-gold text-primary font-bold' : 'bg-white/5 border-white/20 text-white/80'}`}
                    >
                        <span className="material-symbols-outlined text-sm">
                            {(isSpeaking && activeAudioId === `review-${id}`) ? 'stop' : (hasPodcast ? 'podcasts' : 'record_voice_over')}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest">
                            {(isSpeaking && activeAudioId === `review-${id}`) ? 'Listening' : (hasPodcast ? 'Podcast' : 'Listen')}
                        </span>
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
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-0.5 w-8 bg-gold"></div>
                                        <span className="text-[10px] text-gold font-bold uppercase tracking-[0.3em]">Prologue</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-serif text-[#1a1a1a] font-black leading-tight">Synopsis</h3>
                                        <p className="text-black/40 text-[10px] uppercase tracking-widest font-bold">Curated for {foundCeleb?.name || 'Archiview'}</p>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute -left-4 -top-2 text-6xl text-gold/20 font-serif leading-none">"</span>
                                        <p className="italic text-black/80 leading-relaxed font-serif text-lg pl-2">
                                            {targetBook.desc}
                                        </p>
                                    </div>
                                    <div className="pt-10 border-t border-black/5 space-y-4">
                                        <h4 className="text-[11px] font-bold text-black/60 uppercase tracking-widest">Author's Insight</h4>
                                        <p className="text-[12px] font-serif text-black/50 leading-relaxed">
                                            이 5,000자의 여정은 단순히 텍스트를 읽는 행위를 넘어,
                                            동시대를 대표하는 선구자의 영혼과 대면하는 의식입니다.
                                            한 페이지 한 페이지 넘길 때마다 당신의 사유가 깊어지길 소망합니다.
                                        </p>
                                    </div>
                                </div>
                            </Page>

                            {chunks.map((chunk, idx) => (
                                <Page key={idx} number={idx + 2}>
                                    {chunk}
                                </Page>
                            ))}

                            <div className="bg-[#1a1c20] w-full h-full flex flex-col items-center justify-center p-8 text-center relative overflow-hidden" data-density="hard">
                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/black-linen.png')" }}></div>
                                <div className="z-10 space-y-6 font-serif flex flex-col items-center">
                                    <div className="size-16 rounded-full border border-gold/30 flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-gold text-2xl">book_4</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-gold text-4xl italic font-light tracking-tighter">Fin.</div>
                                        <div className="h-0.5 w-12 bg-gold/20 mx-auto"></div>
                                    </div>
                                    <div className="max-w-[200px] space-y-4">
                                        <p className="text-white/40 text-[11px] leading-relaxed italic">
                                            "우리가 읽는 책이 우리 머리를 주먹으로 한 대 쳐서 깨우지 않는다면, 왜 그 책을 읽는가?"
                                        </p>
                                        <p className="text-gold/60 text-[9px] uppercase tracking-widest font-bold">- Franz Kafka -</p>
                                    </div>
                                    <div className="pt-12 text-[8px] text-white/5 tracking-[0.5em] uppercase font-black">
                                        Archiview Curation Archive
                                    </div>
                                </div>
                                <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-black/60 to-transparent"></div>
                                <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-white/5"></div>
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
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
            `}</style>
            <div className="w-full bg-black">
                <Footer />
            </div>
        </div>
    );
}
