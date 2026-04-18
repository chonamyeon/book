import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import MainHeader from '../components/MainHeader';
import Footer from '../components/Footer';
import { resultData, generateResultData } from '../data/resultData';
import { recommendations, generateRecommendations } from '../data/recommendations';
import { useAuth } from '../hooks/useAuth';
import BookCardActions from '../components/BookCardActions';
import { useBookData } from '../hooks/useBookData';
import PersonaAvatar from '../components/PersonaAvatar';
import { useAudio } from '../contexts/AudioContext';

const formatInsightTime = (sec) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const TYPE_META_LIB = {
    growth:        { label: '성장·실행형', icon: 'trending_up',     bgFrom: 'from-blue-900',   bgTo: 'to-primary', accentColor: 'text-cyan-400',   borderColor: 'border-cyan-500/30',   bgColor: 'bg-cyan-500/10'   },
    entertainment: { label: '창의·탐험형', icon: 'auto_stories',    bgFrom: 'from-violet-900', bgTo: 'to-primary', accentColor: 'text-fuchsia-400', borderColor: 'border-fuchsia-500/30',bgColor: 'bg-fuchsia-500/10'},
    empathy:       { label: '공감·관계형', icon: 'favorite',        bgFrom: 'from-rose-900',   bgTo: 'to-primary', accentColor: 'text-rose-400',    borderColor: 'border-rose-500/30',   bgColor: 'bg-rose-500/10'   },
    mindfulness:   { label: '사색·마음형', icon: 'self_improvement', bgFrom: 'from-emerald-900',bgTo: 'to-primary', accentColor: 'text-emerald-400', borderColor: 'border-emerald-500/30',bgColor: 'bg-emerald-500/10'},
};

