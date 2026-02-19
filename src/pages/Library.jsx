import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';
import { resultData } from '../data/resultData';

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

    return (
        <div className="bg-[#090b10] font-display text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            {/* Main Layout Container */}
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden">
                <TopNavigation title="내 서재" type="sub" />

                <main className="px-5 pt-8 pb-20 space-y-12 animate-fade-in">

                    {/* TOP SECTION: Intellectual Taste Test */}
                    <section>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="serif-title text-xl font-bold tracking-tight">지적 취향 테스트</h2>
                            <Link to="/quiz" className="text-gold text-xs font-bold px-3 py-1 bg-gold/10 rounded-full border border-gold/20 flex items-center gap-1 active:scale-95 transition-all">
                                {myResultType ? '다시 하기' : '시작하기'}
                                <span className="material-symbols-outlined text-sm">play_arrow</span>
                            </Link>
                        </div>

                        {myResultType && result ? (
                            <Link to="/result" className="block group">
                                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-6 shadow-2xl transition-all hover:border-gold/30">
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div className="max-w-[180px]">
                                            <span className="inline-block px-2 py-0.5 bg-gold text-primary text-[9px] font-black uppercase tracking-widest rounded mb-3">Your Persona</span>
                                            <h3 className="text-2xl font-black text-white leading-tight mb-2">{result.persona}</h3>
                                            <p className="text-slate-400 text-xs font-medium leading-relaxed">{result.subtitle}</p>
                                        </div>
                                        <div className="size-16 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-3xl text-gold">psychology</span>
                                        </div>
                                    </div>
                                    {/* Abstract background art */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl -mr-10 -mt-10 rounded-full"></div>
                                </div>
                            </Link>
                        ) : (
                            <div className="rounded-3xl p-8 bg-slate-900 border-2 border-dashed border-white/5 flex flex-col items-center text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-600 mb-4">discover_tune</span>
                                <h3 className="text-lg font-bold text-white mb-2">아직 지적 취향을 발견하지 못했습니다</h3>
                                <p className="text-slate-500 text-sm mb-6 leading-relaxed">테스트를 통해 당신의 독서 페르소나와<br />맞춤형 추천 도서를 확인해보세요.</p>
                                <Link to="/quiz" className="w-full py-4 bg-gold text-primary font-black rounded-2xl shadow-lg shadow-gold/10 active:scale-95 transition-transform">
                                    취향 테스트 시작하기
                                </Link>
                            </div>
                        )}
                    </section>

                    {/* BOTTOM SECTION: Recommended Designated Books */}
                    <section>
                        <div className="flex items-end justify-between mb-6">
                            <div>
                                <h2 className="serif-title text-xl font-bold tracking-tight">추천지정도서</h2>
                                <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1 font-bold">Curated Masterpieces</p>
                            </div>
                            <span className="text-gold text-[10px] font-bold">{designatedBooks.length} Books</span>
                        </div>

                        <div className="space-y-4">
                            {designatedBooks.map((book, idx) => (
                                <a
                                    key={idx}
                                    href={`https://www.coupang.com/np/search?component=&q=${encodeURIComponent(book.title)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-[0.98] group"
                                >
                                    <div className="size-20 rounded-xl overflow-hidden shadow-lg border border-white/10 flex-shrink-0">
                                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[9px] font-bold text-gold/80 uppercase tracking-widest">{book.tag}</span>
                                        <h4 className="text-sm font-bold text-white truncate my-0.5">{book.title}</h4>
                                        <p className="text-xs text-slate-500 truncate">{book.author}</p>
                                    </div>
                                    <div className="pr-2">
                                        <span className="material-symbols-outlined text-slate-600 group-hover:text-gold transition-colors">shopping_cart</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>

                    {/* Saved Books Section (If any) */}
                    {savedBooks.length > 0 && (
                        <section className="pb-10">
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    <h2 className="serif-title text-xl font-bold tracking-tight text-gold">내가 찜한 도서</h2>
                                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1 font-bold">Your Saved Collection</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {savedBooks.map((book, idx) => (
                                    <Link key={idx} to="/library" className="flex flex-col gap-3 group">
                                        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                                            <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                                            <div className="absolute bottom-3 left-3 right-3">
                                                <h4 className="text-[11px] font-bold text-white truncate">{book.title}</h4>
                                            </div>
                                        </div>
                                    </Link>
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

