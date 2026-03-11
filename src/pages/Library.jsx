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

        // 초기 로드
        loadSavedBooks();

        const handleStorage = () => {
            loadSavedBooks();
            const updatedFRecs = JSON.parse(localStorage.getItem('finderRecommendations') || '[]');
            setFinderRecs(updatedFRecs);
        };
        // 같은 탭 내 커스텀 이벤트 + 다른 탭 storage 이벤트 모두 수신
        window.addEventListener('storage', handleStorage);
        window.addEventListener('savedBooksUpdated', handleStorage);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('savedBooksUpdated', handleStorage);
        };
    }, []);

    const result = myResultType ? resultData[myResultType] : null;
    const myRecs = myResultType ? recommendations[myResultType]?.books.filter(b => !hiddenRecs.includes(b.title)) : [];
    const isTeaserVisible = user && unlocked && result;

    return (
        <div className="bg-[#101218] text-white font-sans antialiased min-h-screen flex justify-center selection:bg-orange-500/30">
            {/* Main Layout Container */}
            <div className="w-full max-w-md relative min-h-screen flex flex-col pb-32 z-10 overflow-hidden">
                <TopNavigation type="sub" />

                <main className="px-6 pt-6 pb-24 space-y-2 animate-fade-in flex-grow">
                    {/* Personal Collection Header */}
                    <div className="text-center space-y-2 mb-8 mt-4">
                        <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">Personal Archive</span>
                        <h2 className="text-2xl text-white font-black tracking-tight">
                            내 서재
                        </h2>
                        <p className="text-white/40 text-[12px] font-bold uppercase tracking-widest">
                            {savedBooks.length} items collected
                        </p>
                    </div>

                    {/* Personality Test Banner */}
                    {isTeaserVisible ? (
                        <div
                            onClick={() => navigate('/result', { state: { resultType: myResultType } })}
                            className="relative rounded-sm overflow-hidden border border-orange-500/30 bg-white/[0.02] p-1 group cursor-pointer shadow-[0_0_30px_rgba(234,88,12,0.1)] mb-8 glass-card"
                        >
                            <div className="relative bg-black/40 backdrop-blur-xl rounded-sm p-6 flex items-center gap-6">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-orange-500/30 transition-all duration-700"></div>
                                <div className="relative size-20 shrink-0">
                                    <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full"></div>
                                    <img src={result.image} alt={result.persona} loading="lazy" className="relative w-full h-full object-cover rounded-sm border border-orange-500/30 grayscale group-hover:grayscale-0 transition-all duration-500" />
                                </div>
                                <div className="flex-1 min-w-0 text-left relative z-10">
                                    <span className="text-orange-500 text-[8px] font-black uppercase tracking-widest block mb-1.5">My Persona</span>
                                    <h3 className="text-white text-[18px] font-black leading-none mb-2 tracking-tight">{result.persona}</h3>
                                    <p className="text-white/60 text-[10px] font-bold truncate mb-3">{result.subtitle}</p>
                                    <div className="flex gap-2">
                                        {Object.entries(result.metrics).slice(0, 2).map(([key, m]) => (
                                            <div key={key} className="bg-white/5 border border-white/10 rounded-sm px-2.5 py-1.5 flex flex-col items-center min-w-[60px]">
                                                <span className="text-white/40 text-[7px] uppercase font-bold tracking-wider mb-0.5">{m.label}</span>
                                                <span className="text-orange-500 text-[10px] font-black">{m.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-orange-500 opacity-50 group-hover:opacity-100 transition-opacity">chevron_right</span>
                            </div>
                        </div>
                    ) : (
                        <div className="relative rounded-sm overflow-hidden border border-white/10 group mb-8 glass-card bg-white/[0.02]">
                            <div className="absolute -top-20 -left-20 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-orange-500/20 transition-all duration-700"></div>

                            <div className="relative p-8 text-center flex flex-col items-center z-10">
                                <span className="material-symbols-outlined text-orange-500 text-4xl mb-4 font-light">psychology</span>
                                <h3 className="text-white text-[18px] font-black mb-2 tracking-tight">나의 페르소나 찾기</h3>
                                <p className="text-white/40 text-[12px] font-bold mb-6 max-w-xs leading-relaxed break-keep">
                                    성향 분석을 통해 나에게 딱 맞는 서재를 구성해보세요.
                                </p>
                                {quizResult ? (
                                    <button
                                        onClick={() => navigate('/result', { state: { resultType: quizResult } })}
                                        className="w-full h-[52px] bg-white text-black font-black rounded-sm text-[13px] tracking-wide hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                                    >
                                        분석 결과 보기 <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                ) : (
                                    <Link to="/quiz" className="w-full h-[52px] bg-orange-600 flex items-center justify-center text-white font-black rounded-sm text-[13px] tracking-wide hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20">
                                        무료 진단하기
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recommendations (if any) */}
                    {((myResultType && myRecs.length > 0) || finderRecs.length > 0) && (
                        <div className="pt-8 mb-8">
                            <h3 className="text-[14px] font-black text-white mb-4 tracking-tight uppercase flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-orange-500 rounded-sm"></span>
                                맞춤 추천
                            </h3>
                            <div className="space-y-3">
                                {/* Finder Results */}
                                {finderRecs.length > 0 && finderRecs.map((book, idx) => (
                                    <div key={`finder-${idx}`} className="flex gap-4 p-4 glass-card bg-orange-500/5 rounded-sm border border-orange-500/20 hover:bg-orange-500/10 transition-colors relative group">
                                        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-80">
                                            <span className="text-orange-500 text-[8px] font-black uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-sm border border-orange-500/20">FOUND</span>
                                        </div>
                                        <div className="w-16 h-24 shrink-0 bg-black/40 rounded-sm border border-white/5 overflow-hidden shadow-lg object-cover">
                                            <img src={book.cover} alt={book.title} loading="lazy" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0 py-1 flex flex-col justify-center">
                                            <h4 className="text-white text-[13px] font-black truncate mb-1">{book.title}</h4>
                                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">{book.author}</p>
                                            <p className="text-white/60 text-[11px] font-medium line-clamp-2 leading-relaxed break-keep">"{book.desc || '당신을 위해 특별히 찾아낸 도서입니다.'}"</p>
                                        </div>
                                    </div>
                                ))}

                                {/* Persona Results */}
                                {myRecs.map((book, idx) => (
                                    <div key={`persona-${idx}`} className="flex gap-4 p-4 glass-card bg-white/[0.02] rounded-sm border border-white/5 hover:bg-white/[0.05] transition-colors">
                                        <div className="w-16 h-24 shrink-0 bg-black/40 rounded-sm border border-white/5 overflow-hidden object-cover">
                                            <img src={book.cover} alt={book.title} loading="lazy" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0 py-1 flex flex-col justify-center">
                                            <h4 className="text-white text-[13px] font-black truncate mb-1">{book.title}</h4>
                                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">{book.author}</p>
                                            <p className="text-white/60 text-[11px] font-medium line-clamp-2 leading-relaxed break-keep">"{book.desc}"</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Saved Books Grid */}
                    <div className="pt-2">
                        <div className="flex items-center justify-between mb-4 mt-2">
                            <h3 className="text-[14px] font-black text-white tracking-tight uppercase flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-orange-500 rounded-sm"></span>
                                보관된 콘텐츠
                            </h3>
                        </div>

                        {savedBooks.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {savedBooks.map((book, idx) => (
                                    <div key={idx} className="group relative">
                                        <div className="relative aspect-[2/3] bg-white/[0.02] rounded-sm overflow-hidden border border-white/5 shadow-lg mb-2.5">
                                            <img src={book.cover} alt={book.title} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-105" />

                                            {/* Overlay Actions */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                                <a
                                                    href={`https://www.coupang.com/np/search?component=&q=${encodeURIComponent(book.title)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors shadow-xl"
                                                >
                                                    <span className="material-symbols-outlined text-[20px] font-black">shopping_bag</span>
                                                </a>
                                                <button
                                                    onClick={() => removeSavedBook(book.title)}
                                                    className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-xl"
                                                >
                                                    <span className="material-symbols-outlined text-[20px] font-black">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-white text-[12px] font-black truncate pr-2 tracking-tight">{book.title}</h3>
                                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider truncate mt-0.5">{book.author}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center border border-dashed border-white/10 rounded-sm bg-white/[0.02] mx-2">
                                <span className="material-symbols-outlined text-white/20 text-4xl mb-4 font-light">bookmark</span>
                                <p className="text-white/40 text-[12px] font-bold mb-6">아직 보관된 콘텐츠가 없습니다.</p>
                                <Link to="/" className="px-6 py-3 bg-orange-600 text-white font-black rounded-sm text-[12px] tracking-wide hover:bg-orange-500 transition-colors inline-block shadow-lg shadow-orange-600/20">
                                    콘텐츠 둘러보기
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
