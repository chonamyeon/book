import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';
import Footer from '../components/Footer';
import { resultData } from '../data/resultData';
import { recommendations } from '../data/recommendations';
import { useAuth } from '../hooks/useAuth';

export default function Library() {
    const { user } = useAuth();
    const [unlocked, setUnlocked] = useState(false);
    const [myResultType, setMyResultType] = useState(null);
    const [quizResult, setQuizResult] = useState(null);
    const [hiddenRecs, setHiddenRecs] = useState([]);
    const [savedBooks, setSavedBooks] = useState([]);
    const [finderRecs, setFinderRecs] = useState([]);
    const navigate = useNavigate();

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
        const qResult = localStorage.getItem('quizResult');

        setUnlocked(isUnlocked);
        setMyResultType(type);
        setQuizResult(qResult);
        const fRecs = JSON.parse(localStorage.getItem('finderRecommendations') || '[]');
        setFinderRecs(fRecs);

        const handleStorage = () => {
            loadSavedBooks();
            const updatedFRecs = JSON.parse(localStorage.getItem('finderRecommendations') || '[]');
            setFinderRecs(updatedFRecs);
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const result = myResultType ? resultData[myResultType] : null;
    const myRecs = myResultType ? recommendations[myResultType]?.books.filter(b => !hiddenRecs.includes(b.title)) : [];
    const isTeaserVisible = user && unlocked && result;

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            {/* Main Layout Container */}
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5">
                <TopNavigation title="내 서재" type="sub" />

                <main className="px-6 pt-8 pb-24 space-y-12 animate-fade-in">
                    {/* Personal Collection Header */}
                    <div className="text-center space-y-2 border-b border-white/5 pb-8">
                        <span className="text-gold text-xs font-bold uppercase tracking-[0.2em]">Personal archiview</span>
                        <h2 className="serif-title text-3xl text-white font-medium leading-tight">
                            당신의 기록
                        </h2>
                        <p className="text-slate-400 text-xs font-light">
                            {savedBooks.length} items collected
                        </p>
                    </div>

                    {/* Personality Test Banner */}
                    {isTeaserVisible ? (
                        <div
                            onClick={() => navigate('/result', { state: { resultType: myResultType } })}
                            className="relative rounded-3xl overflow-hidden border border-gold/30 bg-gradient-to-br from-slate-900 via-slate-800 to-black p-1 group cursor-pointer shadow-2xl mb-8"
                        >
                            <div className="relative bg-background-dark/40 backdrop-blur-xl rounded-[22px] p-6 flex items-center gap-6">
                                <div className="relative size-24 shrink-0">
                                    <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full"></div>
                                    <img src={result.image} alt={result.persona} className="relative w-full h-full object-cover rounded-2xl shadow-xl border border-gold/30" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <span className="text-gold text-[10px] font-bold uppercase tracking-widest block mb-1">My Persona</span>
                                    <h3 className="serif-title text-white text-2xl font-bold leading-none mb-2 tracking-tight">{result.persona}</h3>
                                    <p className="text-slate-400 text-[11px] font-medium truncate mb-4">{result.subtitle}</p>
                                    <div className="flex gap-2">
                                        {Object.entries(result.metrics).slice(0, 2).map(([key, m]) => (
                                            <div key={key} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 flex flex-col items-center min-w-[64px]">
                                                <span className="text-slate-500 text-[7px] uppercase block leading-none mb-1">{m.label}</span>
                                                <span className="text-gold text-[10px] font-extrabold">{m.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-gold opacity-30 group-hover:opacity-100 transition-opacity">chevron_right</span>
                            </div>
                        </div>
                    ) : (
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 group mb-8">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000"></div>
                            <div className="absolute inset-0 bg-background-dark/80"></div>

                            <div className="relative p-6 text-center flex flex-col items-center">
                                <span className="material-symbols-outlined text-gold text-3xl mb-3">psychology_alt</span>
                                <h3 className="serif-title text-white text-xl mb-2">Find Your Persona</h3>
                                <p className="text-slate-400 text-xs font-light mb-5 max-w-xs leading-relaxed">
                                    Take our literary personality test to discover the books that resonate with your soul.
                                </p>
                                {quizResult ? (
                                    <button
                                        onClick={() => navigate('/result', { state: { resultType: quizResult } })}
                                        className="px-6 py-2.5 bg-white text-primary font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-gold transition-colors flex items-center gap-2"
                                    >
                                        View Analysis Result <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                ) : (
                                    <Link to="/quiz" className="px-6 py-2.5 bg-gold text-primary font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-white transition-colors">
                                        Start Diagnostics
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recommendations (if any) */}
                    {((myResultType && myRecs.length > 0) || finderRecs.length > 0) && (
                        <div className="pt-8 border-t border-white/10">
                            <h3 className="serif-title text-xl text-white mb-6 italic">Recommended for You</h3>
                            <div className="space-y-4">
                                {/* Finder Results */}
                                {finderRecs.length > 0 && finderRecs.map((book, idx) => (
                                    <div key={`finder-${idx}`} className="flex gap-4 p-4 bg-gold/5 rounded-xl border border-gold/20 hover:bg-gold/10 transition-colors relative group">
                                        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-60">
                                            <span className="text-gold text-[8px] font-black uppercase tracking-widest bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">FOUND</span>
                                        </div>
                                        <div className="w-16 h-24 shrink-0 bg-slate-800 rounded border border-white/10 overflow-hidden shadow-lg">
                                            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0 py-1">
                                            <h4 className="text-white text-sm font-bold truncate mb-1">{book.title}</h4>
                                            <p className="text-slate-400 text-xs mb-2">{book.author}</p>
                                            <p className="text-slate-500 text-[10px] line-clamp-2 leading-relaxed">"{book.desc || '당신을 위해 특별히 찾아낸 도서입니다.'}"</p>
                                        </div>
                                    </div>
                                ))}

                                {/* Persona Results */}
                                {myRecs.map((book, idx) => (
                                    <div key={`persona-${idx}`} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
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

                    {/* Saved Books Grid */}
                    <div className="pt-8 border-t border-white/10">
                        <h3 className="serif-title text-xl text-white mb-6 italic">Favorite Collection</h3>
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
                    </div>
                    <Footer />
                </main>
                <BottomNavigation />
            </div>
        </div>
    );
}
