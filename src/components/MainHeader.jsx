import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookData } from '../hooks/useBookData';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAudio } from '../contexts/AudioContext';
import { getTodayContents } from '../data/personalization';
import { useSeoulCalendarDayKey } from '../hooks/useCalendarDay';

const TABS = [
    { label: 'NOW',    path: '/' },
    { label: '자기계발', path: '/category/SELF_DEV' },
    { label: '경제',    path: '/category/ECONOMY' },
    { label: '경영',    path: '/category/MANAGEMENT' },
    { label: '인문',    path: '/category/HUMANITIES' },
    { label: '심리',    path: '/category/PSYCHOLOGY' },
];

export default function MainHeader() {
    const location = useLocation();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [videos, setVideos] = useState([]);
    const [weeklyFocusBooks, setWeeklyFocusBooks] = useState([]);
    const [popularArchives, setPopularArchives] = useState([]);
    const searchInputRef = useRef(null);
    const { getAllBooks, loading: booksLoading } = useBookData();
    const { openScriptModal, playPodcastMP3 } = useAudio();
    const seoulYmd = useSeoulCalendarDayKey();

    const [rawWeeklyFocusBooks, setRawWeeklyFocusBooks] = useState([]);
    const [rawPopularArchives, setRawPopularArchives] = useState([]);

    useEffect(() => {
        if (!searchOpen) return;
        getDoc(doc(db, 'site_config', 'weekly_focus')).then(snap => {
            if (snap.exists()) {
                setVideos(snap.data().videos || []);
                setRawWeeklyFocusBooks(snap.data().books || []);
            }
        }).catch(() => {});
        getDoc(doc(db, 'site_config', 'popular_archives')).then(snap => {
            if (snap.exists()) {
                setRawPopularArchives(snap.data().books || snap.data().items || []);
            }
        }).catch(() => {});
        setTimeout(() => searchInputRef.current?.focus(), 80);
    }, [searchOpen]);

    useEffect(() => {
        if (booksLoading) return;
        const allBks = getAllBooks();
        if (rawWeeklyFocusBooks.length) {
            setWeeklyFocusBooks(rawWeeklyFocusBooks.map(b => allBks.find(ab => ab.id === b.id) || b).filter(Boolean));
        }
        if (rawPopularArchives.length) {
            setPopularArchives(rawPopularArchives.map(b => allBks.find(ab => ab.id === b.id) || b).filter(Boolean));
        }
    }, [booksLoading, rawWeeklyFocusBooks, rawPopularArchives]);

    useEffect(() => { if (!searchOpen) setQuery(''); }, [searchOpen]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return { books: [], videos: [] };
        return {
            books: getAllBooks().filter(b => (b.title||'').toLowerCase().includes(q) || (b.author||'').toLowerCase().includes(q)).slice(0, 8),
            videos: videos.filter(v => (v.title||'').toLowerCase().includes(q)).slice(0, 4),
        };
    }, [query, videos]);

    const hasResults = results.books.length > 0 || results.videos.length > 0;

    const todayBooks = useMemo(() => {
        if (!weeklyFocusBooks.length && !videos.length) return [];
        const { todayBooks: tb } = getTodayContents(weeklyFocusBooks, videos, null, seoulYmd);
        return tb.slice(0, 2);
    }, [weeklyFocusBooks, videos, seoulYmd]);

    const originalBooks = useMemo(() => {
        return getAllBooks().filter(b => b.id?.includes('framework') || b.id?.includes('original')).slice(0, 2);
    }, [getAllBooks, booksLoading]);

    const handleBookClick = (book) => {
        setSearchOpen(false);
        navigate(`/review/${book.id}?tab=podcast`);
    };

    const handleVideoClick = (v) => {
        setSearchOpen(false);
        const vid = v.videoId || v.id || (v.url||'').match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1];
        if (vid) navigate(`/yt-podcast/${vid}`);
    };
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [hoverIdx, setHoverIdx] = useState(null);
    const tabRefs = useRef([]);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    const activeIdx = TABS.findIndex(t =>
        t.path === '/' ? location.pathname === '/' : location.pathname.startsWith(t.path)
    );
    const displayIdx = hoverIdx !== null ? hoverIdx : (activeIdx >= 0 ? activeIdx : 0);

    useEffect(() => {
        const el = tabRefs.current[displayIdx];
        if (el) setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }, [displayIdx]);
    const [pwaInstalled, setPwaInstalled] = useState(false);
    const [showIphoneModal, setShowIphoneModal] = useState(false);
    const [showAndroidModal, setShowAndroidModal] = useState(false);

    useEffect(() => {
        const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => setPwaInstalled(true));
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleAndroidInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setPwaInstalled(true);
            setDeferredPrompt(null);
        } else {
            setShowAndroidModal(true);
        }
    };

    return (
        <>
            <div className="bg-[#101218] sticky top-0 z-50 w-full" style={{ paddingTop: 'calc(3px + env(safe-area-inset-top, 0px))' }}>
                <header className="flex h-[31px] items-center justify-between mt-[6px] px-3">
                    {/* Logo or Back */}
                    <div className="flex items-center gap-3 relative top-0">

                        <Link to="/" className="min-h-0 transition-opacity active:opacity-70">
                            <div className="flex items-center gap-[7px]">
                                <div className="flex items-end h-[18px] gap-[2px] mr-1 pb-[2px]">
                                    <div className="w-[3px] h-[10px] bg-zinc-400 rounded-none" />
                                    <div className="w-[3px] h-[14px] bg-zinc-400 rounded-none" />
                                    <div className="w-[3px] h-[18px] bg-zinc-400 rounded-none" />
                                    <div className="w-[3px] h-[12px] bg-zinc-400 rounded-none" />
                                    <div className="w-[3px] h-[16px] bg-zinc-400 rounded-none" />
                                </div>
                                <span className="text-[19px] font-black tracking-[-0.03em] uppercase mt-0.5 text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>ARCHIVIEW</span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex h-[31px] items-center gap-1.5 relative top-0">
                        <div className="flex h-[24px] items-center">
                        <button
                            onClick={handleAndroidInstall}
                            disabled={pwaInstalled}
                            className="min-h-0 h-[24px] flex items-center gap-0.5 px-1.5 py-0 text-[9px] font-bold text-white/75 hover:text-white active:scale-95 transition-all whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>android</span>
                            {pwaInstalled ? '✓ Android' : 'Android'}
                        </button>
                        <span className="text-white/25 text-[10px] select-none">|</span>
                        <button
                            onClick={() => setShowIphoneModal(true)}
                            className="min-h-0 h-[24px] flex items-center gap-0.5 px-1.5 py-0 text-[9px] font-bold text-white/75 hover:text-white active:scale-95 transition-all whitespace-nowrap"
                        >
                            <svg width="11" height="13" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.2 172.5 46.2 42.8 0 109.6-49 192.8-49 31.2 0 134.2 2.9 209.4 100.5zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                            </svg>
                            iPhone
                        </button>
                        </div>
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="min-h-0 w-7 h-[31px] flex-shrink-0 flex items-center justify-center transition-opacity active:opacity-70"
                            aria-label="검색"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
                            </svg>
                        </button>
                        <button
                            onClick={() => setMenuOpen(true)}
                            className="min-h-0 w-7 h-[31px] flex-shrink-0 flex flex-col items-center justify-center gap-[4px] transition-opacity active:opacity-70"
                            aria-label="메뉴 열기"
                        >
                            <span className="block w-4 h-[2px] bg-white rounded-none"></span>
                            <span className="block w-4 h-[2px] bg-white rounded-none"></span>
                            <span className="block w-4 h-[2px] bg-white rounded-none"></span>
                        </button>
                    </div>
                </header>

                {/* Category Tab Navigation */}
                <div className="mt-[2px] border-b border-white/10 w-full">
                    <div className="relative flex items-center w-full px-3" onMouseLeave={() => setHoverIdx(null)}>
                        {TABS.map((tab, i) => (
                            <Link
                                key={tab.path}
                                to={tab.path}
                                ref={el => tabRefs.current[i] = el}
                                onMouseEnter={() => setHoverIdx(i)}
                                className={`min-h-0 h-[31px] flex-1 flex items-center justify-center py-[5px] text-[14px] tracking-tight transition-colors ${
                                    i === (activeIdx >= 0 ? activeIdx : 0) ? 'font-black text-white' : 'font-bold text-white/85 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </Link>
                        ))}
                        {/* 슬라이딩 언더바 */}
                        <motion.div
                            className="absolute bottom-0 h-[2px] bg-orange-500"
                            animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                        />
                    </div>
                </div>
            </div>

            {/* 🔍 검색 오버레이 */}
            <AnimatePresence>
                {searchOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-[300] flex flex-col" style={{ background: 'rgba(10,11,15,0.97)', backdropFilter: 'blur(12px)' }}>
                        <div className="flex items-center gap-3 px-4 border-b border-white/8" style={{ paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))', paddingBottom: 12 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40 flex-shrink-0">
                                <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
                            </svg>
                            <input ref={searchInputRef} value={query} onChange={e => setQuery(e.target.value)}
                                placeholder="도서, 저자, 영상 검색..." className="flex-1 bg-transparent text-white text-[16px] font-medium outline-none placeholder:text-white/25"/>
                            <button onClick={() => setSearchOpen(false)} className="text-white/40 hover:text-white transition-colors">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            {!query.trim() && (
                                <div className="space-y-6 mt-2">
                                    {/* 1. 투데이 컨텐츠 */}
                                    {todayBooks.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">투데이 컨텐츠</p>
                                            <div className="flex flex-col gap-1">
                                                {todayBooks.map(book => (
                                                    <button key={book.id} onClick={() => handleBookClick(book)}
                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        {book.cover
                                                            ? <img src={book.cover} alt={book.title} className="w-9 h-12 object-cover rounded-md flex-shrink-0"/>
                                                            : <div className="w-9 h-12 rounded-md flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}><span className="material-symbols-outlined text-orange-400 text-[16px]">menu_book</span></div>}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-[13px] font-bold truncate">{book.title}</p>
                                                            <p className="text-white/40 text-[11px] mt-0.5 truncate">{book.author}</p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-orange-400 text-[18px] flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* 2. 최다 조회 아카이뷰 */}
                                    {popularArchives.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">최다 조회 아카이뷰</p>
                                            <div className="flex flex-col gap-1">
                                                {popularArchives.slice(0, 2).map(book => (
                                                    <button key={book.id} onClick={() => handleBookClick(book)}
                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        {book.cover
                                                            ? <img src={book.cover} alt={book.title} className="w-9 h-12 object-cover rounded-md flex-shrink-0"/>
                                                            : <div className="w-9 h-12 rounded-md flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}><span className="material-symbols-outlined text-orange-400 text-[16px]">menu_book</span></div>}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-[13px] font-bold truncate">{book.title}</p>
                                                            <p className="text-white/40 text-[11px] mt-0.5 truncate">{book.author}</p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-orange-400 text-[18px] flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* 3. 아카이뷰 오리지널 */}
                                    {originalBooks.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">아카이뷰 오리지널</p>
                                            <div className="flex flex-col gap-1">
                                                {originalBooks.map(book => (
                                                    <button key={book.id} onClick={() => handleBookClick(book)}
                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full" style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.12)' }}>
                                                        {book.cover
                                                            ? <img src={book.cover} alt={book.title} className="w-9 h-12 object-cover rounded-md flex-shrink-0"/>
                                                            : <div className="w-9 h-12 rounded-md flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}><span className="material-symbols-outlined text-orange-400 text-[16px]">auto_stories</span></div>}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-0.5">ORIGINAL</p>
                                                            <p className="text-white text-[13px] font-bold truncate">{book.title}</p>
                                                            <p className="text-white/40 text-[11px] mt-0.5 truncate">{book.author}</p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-orange-400 text-[18px] flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {!todayBooks.length && !popularArchives.length && !originalBooks.length && (
                                        <p className="text-white/20 text-[13px] text-center mt-12">도서 제목, 저자명, 영상 제목으로 검색하세요</p>
                                    )}
                                </div>
                            )}
                            {query.trim() && !hasResults && <p className="text-white/20 text-[13px] text-center mt-12">검색 결과가 없습니다</p>}
                            {results.books.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">도서</p>
                                    <div className="flex flex-col gap-1">
                                        {results.books.map(book => (
                                            <button key={book.id} onClick={() => handleBookClick(book)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                {book.cover ? <img src={book.cover} alt={book.title} className="w-9 h-12 object-cover rounded-md flex-shrink-0"/>
                                                    : <div className="w-9 h-12 rounded-md flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}><span className="material-symbols-outlined text-orange-400 text-[16px]">menu_book</span></div>}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-[13px] font-bold truncate">{book.title}</p>
                                                    <p className="text-white/40 text-[11px] mt-0.5 truncate">{book.author}</p>
                                                </div>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 flex-shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {results.videos.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">유튜브</p>
                                    <div className="flex flex-col gap-1">
                                        {results.videos.map((v, i) => {
                                            const vid = v.videoId || v.id || (v.url||'').match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1];
                                            return (
                                                <button key={i} onClick={() => handleVideoClick(v)}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    {vid ? <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt={v.title} className="w-14 h-9 object-cover rounded-md flex-shrink-0"/>
                                                        : <div className="w-14 h-9 rounded-md flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,0,0,0.15)' }}><span className="material-symbols-outlined text-red-400 text-[16px]">play_circle</span></div>}
                                                    <p className="flex-1 text-white text-[13px] font-bold line-clamp-2 leading-tight">{v.title}</p>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 flex-shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🍔 Side Drawer */}
            {menuOpen && (
                <div className="fixed inset-0 z-[200] flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
                    <div className="relative ml-auto w-[280px] h-full bg-[#0d0f15] flex flex-col overflow-y-auto" style={{ maxWidth: '80vw' }}>
                        <div className="flex items-center justify-between px-5 pt-8 pb-6 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="flex items-end h-[16px] gap-[2px]">
                                    <div className="w-[3px] h-[8px] bg-orange-400 rounded-none" />
                                    <div className="w-[3px] h-[14px] bg-orange-400 rounded-none" />
                                    <div className="w-[3px] h-[16px] bg-orange-400 rounded-none" />
                                    <div className="w-[3px] h-[10px] bg-orange-400 rounded-none" />
                                    <div className="w-[3px] h-[13px] bg-orange-400 rounded-none" />
                                </div>
                                <span className="text-[17px] font-black tracking-tight uppercase text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>ARCHIVIEW</span>
                            </div>
                            <button onClick={() => setMenuOpen(false)} className="flex items-center justify-center w-11 h-11 -mr-2 text-white/50 hover:text-white active:text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        <div className="px-5 pt-5 pb-3">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">카테고리</p>
                            <div className="flex flex-col gap-1">
                                {[
                                    { label: '자기계발', path: '/category/SELF_DEV', icon: 'trending_up' },
                                    { label: '경제',     path: '/category/ECONOMY',    icon: 'bar_chart' },
                                    { label: '경영',     path: '/category/MANAGEMENT', icon: 'business' },
                                    { label: '인문',     path: '/category/HUMANITIES', icon: 'history_edu' },
                                    { label: '심리',     path: '/category/PSYCHOLOGY', icon: 'psychology' },
                                ].map(cat => (
                                    <Link key={cat.path} to={cat.path} onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                                        <span className="material-symbols-outlined text-orange-400 text-[18px]">{cat.icon}</span>
                                        <span className="text-[14px] font-bold text-white">{cat.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="mx-5 h-px bg-white/10 my-2" />

                        <div className="px-5 pt-3 pb-8 flex flex-col gap-1">
                            {[
                                { label: '에디토리얼', path: '/editorial' },
                                { label: '지식 인사이트', path: '/insights' },
                                { label: '서재',        path: '/library' },
                                { label: '기록노트',    path: '/reading-notes' },
                                { label: '프로필',      path: '/profile' },
                            ].map(item => (
                                <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)}
                                    className="px-3 py-2 text-[13px] text-white/40 hover:text-white/70 transition-colors">
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 📱 Android 설치 모달 */}
            {showAndroidModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }} onClick={() => setShowAndroidModal(false)}>
                    <div className="w-full max-w-[320px] rounded-2xl overflow-hidden" style={{ background: '#1a1a2a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-xl overflow-hidden flex-shrink-0">
                                    <img src="/app-icon2.png" alt="Archiview" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-white/60 text-[11px] font-bold">아카이뷰 앱 설치</span>
                            </div>
                            <button onClick={() => setShowAndroidModal(false)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <span className="material-symbols-outlined text-white/50 text-[13px]">close</span>
                            </button>
                        </div>
                        <div className="px-4 py-3 text-center">
                            <p className="text-white font-bold text-[13px] leading-relaxed">
                                아카이뷰 서비스를 쉽고 편하게<br />
                                이용하시려면 <span style={{ color: '#3ddc84' }}>"홈화면에 추가"</span>를<br />
                                하신 후 이용하시기 바랍니다.
                            </p>
                        </div>
                        <div className="mx-3 mb-2 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 text-white" style={{ background: '#1db954' }}>1</div>
                                <p className="text-white text-[11px] font-bold">크롬으로 접속 후 우측 상단 ⋮ 탭</p>
                            </div>
                            <div className="px-3 py-2">
                                <div className="rounded-lg overflow-hidden" style={{ background: '#111' }}>
                                    <div className="px-3 py-1.5 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                        <div className="flex-1 rounded px-2 py-1 text-[9px] text-white/30 font-mono" style={{ background: 'rgba(255,255,255,0.06)' }}>archiview.store</div>
                                        <div className="flex flex-col gap-[3px] px-1">
                                            {[0,1,2].map(i => <div key={i} className="w-[3px] h-[3px] rounded-full" style={{ background: '#3ddc84', boxShadow: i===2?'0 0 6px rgba(61,220,132,0.8)':undefined }} />)}
                                        </div>
                                    </div>
                                    <div className="px-3 py-2">
                                        <div className="rounded px-3 py-1.5 text-[10px] font-bold" style={{ background: 'rgba(61,220,132,0.15)', border: '1px solid rgba(61,220,132,0.3)', color: '#3ddc84' }}>
                                            앱 설치 / 홈 화면에 추가 👆
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mx-3 mb-3 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 text-white" style={{ background: '#1db954' }}>2</div>
                                <p className="text-white text-[11px] font-bold">"설치" 탭 → 홈화면에 아이콘 추가</p>
                            </div>
                            <div className="px-3 py-2.5 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                                    <img src="/app-icon2.png" alt="icon" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="text-white text-[11px] font-bold">Archiview</p>
                                    <p className="text-white/40 text-[10px] mt-0.5">홈화면에 추가되면 앱처럼 실행됩니다</p>
                                </div>
                                <div className="ml-auto w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#1db954,#0a8a3a)' }}>
                                    <span className="material-symbols-outlined text-white text-[14px]">add</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-3 pb-4">
                            <button onClick={() => setShowAndroidModal(false)} className="w-full py-3 rounded-xl text-[13px] font-black text-white" style={{ background: 'linear-gradient(135deg,#1db954,#0a8a3a)' }}>
                                확인했습니다
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 📱 아이폰 홈화면 추가 모달 */}
            {showIphoneModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }} onClick={() => setShowIphoneModal(false)}>
                    <div className="w-full max-w-[320px] rounded-2xl overflow-hidden" style={{ background: '#1a1a2a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-xl overflow-hidden flex-shrink-0">
                                    <img src="/app-icon2.png" alt="Archiview" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-white/60 text-[11px] font-bold">아카이뷰 앱 설치</span>
                            </div>
                            <button onClick={() => setShowIphoneModal(false)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <span className="material-symbols-outlined text-white/50 text-[13px]">close</span>
                            </button>
                        </div>
                        <div className="px-4 py-3 text-center">
                            <p className="text-white font-bold text-[13px] leading-relaxed">
                                아카이뷰 서비스를 쉽고 편하게<br />
                                이용하시려면 <span style={{ color: '#4fc3f7' }}>"홈화면에 추가"</span>를<br />
                                하신 후 이용하시기 바랍니다.
                            </p>
                        </div>
                        <div className="mx-3 mb-2 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 text-white" style={{ background: '#0288d1' }}>1</div>
                                <p className="text-white text-[11px] font-bold">사파리로 접속 후 하단 공유 버튼 탭</p>
                            </div>
                            <div className="px-3 py-2">
                                <div className="rounded-lg overflow-hidden" style={{ background: '#111' }}>
                                    <div className="px-3 py-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                        <div className="rounded px-2 py-1 text-[9px] text-white/30 font-mono" style={{ background: 'rgba(255,255,255,0.06)' }}>archiview.store</div>
                                    </div>
                                    <div className="flex items-center justify-around px-2 py-1.5">
                                        {['arrow_back_ios','arrow_forward_ios','','bookmark','tab'].map((icon, i) => (
                                            i === 2 ? (
                                                <div key={i} className="flex flex-col items-center gap-0.5">
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#4fc3f7,#0288d1)', boxShadow: '0 0 10px rgba(79,195,247,0.5)' }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2l-4 4h3v8h2V6h3l-4-4zm-7 14v4h14v-4h-2v2H7v-2H5z"/></svg>
                                                    </div>
                                                    <span className="text-[7px] font-bold" style={{ color: '#4fc3f7' }}>공유</span>
                                                </div>
                                            ) : (
                                                <span key={i} className="material-symbols-outlined text-white/25 text-[15px]">{icon}</span>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mx-3 mb-3 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 text-white" style={{ background: '#0288d1' }}>2</div>
                                <p className="text-white text-[11px] font-bold">"홈 화면에 추가" 선택 → "추가" 탭</p>
                            </div>
                            <div className="px-3 py-2">
                                <div className="rounded-lg overflow-hidden" style={{ background: '#1e1e22' }}>
                                    {['AirDrop으로 공유', '메시지', '메일'].map((item, i) => (
                                        <div key={i} className="px-3 py-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                            <span className="text-white/25 text-[10px]">{item}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'rgba(79,195,247,0.1)' }}>
                                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#4fc3f7,#0288d1)' }}>
                                            <span className="material-symbols-outlined text-white text-[12px]">add_box</span>
                                        </div>
                                        <span className="text-[12px] font-black" style={{ color: '#4fc3f7' }}>홈 화면에 추가</span>
                                        <span className="ml-auto text-[14px]">👆</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-3 pb-4">
                            <button onClick={() => setShowIphoneModal(false)} className="w-full py-3 rounded-xl text-[13px] font-black text-white" style={{ background: 'linear-gradient(135deg,#4fc3f7,#0288d1)' }}>
                                확인했습니다
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
