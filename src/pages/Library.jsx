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

    const designatedBooks = [
        { title: "사피엔스", author: "유발 하라리", cover: "/images/covers/sapiens.jpg", tag: "인류학" },
        { title: "1984", author: "조지 오웰", cover: "/images/covers/1984.jpg", tag: "고전" },
        { title: "데미안", author: "헤르만 헤세", cover: "/images/covers/demian.jpg", tag: "성장" },
        { title: "연금술사", author: "파울로 코엘료", cover: "/images/covers/alchemist.jpg", tag: "철학" },
        { title: "슈독", author: "필 나이트", cover: "/images/covers/c_02.jpg", tag: "경영" },
        { title: "아몬드", author: "손원평", cover: "/images/covers/almond.jpg", tag: "소설" }
    ];

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

                <main className="px-6 pt-10 pb-20 space-y-12 animate-fade-in">

                    {/* 1. Stats Section */}
                    <section className="grid grid-cols-3 gap-4 mb-10">
                        <div className="text-center">
                            <span className="block text-3xl font-black text-gold mb-1">210</span>
                            <span className="text-xs font-bold text-slate-400">보유 도서</span>
                        </div>
                        <div className="text-center border-x border-white/10">
                            <span className="block text-3xl font-black text-gold mb-1">7</span>
                            <span className="text-xs font-bold text-slate-400">카테고리</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-3xl font-black text-gold mb-1">14h</span>
                            <span className="text-xs font-bold text-slate-400">평균독서시간</span>
                        </div>
                    </section>

                    {/* 2. Banner Section (Test Teaser or Result) */}
                    <section>
                        {myResultType && result ? (
                            <Link to="/result" className="block group">
                                <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-gold/30 shadow-2xl bg-gradient-to-br from-slate-900 via-background-dark to-slate-800">
                                    <div className="absolute inset-0 bg-black/40 z-0"></div>
                                    <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center h-full">
                                        <div className="size-14 rounded-full bg-gold/20 flex items-center justify-center border border-gold/40 mb-4 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                                            <span className="material-symbols-outlined text-gold text-3xl">psychology</span>
                                        </div>
                                        <span className="text-gold text-[10px] font-black uppercase tracking-[0.3em] mb-2 px-3 py-1 bg-gold/10 rounded-full">Your Intellectual Persona</span>
                                        <h3 className="text-2xl font-black text-white mb-2 leading-tight drop-shadow-lg">{result.persona}</h3>
                                        <p className="text-slate-400 text-xs font-medium mb-6 opacity-80">{result.subtitle}</p>
                                        <div className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs backdrop-blur-md border border-white/10 transition-all flex items-center gap-2">
                                            <span>결과 다시보기</span>
                                            <span className="material-symbols-outlined text-sm text-gold">analytics</span>
                                        </div>
                                    </div>
                                    <div className="absolute -top-10 -right-10 size-40 bg-gold/5 blur-3xl rounded-full"></div>
                                    <div className="absolute -bottom-10 -left-10 size-40 bg-primary/20 blur-3xl rounded-full"></div>
                                </div>
                            </Link>
                        ) : (
                            <Link to="/quiz" className="block group">
                                <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                                    <img
                                        src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1000&auto=format&fit=crop"
                                        alt="Library Background"
                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-6 text-center">
                                        <div className="size-12 rounded-full bg-gold/20 flex items-center justify-center border border-gold/40 mb-4">
                                            <span className="material-symbols-outlined text-gold">psychology</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2 leading-tight">당신의 지적 취향을 발견하세요</h3>
                                        <p className="text-slate-300 text-[11px] leading-relaxed max-w-[200px] mb-6">
                                            나에게 맞는 책 찾기 테스트를 통해 당신만의 개인 아카이브를 완성하세요.
                                        </p>
                                        <div className="px-8 py-3 bg-gold text-primary font-black rounded-xl text-xs shadow-lg shadow-gold/20 active:scale-95 transition-transform flex items-center gap-2">
                                            <span>테스트 시작하기</span>
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
                                    <a
                                        key={idx}
                                        href={book.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex gap-5 group items-center"
                                    >
                                        <div className="w-24 shrink-0 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/5">
                                            <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <h4 className="text-lg font-bold text-white leading-tight mb-1">{book.title}</h4>
                                            <p className="text-xs text-slate-500 mb-2">{book.author}</p>
                                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed opacity-70 italic">"{book.desc}"</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 4. Designated Books Section (Always Shown) */}
                    <section>
                        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                            <h2 className="serif-title text-2xl font-bold tracking-tight">01. 인생의 책들</h2>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">추천지정도서</span>
                        </div>

                        <div className="space-y-6">
                            {designatedBooks.map((book, idx) => (
                                <a
                                    key={idx}
                                    href={`https://www.coupang.com/np/search?component=&q=${encodeURIComponent(book.title)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-5 p-2 rounded-2xl transition-all group"
                                >
                                    <div className="size-24 rounded-xl overflow-hidden shadow-2xl border border-white/10 flex-shrink-0">
                                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gold/60 uppercase tracking-widest mb-1">{book.tag}</span>
                                            <h4 className="text-lg font-bold text-white truncate mb-0.5">{book.title}</h4>
                                            <p className="text-sm text-slate-500 truncate">{book.author}</p>
                                        </div>
                                    </div>
                                    <div className="size-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-gold text-xl">shopping_cart</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>

                    {/* 5. Saved Collection (If any) */}
                    {savedBooks.length > 0 && (
                        <section className="pb-10 pt-10 border-t border-white/5">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="serif-title text-xl font-bold tracking-tight text-white/40 italic font-light tracking-widest">Saved Collection</h2>
                                <span className="text-[10px] text-slate-600 font-bold">{savedBooks.length} ITEMS</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {savedBooks.map((book, idx) => (
                                    <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/5 shadow-xl group">
                                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
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
