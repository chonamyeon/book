import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { celebrities } from '../data/celebrities';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { useBookData } from '../hooks/useBookData';
import { useAudio } from '../contexts/AudioContext';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import TopNavigation from '../components/TopNavigation';
import InsightBanner from '../components/InsightBanner';
import BookCardActions from '../components/BookCardActions';
import { availableAudio } from '../data/availableAudio';
import { adsenseBooks, ADSENSE_CATEGORIES } from '../data/adsense/books';
import AdSenseAd from '../components/AdSenseAd';
import { prefetchStory } from './AdSense/StaticReview';
import KakaoAdFit from '../components/KakaoAdFit';

const ADSENSE_CACHE_KEY = 'archiview_adsense_books_cache';
const loadAdsenseCache = () => {
    try {
        const raw = localStorage.getItem(ADSENSE_CACHE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

// abstract/ 폴더 AI 이미지 32개 — 책 카드에 순서대로 1:1 배정 (중복 없음)
const ABSTRACT_IMGS = [
    '/images/abstract/abstract_growth_1774340473886.png',
    '/images/abstract/abstract_time_1774340492359.png',
    '/images/abstract/abstract_focus_1774340509108.png',
    '/images/abstract/abstract_leadership_1774340524825.png',
    '/images/abstract/abstract_wealth_1774340543117.png',
    '/images/abstract/abstract_innovation_1774340633247.png',
    '/images/abstract/abstract_mind_1774340653121.png',
    '/images/abstract/abstract_success_1774340670143.png',
    '/images/abstract/abstract_balance_1774340684379.png',
    '/images/abstract/abstract_resilience_1774340701546.png',
    '/images/abstract/media__1774334607773.png',
    '/images/abstract/media__1774335323428.png',
    '/images/abstract/media__1774336178459.png',
    '/images/abstract/media__1774336238691.png',
    '/images/abstract/media__1774336338995.png',
    '/images/abstract/media__1774336549186.png',
    '/images/abstract/media__1774336558066.png',
    '/images/abstract/media__1774336587688.png',
    '/images/abstract/media__1774337182114.png',
    '/images/abstract/media__1774337290527.png',
    '/images/abstract/media__1774337721563.png',
    '/images/abstract/media__1774338027907.png',
    '/images/abstract/media__1774338075960.png',
    '/images/abstract/media__1774338109653.png',
    '/images/abstract/media__1774338171858.png',
    '/images/abstract/media__1774338275595.png',
    '/images/abstract/media__1774339536472.png',
    '/images/abstract/media__1774339732271.png',
    '/images/abstract/media__1774339904643.png',
    '/images/abstract/media__1774339907931.png',
    '/images/abstract/media__1774340668703.png',
    '/images/abstract/media__1774340993253.png',
];

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { getAllBooks, loading: booksLoading } = useBookData();
    const { playPodcastMP3, podcastPlaying, podcastInfo, openScriptModal } = useAudio();
    const [isScrolled, setIsScrolled] = useState(false);
    const [showAllCelebs, setShowAllCelebs] = useState(false);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedBookId, setExpandedBookId] = useState(null);
    const [combinedAdsenseBooks, setCombinedAdsenseBooks] = useState(() => loadAdsenseCache());

    const getAudioDurationMin = (podcastFile) => {
        if (!podcastFile) return 15;
        const fileName = podcastFile.split('/').pop();
        const duration = availableAudio[fileName];
        return Math.ceil((duration || 900) / 60);
    };

    const getAudioDurationFormatted = (book) => {
        if (!book) return "15:00";
        let duration = null;

        // helper to safely check availableAudio keys (case-insensitive)
        const findDuration = (filename) => {
            if (!filename) return null;
            const key = String(filename).toLowerCase();
            return availableAudio[key] || availableAudio[`${key}.mp3`];
        };

        if (book.podcastFile) duration = findDuration(book.podcastFile.split('/').pop());
        if (!duration && book.audioPath) duration = findDuration(book.audioPath.split('/').pop());
        if (!duration && book.voiceAudioUrl) duration = findDuration(book.voiceAudioUrl.split('/').pop());
        if (!duration && book.audioUrl) duration = findDuration(book.audioUrl.split('/').pop());
        if (!duration && book.id) duration = findDuration(book.id);

        if (!duration) return "15:00";

        const m = Math.floor(duration / 60);
        const s = Math.floor(duration % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const cleanText = (t) => {
        if (!t) return "";
        return t.replace(/\[GEMINI [\d.]+ ANALYSIS\]/gi, '')
            .replace(/팟캐스트 대본 제작을 위한/g, '')
            .replace(/[#*]/g, '')
            .replace(/---/g, '')
            .trim();
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const userReviews = [
        { name: "3년차 마케터", text: "출퇴근 시간이 낭비되지 않아 너무 좋아요. 15분 만에 핵심만 듣고 출근합니다." },
        { name: "스타트업 CEO", text: "매주 선별된 책이 카톡으로 오니까 무슨 책을 읽을지 고민할 필요가 없습니다." },
        { name: "프로덕트 매니저", text: "팟캐스트를 듣고 나니 원작 내용이 너무 궁금해져서 바로 책을 주문했어요." },
        { name: "프리랜서 디자이너", text: "오디오와 요약 텍스트를 함께 볼 수 있어서 이해가 훨씬 빠르고 남는 게 많아요." },
        { name: "5년차 기획자", text: "요즘 번아웃이 와서 우울하고 무기력했는데, 퇴근길에 들으면서 큰 위로가 되었습니다." },
        { name: "영업 팀장", text: "바빠서 책 읽을 엄두를 못 냈는데, 짧은 시간 안에 제 성장에 진짜 큰 도움이 되고 있어요." },
        { name: "7년차 인사담당자", text: "라디오 듣는 것처럼 편안하게 넘어가는데 머릿속에 남는 인사이트는 묵직합니다." },
        { name: "신입 사원", text: "단순히 책을 요약하는 게 아니라, 실제 내 상황에 어떻게 적용할지 알려줘서 최고예요." },
        { name: "웹 개발자", text: "매주 알람이 울리면 오늘은 어떤 책이 왔을까 기대됩니다. 요즘 제 최애 앱이에요." },
        { name: "은행원", text: "인문학, 심리학까지 평소 내가 잘 안 읽던 분야도 부담 없이 넓게 접할 수 있어서 좋습니다." }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setReviewIndex((prev) => (prev + 1) % userReviews.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [userReviews.length]);

    const categories = [
        { label: "일이 손에 안 잡히고 지칠 때", subLabel: "(번아웃 & 커리어 슬럼프)", img: '/images/cat_burnout_v10.png', id: 'BURNOUT' },
        { label: "내 가치를 증명하고 부를 쌓고 싶을 때", subLabel: "(연봉협상 & 경제적 자유)", img: '/images/cat_wealth_v11.png', id: 'WEALTH' },
        { label: "마음이 답답하고 위로가 필요할 때", subLabel: "(우울 & 고독 & 치유)", img: '/images/cat_healing_v8.png', id: 'HEALING' },
        { label: "어떻게 살아야 할지 막막할 때", subLabel: "(자아성찰 & 인생철학)", img: '/images/cat_philosophy_v8.png', id: 'PHILOSOPHY' }
    ];

    // Memoized all books for efficiency
    const allBooks = useMemo(() => {
        const merged = getAllBooks();
        // Remove duplicates by title
        return merged.filter((book, i, arr) => arr.findIndex(b => b.title === book.title) === i);
    }, [getAllBooks]);

    const originalContents = useMemo(() => {
        return allBooks.filter(b => (b.id?.includes('framework') || b.id?.includes('original')));
    }, [allBooks]);

    // Mapping for Category Chips to Category Page IDs
    const navCategories = [
        { id: 'NOW', label: 'NOW' },
        { id: 'SELF_DEV', label: '자기계발' },
        { id: 'ECONOMY', label: '경제' },
        { id: 'MANAGEMENT', label: '경영' },
        { id: 'HUMANITIES', label: '인문' },
        { id: 'PSYCHOLOGY', label: '심리' }
    ];


    const [activeNav, setActiveNav] = useState('NOW');
    const [hoveredNav, setHoveredNav] = useState(null);

    // ── static data 섹션 데이터 ──────────────────────────────────────────
    const [weeklyFocusRaw, setWeeklyFocusRaw] = useState(() => {
        try { return JSON.parse(localStorage.getItem('wf_cache') || '[]'); } catch { return []; }
    });
    const [weeklyMostViewedRaw, setWeeklyMostViewedRaw] = useState([]);
    const [popularArchives, setPopularArchives] = useState([
        { id: "wealth-way", title: "부자들이 돈을 보는 방식", listens: "12.4k" },
        { id: "decision-making", title: "억만장자의 의사결정", listens: "10.1k" },
        { id: "warren-buffett", title: "워런 버핏 사고법", listens: "8.9k" },
        { id: "leverage", title: "레버리지: 부의 추월차선", listens: "7.5k" },
        { id: "story-power", title: "스토리의 힘", listens: "6.8k" },
    ]);

    // 정적 번들 + 로컬 캐시만 사용 (Vercel 미사용)
    useEffect(() => {
        const cached = loadAdsenseCache();
        if (cached.length > 0) setCombinedAdsenseBooks(cached);
        else setCombinedAdsenseBooks([...adsenseBooks]);
    }, []);

    useEffect(() => {
        try {
            const wmv = localStorage.getItem('weekly_most_viewed_cache');
            if (wmv) {
                const books = JSON.parse(wmv);
                if (books?.length) setWeeklyMostViewedRaw(books);
            }
        } catch { /* ignore */ }
    }, []);

    const enrich = (list) => list.map(item => {
        const bookData = allBooks.find(b => b.id === item.id) || {};
        return { ...bookData, ...item, cover: item.cover || bookData.cover || '', purchaseLink: item.purchaseLink || bookData.purchaseLink || '', author: item.author || bookData.author || '' };
    });

    const enrichedPopularArchives = useMemo(() => enrich(popularArchives), [popularArchives, allBooks]);

    // Weekly Focus: 캐시 우선 표시 → allBooks 로드 후 enriched 버전으로 교체
    const weeklyFocusBooks = useMemo(() => {
        if (weeklyFocusRaw.length > 0) {
            const enriched = enrich(weeklyFocusRaw);
            // allBooks가 로드된 경우에만 enriched 캐시 갱신
            if (allBooks.length > 0) {
                try { localStorage.setItem('wf_enriched_cache', JSON.stringify(enriched)); } catch { }
                return enriched;
            }
            // allBooks 아직 로딩 중 → enriched 캐시 사용
            try {
                const cached = JSON.parse(localStorage.getItem('wf_enriched_cache') || '[]');
                if (cached.length > 0) return cached;
            } catch { }
            return enriched;
        }
        return allBooks.filter(b => b.section === 'WEEKLY_FOCUS').sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).slice(0, 5);
    }, [weeklyFocusRaw, allBooks]);

    // 주간 최다조회: static data 데이터 우선, 없으면 popular_archives fallback
    const enrichedWeeklyMostViewed = useMemo(() => {
        if (weeklyMostViewedRaw.length > 0) return enrich(weeklyMostViewedRaw);
        return enrichedPopularArchives;
    }, [weeklyMostViewedRaw, enrichedPopularArchives, allBooks]);

    const addToLibrary = (book) => {
        const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
        if (saved.some(b => b.title === book.title)) {
            alert('이미 서재에 보관된 도서입니다.');
            return;
        }
        const updated = [...saved, { id: book.id, title: book.title, author: book.author, cover: book.cover }];
        localStorage.setItem('savedBooks', JSON.stringify(updated));
        window.dispatchEvent(new Event('savedBooksUpdated'));
        alert('서재에 보관되었습니다. ✅');
    };

    const experts = [
        { name: "James Clear", role: "Habit Expert", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" },
        { name: "Naval", role: "Philosophy & Wealth", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop" },
        { name: "Morgan Housel", role: "Psychology of Money", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop" }
    ];

    const sectionVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    const CAT_THEME = {
        SELF_DEV:   { gradient: 'from-blue-500 to-blue-700',      icon: 'rocket_launch',   bar: '#3b82f6', badge: 'text-blue-500 border-blue-200',    btn: 'text-blue-500 border-blue-200 hover:bg-blue-500 hover:text-white',    dot: 'bg-blue-500' },
        ECONOMY:    { gradient: 'from-amber-400 to-amber-600',     icon: 'payments',        bar: '#f59e0b', badge: 'text-amber-500 border-amber-200',   btn: 'text-amber-500 border-amber-200 hover:bg-amber-500 hover:text-white',   dot: 'bg-amber-500' },
        MANAGEMENT: { gradient: 'from-violet-500 to-violet-700',   icon: 'business_center', bar: '#8b5cf6', badge: 'text-violet-500 border-violet-200',  btn: 'text-violet-500 border-violet-200 hover:bg-violet-500 hover:text-white',  dot: 'bg-violet-500' },
        HUMANITIES: { gradient: 'from-rose-500 to-rose-700',       icon: 'history_edu',     bar: '#f43f5e', badge: 'text-rose-500 border-rose-200',     btn: 'text-rose-500 border-rose-200 hover:bg-rose-500 hover:text-white',     dot: 'bg-rose-500' },
        PSYCHOLOGY: { gradient: 'from-emerald-500 to-emerald-700', icon: 'psychology',      bar: '#10b981', badge: 'text-emerald-500 border-emerald-200', btn: 'text-emerald-500 border-emerald-200 hover:bg-emerald-500 hover:text-white', dot: 'bg-emerald-500' },
    };

    const sideNavItems = [
        { id: 'NOW',        label: '전체',    icon: 'home' },
        { id: 'SELF_DEV',   label: '자기계발', icon: 'rocket_launch' },
        { id: 'ECONOMY',    label: '경제',    icon: 'payments' },
        { id: 'MANAGEMENT', label: '경영',    icon: 'business_center' },
        { id: 'HUMANITIES', label: '인문',    icon: 'history_edu' },
        { id: 'PSYCHOLOGY', label: '심리',    icon: 'psychology' },
    ];

    const trendingKeywords = ['한강 작가 노벨상', '자기계발 베스트셀러', '경제경영 추천', '심리학 입문', '철학 고전'];

    // celebrities.js의 모든 책을 flat하게 추출 (id 기준 중복 제거)
    const celebBooks = useMemo(() => {
        const seen = new Set();
        const list = [];
        for (const celeb of celebrities) {
            for (const b of (celeb.books || [])) {
                if (!b.id || seen.has(b.id)) continue;
                seen.add(b.id);
                list.push({ ...b });
            }
        }
        return list;
    }, []);

    // static data/adsenseBooks ID 셋 (우선순위 높음)
    const staticDataIds = useMemo(() => new Set(combinedAdsenseBooks.map(b => b.id)), [combinedAdsenseBooks]);

    // 전체 책 목록: static data 우선, celebrities 보완
    const allDisplayBooks = useMemo(() => {
        const celebOnly = celebBooks.filter(b => !staticDataIds.has(b.id));
        return [...combinedAdsenseBooks, ...celebOnly];
    }, [combinedAdsenseBooks, celebBooks, staticDataIds]);

    const filteredBooks = useMemo(() => {
        const seenTitles = new Set();
        let books = allDisplayBooks.filter(b => {
            if (!b.title) return false;
            if (seenTitles.has(b.title)) return false;
            seenTitles.add(b.title);
            if (activeNav === 'NOW') return true;
            const bCat = b.category || '';
            if (activeNav === 'SELF_DEV') return bCat.includes('자기계발');
            if (activeNav === 'ECONOMY') return bCat.includes('경제');
            if (activeNav === 'MANAGEMENT') return bCat.includes('경영');
            if (activeNav === 'HUMANITIES') return bCat.includes('인문');
            if (activeNav === 'PSYCHOLOGY') return bCat.includes('심리');
            return true;
        });
        if (searchTerm.trim()) {
            books = books.filter(b =>
                b.title?.includes(searchTerm) || b.author?.includes(searchTerm) || b.category?.includes(searchTerm)
            );
        }
        return books;
    }, [allDisplayBooks, activeNav, searchTerm]);

    return (
        <div className="bg-slate-50 text-gray-900 font-sans antialiased min-h-screen">
            <Helmet>
                <title>Whiteboard — 성공한 사람들의 인사이트를 읽다</title>
                <meta name="description" content="자기계발·경제·경영·인문·심리 분야 베스트셀러의 독창적인 비평과 실전 인사이트." />
                <link rel="canonical" href="https://archiview.shop" />
            </Helmet>
            <style>{`
                @keyframes wave1 { 0%,100%{height:8px} 50%{height:14px} }
                @keyframes wave2 { 0%,100%{height:14px} 50%{height:20px} }
                @keyframes wave3 { 0%,100%{height:20px} 50%{height:14px} }
                @keyframes wave4 { 0%,100%{height:10px} 50%{height:18px} }
                @keyframes wave5 { 0%,100%{height:16px} 50%{height:10px} }
                .wv1{animation:wave1 1s ease-in-out infinite}
                .wv2{animation:wave2 1.2s ease-in-out infinite .1s}
                .wv3{animation:wave3 .9s ease-in-out infinite .2s}
                .wv4{animation:wave4 1.1s ease-in-out infinite .3s}
                .wv5{animation:wave5 1s ease-in-out infinite .4s}
            `}</style>

            <TopNavigation searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

            <div className="flex pt-16 min-h-screen">

                {/* Left Sidebar */}
                <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 p-6 flex flex-col gap-y-3 bg-white border-r border-slate-200 hidden lg:flex overflow-y-auto">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">카테고리</div>
                    <nav className="flex flex-col gap-y-0.5">
                        {sideNavItems.map((item) => {
                            const isActive = activeNav === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveNav(item.id);
                                        if (item.id === 'NOW') window.scrollTo({ top: 0, behavior: 'smooth' });
                                        else {
                                            const el = document.getElementById('book-list');
                                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }
                                    }}
                                    className={`flex items-center gap-3 py-2 px-3 rounded-md transition-all text-left w-full ${
                                        isActive
                                            ? 'text-slate-900 font-semibold bg-slate-100 border-r-2 border-slate-900'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                    <span className="text-[13px]">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mt-4">
                        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">실시간 인기 키워드</div>
                        <div className="flex flex-col gap-y-2">
                            {trendingKeywords.map((kw, i) => (
                                <div key={i} className="flex items-center gap-2 px-1 cursor-pointer hover:text-blue-500 transition-colors">
                                    <span className={`font-bold text-xs w-4 ${i === 0 ? 'text-blue-500' : 'text-slate-400'}`}>{i + 1}</span>
                                    <span className="truncate text-[13px] text-slate-600">{kw}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </aside>

                {/* Main Content */}
                <main className="flex-1 lg:ml-64 xl:mr-72 bg-white min-h-screen">
                    <div className="max-w-[900px] mx-auto px-6 py-8">

                        {/* Hero Banner */}
                        <div className="mb-8 rounded-lg overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800">
                            <div className="px-8 py-10">
                                <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">Whiteboard</p>
                                <h1 className="text-white leading-tight mb-3 tracking-tight">
                                    <span className="font-black text-2xl md:text-3xl">당신의 인생에 스며든</span><br />
                                    <span className="font-light text-xl md:text-2xl">단 하나의 문장들</span>
                                </h1>
                                <p className="text-blue-100 text-sm leading-relaxed">
                                    자기계발·경제·경영·인문·심리 분야 베스트셀러 핵심 인사이트
                                </p>
                            </div>
                        </div>

                        {/* 광고 */}
                        <AdSenseAd className="mb-8" />

                        {/* Section Header */}
                        <div id="book-list" className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[15px] font-bold text-slate-900">
                                    {activeNav === 'NOW' ? '전체 도서 인사이트' : (sideNavItems.find(s => s.id === activeNav)?.label + ' 인사이트')}
                                </h2>
                                <span className="text-[11px] text-slate-400 font-medium">{filteredBooks.length}권</span>
                            </div>
                            <div className="flex items-center gap-3 text-[12px] text-slate-500">
                                <button className="text-blue-600 font-bold">최신순</button>
                                <button className="hover:text-slate-900">추천순</button>
                            </div>
                        </div>

                        {searchTerm.trim() && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700 flex items-center justify-between">
                                <span><span className="font-bold">"{searchTerm}"</span> 검색 결과 {filteredBooks.length}건</span>
                                <button onClick={() => setSearchTerm('')} className="text-blue-400 hover:text-blue-600">✕</button>
                            </div>
                        )}

                        {/* Book List */}
                        <div className="space-y-0">
                            {filteredBooks.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
                                    <p className="text-sm">검색 결과가 없습니다.</p>
                                </div>
                            ) : filteredBooks.map((book, idx) => {
                                const catKey =
                                    book.category?.includes('자기계발') ? 'SELF_DEV' :
                                    book.category?.includes('경제') ? 'ECONOMY' :
                                    book.category?.includes('경영') ? 'MANAGEMENT' :
                                    book.category?.includes('인문') ? 'HUMANITIES' :
                                    book.category?.includes('심리') ? 'PSYCHOLOGY' : 'SELF_DEV';
                                const theme = CAT_THEME[catKey];

                                return (
                                    <Link
                                        key={book.id || idx}
                                        to={`/story/${book.id}`}
                                        className="flex items-start gap-4 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors group px-2 -mx-2 rounded"
                                        onMouseEnter={() => book.id && prefetchStory(book.id)}
                                    >
                                        <span className="text-slate-300 font-bold text-sm w-5 text-right flex-shrink-0 pt-2">{idx + 1}</span>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] font-bold border px-1.5 py-0.5 uppercase tracking-tight rounded-sm ${theme.badge}`}>
                                                            {book.category?.split(' ')[0] || 'Essential'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-[14px] font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{book.title}</h3>
                                                    <p className="text-[12px] text-slate-500 mt-0.5">{book.author}</p>
                                                </div>
                                                <div className={`hidden sm:flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold border transition-all whitespace-nowrap flex-shrink-0 rounded-sm ${theme.btn}`}>
                                                    글보기
                                                    <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                                </div>
                                            </div>
                                            {book.desc && (
                                                <p className="text-[12px] text-slate-400 mt-1.5 line-clamp-1">{book.desc}</p>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {filteredBooks.length > 0 && (
                            <div className="mt-8 flex justify-center">
                                <Link
                                    to="/review-board"
                                    className="flex items-center gap-2 px-6 py-2.5 border border-slate-200 rounded text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                                >
                                    더 많은 도서 보기
                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </Link>
                            </div>
                        )}

                        {/* 광고 */}
                        <AdSenseAd className="mt-8 mb-4" />

                        <div className="mt-6 pb-24">
                            <Footer />
                        </div>
                    </div>
                </main>

                {/* Right Sidebar */}
                <aside className="hidden xl:block w-72 p-6 border-l border-slate-200 h-[calc(100vh-64px)] fixed right-0 top-16 overflow-y-auto bg-white">
                    <div className="mb-8">
                        <h4 className="text-[15px] font-bold mb-4 flex items-center gap-2 text-slate-900">
                            <span className="material-symbols-outlined text-blue-500 text-[20px]">trending_up</span> 인기 인사이트
                        </h4>
                        <div className="space-y-4">
                            {adsenseBooks.filter(b => b.fullReview).slice(0, 5).map((item, i) => (
                                <Link
                                    key={item.id}
                                    to={`/story/${item.id}`}
                                    className="group cursor-pointer block"
                                >
                                    <div className={`text-[11px] font-bold mb-1 ${i === 0 ? 'text-blue-500' : 'text-slate-400'}`}>BEST {i + 1}</div>
                                    <h5 className="text-[13px] font-bold text-slate-700 group-hover:text-blue-600 truncate transition-colors">{item.title}</h5>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] text-slate-400">{item.author}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-5">
                        <h4 className="text-[11px] font-bold text-blue-600 mb-2 uppercase tracking-wider">이용자 리뷰</h4>
                        <p className="text-[12px] text-slate-600 leading-relaxed italic">
                            "{userReviews[reviewIndex].text}"
                        </p>
                        <p className="text-[11px] text-blue-500 font-bold mt-2">— {userReviews[reviewIndex].name}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h4 className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">서비스 안내</h4>
                        <p className="text-[12px] text-slate-500 leading-relaxed">
                            Whiteboard는 도서 원문을 낭독하지 않으며, 각 도서의 핵심 철학을 분석한 독창적인 2차 창작물을 제공합니다.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-3">
                            <Link to="/about" className="text-[11px] text-blue-500 hover:underline">서비스 소개</Link>
                            <Link to="/privacy" className="text-[11px] text-blue-500 hover:underline">개인정보처리방침</Link>
                        </div>
                    </div>
                </aside>
            </div>

            <BottomNavigation />
        </div>
    );
}
