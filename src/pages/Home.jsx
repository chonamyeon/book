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
import InsightBanner from '../components/InsightBanner';
import BookCardActions from '../components/BookCardActions';
import { db } from '../firebase';
import { doc, onSnapshot, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { availableAudio } from '../data/availableAudio';
import { adsenseBooks, ADSENSE_CATEGORIES } from '../data/adsense/books';
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

    // ── Firestore 섹션 데이터 ──────────────────────────────────────────
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

    // 위클리포커스 스케줄 자동 적용
    useEffect(() => {
        const applySchedule = async () => {
            try {
                const snap = await getDoc(doc(db, 'site_config', 'weekly_focus_schedule'));
                if (!snap.exists()) return;
                const weeks = snap.data().weeks || [];
                const now = new Date();
                const activeWeek = [...weeks]
                    .filter(w => w.weekStart && new Date(w.weekStart) <= now && w.books?.length > 0)
                    .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart))[0];
                if (!activeWeek) return;
                const cur = await getDoc(doc(db, 'site_config', 'weekly_focus'));
                const curIds = (cur.data()?.books || []).map(b => b.id).join(',');
                const newIds = activeWeek.books.map(b => b.id).join(',');
                if (curIds !== newIds) {
                    await setDoc(doc(db, 'site_config', 'weekly_focus'), { books: activeWeek.books });
                }
            } catch { }
        };
        applySchedule();
    }, []);

    useEffect(() => {
        const unsub1 = onSnapshot(doc(db, 'site_config', 'popular_archives'), (snap) => {
            if (snap.exists() && snap.data().books?.length) setPopularArchives(snap.data().books);
        });

        // ── AdSense 도서: Firestore 전체 목록 기준 + 로컬 데이터 병합 ──
        const unsubAdsense = onSnapshot(collection(db, 'adsenseBooks'), (snap) => {
            try {
                // 로컬 도서를 title 기준으로 맵핑
                const localByTitle = {};
                adsenseBooks.forEach(b => { localByTitle[b.title] = b; });

                // Firestore 도서 전체 로드 (로컬 데이터 병합, Firestore 카테고리 우선)
                const firestoreBooks = snap.docs.map(d => {
                    const data = d.data();
                    const local = localByTitle[data.title] || {};
                    return { ...local, ...data, id: d.id };
                });

                // Firestore에 없는 로컬 도서도 포함
                const firestoreTitles = new Set(firestoreBooks.map(b => b.title));
                const localOnlyBooks = adsenseBooks.filter(b => !firestoreTitles.has(b.title));

                // title 기준 중복 제거 (Firestore 우선)
                const titleSeen = new Set();
                const books = [...firestoreBooks, ...localOnlyBooks].filter(b => {
                    if (titleSeen.has(b.title)) return false;
                    titleSeen.add(b.title);
                    return true;
                });
                setCombinedAdsenseBooks(books);
                try { localStorage.setItem(ADSENSE_CACHE_KEY, JSON.stringify(books)); } catch {}
            } catch (e) {
                console.error("Failed to sync live adsense books:", e);
                setCombinedAdsenseBooks([...adsenseBooks]);
            }
        });


        const unsub2 = onSnapshot(doc(db, 'site_config', 'weekly_focus'), (snap) => {
            if (snap.exists() && snap.data().books?.length) {
                const books = snap.data().books;
                setWeeklyFocusRaw(books);
                try { localStorage.setItem('wf_cache', JSON.stringify(books)); } catch { }
            }
        });
        const unsub3 = onSnapshot(doc(db, 'site_config', 'weekly_most_viewed'), (snap) => {
            if (snap.exists() && snap.data().books?.length) setWeeklyMostViewedRaw(snap.data().books);
        });
        return () => { unsub1(); unsubAdsense(); unsub2(); unsub3(); };
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

    // 주간 최다조회: Firestore 데이터 우선, 없으면 popular_archives fallback
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

    return (
        <div className="bg-black text-white font-sans antialiased min-h-screen flex flex-col relative overflow-x-hidden selection:bg-orange-500/30">
            <Helmet>
                <title>아카이뷰(ArchiView) — 성공한 사람들의 인사이트를 읽다</title>
                <meta name="description" content="자기계발·경제·경영·인문·심리 분야 베스트셀러의 독창적인 비평과 실전 인사이트. 에디터의 관점으로 성공한 사람들의 생각을 깊이 분석합니다." />
                <link rel="canonical" href="https://archiview.shop" />
            </Helmet>
            {/* Styles Injection for Glassmorphism */}
            <style>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .cursive-font {
                    font-family: 'Alex Brush', cursive;
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes wave1 { 0%,100%{height:8px} 50%{height:12px} }
                @keyframes wave2 { 0%,100%{height:12px} 50%{height:16px} }
                @keyframes wave3 { 0%,100%{height:16px} 50%{height:20px} }
                @keyframes wave4 { 0%,100%{height:10px} 50%{height:14px} }
                @keyframes wave5 { 0%,100%{height:14px} 50%{height:18px} }
                .wv1{animation:wave1 1s ease-in-out infinite}
                .wv2{animation:wave2 1.2s ease-in-out infinite .1s}
                .wv3{animation:wave3 .9s ease-in-out infinite .2s}
                .wv4{animation:wave4 1.1s ease-in-out infinite .3s}
                .wv5{animation:wave5 1s ease-in-out infinite .4s}
                @keyframes review-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
                .review-fade { animation: review-fade 0.4s ease forwards; }
            `}</style>

            <div className="w-full mx-auto flex-grow relative flex flex-col">
                {/* 🏠 Header Navigation */}
                <main className="flex-grow pb-32">
                    {/* Independent Header Area - Positioned above the image */}
                    <div className="bg-[#101218] px-4" style={{ paddingTop: 'calc(5px + env(safe-area-inset-top, 0px))', paddingBottom: 0 }}>

                        <header className="flex items-center justify-between mb-4 mt-2">
                            <Link to="/" className="flex-1 transition-opacity active:opacity-70 group flex justify-start">
                                <div className="flex items-center gap-[7px]">
                                    {/* 🔊 Gray Waveform Graphic Logo */}
                                    <div className="flex items-end h-[18px] gap-[2px] mr-1 pb-[2px]">
                                        <div className="wv1 w-[3px] bg-zinc-400" />
                                        <div className="wv2 w-[3px] bg-zinc-400" />
                                        <div className="wv3 w-[3px] bg-zinc-400" />
                                        <div className="wv4 w-[3px] bg-zinc-400" />
                                        <div className="wv5 w-[3px] bg-zinc-400" />
                                    </div>
                                    <span className="text-[19px] font-black tracking-[-0.03em] uppercase mt-0.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>ARCHIVIEW</span>
                                </div>
                            </Link>
                            {/* Search hidden by user request */}
                        </header>
                        {/* 🏷️ Dynamic Category Navigation Bar */}
                        <nav aria-label="카테고리 메뉴" className="flex mt-2" style={{ lineHeight: 1 }}
                            onMouseLeave={() => setActiveNav('NOW')}
                        >
                            {navCategories.map((cat) => (
                                <Link
                                    key={cat.id}
                                    to={cat.id === 'NOW' ? '/' : `/category/${cat.id}`}
                                    onMouseEnter={() => setActiveNav(cat.id)}
                                    onClick={(e) => {
                                        if (cat.id === 'NOW') {
                                            e.preventDefault();
                                            setActiveNav('NOW');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        } else {
                                            const el = document.getElementById(`category-${cat.id}`);
                                            if (el) {
                                                e.preventDefault();
                                                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                setActiveNav(cat.id);
                                            }
                                        }
                                    }}
                                    className="flex-1 font-semibold transition-all duration-200 relative text-center"
                                    style={{ fontSize: '14px', color: '#ffffff', padding: '8px 0 6px', lineHeight: 1, textDecoration: 'none' }}
                                >
                                    {cat.label}
                                    <span
                                        className="absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-200"
                                        style={{
                                            background: 'linear-gradient(90deg,#f97316,#fb923c)',
                                            opacity: activeNav === cat.id ? 1 : 0,
                                            transform: activeNav === cat.id ? 'scaleX(1)' : 'scaleX(0)',
                                            transformOrigin: 'center',
                                        }}
                                    />
                                </Link>
                            ))}
                        </nav>
                        <div className="h-px bg-white/15 w-full"></div>
                    </div>

                    {/* 🔎 Search Results Overlay */}
                    {searchTerm.trim().length > 0 && (
                        <div className="absolute top-[108px] left-0 right-0 z-[100] px-4">

                            <div className="bg-[#1a1d24] border border-white/10 shadow-2xl w-full max-h-[400px] overflow-y-auto overflow-x-hidden p-3 relative" style={{ borderRadius: '0', backdropFilter: 'blur(20px)' }}>
                                <h3 className="text-[12px] font-bold text-orange-400 mb-3 ml-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">search</span> 검색 결과
                                </h3>
                                {allBooks.filter(b => b.title?.includes(searchTerm) || b.author?.includes(searchTerm) || b.category?.includes(searchTerm)).length > 0 ? (
                                    <div className="flex flex-col gap-2 relative z-[101]">
                                        {allBooks.filter(b => b.title?.includes(searchTerm) || b.author?.includes(searchTerm) || b.category?.includes(searchTerm)).slice(0, 10).map((book, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => navigate(`/review-board/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)}
                                                className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
                                            >
                                                <div className="w-10 h-14 bg-zinc-800 shrink-0 overflow-hidden shadow-inner">
                                                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = '/images/hero_expert_v5.png' }} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-[13px] font-black text-white truncate leading-tight">{book.title}</h4>
                                                    <p className="text-[10px] text-gray-400 truncate mt-0.5 font-medium">{book.author}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-[12px] text-gray-500 font-bold relative z-[101]">검색 결과가 없습니다.</div>
                                )}
                            </div>
                        </div>
                    )}
                    <section id="hero-section" className="relative pt-0 pb-0 overflow-hidden" style={{ minHeight: '376px' }}>
                        {/* Full background image - face focused */}
                        <div className="absolute inset-0 z-0 overflow-hidden">
                            <img
                                src="/images/hero_expert_v5.png"
                                alt="전문가들이 엄선한 도서 인사이트를 듣는 사용자"
                                width={450}
                                height={376}
                                fetchpriority="high"
                                loading="eager"
                                decoding="async"
                                className="object-cover"
                                style={{
                                    width: '450px',
                                    height: '376px',
                                    objectPosition: 'right top'
                                }}
                            />
                            {/* Left solid → transparent: 텍스트 왼쪽, 얼굴 오른쪽 */}
                            <div className="absolute inset-0" style={{
                                background: 'linear-gradient(to right, #101218 35%, rgba(16,18,24,0.6) 60%, transparent 100%)'
                            }}></div>
                            {/* Bottom fade */}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent"></div>
                        </div>

                        {/* Hero Text Only */}
                        <div className="relative z-10 px-4 pt-5">

                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={sectionVariants}
                                className="mt-10 mb-6"
                                style={{ maxWidth: '60%' }}
                            >
                                <h1 className="font-black leading-[1.3] mb-5 tracking-tight">
                                    <span className="text-[29px]">출퇴근 15분,</span><br />
                                    <span className="text-[23px]">
                                        성공한 사람들의<br />
                                        <span className="flex items-center gap-[6px]">
                                            생각을 듣다
                                            <span className="inline-flex items-center gap-[2px] opacity-90 h-[24px]">
                                                <div className="wv1 w-[3px] bg-white rounded-sm" />
                                                <div className="wv2 w-[3px] bg-white rounded-sm" />
                                                <div className="wv3 w-[3px] bg-white rounded-sm" />
                                                <div className="wv4 w-[3px] bg-white rounded-sm" />
                                            </span>
                                        </span>
                                    </span>
                                </h1>
                                <p className="text-gray-300 text-[11px] font-medium leading-relaxed">
                                    책 한 권 읽을 시간 없는 직장인을 위한<br />오디오 인사이트 플랫폼
                                </p>
                            </motion.div>
                        </div>

                        {/* ⭐ Social Proof Section */}
                        <div className="relative z-10 px-4 pb-6 pt-0">

                            <div className="glass-card bg-zinc-900/40 border border-white/5 rounded-none p-4 text-center">
                                <div className="flex items-center justify-center gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className="material-symbols-outlined text-orange-500 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    ))}
                                </div>
                                <h3 className="text-[12px] font-black tracking-tight text-white mb-2 pb-1 relative z-10">이미 <span className="text-orange-500">15,400명</span>의 직장인들이 매일 아침 성장하고 있습니다.</h3>
                                
                                <div className="h-[44px] flex items-center justify-center overflow-hidden mb-2">
                                    <p key={reviewIndex} className="review-fade text-white text-[12px] font-bold leading-snug break-keep text-center px-2">
                                        "{userReviews[reviewIndex].text}" <span className="text-orange-500/70 text-[11px] font-black whitespace-nowrap ml-1">- {userReviews[reviewIndex].name}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── 사이트 소개 배너 ── */}
                        <div className="relative z-[20] px-1 mb-8">
                            <div className="bg-white/[0.03] border border-white/5 p-5">
                                <p className="text-[12px] text-white/50 leading-relaxed break-keep mb-4">
                                    아카이뷰는 자기계발·경제·경영·인문·심리 분야 세계적 베스트셀러의 핵심 인사이트를 오디오 콘텐츠로 제공하는 플랫폼입니다. 출퇴근 15분으로 매일 성장하세요.
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Link to="/about" className="flex items-center justify-center py-2.5 bg-white/5 border border-white/10 text-[12px] font-bold text-white/70 hover:text-white hover:border-orange-500/40 transition-colors text-center">서비스 소개</Link>
                                    <Link to="/contact" className="flex items-center justify-center py-2.5 bg-white/5 border border-white/10 text-[12px] font-bold text-white/70 hover:text-white hover:border-orange-500/40 transition-colors text-center">문의하기</Link>
                                    <Link to="/privacy" className="flex items-center justify-center py-2.5 bg-white/5 border border-white/10 text-[12px] font-bold text-white/70 hover:text-white hover:border-orange-500/40 transition-colors text-center">개인정보처리방침</Link>
                                    <Link to="/terms" className="flex items-center justify-center py-2.5 bg-white/5 border border-white/10 text-[12px] font-bold text-white/70 hover:text-white hover:border-orange-500/40 transition-colors text-center">이용약관</Link>
                                </div>
                            </div>
                        </div>

                        {/* 📍 [애드센스 심사용 지식 라이브러리 - 5대 카테고리 각 5권씩] 📍 */}
                        {(() => {
                            const CAT_THEME = {
                                SELF_DEV:   { gradient: 'from-blue-600 to-cyan-900',     icon: 'rocket_launch',   bar: '#3b82f6', hoverBorder: 'hover:border-blue-500/50',    titleHover: 'group-hover:text-blue-400',    badge: 'text-blue-400/80 border-blue-500/25',    btn: 'text-blue-400 border-blue-500/30 group-hover:bg-blue-500 group-hover:text-white',    dot: 'bg-blue-500' },
                                ECONOMY:    { gradient: 'from-amber-500 to-yellow-900',  icon: 'payments',        bar: '#f59e0b', hoverBorder: 'hover:border-amber-500/50',   titleHover: 'group-hover:text-amber-400',   badge: 'text-amber-400/80 border-amber-500/25',  btn: 'text-amber-400 border-amber-500/30 group-hover:bg-amber-500 group-hover:text-white',  dot: 'bg-amber-500' },
                                MANAGEMENT: { gradient: 'from-violet-600 to-purple-900', icon: 'business_center', bar: '#8b5cf6', hoverBorder: 'hover:border-violet-500/50',  titleHover: 'group-hover:text-violet-400',  badge: 'text-violet-400/80 border-violet-500/25', btn: 'text-violet-400 border-violet-500/30 group-hover:bg-violet-500 group-hover:text-white', dot: 'bg-violet-500' },
                                HUMANITIES: { gradient: 'from-rose-600 to-red-900',      icon: 'history_edu',     bar: '#f43f5e', hoverBorder: 'hover:border-rose-500/50',    titleHover: 'group-hover:text-rose-400',    badge: 'text-rose-400/80 border-rose-500/25',    btn: 'text-rose-400 border-rose-500/30 group-hover:bg-rose-500 group-hover:text-white',    dot: 'bg-rose-500' },
                                PSYCHOLOGY: { gradient: 'from-emerald-600 to-teal-900',  icon: 'psychology',      bar: '#10b981', hoverBorder: 'hover:border-emerald-500/50', titleHover: 'group-hover:text-emerald-400', badge: 'text-emerald-400/80 border-emerald-500/25', btn: 'text-emerald-400 border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white', dot: 'bg-emerald-500' },
                            };
                            const seenTitles = new Set();
                            return ADSENSE_CATEGORIES.map((cat) => {
                                const theme = CAT_THEME[cat.key] || CAT_THEME.SELF_DEV;
                                const displayBooks = combinedAdsenseBooks.filter(b => {
                                    const bCat = b.category || '';
                                    const match = (
                                        (cat.key === 'SELF_DEV' && bCat.includes('자기계발')) ||
                                        (cat.key === 'ECONOMY' && bCat.includes('경제')) ||
                                        (cat.key === 'MANAGEMENT' && bCat.includes('경영')) ||
                                        (cat.key === 'HUMANITIES' && bCat.includes('인문')) ||
                                        (cat.key === 'PSYCHOLOGY' && bCat.includes('심리'))
                                    );
                                    if (match && !seenTitles.has(b.title)) return true;
                                    return false;
                                });
                                displayBooks.forEach(b => seenTitles.add(b.title));
                                if (displayBooks.length === 0) return null;

                            return (
                                <div key={cat.key} className="relative z-[20] px-1 mb-16" id={`category-${cat.key}`}>
                                    <div className="flex items-center justify-between mb-6 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 rounded-full" style={{ background: theme.bar }}></div>
                                            <h2 className="text-[22px] font-black text-white tracking-tight flex items-center gap-2">
                                                {cat.label} <span className="text-zinc-500 font-medium text-[13px] ml-1">{cat.sub}</span>
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {displayBooks.map((book, bIdx) => {
                                            const targetLink = `/story/${book.id}`;
                                            const isExternal = false;
                                            const linkProps = { to: targetLink };
                                            const Component = Link;

                                            return (
                                                <Component
                                                    key={book.id || bIdx}
                                                    {...linkProps}
                                                    className={`flex flex-col bg-[#16181d] border border-white/5 ${theme.hoverBorder} transition-all duration-300 group relative`}
                                                    onMouseEnter={() => !isExternal && book.id && prefetchStory(book.id)}
                                                    onTouchStart={() => !isExternal && book.id && prefetchStory(book.id)}
                                                >
                                                    <div className="flex flex-row p-4 items-center gap-4">
                                                        <div
                                                            className={`w-16 h-20 shrink-0 bg-gradient-to-br ${theme.gradient} flex items-center justify-center border border-white/10 relative overflow-hidden`}
                                                            role="img"
                                                            aria-label={`${book.title} 표지 이미지`}
                                                        >
                                                            <span className="material-symbols-outlined text-white/70 text-2xl group-hover:scale-110 transition-transform duration-500" aria-hidden="true">{theme.icon}</span>
                                                            <div className={`absolute top-0 right-0 w-2 h-2 ${theme.dot} opacity-60`} aria-hidden="true"></div>
                                                        </div>

                                                        <div className="flex-grow min-w-0">
                                                            <div className="flex items-start justify-between">
                                                                <div className="min-w-0">
                                                                    <h3 className={`text-[14px] font-black text-white truncate leading-tight ${theme.titleHover} transition-colors`}>{book.title}</h3>
                                                                    <p className="text-[11px] text-zinc-500 font-bold mt-0.5 truncate">{book.author}</p>
                                                                </div>
                                                                <span className={`text-[8px] font-black border px-1 py-0.5 uppercase tracking-tighter shrink-0 ml-2 ${theme.badge}`}>Essential</span>
                                                            </div>
                                                            <div className="mt-3 flex items-center justify-between">
                                                                <p className="text-[11px] text-zinc-400 line-clamp-1 flex-grow mr-4">{book.desc}</p>
                                                                <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black bg-white/5 border transition-all whitespace-nowrap ${theme.btn}`}>
                                                                    인사이트 보기
                                                                    <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Component>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-8 border-b border-white/5 w-full"></div>
                                </div>
                            );
                        });
                    })()}
                    {/* 📍 [애드센스 심사용 지식 라이브러리 끝] 📍 */}

                        {/* 2️⃣ Weekly Focus */}
                        {false && (
                            <div className="relative z-[20] space-y-4 w-full bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-none pt-7 pb-7 px-1 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                                <div className="mb-8 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">Weekly Focus</h2>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">매주 무료로 청취하는 위클리 포커스</p>
                                        </div>
                                    </div>
                                </div>
                                {weeklyFocusBooks.length === 0 && booksLoading ? (
                                    // 첫 방문자용 스켈레톤 (Firestore 로딩 중)
                                    [0, 1].map(i => (
                                        <div key={i} className="glass-card rounded-none p-4 flex gap-5 items-center border border-white/5 animate-pulse">
                                            <div className="w-[70px] h-[98px] rounded-none bg-white/10 flex-shrink-0" />
                                            <div className="flex-grow space-y-2">
                                                <div className="h-4 bg-white/10 rounded w-3/4" />
                                                <div className="h-3 bg-white/5 rounded w-full" />
                                                <div className="flex gap-1 mt-3">
                                                    {[0, 1, 2, 3].map(j => <div key={j} className="flex-1 h-6 bg-white/5 rounded-none" />)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : weeklyFocusBooks.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-white/30 text-xs font-bold">도서 정보가 없습니다.</p>
                                    </div>
                                ) : weeklyFocusBooks.map((book, idx) => {
                                    const isThisPlaying = podcastPlaying && podcastInfo?.id === book.id;
                                    return (
                                        <div key={idx} className="relative group">
                                            <div onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)} className="cursor-pointer glass-card rounded-none p-4 flex gap-5 items-start hover:bg-white/5 transition-all w-full border border-white/5">
                                                <div className="w-[70px] h-[98px] mt-[30px] rounded-none overflow-hidden flex-shrink-0 shadow-2xl border border-white/10 ring-1 ring-white/20">
                                                    <img alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={book.cover} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <h3 className="font-black text-[16px] mb-1.5 leading-snug truncate text-white">{book.title}</h3>
                                                    <p className="text-[11px] text-gray-400 mb-2 line-clamp-1 italic font-medium">{cleanText(book.desc) || '성공적인 인생을 위한 핵심 근력을 키워주는 방법론...'}</p>



                                                    {/* <BookCardActions book={book} /> */}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>


                    {/* 3️⃣ 직장인이 많이 듣는 컨텐츠 */}
                    {false && (
                        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-1 pt-7 pb-7">
                            <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5">직장인이 가장 많이 듣는 인사이트</h2>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">지금 직장인의 고민으로 가장 많이 듣는 인사이트</p>
                                    </div>
                                </div>
                                <Link to="/archive" className="size-10 rounded-none border border-white/10 flex items-center justify-center bg-white/[0.03] active:scale-95 transition-transform">
                                    <span className="material-symbols-outlined text-white/30 text-[20px]">chevron_right</span>
                                </Link>
                            </div>

                            <div className="space-y-5">
                                {categories.map((cat, i) => {
                                    const targetLink = `/category/${cat.id}`;

                                    return (
                                        <Link
                                            key={i}
                                            to={targetLink}
                                            className="relative group block w-full min-h-[160px] rounded-none overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 bg-zinc-900 transition-all hover:scale-[1.01] active:scale-[0.98]"
                                        >
                                            {/* Background Image & Advanced Overlays */}
                                            <div className="absolute inset-0 pointer-events-none">
                                                <img
                                                    src={cat.img}
                                                    alt={cat.label}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-[1500ms] group-hover:scale-110"
                                                />
                                                {/* Multi-layered Vignette Header & Footer */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent"></div>
                                                {/* Edge Shine Effect */}
                                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                            </div>

                                            {/* Content Wrapper */}
                                            <div className="relative h-full min-h-[160px] p-7 flex flex-col justify-end z-10 w-full">
                                                {/* Category Pill (Glassmorphism) */}
                                                <div className="mb-3">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-none bg-white/10 backdrop-blur-xl border border-white/10 text-[12.5px] font-black text-white uppercase tracking-widest drop-shadow-md">
                                                        <span className="text-orange-500 mr-1.5">🎧</span>
                                                        {cat.subLabel.replace(/[()]/g, '')}
                                                    </span>
                                                </div>

                                                <h3 className="text-white text-[19px] font-extrabold leading-[1.4] tracking-tight break-keep max-w-[90%] transition-transform group-hover:translate-x-1 duration-500">
                                                    {cat.label.split(' ').map((word, idx) => (
                                                        <span key={idx} className="inline-block mr-1.5 opacity-90 group-hover:opacity-100">{word}</span>
                                                    ))}
                                                </h3>

                                                {/* Hover Detail (Optional hint) */}
                                                <div className="absolute right-6 bottom-6 size-10 rounded-none bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                                    <span className="material-symbols-outlined text-white text-xl">arrow_outward</span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </motion.section>
                    )}

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {false && (
                        <>
                            {/* 4️⃣ 인기 아카이뷰 */}
                            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-1 pt-7 pb-7">
                                <div className="mb-8 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">최다 조회 아카이뷰</h2>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">이번주 가장 많이 들은 아카이뷰</p>
                                        </div>
                                    </div>
                                    <Link to="/archive" className="size-10 rounded-none border border-white/10 flex items-center justify-center bg-white/[0.03] active:scale-95 transition-transform">
                                        <span className="material-symbols-outlined text-white/30 text-[20px]">chevron_right</span>
                                    </Link>
                                </div>
                                <div className="space-y-5">
                                    {enrichedWeeklyMostViewed.map((item, i) => (
                                        <div key={i} className={`flex items-start gap-3 pb-5 ${i !== enrichedPopularArchives.length - 1 ? 'border-b border-white/5' : ''}`}>
                                            <span className="text-3xl font-black text-white/50 italic w-5 text-left flex-shrink-0 pt-1 -ml-[3px]">{i + 1}</span>
                                            <Link to={`/review/${item.id || item.title.toLowerCase().replace(/\s+/g, '-')}`} className="flex-shrink-0">
                                                <div className="w-[60px] h-[82px] rounded-none overflow-hidden shadow-lg border border-white/10 bg-zinc-800">
                                                    {item.cover
                                                        ? <img src={item.cover} alt={item.title} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                                                        : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-white/20 text-xl">menu_book</span></div>
                                                    }
                                                </div>
                                            </Link>
                                            <div className="px-1 min-h-[300px]">
                                                <Link to={`/review/${item.id || item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                                                    <h4 className="text-white font-black text-[14px] tracking-tight truncate">{item.title}</h4>
                                                </Link>
                                                {item.author && <p className="text-gray-500 text-[10px] font-medium mt-0.5 truncate">{item.author}</p>}
                                                {item.listens && <p className="text-gray-600 text-[9px] font-black mt-0.5 uppercase tracking-[0.1em]">{item.listens} LISTENS</p>}

                                                {/* <BookCardActions book={item} /> */}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        </>
                    )}

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 🎬 2.5 아카이뷰 Originals Section */}
                    {false && originalContents.length > 0 && (
                        <motion.section
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={sectionVariants}
                            className="space-y-4 px-1 pt-7 pb-7"
                        >
                            <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">아카이뷰 Originals</h2>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">아카이뷰 만에 특별한 오리지널 컨텐츠</p>
                                    </div>
                                </div>
                                <Link to="/archive" className="size-10 rounded-none border border-white/10 flex items-center justify-center bg-white/[0.03] active:scale-95 transition-transform">
                                    <span className="material-symbols-outlined text-white/30 text-[20px]">chevron_right</span>
                                </Link>
                            </div>

                            <div className="space-y-4">
                                {originalContents.map((content) => (
                                    <div
                                        key={content.id}
                                        className="glass-card rounded-none p-4 flex gap-5 border border-white/5 shadow-2xl overflow-hidden relative"
                                    >
                                        {/* Left: Image (Reduced size) */}
                                        <div
                                            onClick={() => navigate(`/review/${content.id}`)}
                                            className="w-[110px] shrink-0 aspect-[3.5/5] rounded-none overflow-hidden border border-white/10 shadow-lg cursor-pointer group"
                                        >
                                            <img
                                                src={content.cover}
                                                alt={content.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                            />
                                        </div>

                                        {/* Right: Info and 4 Buttons */}
                                        <div className="flex-1 flex flex-col justify-between py-0.5">
                                            <div className="px-1 space-y-12">
                                                <h3 className="text-white font-black text-[15px] leading-tight break-keep line-clamp-2">{content.title}</h3>
                                                <p className="text-gold text-[10px] font-black uppercase tracking-[0.15em] mb-1">아카이뷰 오리지널</p>

                                            </div>

                                            {/* <BookCardActions book={content} /> */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {false && (
                        <>
                            {/* ✨ 2.8 Celeb Picks Section */}
                            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-1 pt-7 pb-7">
                                <div className="mb-8 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">유명인들의 추천 아카이뷰</h2>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">유명 셀럽들이 추천했던 도서 컬렉션</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {(showAllCelebs ? celebrities.filter(c => !c.id.includes('editor') && !c.id.includes('original') && !c.id.includes('guru')) : celebrities.filter(c => !c.id.includes('editor') && !c.id.includes('original') && !c.id.includes('guru')).slice(0, 6)).map((celeb) => (
                                        <Link key={celeb.id} to={`/celebrity/${celeb.id}`} className="flex flex-col items-center bg-white/5 border border-white/10 rounded-none p-4 group transition-all duration-300 hover:bg-white/10 hover:border-white/30 shadow-lg">
                                            <div className="w-full aspect-square rounded-none overflow-hidden mb-3 shadow-inner">
                                                <img src={celeb.image} alt={celeb.name} loading="lazy" className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" />
                                            </div>
                                            <h4 className="text-[14px] font-black tracking-tight text-white mb-1 truncate w-full text-center drop-shadow-md">{celeb.name === '김남준 (RM)' ? 'RM (BTS)' : celeb.name}</h4>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter truncate w-full text-center">{celeb.role}</p>
                                        </Link>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowAllCelebs(!showAllCelebs)}
                                    className="w-full mt-6 py-3.5 rounded-none border border-white/10 text-white/50 text-[11px] font-black tracking-widest uppercase hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    {showAllCelebs ? '접기 (SHOW LESS)' : '더보기 (SEE MORE)'}
                                </button>
                            </motion.section>
                        </>
                    )}

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {false && (
                        <>
                            {/* 5️⃣ 멤버십 안내 */}
                            <motion.section
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={sectionVariants}
                                className="px-1 pt-7 pb-7"
                            >
                                <div className="mb-8 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">아카이뷰 유료 멤버십 안내</h2>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Membership Guide</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendation Highlight Box */}
                                <div className="mb-6 bg-zinc-900/50 border border-white/5 p-5 rounded-none relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full -mr-10 -mt-10"></div>
                                    <h3 className="text-[13px] font-black text-orange-500 mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px]">stars</span>
                                        아카이뷰는 이런 분께 추천합니다
                                    </h3>
                                    <div className="grid grid-cols-1 gap-y-2.5">
                                        {[
                                            "직장을 다니지만 지적 채워짐이 필요하신 분",
                                            "친구에게 책을 선물하고 싶은데 선택이 어려우신 분",
                                            "성장하고 싶은데 항상 제자리라 느껴지시는 분",
                                            "성공한 사람들의 인사이트가 절실하신 분",
                                            "서점 가기 전, 무슨 도서를 살지 고민되시는 분"
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <span className="text-orange-500/50 text-[11px] mt-0.5">●</span>
                                                <span className="text-[11px] font-bold text-gray-300 leading-relaxed break-keep">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-4 text-[10.5px] font-medium text-gray-500 bg-white/5 p-2 border-l-2 border-orange-500/30">
                                        아카이뷰를 통해 바쁜 일상 속에서도 당신만의 <span className="text-white">지식과 통찰</span>을 얻을 수 있습니다.
                                    </p>
                                </div>

                                <div className="glass-card rounded-none p-6 bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                                    {/* Subtle background glow */}
                                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-none pointer-events-none group-hover:bg-orange-500/20 transition-all duration-700"></div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Free Column */}
                                        <div className="bg-black/40 border border-white/5 rounded-none p-4 relative z-10">
                                            <h3 className="text-[12px] font-black text-white/50 text-center mb-4 uppercase tracking-widest border-b border-white/5 pb-2">일반 회원</h3>
                                            <ul className="space-y-3">
                                                <li className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-white/30 text-[14px]">check</span>
                                                    <span className="text-[11px] font-bold text-white/30">주간 무료 콘텐츠</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                                    <span className="text-[11px] font-bold text-white/30 line-through">모든 에피소드 감상</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                                    <span className="text-[11px] font-bold text-white/30 line-through">핵심 요약 PDF 제공</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                                    <span className="text-[11px] font-bold text-white/30 line-through">핵심 실천 가이드 제공</span>
                                                </li>
                                                <li className="flex items-center gap-2 pt-2">
                                                    <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                                    <span className="text-[11px] font-bold text-white/30 line-through">기록노트 연동 성취 트래커</span>
                                                </li>
                                            </ul>
                                        </div>

                                        {/* Premium Column */}
                                        <div className="bg-orange-500/5 border border-orange-500/30 rounded-none p-4 relative z-10 shadow-[0_0_20px_rgba(234,88,12,0.1)]">
                                            <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-none shadow-lg">PRO</div>
                                            <h3 className="text-[12px] font-black text-orange-500 text-center mb-4 uppercase tracking-widest border-b border-orange-500/20 pb-2">프리미엄</h3>
                                            <ul className="space-y-3">
                                                <li className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                                    <span className="text-[11px] font-bold text-white/90">모든 팟캐스트 무제한</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                                    <span className="text-[11px] font-bold text-white/90">매주 2권 카톡 발송</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                                    <span className="text-[11px] font-bold text-white/90">전용 가이드북 다운로드</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                                    <span className="text-[11px] font-bold text-white/90">핵심 실천 가이드 제공</span>
                                                </li>
                                                <li className="flex items-start gap-2 bg-orange-500/10 p-2.5 rounded-none border border-orange-500/20 mt-3 shadow-inner">
                                                    <span className="material-symbols-outlined text-orange-500 text-[16px]">fact_check</span>
                                                    <div className="flex-1 mt-0.5">
                                                        <span className="text-[11px] font-black text-orange-400 block mb-0.5 tracking-tight">기록노트 연동 성취 트래커</span>
                                                        <span className="text-[9px] font-bold text-white/60 leading-tight block break-keep">제공된 가이드를 실천하고, 기록노트에서 달성률을 체크하며 성장하세요.</span>
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </motion.section>
                        </>
                    )}

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* ✨ 새로 추가된 3단계 온보딩 (How it Works) */}
                    {false && (
                        <motion.section
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={sectionVariants}
                            className="px-1 pb-16 pt-7"
                        >
                            <div className="mb-10 text-center">
                                <h2 className="text-[20px] font-black tracking-tight leading-none mb-2 text-white">어떻게 이용하나요?</h2>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">How to use Archiview</p>
                            </div>

                            <div className="space-y-6 relative">
                                {/* Connecting Line */}
                                <div className="absolute left-[24px] top-6 bottom-10 w-[1px] bg-white/5"></div>

                                {/* Step 1 */}
                                <div className="flex gap-4 items-start relative z-10">
                                    <div className="w-12 h-12 rounded-none bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                                        <span className="material-symbols-outlined text-white/60">menu_book</span>
                                    </div>
                                    <div className="pt-2">
                                        <h3 className="text-[14px] font-black text-white mb-1 tracking-tight">상황에 맞는 책 선택</h3>
                                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">번아웃, 연봉협상 등 지금 내게 필요한<br />카테고리에서 책을 고릅니다.</p>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="flex gap-4 items-start relative z-10">
                                    <div className="w-12 h-12 rounded-none bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                                        <span className="material-symbols-outlined text-orange-500">headphones</span>
                                    </div>
                                    <div className="pt-2">
                                        <h3 className="text-[14px] font-black text-orange-500 mb-1 tracking-tight">출퇴근 15분 오디오</h3>
                                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">성공한 사람들의 생각과 핵심 레슨을<br />이동하며 스마트하게 듣습니다.</p>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="flex gap-4 items-start relative z-10">
                                    <div className="w-12 h-12 rounded-none bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                                        <span className="material-symbols-outlined text-white/60">auto_awesome</span>
                                    </div>
                                    <div className="pt-2">
                                        <h3 className="text-[14px] font-black text-white mb-1 tracking-tight">핵심 요약본으로 복습</h3>
                                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">스크립트와 인사이트 요약본을 통해<br />내 삶에 즉각적으로 적용합니다.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.section>
                    )}

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 7️⃣ CTA */}
                    {false && (
                        <motion.section
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={sectionVariants}
                            className="px-1 pb-16"
                        >
                            <div className="relative group">
                                {/* Card Background Bloom */}
                                <div className="absolute inset-0 bg-orange-600/5 blur-[50px] rounded-none pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                <div className="relative glass-card bg-zinc-900/40 rounded-none p-10 border border-white/5 text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                                    <h2 className="text-[26px] font-black mb-1.5 tracking-tight text-white">커피 한 잔 가격으로</h2>
                                    <p className="text-[14px] font-bold text-white/40 mb-10 tracking-widest uppercase">성공한 사람들의 생각을 듣다</p>

                                    <button
                                        onClick={() => navigate('/membership')}
                                        className="w-full h-[64px] bg-orange-600 hover:bg-orange-500 text-white rounded-none font-black text-[16px] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_15px_30px_-5px_rgba(234,88,12,0.4)] mb-6"
                                    >
                                        <span className="material-symbols-outlined text-[20px] font-black">rocket_launch</span>
                                        지금 시작하기
                                    </button>

                                    <div onClick={() => navigate('/membership')} className="inline-flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors cursor-pointer py-1 px-3 rounded-none hover:bg-white/5">
                                        <span className="text-[12px] font-black tracking-widest uppercase">월 4,900원</span>
                                        <span className="material-symbols-outlined text-[14px] font-black">arrow_forward_ios</span>
                                    </div>
                                </div>
                            </div>
                        </motion.section>
                    )}
                    {/* ── AdSense 콘텐츠 보강: 서비스 소개 ── */}
                    <section className="px-1 pt-12 pb-10 border-t border-white/5">
                        <div className="mb-6">
                            <span className="text-[10px] text-orange-500 font-black tracking-[0.3em] uppercase">About Archiview</span>
                            <h2 className="text-[22px] font-black tracking-tight mt-2 mb-4 leading-tight">아카이뷰란 무엇인가요?</h2>
                            <p className="text-[13px] text-white/60 leading-relaxed mb-4 break-keep">
                                아카이뷰(Archiview)는 바쁜 직장인을 위한 오디오 인사이트 플랫폼입니다. 출퇴근 시간, 점심 시간, 짧은 휴식 시간을 활용해 세계적인 베스트셀러의 핵심 인사이트를 15분 내외의 오디오 콘텐츠로 만나볼 수 있습니다.
                            </p>
                            <p className="text-[13px] text-white/60 leading-relaxed mb-4 break-keep">
                                우리는 단순히 책을 요약하는 것이 아니라, 각 도서의 철학과 핵심 메시지를 분석하여 직장 생활과 일상에 바로 적용할 수 있는 독창적인 인사이트 콘텐츠를 제작합니다. 자기계발, 경제, 경영, 인문, 심리 등 5개 핵심 카테고리에 걸쳐 엄선된 도서들의 지혜를 전달합니다.
                            </p>
                            <p className="text-[13px] text-white/60 leading-relaxed mb-4 break-keep">
                                아카이뷰의 콘텐츠는 오디오 팟캐스트 형식으로 제공되며, 두 진행자의 자연스러운 대화를 통해 어렵게 느껴지던 비즈니스 서적도 쉽고 재미있게 이해할 수 있습니다. 책 한 권을 읽을 시간이 없어도, 아카이뷰와 함께라면 매일 성장할 수 있습니다.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mt-8">
                            {[
                                { icon: 'headphones', title: '오디오 인사이트', desc: '15분 내외의 핵심 요약 오디오' },
                                { icon: 'auto_stories', title: '큐레이션', desc: '전문가가 엄선한 필독 도서' },
                                { icon: 'trending_up', title: '성장 트래킹', desc: '나만의 독서 노트와 기록' },
                            ].map((item, i) => (
                                <div key={i} className="bg-white/[0.03] border border-white/5 p-4 text-center">
                                    <span className="material-symbols-outlined text-orange-500 text-[28px] mb-2 block">{item.icon}</span>
                                    <h3 className="text-[12px] font-black text-white mb-1">{item.title}</h3>
                                    <p className="text-[10px] text-white/40 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── 이용 방법 ── */}
                    <section className="px-1 pt-10 pb-10 border-t border-white/5">
                        <span className="text-[10px] text-orange-500 font-black tracking-[0.3em] uppercase">How to Use</span>
                        <h2 className="text-[22px] font-black tracking-tight mt-2 mb-8 leading-tight">아카이뷰 이용 방법</h2>
                        <div className="space-y-6">
                            {[
                                { step: '01', title: '관심 카테고리 선택', desc: '자기계발, 경제, 경영, 인문, 심리 중 지금 나에게 필요한 분야를 선택합니다. 각 카테고리는 직장인의 실제 고민과 성장 욕구에 맞게 구성되어 있습니다.' },
                                { step: '02', title: '오디오 콘텐츠 청취', desc: '출퇴근길, 점심 시간, 잠들기 전 등 틈새 시간에 15분 내외의 오디오 인사이트를 청취합니다. 두 진행자의 생생한 대화로 핵심을 빠르게 파악할 수 있습니다.' },
                                { step: '03', title: '인사이트 기록', desc: '인상 깊은 문구와 깨달음을 나만의 독서 노트에 기록합니다. 기록된 인사이트는 언제든 다시 꺼내볼 수 있어 지식이 내 것으로 남습니다.' },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="text-[28px] font-black text-orange-500/30 leading-none w-10 shrink-0">{item.step}</div>
                                    <div>
                                        <h3 className="text-[14px] font-black text-white mb-1">{item.title}</h3>
                                        <p className="text-[12px] text-white/50 leading-relaxed break-keep">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── 카테고리 소개 ── */}
                    <section className="px-1 pt-10 pb-10 border-t border-white/5">
                        <span className="text-[10px] text-orange-500 font-black tracking-[0.3em] uppercase">Categories</span>
                        <h2 className="text-[22px] font-black tracking-tight mt-2 mb-8 leading-tight">5가지 핵심 카테고리</h2>
                        <div className="space-y-5">
                            {[
                                { cat: '자기계발', en: 'Self-Development', desc: '습관 형성, 목표 달성, 생산성 향상에 관한 세계적인 베스트셀러들의 핵심 원리를 담았습니다. 그릿, 아주 작은 습관의 힘, 원씽 등 검증된 성공 방법론을 통해 지금보다 나은 삶을 설계하세요.', color: 'from-purple-900 to-purple-800' },
                                { cat: '경제', en: 'Economy & Finance', desc: '돈의 심리학, 부의 본질, 투자 원칙에 관한 깊이 있는 통찰을 제공합니다. 경제적 자유를 향한 첫 걸음을 위해 필요한 금융 지식과 사고방식을 체계적으로 학습할 수 있습니다.', color: 'from-green-900 to-green-800' },
                                { cat: '경영', en: 'Business & Leadership', desc: '탁월한 리더십, 조직 문화, 혁신적 비즈니스 전략에 관한 글로벌 경영 명서들을 엄선했습니다. 팀을 이끌고 성과를 만드는 실전 경영 지혜를 전달합니다.', color: 'from-blue-900 to-blue-800' },
                                { cat: '인문', en: 'Humanities & History', desc: '사피엔스, 총균쇠, 이기적 유전자 등 인류의 역사와 본질을 탐구하는 명작들을 통해 세상을 보는 시각을 넓힙니다. 오랜 시간 검증된 지혜에서 현대의 해답을 찾습니다.', color: 'from-orange-900 to-orange-800' },
                                { cat: '심리', en: 'Psychology & Mind', desc: '나 자신과 타인을 깊이 이해하고 싶을 때 필요한 심리학 명서들을 담았습니다. 번아웃 극복, 관계 개선, 마음챙김까지 일상의 심리적 어려움을 해소할 지혜를 제공합니다.', color: 'from-rose-900 to-rose-800' },
                            ].map((item, i) => (
                                <Link key={i} to={`/review-board`} className="block bg-white/[0.03] border border-white/5 p-5 hover:border-orange-500/30 transition-colors">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-1 h-5 bg-orange-500"></div>
                                        <h3 className="text-[16px] font-black text-white">{item.cat}</h3>
                                        <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{item.en}</span>
                                    </div>
                                    <p className="text-[12px] text-white/50 leading-relaxed break-keep">{item.desc}</p>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* ── 에디터 노트 ── */}
                    <section className="px-1 pt-6 pb-2 space-y-4 border-t border-white/5">
                        <span className="text-[10px] text-orange-500 font-black tracking-[0.3em] uppercase">Editor's Note</span>
                        <h2 className="text-[22px] font-black tracking-tight mt-2 mb-6 leading-tight">왜 아카이뷰인가</h2>
                        <div className="space-y-4 text-[13px] text-white/60 leading-relaxed break-keep">
                            <p>현대인은 정보 과잉의 시대에 살고 있습니다. 수만 권의 책이 매년 출판되지만, 실제로 읽히는 책은 극히 일부에 불과합니다. 우리는 "읽어야 한다"는 부담감은 있지만, 정작 바쁜 일상에서 책 한 권을 완독하기란 쉽지 않습니다.</p>
                            <p>아카이뷰는 이 간극을 메우기 위해 탄생했습니다. 좋은 책이 주는 지혜와 통찰을 더 많은 사람이 일상 속에서 쉽게 접할 수 있도록, 우리는 각 도서의 핵심 철학을 분석하고 재해석하여 청취하기 좋은 형태로 전달합니다.</p>
                            <p>아카이뷰의 콘텐츠는 책의 줄거리를 단순히 요약하는 것이 아니라, 저자의 핵심 주장, 그 주장이 현실에서 어떻게 작동하는지, 그리고 직장인의 삶에 어떻게 적용할 수 있는지를 깊이 있게 탐구합니다. 이것이 아카이뷰가 단순한 북 서머리 서비스와 다른 이유입니다.</p>
                            <p>매주 새로운 인사이트를 발견하는 기쁨, 책 한 권이 삶을 바꿀 수 있다는 믿음과 함께 아카이뷰는 오늘도 성장을 원하는 직장인들의 곁에 있겠습니다.</p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-orange-500 text-[16px]">edit</span>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-white">TEAM ARCHIVIEW</p>
                                <p className="text-[10px] text-white/30">Editorial Team · 2026</p>
                            </div>
                        </div>
                    </section>

                    {/* 📍 [전체 도서 인사이트 인덱스 - SEO & 봇 탐색용] 📍 */}
                    <section className="px-5 mt-20 mb-24 border-t border-white/5 pt-16">
                        <div className="flex flex-col gap-2 mb-10 text-center">
                            <span className="text-[10px] text-orange-500 font-black tracking-[0.4em] uppercase">Archive Library</span>
                            <h2 className="text-[20px] font-black tracking-tight text-white/90">전체 도서 인사이트 인덱스</h2>
                            <p className="text-[11px] text-zinc-600 font-bold max-w-[280px] mx-auto leading-relaxed">아카이뷰가 엄선한 베스트셀러 명저들의 핵심 통찰을 가나다순으로 찾아보세요.</p>
                        </div>
                        
                        <div className="columns-2 gap-4 space-y-3">
                            {[...combinedAdsenseBooks]
                                .sort((a, b) => a.title.localeCompare(b.title, 'ko'))
                                .map((book) => (
                                <Link 
                                    key={book.id} 
                                    to={`/story/${book.id}`}
                                    className="block p-3 bg-white/[0.02] border border-white/[0.03] hover:border-orange-500/20 hover:bg-white/[0.04] transition-all group"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-1.5 h-1.5 rounded-full ${book.gradient?.split(' ')[0].replace('from-', 'bg-') || 'bg-zinc-700'} group-hover:scale-125 transition-transform`}></div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-[11px] font-black text-white/50 group-hover:text-white transition-colors truncate">{book.title}</h4>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[8px] text-zinc-700 font-bold truncate">{book.author}</span>
                                                <span className="text-[8px] text-orange-500/30 group-hover:text-orange-500/60 transition-colors font-black uppercase tracking-tighter shrink-0">Insight</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        
                        <div className="mt-16 text-center">
                            <Link to="/review-board" className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(249,115,22,0.2)]">
                                Browse All Library
                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </Link>
                        </div>
                    </section>

                    {/* 8️⃣ Footer */}
                    <Footer />
                </main >

                {/* 🧭 Bottom Navigation Dock (Editorial Premium Style) */}
                <BottomNavigation />
            </div >
        </div >
    );
}
