import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';
import { resultData } from '../data/resultData';
import { recommendations } from '../data/recommendations';

export default function Library() {
    const [unlocked, setUnlocked] = useState(false);
    const [myResultType, setMyResultType] = useState(null);
    const [hiddenRecs, setHiddenRecs] = useState([]);
    const [savedBooks, setSavedBooks] = useState([]);

    const loadSavedBooks = () => {
        const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
        setSavedBooks(saved);
    };

    const removeSavedBook = (title) => {
        const updated = savedBooks.filter(b => b.title !== title);
        localStorage.setItem('savedBooks', JSON.stringify(updated));
        setSavedBooks(updated);
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
    const myRecs = myResultType ? recommendations[myResultType]?.books.filter(b => !hiddenRecs.includes(b.title)) : [];

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            {/* Main Layout Container */}
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5">
                <TopNavigation title="내 서재" type="sub" />

                <main className="px-6 pt-8 pb-24 space-y-12 animate-fade-in">

                    {/* Personal Collection Header */}
                    <div className="text-center space-y-2 border-b border-white/5 pb-8">
                        <span className="text-gold text-xs font-bold uppercase tracking-[0.2em]">Personal Archive</span>
                        <h2 className="serif-title text-3xl text-white font-medium leading-tight">
                            당신의 기록
                        </h2>
                        <p className="text-slate-400 text-xs font-light">
                            {savedBooks.length} items collected
                        </p>
                    </div>

                    {/* Saved Books Grid */}
                    {savedBooks.length > 0 ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                            {savedBooks.map((book, idx) => (
                                <div key={idx} className="group relative">
                                    <div className="relative aspect-[2/3] bg-white/5 rounded-lg overflow-hidden border border-white/10 shadow-lg mb-3">
                                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />

                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                            <a
                                                href={`https://www.coupang.com/np/search?component=&q=${encodeURIComponent(book.title)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="size-10 rounded-full bg-white text-primary flex items-center justify-center hover:bg-gold transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">shopping_cart</span>
                                            </a>
                                            <button
                                                onClick={() => removeSavedBook(book.title)}
                                                className="size-10 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="text-white text-sm font-bold truncate pr-2">{book.title}</h3>
                                    <p className="text-slate-500 text-[10px] uppercase tracking-wide truncate">{book.author}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/5 mx-4">
                            <span className="material-symbols-outlined text-slate-600 text-4xl mb-4">bookmark_border</span>
                            <p className="text-slate-400 text-sm mb-6">아직 보관된 도서가 없습니다.</p>
                            <Link to="/" className="px-6 py-2 bg-gold text-primary font-bold rounded-full text-xs hover:bg-white transition-colors">
                                도서 둘러보기
                            </Link>
                        </div>
                    )}

                    {/* Recommendations (if any) */}
                    {myResultType && myRecs.length > 0 && (
                        <div className="pt-8 border-t border-white/10">
                            <h3 className="serif-title text-xl text-white mb-6 italic">Recommended for You</h3>
                            <div className="space-y-4">
                                {myRecs.map((book, idx) => (
                                    <div key={idx} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="w-16 h-24 shrink-0 bg-slate-800 rounded border border-white/10 overflow-hidden">
                                            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0 py-1">
                                            <h4 className="text-white text-sm font-bold truncate mb-1">{book.title}</h4>
                                            <p className="text-slate-400 text-xs mb-2">{book.author}</p>
                                            <p className="text-slate-500 text-[10px] line-clamp-2 leading-relaxed">"{book.desc}"</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </main>
                <BottomNavigation />
            </div>
        </div>
    );
}
