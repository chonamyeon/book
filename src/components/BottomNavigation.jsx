import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { recommendations } from '../data/recommendations';
import { useAudio } from '../contexts/AudioContext';
import { bookScripts } from '../data/bookScripts';

export default function BottomNavigation() {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    const [isFinderOpen, setIsFinderOpen] = useState(false);
    const [finderStep, setFinderStep] = useState(1); // 1: Form, 2: Loading, 3: Results
    const [formData, setFormData] = useState({ gender: '', age: '', job: '', interest: '' });
    const [foundBooks, setFoundBooks] = useState([]);
    const { isSpeaking, activeAudioId, playPodcast, stopAll } = useAudio();

    // Mapping for Editors' Picks to their IDs for lookups
    const editorsPicksMap = {
        "세이노의 가르침": "sayno",
        "돈의 심리학": "psychology",
        "위버멘쉬": "ubermensch",
        "1984": "1984",
        "데미안": "demian",
        "채식주의자": "vegetarian",
        "팩트풀니스": "factfulness",
        "아몬드": "almond",
        "레버리지": "leverage",
        "원씽": "one-thing",
        "사피엔스": "sapiens"
    };

    const handleFind = () => {
        if (!formData.gender || !formData.age || !formData.job || !formData.interest) {
            alert('모든 정보를 선택해주세요!');
            return;
        }

        setFinderStep(2);

        // Simulating AI recommendation logic
        setTimeout(() => {
            const allBooks = [];
            Object.values(recommendations).forEach(category => {
                allBooks.push(...category.books);
            });

            // Randomly pick 5 unique books for now (could be more "AI" like later)
            const shuffled = [...allBooks].sort(() => 0.5 - Math.random());
            setFoundBooks(shuffled.slice(0, 5));
            setFinderStep(3);
        }, 1500);
    };

    const resetFinder = () => {
        setIsFinderOpen(false);
        setFinderStep(1);
        setFormData({ gender: '', age: '', job: '', interest: '' });
        setFoundBooks([]);
        stopAll();
    };

    const addToLibrary = (book) => {
        const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
        if (saved.some(b => b.title === book.title)) {
            alert('이미 서재에 보관된 도서입니다.');
            return;
        }
        const updated = [...saved, {
            title: book.title,
            author: book.author,
            cover: book.cover
        }];
        localStorage.setItem('savedBooks', JSON.stringify(updated));
        window.dispatchEvent(new Event('savedBooksUpdated'));
        alert('서재에 보관되었습니다. ✅');
    };

    const saveResults = () => {
        localStorage.setItem('finderRecommendations', JSON.stringify(foundBooks));
        resetFinder();
        navigate('/library');
    };

    const navItems = [
        { path: '/', label: '홈', icon: 'home' },
        { path: '/editorial', label: '에디토리얼', icon: 'auto_awesome' },
        { path: '/library', label: '서재', icon: 'auto_stories' },
        { path: '/reading-notes', label: '독서노트', icon: 'edit_note' },
        { path: '/profile', label: '프로필', icon: 'person' },
    ];

    return (
        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-gold/20 bg-[#090b10]/95 backdrop-blur-2xl transition-all duration-300 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
            <div className="flex justify-around items-center px-4 pt-4 pb-6 relative">
                {/* Subtle gold line on top of active item */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/10 to-transparent"></div>

                {navItems.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-500 active:scale-95 ${isActive
                                ? 'text-gold'
                                : 'text-slate-600 hover:text-slate-400'
                                }`}
                        >
                            <div className="relative group/nav">
                                {isActive && (
                                    <div className="absolute inset-0 bg-gold/10 blur-xl rounded-full scale-150 animate-pulse"></div>
                                )}
                                <div className={`flex size-11 items-center justify-center rounded-2xl transition-all duration-500 relative z-10 ${isActive ? 'bg-gold/10 border border-gold/20 shadow-[inset_0_0_15px_rgba(212,175,55,0.2)]' : ''}`}>
                                    <span className={`material-symbols-outlined text-[24px] transition-all duration-500 ${isActive ? 'fill-1 scale-110' : 'scale-100'}`}>
                                        {item.icon}
                                    </span>
                                </div>
                            </div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 -translate-y-0.5 ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                                {item.label}
                            </p>
                        </Link>
                    );
                })}

                {/* Floating Finder Button and Modal */}
                <div className="absolute -top-20 right-6">
                    {currentPath === '/reading-notes' ? (
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-reading-note-form'))}
                            className="h-14 pl-5 pr-7 rounded-full bg-gold text-primary shadow-[0_15px_35px_rgba(212,175,55,0.3)] flex items-center gap-3 active:scale-90 transition-all font-bold group/note animate-in zoom-in duration-500"
                        >
                            <span className="material-symbols-outlined text-xl group-hover/note:rotate-12 transition-transform">edit_note</span>
                            <span className="text-[14px]">기록하기</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsFinderOpen(!isFinderOpen)}
                            className={`size-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 active:scale-90 ${isFinderOpen ? 'bg-white text-[#090b10] rotate-45' : 'bg-gold text-[#090b10] rotate-0'} hover:shadow-gold/40`}
                        >
                            <span className="material-symbols-outlined text-[32px] font-bold">add</span>
                        </button>
                    )}

                    <AnimatePresence>
                        {isFinderOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                className="absolute bottom-20 right-0 w-[280px] bg-[#1a1c23]/95 backdrop-blur-3xl border border-white/10 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60]"
                            >
                                {/* Triangle arrow for speech bubble effect */}
                                <div className="absolute -bottom-2 right-10 w-4 h-4 bg-[#1a1c23] border-r border-b border-white/10 rotate-45 translate-x-1/2"></div>

                                {finderStep === 1 && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-white text-base font-black tracking-tighter italic">내게 맞는 BOOK 찾기</h3>
                                            <button onClick={resetFinder} className="text-white/30 hover:text-white transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">close</span>
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">성별</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['남자', '여자'].map(g => (
                                                        <button
                                                            key={g}
                                                            onClick={() => setFormData({ ...formData, gender: g })}
                                                            className={`py-1.5 rounded-xl text-[13px] font-bold transition-all border ${formData.gender === g ? 'bg-gold border-gold text-primary' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                                        >
                                                            {g}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">나이</p>
                                                <select
                                                    value={formData.age}
                                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                                    className="w-full bg-[#1a1c23] border border-white/10 rounded-xl px-4 py-2 text-white text-[13px] outline-none focus:border-gold/50 transition-all font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled className="bg-[#1a1c23]">나이를 선택해주세요</option>
                                                    {Array.from({ length: 61 }, (_, i) => i + 10).map(age => (
                                                        <option key={age} value={age} className="bg-[#1a1c23]">{age}살</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">직업</p>
                                                <select
                                                    value={formData.job}
                                                    onChange={(e) => setFormData({ ...formData, job: e.target.value })}
                                                    className="w-full bg-[#1a1c23] border border-white/10 rounded-xl px-4 py-2 text-white text-[13px] outline-none focus:border-gold/50 transition-all font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled className="bg-[#1a1c23]">직업을 선택해주세요</option>
                                                    {['개인사업', '직장인', '학생', '무직', '창업준비중'].map(job => (
                                                        <option key={job} value={job} className="bg-[#1a1c23]">{job}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">관심분야</p>
                                                <select
                                                    value={formData.interest}
                                                    onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                                                    className="w-full bg-[#1a1c23] border border-white/10 rounded-xl px-4 py-2 text-white text-[13px] outline-none focus:border-gold/50 transition-all font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled className="bg-[#1a1c23]">관심분야를 선택해주세요</option>
                                                    {['예술', '경제', '문화', '사회', '자기개발'].map(interest => (
                                                        <option key={interest} value={interest} className="bg-[#1a1c23]">{interest}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button
                                                onClick={handleFind}
                                                className="w-full h-12 bg-gradient-to-r from-gold to-[#c5a040] rounded-2xl text-primary font-black uppercase tracking-widest shadow-lg shadow-gold/20 active:scale-95 transition-all mt-1"
                                            >
                                                찾기
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {finderStep === 2 && (
                                    <div className="h-[300px] flex flex-col items-center justify-center space-y-4">
                                        <div className="size-16 border-4 border-gold/20 border-t-gold rounded-full animate-spin"></div>
                                        <p className="text-gold font-black animate-pulse">당신만을 위한 도서를 찾는 중...</p>
                                    </div>
                                )}

                                {finderStep === 3 && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-white text-base font-black tracking-tighter italic">추천 도서 Top 5</h3>
                                            <button onClick={() => setFinderStep(1)} className="text-gold text-[10px] font-bold">다시 찾기</button>
                                        </div>

                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {foundBooks.map((book, idx) => {
                                                const pickId = editorsPicksMap[book.title];
                                                const hasPodcast = pickId && bookScripts[pickId];

                                                return (
                                                    <div key={idx} className="space-y-2">
                                                        <div className="flex gap-4 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                                                            <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-lg border border-white/5">
                                                                <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                            </div>
                                                            <div className="flex flex-col justify-center overflow-hidden flex-1">
                                                                <h4 className="text-white text-sm font-bold truncate">{book.title}</h4>
                                                                <p className="text-slate-500 text-[11px] truncate">{book.author}</p>
                                                            </div>
                                                            {pickId && (
                                                                <div className="flex items-center">
                                                                    <span className="text-gold text-[8px] font-black uppercase tracking-widest bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">PICK</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {pickId && (
                                                            <div className="grid grid-cols-2 gap-2 pb-2">
                                                                <Link
                                                                    to={`/review/${pickId}`}
                                                                    onClick={() => setIsFinderOpen(false)}
                                                                    className="h-9 rounded-xl bg-white/5 border border-white/10 text-white text-[8px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">menu_book</span>
                                                                    <span>리뷰</span>
                                                                </Link>
                                                                {hasPodcast && (
                                                                    <button
                                                                        onClick={() => {
                                                                            if (activeAudioId === `finder-${pickId}`) {
                                                                                stopAll();
                                                                            } else {
                                                                                playPodcast(bookScripts[pickId], `finder-${pickId}`);
                                                                            }
                                                                        }}
                                                                        className={`h-9 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${activeAudioId === `finder-${pickId}`
                                                                            ? 'bg-gold border-gold text-primary font-bold'
                                                                            : 'bg-white/5 border-white/10 text-white hover:text-gold hover:border-gold/50'
                                                                            }`}
                                                                    >
                                                                        <span className="material-symbols-outlined text-[16px]">{activeAudioId === `finder-${pickId}` ? 'stop' : 'podcasts'}</span>
                                                                        <span className="text-[8px] font-black uppercase tracking-widest">{activeAudioId === `finder-${pickId}` ? '정지' : '팟캐스트'}</span>
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => addToLibrary(book)}
                                                                    className="h-9 rounded-xl bg-white/5 border border-white/10 text-white text-[8px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">bookmark</span>
                                                                    <span>서재 추가</span>
                                                                </button>
                                                                <a
                                                                    href={`https://www.coupang.com/np/search?q=${encodeURIComponent(book.title)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="h-9 rounded-xl bg-gold/5 border border-gold/20 text-gold text-[8px] font-black uppercase tracking-widest hover:bg-gold hover:text-primary transition-all flex items-center justify-center gap-1.5"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
                                                                    <span>구매</span>
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={resetFinder}
                                                className="flex-1 h-11 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                                            >
                                                닫기
                                            </button>
                                            <button
                                                onClick={saveResults}
                                                className="flex-[1.5] h-11 bg-gold text-primary rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-gold/20 active:scale-95"
                                            >
                                                결과 저장하기
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </nav>
    );
}