export default function Library() {
    const { user } = useAuth();
    const { getAllBooks } = useBookData();
    const { dailyListenTime, dailyTarget, streak } = useAudio();
    const [unlocked, setUnlocked] = useState(false);
    const [myResultType, setMyResultType] = useState(null);
    const [quizResult, setQuizResult] = useState(null);
    const [quizScores, setQuizScores] = useState(null);
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
        
        try {
            const qScoresStr = localStorage.getItem('quizScores');
            if (qScoresStr) {
                setQuizScores(JSON.parse(qScoresStr));
            }
        } catch (e) {
            console.error(e);
        }

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

    // getAllBooks()로 Firestore override 병합된 완전한 book 객체를 제목으로 찾아 반환
    const allBooks = getAllBooks();
    const enrichBook = (book) => {
        const found = allBooks.find(b => b.title === book.title);
        return found ? { ...book, ...found } : book;
    };

    const result = myResultType ? resultData[myResultType] : null;
    
    // myRecs를 quizScores가 있을 경우 동적 결과로, 없으면 기존 레거시 결과로 폴백
    const myRecs = (() => {
        let books = [];
        if (quizScores) {
            books = generateRecommendations(quizScores).books || [];
        } else if (myResultType) {
            books = recommendations[myResultType]?.books || [];
        }
        return books.filter(b => !hiddenRecs.includes(b.title));
    })();

    const teaserResult = (() => {
        if (quizScores) return generateResultData(quizScores);
        if (myResultType) return result;
        return null;
    })();

    return (
        <div className="bg-[#101218] text-white font-sans antialiased min-h-screen flex justify-center selection:bg-orange-500/30">
            {/* Main Layout Container */}
            <div className="w-full max-w-md relative min-h-screen flex flex-col pb-32 z-10 overflow-x-hidden" style={{ touchAction: 'pan-y' }}>
                <MainHeader showBack />

                <main className="px-6 pt-6 pb-24 animate-fade-in flex-grow space-y-6">
                    {/* Personal Collection Header */}
                    <div className="text-center space-y-2 mt-2">
                        <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">Personal Archive</span>
                        <h2 className="text-2xl text-white font-black tracking-tight">내 서재</h2>
                        <p className="text-white/40 text-[12px] font-bold uppercase tracking-widest">
                            {savedBooks.length} items collected
                        </p>
                    </div>

                    {/* ── 나의 페르소나 ── */}
                    <div>
                        <h3 className="text-[14px] font-black text-white mb-3 tracking-tight uppercase flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-orange-500 rounded-sm"></span>
                            나의 페르소나
                        </h3>
                        {teaserResult ? (() => {
                            const resType = myResultType || quizResult || teaserResult.primaryType || 'growth';
                            const typeMeta = TYPE_META_LIB[resType] || TYPE_META_LIB.growth;
                            return (
                                <div
                                    onClick={() => navigate('/result', { state: { resultType: resType, scores: quizScores } })}
                                    className="relative overflow-hidden border border-orange-500/30 bg-[#101218]/90 backdrop-blur-3xl group cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 blur-xl opacity-50 pointer-events-none" />
                                    <div className="relative p-5 flex items-center gap-4 z-10">
                                        <div className={`absolute -top-8 -right-8 w-28 h-28 ${typeMeta.bgColor} blur-[40px] rounded-full pointer-events-none opacity-60`} />
                                        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-orange-500/20 shadow-lg">
                                            <PersonaAvatar type={resType} />
                                        </div>
                                        <div className="flex-1 min-w-0 relative z-10">
                                            <span className={`text-[8px] font-black uppercase tracking-widest ${typeMeta.accentColor} block mb-1`}>My Persona</span>
                                            <h3 className="text-white text-base font-black leading-tight mb-0.5 truncate">{teaserResult.subtitle}</h3>
                                            <p className="text-white/40 text-[10px] font-bold truncate">{teaserResult.persona} · {typeMeta.label}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-orange-500/50 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all">chevron_right</span>
                                    </div>
                                </div>
                            );
                        })() : (
                            <div className="relative rounded-sm overflow-hidden border border-orange-500/20 group bg-[#101218]/90 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-500/10 blur-xl opacity-50 pointer-events-none" />
                                <div className="relative p-8 text-center flex flex-col items-center z-10">
                                    <span className="material-symbols-outlined text-orange-500 text-4xl mb-4 font-light">psychology</span>
                                    <h3 className="text-white text-[18px] font-black mb-2 tracking-tight">나의 페르소나 찾기</h3>
                                    <p className="text-white/40 text-[12px] font-bold mb-6 max-w-xs leading-relaxed break-keep">
                                        성향 분석을 통해 나에게 딱 맞는 서재를 구성해보세요.
                                    </p>
                                    <Link to="/quiz" className="w-full h-[52px] bg-orange-600 flex items-center justify-center text-white font-black rounded-sm text-[13px] tracking-wide hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20">
                                        무료 진단하기
                                    </Link>
                                </div>
                            </div>
                        )}
                        <p className="text-white/35 text-[11px] font-medium leading-relaxed mt-3 pl-1">나의 독서 성향을 분석해 맞춤 독서 유형과 페르소나를 확인하세요.</p>
                    </div>

                    {/* ── 나의 인사이트 타임 ── */}
                    {(() => {
                        const totalBlocks = 30;
                        const filledBlocks = Math.max(0, Math.min(totalBlocks, dailyTarget > 0 ? Math.floor(dailyListenTime / (dailyTarget / totalBlocks)) : 0));
                        const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(Math.max(0, totalBlocks - filledBlocks));
                        return (
                            <div>
                                <h3 className="text-[14px] font-black text-white mb-3 tracking-tight uppercase flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-orange-500 rounded-sm"></span>
                                    나의 인사이트 타임
                                </h3>
                                <div className="relative bg-[#101218]/90 backdrop-blur-3xl border border-white/10 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm w-full">
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 blur-xl opacity-50 pointer-events-none rounded-sm" />
                                    <div className="relative z-10 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[13px] font-black tracking-tight text-white/90 uppercase">오늘의 청취 시간</h4>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-orange-500/10 border border-orange-500/20">
                                                <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">ON AIR</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_5px_rgba(249,115,22,0.8)]" />
                                            </div>
                                        </div>
                                        <div className="flex items-baseline justify-between">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-[28px] font-black text-white tracking-tighter tabular-nums leading-none">
                                                    {formatInsightTime(dailyListenTime)}
                                                </span>
                                                <span className="text-[10px] font-bold text-white/40 tracking-tight uppercase">Min Listened</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[14px] font-bold text-white/60 tracking-tight">
                                                    / {formatInsightTime(dailyTarget)} <span className="text-white/20 ml-1 font-black">GOAL</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[14px] sm:text-[16px] font-mono tracking-[0.12em] text-orange-500/90 leading-none filter drop-shadow-[0_0_8px_rgba(249,115,22,0.4)] whitespace-nowrap overflow-hidden text-clip flex justify-center w-full">
                                                {progressBar}
                                            </div>
                                            <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-1">
                                                <span className="text-[12px] font-black text-white/70 tracking-tight">{streak}일 연속 달성 중</span>
                                                <span className="text-[9px] font-black text-orange-500/50 uppercase tracking-[0.2em]">Growing Daily</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-white/35 text-[11px] font-medium leading-relaxed mt-3 pl-1">오늘 청취한 팟캐스트 시간을 기록하고 매일 꾸준한 독서 습관을 만들어 보세요.</p>
                            </div>
                        );
                    })()}

                    {/* ── 쿠팡 파트너스 배너 ── */}
                    <div className="flex flex-col items-center gap-1.5">
                        <iframe
                            src="https://ads-partners.coupang.com/widgets.html?id=976190&template=banner&trackingCode=AF5571749&subId=&width=320&height=100"
                            width="320"
                            height="100"
                            frameBorder="0"
                            scrolling="no"
                            referrerPolicy="unsafe-url"
                            style={{ display: 'block' }}
                        />
                        <p className="text-[10px] text-slate-600 text-center leading-snug">
                            이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
                        </p>
                    </div>

                    {/* ── 맞춤 추천 ── */}
                    {((myRecs.length > 0) || finderRecs.length > 0) && (
                        <div>
                            <h3 className="text-[14px] font-black text-white mb-3 tracking-tight uppercase flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-orange-500 rounded-sm"></span>
                                맞춤 추천
                            </h3>
                            <div className="space-y-4">
                                {/* Finder Results */}
                                {finderRecs.length > 0 && finderRecs.map((book, idx) => (
                                    <div key={`finder-${idx}`} className="flex gap-4 p-4 glass-card bg-orange-500/5 rounded-sm border border-orange-500/20 hover:bg-orange-500/10 transition-colors relative group">
                                        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-80">
                                            <span className="text-orange-500 text-[8px] font-black uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-sm border border-orange-500/20">FOUND</span>
                                        </div>
                                        <div className="w-[100px] aspect-[3/4.2] shrink-0 bg-black/40 rounded-sm border border-white/5 overflow-hidden shadow-lg object-cover">
                                            <img src={book.cover} alt={book.title} loading="lazy" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)} />
                                            {book.isPodcast && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    <span className="material-symbols-outlined text-white text-2xl">play_circle</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 py-1 flex flex-col justify-start">
                                            <h4 className="text-white text-[15px] font-black truncate mb-1 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)}>{book.title}</h4>
                                            <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider mb-2">{book.author}</p>
                                            <p className="text-white/60 text-[11px] font-medium line-clamp-2 leading-relaxed break-keep mb-4">"{book.desc || '당신을 위해 특별히 찾아낸 도서입니다.'}"</p>
                                            <BookCardActions book={enrichBook(book)} className="mt-auto" />
                                        </div>
                                    </div>
                                ))}

                                {/* Persona Results */}
                                {myRecs.map((book, idx) => (
                                    <div key={`persona-${idx}`} className="flex gap-4 p-4 glass-card bg-white/[0.02] rounded-sm border border-white/5 hover:bg-white/[0.05] transition-colors relative group">
                                        <div className="w-[100px] aspect-[3/4.2] shrink-0 bg-black/40 rounded-sm border border-white/5 overflow-hidden object-cover">
                                            <img src={book.cover} alt={book.title} loading="lazy" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)} />
                                            {book.isPodcast && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    <span className="material-symbols-outlined text-white text-2xl">play_circle</span>
                                                </div>
                                            )}
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
                            <p className="text-white/35 text-[11px] font-medium leading-relaxed mt-3 pl-1">나의 페르소나 분석을 바탕으로 지금 나에게 꼭 맞는 도서를 엄선했습니다.</p>
                        </div>
                    )}

                    {/* ── 보관된 콘텐츠 ── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[14px] font-black text-white tracking-tight uppercase flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-orange-500 rounded-sm"></span>
                                보관된 콘텐츠
                            </h3>
                        </div>

                        {savedBooks.length > 0 ? (
                            <div className="space-y-4">
                                {savedBooks.map((book, idx) => (
                                    <div key={`saved-${idx}`} className="flex gap-4 p-4 glass-card bg-white/[0.02] rounded-sm border border-white/5 hover:bg-white/[0.05] transition-colors relative group">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeSavedBook(book.title); }}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/10 text-red-500/70 border border-transparent hover:border-red-500/30 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all z-10"
                                            title="서재에서 삭제"
                                        >
                                            <span className="material-symbols-outlined text-[16px] font-medium">close</span>
                                        </button>

                                        <div className="w-[100px] aspect-[3/4.2] shrink-0 bg-black/40 rounded-sm border border-white/5 overflow-hidden shadow-lg object-cover relative">
                                            <img src={book.cover} alt={book.title} loading="lazy" className="w-full h-full object-cover cursor-pointer" onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)} />
                                            {book.isPodcast && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    <span className="material-symbols-outlined text-white text-2xl">play_circle</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 py-1 flex flex-col justify-start">
                                            <h4 className="text-white text-[15px] font-black truncate pr-6 mb-1 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)}>{book.title}</h4>
                                            <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider mb-2">{book.author}</p>
                                            <BookCardActions book={enrichBook(book)} className="mt-auto" />
                                        </div>
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
                        <p className="text-white/35 text-[11px] font-medium leading-relaxed mt-3 pl-1">관심 있는 도서와 팟캐스트를 저장해두고 언제든 다시 꺼내 보세요.</p>
                    </div>
                    <Footer />
                </main>
                <BottomNavigation />
            </div>
        </div>
    );
}
