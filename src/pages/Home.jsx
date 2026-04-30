import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSiteDesign } from '../hooks/useSiteDesign';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { useBookData } from '../hooks/useBookData';
import { useAudio } from '../contexts/AudioContext';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import InsightBanner from '../components/InsightBanner';
import BookCardActions from '../components/BookCardActions';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { availableAudio } from '../data/availableAudio';
import { useSavedBooks } from '../hooks/useSavedBooks';
import { getTodayContents } from '../data/personalization';
import { useSeoulCalendarDayKey } from '../hooks/useCalendarDay';

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
    const { design } = useSiteDesign();
    const { user } = useAuth();
    const { addBook: addSavedBook, savedBooks } = useSavedBooks(user);
    const [mainCategories, setMainCategories] = useState(null);
    const navigate = useNavigate();
    const seoulYmd = useSeoulCalendarDayKey();
    const { getAllBooks, loading: booksLoading } = useBookData();
    const { playPodcastMP3, podcastPlaying, podcastInfo, openScriptModal } = useAudio();
    const [isScrolled, setIsScrolled] = useState(false);
    const [showAllCelebs, setShowAllCelebs] = useState(false);
    const [celebrities, setCelebrities] = useState([]);
    useEffect(() => {
        import('../data/celebrities').then(m => setCelebrities(m.celebrities || []));
    }, []);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [openOS, setOpenOS] = useState(null);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showIphoneModal, setShowIphoneModal] = useState(false);
    const [pwaInstalled, setPwaInstalled] = useState(false);

    // 메인 카테고리 - Firestore 직접 구독
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'site_design', 'main'), (snap) => {
            if (snap.exists()) {
                const cats = snap.data().main_categories;
                if (Array.isArray(cats) && cats.length) setMainCategories(cats);
            }
        });
        return () => unsub();
    }, []);

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

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => setPwaInstalled(true));
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleAndroidInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setPwaInstalled(true);
            setDeferredPrompt(null);
        } else {
            // 이미 설치됐거나 지원 안 되는 경우 안내
            alert('크롬 브라우저에서 주소창 우측 설치 아이콘을 탭하거나,\n메뉴 > "앱 설치"를 선택하세요.');
        }
    };

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

    const categories = mainCategories || design.main_categories;

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
    const chipToIdMap = {
        '자기계발': 'SELF_DEV',
        '경제': 'ECONOMY',
        '경영': 'MANAGEMENT',
        '인문': 'HUMANITIES',
        '심리': 'PSYCHOLOGY'
    };

    // ── Firestore 섹션 데이터 ──────────────────────────────────────────
    const [weeklyFocusRaw, setWeeklyFocusRaw] = useState(() => {
        try { return JSON.parse(localStorage.getItem('wf_cache') || '[]'); } catch { return []; }
    });
    const [weeklyFocusVideos, setWeeklyFocusVideos] = useState([]);
    const [weeklyMostViewedRaw, setWeeklyMostViewedRaw] = useState([]);
    const [popularArchives, setPopularArchives] = useState([
        { id: "wealth-way", title: "부자들이 돈을 보는 방식", listens: "12.4k" },
        { id: "decision-making", title: "억만장자의 의사결정", listens: "10.1k" },
        { id: "warren-buffett", title: "워런 버핏 사고법", listens: "8.9k" },
        { id: "leverage", title: "레버리지: 부의 추월차선", listens: "7.5k" },
        { id: "story-power", title: "스토리의 힘", listens: "6.8k" },
    ]);

    // 주의: weekly_focus_schedule(주마다 2권)로 weekly_focus(최대 60권)를 자동 setDoc 하면
    // 어드민에서 넣은 60권이 통째로 2권으로 덮어써짐 — 자동 적용 제거(인기아카이뷰 '메인에 저장'만 사용)

    useEffect(() => {
        const unsub1 = onSnapshot(doc(db, 'site_config', 'popular_archives'), (snap) => {
            if (snap.exists() && snap.data().books?.length) setPopularArchives(snap.data().books);
        });
        const unsub2 = onSnapshot(doc(db, 'site_config', 'weekly_focus'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.books?.length) {
                    setWeeklyFocusRaw(data.books);
                    try { localStorage.setItem('wf_cache', JSON.stringify(data.books)); } catch {}
                }
                if (data.videos?.length) setWeeklyFocusVideos(data.videos);
            }
        });
        const unsub3 = onSnapshot(doc(db, 'site_config', 'weekly_most_viewed'), (snap) => {
            if (snap.exists() && snap.data().books?.length) setWeeklyMostViewedRaw(snap.data().books);
        });
        return () => { unsub1(); unsub2(); unsub3(); };
    }, []);

    const enrich = (list) => list.map(item => {
        const bookData = allBooks.find(b => b.id === item.id) || {};
        return { ...bookData, ...item, cover: item.cover || bookData.cover || '', purchaseLink: item.purchaseLink || bookData.purchaseLink || '', author: item.author || bookData.author || '' };
    });

    const enrichedPopularArchives = useMemo(() => enrich(popularArchives), [popularArchives, allBooks]);

    // Weekly Focus: 캐시 우선 표시 → allBooks 로드 후 enriched 버전으로 교체 (짧은 옛 캐시가 전체 목록을 가리지 않게)
    const weeklyFocusBooks = useMemo(() => {
        if (weeklyFocusRaw.length > 0) {
            const enriched = enrich(weeklyFocusRaw);
            if (allBooks.length > 0) {
                try { localStorage.setItem('wf_enriched_cache', JSON.stringify(enriched)); } catch {}
                return enriched;
            }
            try {
                const cached = JSON.parse(localStorage.getItem('wf_enriched_cache') || '[]');
                if (cached.length > 0 && cached.length >= enriched.length) return cached;
            } catch {}
            return enriched;
        }
        return allBooks.filter(b => b.section === 'WEEKLY_FOCUS').sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).slice(0, 5);
    }, [weeklyFocusRaw, allBooks]);

    // 메인 Weekly Focus: Test4와 동일 — 위클리 **순서**로 (0,1)→(2,3)…, 한국 자정마다 다음 짝
    const { todayBooks: wfTodayBooks, todayVideos: wfTodayVideos } = useMemo(() => {
        const books = weeklyFocusBooks.length > 0 ? weeklyFocusBooks : [];
        const videos = weeklyFocusVideos.length > 0 ? weeklyFocusVideos : [];
        if (!books.length && !videos.length) return { todayBooks: [], todayVideos: [] };
        return getTodayContents(books, videos, null, seoulYmd);
    }, [weeklyFocusBooks, weeklyFocusVideos, seoulYmd]);

    // 주간 최다조회: Firestore 데이터 우선, 없으면 popular_archives fallback
    const enrichedWeeklyMostViewed = useMemo(() => {
        if (weeklyMostViewedRaw.length > 0) return enrich(weeklyMostViewedRaw);
        return enrichedPopularArchives;
    }, [weeklyMostViewedRaw, enrichedPopularArchives, allBooks]);

    const addToLibrary = (book) => {
        if (savedBooks.some(b => b.title === book.title)) {
            alert('이미 서재에 보관된 도서입니다.');
            return;
        }
        addSavedBook({ id: book.id, title: book.title, author: book.author, cover: book.cover });
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
            `}</style>

            <div className="max-w-md mx-auto w-full flex-grow relative flex flex-col">
                {/* 🏠 Header Navigation */}
                <main className="flex-grow pb-32">
                    {/* Independent Header Area - Positioned above the image */}
                    <div className="bg-[#101218] px-3 pb-3" style={{ paddingTop: 'calc(5px + env(safe-area-inset-top, 0px))' }}>
                        <header className="flex items-center justify-between mb-4 mt-2">
                            <Link to="/" className="flex-1 transition-opacity active:opacity-70 group flex justify-start">
                                <div className="flex items-center gap-[7px]">
                                    {/* 🔊 Gray Waveform Graphic Logo */}
                                    <div className="flex items-end h-[18px] gap-[2px] mr-1 pb-[2px]">
                                        <div className="w-[3px] h-[10px] bg-zinc-400 rounded-none" />
                                        <div className="w-[3px] h-[14px] bg-zinc-400 rounded-none" />
                                        <div className="w-[3px] h-[18px] bg-zinc-400 rounded-none" />
                                        <div className="w-[3px] h-[12px] bg-zinc-400 rounded-none" />
                                        <div className="w-[3px] h-[16px] bg-zinc-400 rounded-none" />
                                    </div>
                                    <span className="text-[19px] font-black tracking-[-0.03em] uppercase mt-0.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>ARCHIVIEW</span>
                                </div>
                            </Link>
                            <div className="flex items-center gap-2">
                                {/* 안드로이드 PWA 설치 버튼 */}
                                <button
                                    onClick={handleAndroidInstall}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black border transition-all active:scale-95 ${pwaInstalled ? 'bg-[#3ddc84]/20 border-[#3ddc84]/40 text-[#3ddc84]/50' : 'bg-[#3ddc84]/10 border-[#3ddc84]/40 text-[#3ddc84]'}`}
                                    disabled={pwaInstalled}
                                >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/></svg>
                                    {pwaInstalled ? '설치됨' : '안드로이드'}
                                </button>
                                {/* 아이폰 PWA 안내 버튼 */}
                                <button
                                    onClick={() => setShowIphoneModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black border bg-white/8 border-white/25 text-white transition-all active:scale-95"
                                >
                                    <svg width="10" height="12" viewBox="0 0 814 1000" fill="currentColor"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.9 0 663.5 0 541 0 341.8 129.3 236.2 256.7 236.2c63.3 0 116.2 42.8 155.8 42.8 31.6 0 107.2-45.2 172.9-45.2 34.8-.1 124.9 9.9 192.2 105.1zm-261.3-235.1c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
                                    아이폰
                                </button>
                            </div>
                        </header>
                        {/* 🏷️ Top Menu Category Chips */}
                        <div className="flex gap-1.5 w-full px-1">
                            {Object.keys(chipToIdMap).map((chip) => (
                                <button
                                    key={chip}
                                    onClick={() => {
                                        const el = document.getElementById(`category-${chipToIdMap[chip]}`);
                                        if (el) {
                                            const y = el.getBoundingClientRect().top + window.scrollY - 60;
                                            window.scrollTo({ top: y, behavior: 'smooth' });
                                        } else {
                                            navigate(`/category/${chipToIdMap[chip]}`);
                                        }
                                    }}
                                    className="flex-1 min-w-0 py-1.5 flex items-center justify-center rounded-none border bg-[#1a1d24] border-white/10 text-gray-300 font-bold transition-all active:scale-95 shadow-lg hover:bg-orange-500/20 hover:border-orange-500/50 hover:text-orange-400"
                                >
                                    <span className="text-[9px] opacity-70 mr-[1px]">#</span>
                                    <span className="text-[11px] tracking-tight truncate">{chip}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 🔎 Search Results Overlay */}
                    {searchTerm.trim().length > 0 && (
                        <div className="absolute top-[108px] left-0 right-0 z-[100] px-3">
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
                                                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src='/images/hero_expert_v5.png'}} />
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
                    <section className="relative pt-0 pb-0 overflow-hidden" style={{ minHeight: '376px' }}>
                        {/* Full background image - face focused */}
                        <div className="absolute inset-0 z-0 overflow-hidden">
                            {design.main_hero?.type === 'video'
                                ? <video src={design.main_hero.src} autoPlay loop muted playsInline className="object-cover" style={{ width: '450px', height: '376px', objectPosition: 'right top' }} />
                                : <img
                                    src={design.main_hero?.src || '/images/hero_expert_v5.png'}
                                    alt="Expert Listening"
                                    width={450}
                                    height={376}
                                    fetchpriority="high"
                                    decoding="async"
                                    className="object-cover"
                                    style={{ width: '450px', height: '376px', objectPosition: 'right top' }}
                                />
                            }
                            {/* Left solid → transparent: 텍스트 왼쪽, 얼굴 오른쪽 */}
                            <div className="absolute inset-0" style={{
                                background: 'linear-gradient(to right, #101218 35%, rgba(16,18,24,0.6) 60%, transparent 100%)'
                            }}></div>
                            {/* Bottom fade */}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent"></div>
                        </div>

                        {/* Hero Text Only */}
                        <div className="relative z-10 px-6 pt-5">

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
                                                <div className="w-[3px] h-[11px] bg-white rounded-sm shrink-0" />
                                                <div className="w-[3px] h-[17px] bg-white rounded-sm shrink-0" />
                                                <div className="w-[3px] h-[14px] bg-white rounded-sm shrink-0" />
                                                <div className="w-[3px] h-[13px] bg-white rounded-sm shrink-0" />
                                            </span>
                                        </span>
                                    </span>
                                </h1>
                                <p className="text-gray-300 text-[11px] font-medium leading-relaxed">
                                    책 한 권 읽을 시간 없는 직장인을 위한<br />오디오 인사이트 플랫폼
                                </p>
                            </motion.div>
                        </div>

                        {/* Category Chips moved to top Header */}

                        {/* ⭐ Social Proof Section — full-bleed strip, no box */}
                        <div className="relative z-10 pt-1 pb-5"
                            style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 100%)' }}>
                            {/* 상단 구분선: 오렌지 미세 그라디언트 */}
                            <div className="mx-6 mb-3 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(251,146,60,0.35), transparent)' }} />
                            <div className="text-center px-6">
                                <div className="flex items-center justify-center gap-[3px] mb-0.5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className="material-symbols-outlined text-orange-400/80 text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    ))}
                                    <span className="text-gray-400 text-[10px] font-semibold ml-2 tracking-wide">15,400+ 직장인</span>
                                </div>
                                <div className="relative h-[36px] overflow-hidden -mt-px sm:h-[38px]">
                                    {userReviews.map((review, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: idx === reviewIndex ? 1 : 0, y: idx === reviewIndex ? 0 : 8 }}
                                            transition={{ duration: 0.5 }}
                                            className="absolute inset-0 flex items-start justify-center pt-0.5"
                                            style={{ pointerEvents: idx === reviewIndex ? 'auto' : 'none' }}
                                        >
                                            <p className="text-gray-300/90 text-[11px] font-medium leading-snug break-keep text-center">
                                                "{review.text}"<span className="text-orange-400/60 text-[10px] font-semibold ml-1.5">— {review.name}</span>
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

 
                         {/* 회사 소개 삭제됨 */}

                         {/* 📍 [애드센스 심사용 리뷰 라이브러리 시작] 📍 
                             (나중에 승인 이후 이 부분을 주석 처리하시면 다른 페이지 영향 없이 홈에서 사라집니다) */}
                         <div className="relative z-[20] px-6 mb-7">
                             <div className="flex items-center justify-between mb-4">
                                 <h2 className="text-[18px] font-black text-white tracking-tight flex items-center gap-2">
                                     <span className="material-symbols-outlined text-indigo-400">menu_book</span> 리뷰 라이브러리
                                 </h2>
                                 <Link to="/review-board" className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-0.5">
                                     <span>전체보기</span>
                                     <span className="material-symbols-outlined text-[13px]">chevron_right</span>
                                 </Link>
                             </div>
                             
                             {Object.keys(chipToIdMap).map((categoryName, cIdx) => {
                                 const catBooks = allBooks.filter(b => {
                                     const cat = (b.category || '').toLowerCase();
                                     const sec = (b.section || '').toUpperCase();
                                     const targetId = chipToIdMap[categoryName];
                                     if (targetId === 'SELF_DEV') return cat.includes('자기계발');
                                     if (targetId === 'ECONOMY') return cat.includes('경제') || cat.includes('재테크');
                                     if (targetId === 'MANAGEMENT') return cat.includes('경영') || cat.includes('비즈니스');
                                     if (targetId === 'HUMANITIES') return cat.includes('인문') || cat.includes('철학');
                                     if (targetId === 'PSYCHOLOGY') return cat.includes('심리');
                                     return false;
                                 }).slice(0, 8);

                                 if(catBooks.length === 0) return null;

                                 return (
                                     <div key={categoryName} id={`category-${chipToIdMap[categoryName]}`} className="mb-10 last:mb-0">
                                         <div className="flex items-center gap-2 mb-4 px-1">
                                             <div className="w-1.5 h-4 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                             <h3 className="text-[15px] font-black tracking-widest text-white/90 uppercase">{categoryName}</h3>
                                         </div>
                                         <div className="grid grid-cols-2 gap-3">
                                             {catBooks.map((book, i) => {
                                                 // 카테고리마다 8개씩(slice 0,8) → cIdx*8+i 로 전체 고유 인덱스
                                                 // ABSTRACT_IMGS 32개 순환 — 같은 카테고리 내 절대 중복 없음
                                                 const thumbSrc = ABSTRACT_IMGS[(cIdx * 8 + i) % ABSTRACT_IMGS.length];

                                                 let rawText = "";
                                                 if (typeof document !== 'undefined') {
                                                     const tmp = document.createElement("DIV");
                                                     if (book.review) {
                                                         try {
                                                             tmp.innerHTML = book.review;
                                                             let text = tmp.textContent || tmp.innerText || "";
                                                             text = text.replace(/\[.*?\]/g, '').replace(/\n+/g, ' ').trim();
                                                             if (text) rawText += text + " ";
                                                         } catch (e) {
                                                             console.error(e);
                                                         }
                                                     }
                                                     if (book.ebookText) {
                                                         try {
                                                             tmp.innerHTML = book.ebookText;
                                                             let eText = tmp.textContent || tmp.innerText || "";
                                                             eText = eText.replace(/\[.*?\]/g, '').replace(/\n+/g, ' ').trim();
                                                             if (eText) rawText += eText + " ";
                                                         } catch (e) {
                                                             console.error(e);
                                                         }
                                                     }
                                                 }

                                                 let textPreview = rawText ? rawText.substring(0, 150) + "..." : (book.desc || "도서 리뷰 및 인사이트가 준비되어 있습니다.");
                                                 const encodedId = book.id || book.title.toLowerCase().replace(/\s+/g, '-');

                                                 return (
                                                     <Link key={i} to={`/review-board/${encodedId}`} className="block bg-zinc-900/60 border border-white/5 shadow-lg relative group transition-all hover:border-indigo-500/40 rounded-none overflow-hidden hover:bg-zinc-800/80">
                                                         <div className="w-full aspect-[16/10] overflow-hidden relative border-b border-white/5">
                                                             <img src={thumbSrc} alt={`${book.title} 추상 이미지`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onError={(e) => { e.target.onerror = null; e.target.src = '/images/hero_expert_v5.png'; }} />
                                                             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                                                             <div className="absolute bottom-2 left-2 right-2 flex flex-col justify-end h-full w-[calc(100%-16px)]">
                                                                 <h3 className="text-[12px] font-black text-white leading-tight drop-shadow-md line-clamp-2 break-keep">{book.title}</h3>
                                                                 {book.author && <p className="text-[9px] text-gray-300 opacity-80 mt-1 truncate">{book.author}</p>}
                                                             </div>
                                                         </div>
                                                         <div className="p-3">
                                                             <p className="text-[10px] text-gray-400 leading-[1.6] font-medium line-clamp-3 break-keep">
                                                                 {textPreview}
                                                             </p>
                                                         </div>
                                                     </Link>
                                                 );
                                             })}
                                         </div>
                                     </div>
                                 );
                             })}
                             </div>
                         {/* 📍 [애드센스 심사용 리뷰 라이브러리 끝] 📍 */}

                         {/* 📍 [애드센스 추가 심사용 5개 카테고리 도서 시작] 📍 
                             (나중에 승인 이후 주석 처리 가능) */}
                         {false && (
                         <div className="relative z-[20] px-5 mb-8">
                             <div className="flex gap-2 w-full overflow-x-auto scrollbar-hide snap-x pb-2">
                                 {Object.keys(chipToIdMap).map((chip, idx) => {
                                     // Find the first book that matches this category
                                     const matchedBook = allBooks.find(b => {
                                         const cat = (b.category || '').toLowerCase();
                                         const sec = (b.section || '').toUpperCase();
                                         const targetId = chipToIdMap[chip];
                                         
                                         if (targetId === 'SELF_DEV') return cat.includes('자기계발');
                                         if (targetId === 'ECONOMY') return cat.includes('경제');
                                         if (targetId === 'MANAGEMENT') return cat.includes('경영');
                                         if (targetId === 'HUMANITIES') return cat.includes('인문');
                                         if (targetId === 'PSYCHOLOGY') return cat.includes('심리');
                                         return false;
                                     });
                                     
                                     if (!matchedBook) return null;
                                     const encodedId = matchedBook.id || matchedBook.title.toLowerCase().replace(/\s+/g, '-');

                                     return (
                                         <Link
                                             key={chip}
                                             to={`/review-board/${encodedId}`}
                                             className="flex-shrink-0 w-32 relative group snap-start"
                                         >
                                             <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 transition-all h-full">
                                                 <span className="text-[12px] font-black tracking-tight text-orange-400">#{chip}</span>
                                                 <div className="w-full aspect-[3/4] rounded shadow-lg overflow-hidden border border-white/5 bg-zinc-800">
                                                     <img 
                                                         src={`/assets/cover_bg_${(idx % 5) + 1}.jpg`}
                                                         alt={matchedBook.title}
                                                         className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                     />
                                                 </div>
                                                 <h4 className="text-[10px] font-bold text-white leading-tight break-keep text-center line-clamp-2 w-full">
                                                     {matchedBook.title}
                                                 </h4>
                                             </div>
                                         </Link>
                                     );
                                 })}
                             </div>
                         </div>
                         )}
                         {/* 📍 [애드센스 추가 심사용 5개 카테고리 도서 끝] 📍 */}

                         {/* 📱 앱 설치 가이드 */}
                         <div className="relative w-full bg-[#0e1118] border border-white/10 px-6 py-7 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                                 <div className="absolute inset-0 bg-gradient-to-r from-orange-500/8 via-transparent to-orange-500/8 pointer-events-none" />
                                 <div className="relative z-10">
                                     <div className="flex items-center gap-2 mb-1">
                                         <span className="w-1.5 h-4 bg-orange-500 rounded-sm flex-shrink-0"></span>
                                         <h2 className="text-[15px] font-black text-white tracking-tight uppercase">앱으로 설치하기</h2>
                                     </div>
                                     <p className="text-white/40 text-[11px] font-medium mb-5 pl-4">앱 설치 없이 홈 화면에 추가하면 앱처럼 사용할 수 있어요.</p>

                                     <div className="flex gap-3 mb-4">
                                         {/* 안드로이드 버튼 */}
                                         <button
                                             onClick={() => setOpenOS(openOS === 'android' ? null : 'android')}
                                             className={`flex-1 flex items-center justify-center gap-2 py-3.5 font-black text-[13px] tracking-tight transition-all border ${openOS === 'android' ? 'bg-[#3ddc84] text-black border-[#3ddc84]' : 'bg-[#3ddc84]/10 text-[#3ddc84] border-[#3ddc84]/30 hover:bg-[#3ddc84]/20'}`}
                                         >
                                             <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341l-4.999 2.886-.001-.001L7.478 15.34C5.373 14.12 4 11.88 4 9.333V8.667C4 8.298 4.298 8 4.667 8H19.333C19.702 8 20 8.298 20 8.667v.666c0 2.547-1.373 4.787-3.477 6.008zM14 3.5a.5.5 0 01-.5.5h-3a.5.5 0 010-1h3a.5.5 0 01.5.5zM8.5 5.5A.5.5 0 018 5V3a.5.5 0 011 0v2a.5.5 0 01-.5.5zm7 0A.5.5 0 0115 5V3a.5.5 0 011 0v2a.5.5 0 01-.5.5z"/></svg>
                                             안드로이드
                                         </button>
                                         {/* 아이폰 버튼 */}
                                         <button
                                             onClick={() => setOpenOS(openOS === 'iphone' ? null : 'iphone')}
                                             className={`flex-1 flex items-center justify-center gap-2 py-3.5 font-black text-[13px] tracking-tight transition-all border ${openOS === 'iphone' ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
                                         >
                                             <svg width="12" height="14" viewBox="0 0 814 1000" fill="currentColor"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.9 0 663.5 0 541C0 341.8 129.3 236.2 256.7 236.2c63.3 0 116.2 42.8 155.8 42.8 31.6 0 107.2-45.2 172.9-45.2 34.8-.1 124.9 9.9 192.2 105.1zm-261.3-235.1c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
                                             아이폰
                                         </button>
                                     </div>

                                     {/* 안드로이드 단계 */}
                                     {openOS === 'android' && (
                                         <ol className="space-y-2 bg-[#3ddc84]/5 border border-[#3ddc84]/20 p-4">
                                             {[
                                                 '크롬으로 archiview.store 접속',
                                                 '우측 상단 ⋮ 메뉴 탭',
                                                 '"앱 설치" 또는 "홈 화면에 추가" 탭',
                                                 '설치 완료 → 앱처럼 실행'
                                             ].map((step, i) => (
                                                 <li key={i} className="flex items-start gap-2.5 text-white/70 text-[12px]">
                                                     <span className="w-5 h-5 bg-[#3ddc84]/20 text-[#3ddc84] text-[10px] font-black flex items-center justify-center flex-shrink-0">{i+1}</span>
                                                     {step}
                                                 </li>
                                             ))}
                                         </ol>
                                     )}

                                     {/* 아이폰 단계 */}
                                     {openOS === 'iphone' && (
                                         <ol className="space-y-2 bg-white/[0.04] border border-white/10 p-4">
                                             {[
                                                 '사파리로 archiview.store 접속',
                                                 '하단 공유 버튼 탭 (□↑)',
                                                 '"홈 화면에 추가" 탭',
                                                 '추가 → 앱처럼 실행'
                                             ].map((step, i) => (
                                                 <li key={i} className="flex items-start gap-2.5 text-white/70 text-[12px]">
                                                     <span className="w-5 h-5 bg-white/15 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{i+1}</span>
                                                     {step}
                                                 </li>
                                             ))}
                                         </ol>
                                     )}

                                     <p className="text-white/20 text-[10px] text-center mt-4">✓ 무료 · 앱스토어 설치 불필요 · 주소창 없는 앱 모드</p>
                                 </div>
                         </div>

                         {/* 2️⃣ Weekly Focus */}
                         {(wfTodayBooks.length > 0 || wfTodayVideos.length > 0) && (
                        <div className="relative z-[20] space-y-3 w-full bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-none pt-7 pb-7 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">Weekly Focus</h2>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">이번 주 직장인 필독 인사이트</p>
                                    </div>
                                </div>
                            </div>

                            {/* 도서 2개 */}
                            {wfTodayBooks.map((book, idx) => (
                                <div key={book.id || idx} className="relative group">
                                    <div onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)}
                                        className="cursor-pointer glass-card rounded-none p-4 flex gap-4 items-center hover:bg-white/5 transition-all w-full border border-white/5">
                                        <div className="w-[52px] h-[72px] rounded-none overflow-hidden flex-shrink-0 shadow-xl border border-white/10">
                                            <img alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={book.cover} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-[9px] font-black text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 uppercase tracking-widest">BOOK</span>
                                            </div>
                                            <h3 className="font-black text-[14px] mb-0.5 leading-snug truncate text-white">{book.title}</h3>
                                            <p className="text-[11px] text-gray-500 font-medium">{book.author}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-white/20 text-[18px] flex-shrink-0">chevron_right</span>
                                    </div>
                                </div>
                            ))}

                            {/* 유튜브 영상 2개 */}
                            {wfTodayVideos.map((v, idx) => (
                                <div key={v.id || idx} className="relative group">
                                    <a href={v.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(v.title)}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="glass-card rounded-none p-4 flex gap-4 items-center hover:bg-white/5 transition-all w-full border border-white/5 block">
                                        <div className="w-[80px] h-[46px] rounded-none overflow-hidden flex-shrink-0 shadow-xl border border-white/10 relative bg-black">
                                            {v.thumbnail
                                                ? <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                : <div className="w-full h-full flex items-center justify-center bg-red-900/30"><span className="material-symbols-outlined text-red-400 text-[24px]">play_circle</span></div>}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-[14px]">play_arrow</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-widest">YOUTUBE</span>
                                            </div>
                                            <h3 className="font-black text-[14px] mb-0.5 leading-snug line-clamp-2 text-white">{v.title}</h3>
                                            <p className="text-[11px] text-gray-500 font-medium truncate">{v.channel}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-white/20 text-[18px] flex-shrink-0">open_in_new</span>
                                    </a>
                                </div>
                            ))}
                        </div>
                        )}
                    </section>


                    {/* 3️⃣ 직장인이 많이 듣는 컨텐츠 */}
                    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-6 pt-7 pb-7">
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
                                                className="w-full h-full object-cover object-top grayscale-[30%] group-hover:grayscale-0 transition-all duration-[1500ms] group-hover:scale-110"
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

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {false && (
<>
{/* 4️⃣ 인기 아카이뷰 */}
                    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-6 pt-7 pb-7">
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
                                    <div className="flex-1 min-w-0">
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

                    {/* 📖 나의 페르소나 찾기 Banner */}
                    <motion.section
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={sectionVariants}
                        className="px-4 pt-5 pb-6"
                    >
                        {/* 섹션 헤더 */}
                        <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400 mb-1">Reading Personality Test</p>
                            <h2 className="text-[20px] font-black text-white leading-tight">나의 페르소나 찾기</h2>
                            <div className="w-8 h-[2px] bg-violet-500 mt-2 rounded-full"></div>
                        </div>
                    </motion.section>
                    <motion.section
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={sectionVariants}
                        className="px-4 pb-6"
                    >
                        <button
                            onClick={() => navigate('/quiz')}
                            className="w-full relative overflow-hidden group"
                            style={{ background: 'linear-gradient(135deg, #0f1520 0%, #1a1200 100%)', border: '1px solid rgba(212,175,55,0.25)' }}
                        >
                            {/* 배경 글로우 */}
                            <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity" style={{ background: 'rgba(212,175,55,0.06)' }} />

                            <div className="relative flex items-center gap-4 px-5 py-5">
                                {/* 아이콘 영역 */}
                                <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#d4af37' }}>psychology</span>
                                </div>

                                {/* 텍스트 */}
                                <div className="flex-1 text-left">
                                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#d4af37' }}>무료 · 3분 · 회원가입 불필요</p>
                                    <h3 className="text-[17px] font-black text-white leading-tight mb-1">나의 페르소나 찾기</h3>
                                    <p className="text-white/45 text-[11px] leading-snug">12가지 질문으로 분석하는<br />나만의 독서 유형과 맞춤 도서 추천</p>
                                </div>

                                {/* 화살표 */}
                                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                                    <div className="w-8 h-8 flex items-center justify-center" style={{ background: '#d4af37' }}>
                                        <span className="material-symbols-outlined text-black" style={{ fontSize: 18 }}>arrow_forward</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-white/30">3분</span>
                                </div>
                            </div>

                            {/* 하단 태그 */}
                            <div className="flex gap-2 px-5 pb-4">
                                {['성장형', '공감형', '사색형', '창의형'].map((tag) => (
                                    <span key={tag} className="text-[9px] font-bold px-2 py-0.5" style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.7)', border: '1px solid rgba(212,175,55,0.15)' }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </button>
                    </motion.section>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 🎬 2.5 아카이뷰 Originals Section */}
                    {false && originalContents.length > 0 && (
                        <motion.section
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={sectionVariants}
                            className="space-y-4 px-6 pt-7 pb-7"
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
                                            <div className="space-y-1">
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
                    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-6 pt-7 pb-7">
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
                        className="px-6 pt-7 pb-7"
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

                        <div className="glass-card rounded-none p-4 sm:p-6 bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                            {/* Subtle background glow */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-none pointer-events-none group-hover:bg-orange-500/20 transition-all duration-700"></div>

                            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                {/* Free Column */}
                                <div className="bg-black/40 border border-white/5 rounded-none p-3 sm:p-4 relative z-10 min-w-0">
                                    <h3 className="text-[12px] font-black text-white/50 text-center mb-4 uppercase tracking-widest border-b border-white/5 pb-2">일반 회원</h3>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-white/30 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/30 leading-tight break-keep">주간 무료 콘텐츠</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through leading-tight break-keep">모든 에피소드 감상</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through leading-tight break-keep">핵심 요약 PDF 제공</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through leading-tight break-keep">핵심 실천 가이드 제공</span>
                                        </li>
                                        <li className="flex items-center gap-2 pt-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through leading-tight break-keep">기록노트 연동 성취 트래커</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Premium Column */}
                                <div className="bg-orange-500/5 border border-orange-500/30 rounded-none p-3 sm:p-4 relative z-10 shadow-[0_0_20px_rgba(234,88,12,0.1)] min-w-0 overflow-hidden">
                                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-none shadow-lg">PRO</div>
                                    <h3 className="text-[12px] font-black text-orange-500 text-center mb-4 uppercase tracking-widest border-b border-orange-500/20 pb-2">프리미엄</h3>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/90 leading-tight break-keep">모든 팟캐스트 무제한</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/90 leading-tight break-keep">매주 2권 카톡 발송</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/90 leading-tight break-keep">전용 가이드북 다운로드</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/90 leading-tight break-keep">핵심 실천 가이드 제공</span>
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
                        className="px-6 pb-16 pt-7"
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
                        className="px-6 pb-16"
                    >
                        <div className="relative group">
                            {/* Card Background Bloom */}
                            <div className="absolute inset-0 bg-orange-600/5 blur-[50px] rounded-none pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                            <div className="relative glass-card bg-zinc-900/40 rounded-none p-10 border border-white/5 text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                                <h2 className="text-[26px] font-black mb-1.5 tracking-tight text-white">월 4,900원,</h2>
                                <p className="text-[14px] font-bold text-white/40 mb-10 tracking-widest uppercase">지금 내 삶을 바꿀 시간</p>

                                <button
                                    onClick={() => navigate('/membership')}
                                    className="w-full h-[64px] bg-orange-600 hover:bg-orange-500 text-white rounded-none font-black text-[16px] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_15px_30px_-5px_rgba(234,88,12,0.4)] mb-6"
                                >
                                    <span className="material-symbols-outlined text-[20px] font-black">rocket_launch</span>
                                    첫 달 900원으로 시작하기
                                </button>

                                <div onClick={() => navigate('/membership')} className="inline-flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors cursor-pointer py-1 px-3 rounded-none hover:bg-white/5">
                                    <span className="text-[12px] font-black tracking-widest uppercase">월 4,900원</span>
                                    <span className="material-symbols-outlined text-[14px] font-black">arrow_forward_ios</span>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                    )}
                    {/* 8️⃣ Footer */}
                    <Footer />
                </main >

                {/* 🧭 Bottom Navigation Dock (Editorial Premium Style) */}
                <BottomNavigation />
            </div >

            {/* 📱 아이폰 PWA 안내 모달 */}
            {showIphoneModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-end justify-center" onClick={() => setShowIphoneModal(false)}>
                    <div className="w-full max-w-lg bg-[#0e1118] border-t border-white/10 px-6 pt-6 pb-10 safe-area-bottom" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <svg width="16" height="18" viewBox="0 0 814 1000" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.9 0 663.5 0 541 0 341.8 129.3 236.2 256.7 236.2c63.3 0 116.2 42.8 155.8 42.8 31.6 0 107.2-45.2 172.9-45.2 34.8-.1 124.9 9.9 192.2 105.1zm-261.3-235.1c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
                                <span className="text-white font-black text-[15px]">아이폰 홈화면 추가</span>
                            </div>
                            <button onClick={() => setShowIphoneModal(false)} className="text-white/40 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <p className="text-white/40 text-[12px] mb-5">사파리 브라우저에서만 홈화면 추가가 가능합니다.</p>
                        <ol className="space-y-3">
                            {[
                                { step: '01', icon: '🌐', text: '사파리로 archiview.store 접속' },
                                { step: '02', icon: '⬆️', text: '하단 가운데 공유 버튼 탭 (□↑)' },
                                { step: '03', icon: '➕', text: '"홈 화면에 추가" 선택' },
                                { step: '04', icon: '✅', text: '우측 상단 "추가" 탭 → 완료' },
                            ].map(({ step, icon, text }) => (
                                <li key={step} className="flex items-center gap-4 p-3 bg-white/[0.04] border border-white/[0.07]">
                                    <span className="text-[10px] font-black text-white/30 w-6 flex-shrink-0">{step}</span>
                                    <span className="text-lg flex-shrink-0">{icon}</span>
                                    <span className="text-white/80 text-[13px] font-medium">{text}</span>
                                </li>
                            ))}
                        </ol>
                        <p className="text-white/20 text-[10px] text-center mt-5">앱 설치 없이 앱처럼 사용 · 무료</p>
                    </div>
                </div>
            )}
        </div >
    );
}
