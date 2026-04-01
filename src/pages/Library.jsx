import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';
import Footer from '../components/Footer';
import { resultData } from '../data/resultData';
import { recommendations } from '../data/recommendations';
import { useAuth } from '../hooks/useAuth';
import BookCardActions from '../components/BookCardActions';
import { useBookData } from '../hooks/useBookData';

export default function Library() {
    const { user, loading } = useAuth();
    const { getAllBooks } = useBookData();
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

        loadSavedBooks();

        const handleStorage = () => {
            loadSavedBooks();
            const updatedFRecs = JSON.parse(localStorage.getItem('finderRecommendations') || '[]');
            setFinderRecs(updatedFRecs);
        };
        window.addEventListener('storage', handleStorage);
        window.addEventListener('savedBooksUpdated', handleStorage);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('savedBooksUpdated', handleStorage);
        };
    }, []);

    const allBooks = getAllBooks();
    const enrichBook = (book) => {
        const found = allBooks.find(b => b.title === book.title);
        return found ? { ...book, ...found } : book;
    };

    const result = myResultType ? resultData[myResultType] : null;
    const myRecs = myResultType ? recommendations[myResultType]?.books.filter(b => !hiddenRecs.includes(b.title)) : [];
    const isTeaserVisible = user && unlocked && result;

    if (!loading && !user) {
        return (
            <div className="bg-[#101218] text-white font-sans antialiased min-h-screen flex justify-center selection:bg-orange-500/30">
                <div className="w-full max-w-md relative min-h-screen flex flex-col pb-32 z-10 overflow-x-hidden">
                    <TopNavigation type="sub" />
                    <main className="px-6 pt-10 pb-24 flex-grow flex flex-col items-center justify-center text-center space-y-6">
                        <div className="space-y-3 mb-4">
                            <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">Personal Archive</span>
                            <h2 className="text-2xl text-white font-black tracking-tight">내 서재</h2>
                            <p className="text-white/50 text-[13px] leading-relaxed break-keep max-w-xs mx-auto">
                                나만의 독서 기록을 남겨보세요.<br />
                                읽고 싶은 책을 저장하고, 나의 독서 취향을 분석해드립니다.
                            </p>
                        </div>
                        <div className="w-full space-y-3 max-w-xs">
                            <div className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/10 rounded-sm text-left">
                                <span className="material-symbols-outlined text-orange-500 text-2xl">auto_stories</span>
                                <div>
                                    <p className="text-white text-[13px] font-black">도서 보관함</p>
                                    <p className="text-white/40 text-[11px]">관심 도서를 저장하고 언제든 확인</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/10 rounded-sm text-left">
                                <span className="material-symbols-outlined text-orange-500 text-2xl">psychology</span>
                                <div>
                                    <p className="text-white text-[13px] font-black">독서 성향 분석</p>
                                    <p className="text-white/40 text-[11px]">나에게 맞는 맞춤 도서 추천</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/10 rounded-sm text-left">
                                <span className="material-symbols-outlined text-orange-500 text-2xl">star</span>
                                <div>
                                    <p className="text-white text-[13px] font-black">페르소나 매칭</p>
                                    <p className="text-white/40 text-[11px]">나의 독서 유형을 발견하세요</p>
                                </div>
                            </div>
                        </div>
                        <Link
                            to="/login"
                            className="w-full max-w-xs h-[52px] bg-orange-600 flex items-center justify-center text-white font-black rounded-sm text-[13px] tracking-wide hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20"
                        >
                            로그인 후 서재 이용하기
                        </Link>
                    </main>
                    <Footer />
                    <BottomNavigation />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#101218] text-white font-sans antialiased min-h-screen flex justify-center selection:bg-orange-500/30">
            <div className="w-full max-w-md relative min-h-screen flex flex-col pb-32 z-10 overflow-x-hidden" style={{ touchAction: 'pan-y' }}>
                <TopNavigation type="sub" />

                <main className="px-6 pt-6 pb-24 space-y-2 animate-fade-in flex-grow">
                    {/* Personal Collection Header */}
                    <div className="text-center space-y-2 mb-8 mt-4">
                        <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">Personal Archive</span>
                        <h2 className="text-2xl text-white font-black tracking-tight">내 서재</h2>
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

                    {/* Recommendations */}
                    {((myResultType && myRecs.length > 0) || finderRecs.length > 0) && (
                        <div className="pt-8 mb-8">
                            <h3 className="text-[14px] font-black text-white mb-4 tracking-tight uppercase flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-orange-500 rounded-sm"></span>
                                맞춤 추천
                            </h3>
                            <div className="space-y-4">
                                {finderRecs.length > 0 && finderRecs.map((book, idx) => (
                                    <div key={`finder-${idx}`} className="flex gap-4 p-4 glass-card bg-orange-500/5 rounded-sm border border-orange-500/20 hover:bg-orange-500/10 transition-colors relative group">
                                        <div className="absolute top-2 right-2">
                                            <span className="text-orange-500 text-[8px] font-black uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-sm border border-orange-500/20">FOUND</span>
                                        </div>
                                        <div className="w-[100px] aspect-[3/4.2] shrink-0 bg-black/40 rounded-sm border border-white/5 overflow-hidden shadow-lg">
                                            <img src={book.cover} alt={book.title} loading="lazy" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)} />
                                        </div>
                                        <div className="flex-1 min-w-0 py-1 flex flex-col justify-start">
                                            <h4 className="text-white text-[15px] font-black truncate mb-1 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)}>{book.title}</h4>
                                            <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider mb-2">{book.author}</p>
                                            <p className="text-white/60 text-[11px] font-medium line-clamp-2 leading-relaxed break-keep mb-4">"{book.desc || '당신을 위해 특별히 찾아낸 도서입니다.'}"</p>
                                            <BookCardActions book={enrichBook(book)} className="mt-auto" />
                                        </div>
                                    </div>
                                ))}
                                {myRecs.map((book, idx) => (
                                    <div key={`persona-${idx}`} className="flex gap-4 p-4 glass-card bg-white/[0.02] rounded-sm border border-white/5 hover:bg-white/[0.05] transition-colors relative group">
                                        <div className="w-[100px] aspect-[3/4.2] shrink-0 bg-black/40 rounded-sm border border-white/5 overflow-hidden">
                                            <img src={book.cover} alt={book.title} loading="lazy" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)} />
                                        </div>
                                        <div className="flex-1 min-w-0 py-1 flex flex-col justify-start">
                                            <h4 className="text-white text-[15px] font-black truncate mb-1 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)}>{book.title}</h4>
                                            <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider mb-2">{book.author}</p>
                                            <p className="text-white/60 text-[11px] font-medium line-clamp-2 leading-relaxed break-keep mb-4">"{book.desc}"</p>
                                            <BookCardActions book={enrichBook(book)} className="mt-auto" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Saved Books */}
                    {savedBooks.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4 mt-2">
                                <h3 className="text-[14px] font-black text-white tracking-tight uppercase flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-orange-500 rounded-sm"></span>
                                    보관된 콘텐츠
                                </h3>
                            </div>
                            {savedBooks.map((book, idx) => (
                                <div key={`saved-${idx}`} className="flex gap-4 p-4 glass-card bg-white/[0.02] rounded-sm border border-white/5 hover:bg-white/[0.05] transition-colors relative group">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeSavedBook(book.title); }}
                                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/10 text-red-500/70 border border-transparent hover:border-red-500/30 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all z-10"
                                    >
                                        <span className="material-symbols-outlined text-[16px] font-medium">close</span>
                                    </button>
                                    <div className="w-[100px] aspect-[3/4.2] shrink-0 bg-black/40 rounded-sm border border-white/5 overflow-hidden shadow-lg relative">
                                        <img src={book.cover} alt={book.title} loading="lazy" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)} />
                                    </div>
                                    <div className="flex-1 min-w-0 py-1 flex flex-col justify-start">
                                        <h4 className="text-white text-[15px] font-black truncate pr-6 mb-1 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)}>{book.title}</h4>
                                        <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider mb-2">{book.author}</p>
                                        <BookCardActions book={enrichBook(book)} className="mt-auto" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Footer />
                </main>
                <BottomNavigation />
            </div>
        </div>
    );
}
