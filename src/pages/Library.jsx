import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';
import { resultData } from '../data/resultData';

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

        // Listen for storage changes
        const handleStorage = () => loadSavedBooks();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const handleRemoveBook = (title) => {
        const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
        const filtered = saved.filter(b => b.title !== title);
        localStorage.setItem('savedBooks', JSON.stringify(filtered));
        loadSavedBooks();
    };

    const result = myResultType ? resultData[myResultType] : null;

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            {/* Main Layout Container: Everything constrained to max-w-lg */}
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen rounded-t-[40px] overflow-hidden border-t border-white/5">
                <TopNavigation title="내 서재" type="sub" />

                <main className="px-4 py-20">
                    <div className="space-y-8 animate-fade-in-up">
                        {/* Purchased Report Card */}
                        {unlocked && result && (
                            <section>
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">구매한 리포트</h2>
                                <Link to="/result" state={{ resultType: myResultType }} className="block group">
                                    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-white/5 border border-primary/10 dark:border-white/10 shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-slate-900/90 dark:from-black/80 dark:to-slate-800/80 z-10"></div>
                                        <div className="relative z-20 p-6 flex items-center justify-between">
                                            <div>
                                                <span className="inline-block px-2 py-1 bg-gold text-primary text-[10px] font-bold uppercase tracking-widest rounded mb-2">Premium Unlocked</span>
                                                <h3 className="text-2xl font-black text-white mb-1">{result.persona}</h3>
                                                <p className="text-slate-300 text-xs font-medium">{result.subtitle}</p>
                                            </div>
                                            <div className="size-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20 group-hover:bg-gold group-hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined text-2xl text-white group-hover:text-primary">arrow_forward</span>
                                            </div>
                                        </div>
                                        {/* Background Decoration */}
                                        <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-20 pointer-events-none" style={{ backgroundImage: `url('${result.image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                                    </div>
                                </Link>
                            </section>
                        )}

                        {/* Collection */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">저장된 도서</h2>
                                <Link to="/editorial" className="text-xs text-primary dark:text-gold font-bold flex items-center gap-1">
                                    에디토리얼 둘러보기 <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </Link>
                            </div>
                            {savedBooks.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {savedBooks.map((book, idx) => (
                                        <div key={idx} className="flex flex-col bg-white dark:bg-white/5 rounded-xl border border-primary/5 dark:border-white/5 shadow-sm overflow-hidden group relative">
                                            <div className="aspect-[2/3] relative overflow-hidden">
                                                <img
                                                    src={book.cover}
                                                    alt={book.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                                <button
                                                    onClick={() => handleRemoveBook(book.title)}
                                                    className="absolute top-2 right-2 size-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                            </div>
                                            <div className="p-3">
                                                <h4 className="text-xs font-bold text-primary dark:text-white truncate">{book.title}</h4>
                                                <p className="text-[10px] text-slate-500 truncate mb-2">{book.author}</p>
                                                <a
                                                    href={book.link || `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(book.title)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full py-1.5 bg-primary/5 dark:bg-gold/10 text-primary dark:text-gold text-[10px] font-bold rounded flex items-center justify-center gap-1"
                                                >
                                                    구매 <span className="material-symbols-outlined text-[10px]">shopping_cart</span>
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="aspect-[2/3] rounded-xl bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                                    <span className="material-symbols-outlined text-3xl mb-2">playlist_add</span>
                                    <span className="text-xs">추천 도서를 저장해보세요</span>
                                </div>
                            )}
                        </section>
                    </div>

                    {!unlocked && savedBooks.length === 0 && (
                        /* Empty State for brand new users */
                        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6 mt-8 animate-fade-in-up">
                            <div className="size-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-4xl text-slate-400">library_books</span>
                            </div>
                            <h2 className="text-xl font-bold text-primary dark:text-white mb-2">서재가 비어있습니다</h2>
                            <p className="text-sm text-slate-500 mb-8 max-w-xs">
                                나만의 독서 페르소나를 발견하고<br />맞춤형 추천 도서를 채워보세요.
                            </p>
                            <Link to="/quiz" className="flex items-center gap-2 bg-primary text-gold px-8 py-3 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg hover:shadow-xl active:scale-95 transition-all">
                                <span>테스트 시작하기</span>
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                            </Link>
                        </div>
                    )}
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
