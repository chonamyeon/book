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

                    {/* 2. Discover Your Taste Banner */}
                    <section>
                        <Link to="/quiz" className="block group">
                            <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                                {/* Background Image with Overlay */}
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
                    </section>

                    {/* 3. Books of Life Section */}
                    <section>
                        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                            <h2 className="serif-title text-2xl font-bold tracking-tight">01. 인생의 책들</h2>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">추천 도서</span>
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

                    {/* 4. Saved Collection Only if exists */}
                    {savedBooks.length > 0 && (
                        <section className="pb-10 pt-10">
                            <div className="mb-6">
                                <h2 className="serif-title text-xl font-bold tracking-tight text-white opacity-40 italic">Stored Memories</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {savedBooks.map((book, idx) => (
                                    <div key={idx} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-xl group">
                                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div className="absolute bottom-3 left-3">
                                            <h4 className="text-[10px] font-bold text-white truncate">{book.title}</h4>
                                        </div>
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
