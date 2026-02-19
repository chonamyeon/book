import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';
import { resultData } from '../data/resultData';
import { recommendations } from '../data/recommendations';

export default function Library() {
    const [unlocked, setUnlocked] = useState(false);
    const [myResultType, setMyResultType] = useState(null);
    const [savedBooks, setSavedBooks] = useState([]);



    const loadSavedBooks = () => {
        const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
        setSavedBooks(saved);
    };

    useEffect(() => {
        const isUnlocked = localStorage.getItem('premiumUnlocked') === 'true';
        const type = localStorage.getItem('myResultType');

        setUnlocked(isUnlocked);
        setMyResultType(type);
        loadSavedBooks();

        const handleStorage = () => loadSavedBooks();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const result = myResultType ? resultData[myResultType] : null;
    const myRecs = myResultType ? recommendations[myResultType]?.books : [];

    return (
        <div className="bg-[#090b10] font-display text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            {/* Main Layout Container */}
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden">
                <TopNavigation title="내 서재" type="sub" />

                <main className="px-6 pt-6 pb-20 space-y-12 animate-fade-in">

                    {/* 1. Redesigned Result / Teaser Banner Section */}
                    <section>
                        {myResultType && result ? (
                            /* Premium Result Banner */
                            <Link to="/result" className="block group">
                                <div className="relative aspect-[4/5] sm:aspect-[16/10] rounded-[40px] overflow-hidden border border-gold/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-background-dark">
                                    {/* Decorative Background Elements */}
                                    <div className="absolute inset-0 z-0">
                                        <img
                                            src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1000&auto=format&fit=crop"
                                            alt="Artistic Library"
                                            className="w-full h-full object-cover opacity-30 mix-blend-overlay group-hover:scale-110 transition-transform duration-1000"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background-dark/80 to-background-dark"></div>
                                    </div>

                                    {/* Content Container */}
                                    <div className="relative z-10 h-full flex flex-col items-center justify-between px-6 py-14 text-center">
                                        {/* Top Part: Icon & Badge */}
                                        <div className="flex flex-col items-center">
                                            <div className="relative mb-6">
                                                <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full"></div>
                                                <div className="size-16 rounded-full bg-gradient-to-b from-gold/40 to-transparent flex items-center justify-center border border-gold/40 shadow-xl">
                                                    <span className="material-symbols-outlined text-gold text-3xl leading-none font-light">psychology</span>
                                                </div>
                                            </div>
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 mb-4">
                                                <span className="text-gold text-[9px] font-black uppercase tracking-[0.3em]">Intellectual Persona</span>
                                            </div>
                                        </div>

                                        {/* Middle Part: Title & Subtitle */}
                                        <div className="flex-1 flex flex-col justify-center py-4">
                                            <h3 className="text-4xl xs:text-5xl font-black text-white mb-3 tracking-tight serif-title drop-shadow-2xl">
                                                {result.persona}
                                            </h3>
                                            <p className="text-slate-400 text-[13px] font-medium max-w-[220px] mx-auto leading-relaxed italic opacity-80">
                                                {result.subtitle}
                                            </p>
                                        </div>

                                        {/* Bottom Part: CTA Button */}
                                        <div className="w-full px-4 pt-4">
                                            <div className="relative group/btn inline-flex items-center justify-center">
                                                <div className="absolute -inset-1.5 bg-gold/30 blur-md opacity-0 group-hover/btn:opacity-100 transition duration-500 rounded-2xl"></div>
                                                <div className="relative px-12 py-4 bg-gold text-primary font-black rounded-2xl text-[14px] shadow-[0_10px_30px_rgba(212,175,55,0.3)] flex items-center gap-3 active:scale-95 transition-all">
                                                    <span>결과 보기</span>
                                                    <span className="material-symbols-outlined text-xl">analytics</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Corners Decoration */}
                                    <div className="absolute top-10 left-10 size-6 border-t-2 border-l-2 border-gold/20 rounded-tl-lg"></div>
                                    <div className="absolute top-10 right-10 size-6 border-t-2 border-r-2 border-gold/20 rounded-tr-lg"></div>
                                    <div className="absolute bottom-10 left-10 size-6 border-b-2 border-l-2 border-gold/20 rounded-bl-lg"></div>
                                    <div className="absolute bottom-10 right-10 size-6 border-b-2 border-r-2 border-gold/20 rounded-br-lg"></div>
                                </div>
                            </Link>
                        ) : (
                            /* Not Tested Case: Same as before but with consistent formatting */
                            <Link to="/quiz" className="block group">
                                <div className="relative aspect-[16/9] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-slate-900">
                                    <img
                                        src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1000&auto=format&fit=crop"
                                        alt="Library Background"
                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60"
                                    />
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-center">
                                        <div className="size-12 rounded-full bg-gold/20 flex items-center justify-center border border-gold/40 mb-4 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                                            <span className="material-symbols-outlined text-gold">psychology</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2 leading-tight">당신의 지적 취향을 발견하세요</h3>
                                        <p className="text-slate-300 text-[11px] leading-relaxed max-w-[200px] mb-8">
                                            나에게 맞는 책 찾기 테스트를 통해 당신만의 개인 아카이브를 완성하세요.
                                        </p>
                                        <div className="px-10 py-4 bg-gold text-primary font-black rounded-2xl text-xs shadow-lg shadow-gold/20 active:scale-95 transition-transform flex items-center gap-2">
                                            <span>지금 시작하기</span>
                                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}
                    </section>


                    {/* 3. Persona Recommendations (Only if tested) */}
                    {myResultType && myRecs.length > 0 && (
                        <section className="animate-fade-in-up">
                            <div className="flex items-center justify-between mb-8 border-b border-gold/20 pb-4">
                                <div>
                                    <h2 className="serif-title text-2xl font-bold tracking-tight text-white">맞춤 추천 도서</h2>
                                    <p className="text-gold text-[10px] uppercase tracking-widest mt-1 font-bold">Recommended for {result.persona}</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-6">
                                {myRecs.map((book, idx) => (
                                    <div key={idx} className="flex items-center gap-4 group">
                                        <div className="flex flex-1 gap-5 items-center">
                                            <div className="w-20 shrink-0 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/5">
                                                <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div className="flex flex-col justify-center min-w-0">
                                                <h4 className="text-base font-bold text-white leading-tight mb-1 truncate">{book.title}</h4>
                                                <p className="text-[10px] text-slate-500 mb-2 truncate">{book.author}</p>
                                                <p className="text-[10px] text-slate-400 line-clamp-1 leading-relaxed opacity-70 italic truncate">"{book.desc}"</p>
                                            </div>
                                        </div>
                                        <a
                                            href={book.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="size-10 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20 hover:bg-gold transition-colors group/btn shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-gold group-hover/btn:text-primary text-xl">shopping_cart</span>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 5. Saved Collection (If any) */}
                    {savedBooks.length > 0 && (
                        <section className="pb-10 pt-10 border-t border-white/5">
                            <div className="mb-8 flex items-center justify-between">
                                <h1 className="serif-title text-2xl font-bold tracking-tight text-white italic">Saved Collection</h1>
                                <span className="text-[10px] text-slate-600 font-bold tracking-widest leading-none">{savedBooks.length} ITEMS</span>
                            </div>
                            <div className="space-y-6">
                                {savedBooks.map((book, idx) => (
                                    <div key={idx} className="flex items-center gap-5 group">
                                        <div className="size-20 rounded-xl overflow-hidden shadow-2xl border border-white/10 flex-shrink-0 relative">
                                            <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-base font-bold text-white truncate mb-1">{book.title}</h4>
                                            <p className="text-xs text-slate-500 truncate">{book.author}</p>
                                        </div>
                                        <a
                                            href={`https://www.coupang.com/np/search?component=&q=${encodeURIComponent(book.title)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-gold transition-colors group/btn shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-slate-400 group-hover/btn:text-primary text-xl">shopping_cart</span>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </main>



                <BottomNavigation />
            </div>
        </div>
    );
}
