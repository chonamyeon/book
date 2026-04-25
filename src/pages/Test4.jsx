import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { useBookData } from '../hooks/useBookData';
import { useAudio } from '../contexts/AudioContext';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import InsightBanner from '../components/InsightBanner';
import BookCardActions from '../components/BookCardActions';
import MainHeader from '../components/MainHeader';
import { db } from '../firebase';
import { doc, onSnapshot, getDoc, setDoc, collection } from 'firebase/firestore';
import { availableAudio } from '../data/availableAudio';
import { useSiteDesign } from '../hooks/useSiteDesign';
import { getTodayContents } from '../data/personalization';

export default function Test4() {
    const { design, loading: designLoading } = useSiteDesign();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { getAllBooks, loading: booksLoading } = useBookData();
    const { playPodcastMP3, seekPodcastMP3, podcastPlaying, podcastInfo, openScriptModal } = useAudio();
    const [showAllCelebs, setShowAllCelebs] = useState(false);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [contentMode, setContentMode] = useState('paid'); // 'free' | 'paid'
    const [celebrities, setCelebrities] = useState([]);
    const [enableDeferredData] = useState(true);

    // 셀럽 메타데이터는 지연 로드 (초기 번들에서 474KB 제외)
    useEffect(() => {
        let cancelled = false;
        const load = () => {
            import('../data/celebrities').then(m => {
                if (!cancelled) setCelebrities(m.celebrities || []);
            });
        };
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(load, { timeout: 2000 });
        } else {
            setTimeout(load, 300);
        }
        return () => { cancelled = true; };
    }, []);

    const loadJsonCache = (key, fallback = []) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : fallback;
        } catch {
            return fallback;
        }
    };

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

    // 결제 설정 로드 (회원가입 7일 이후 콘텐츠 모드)
    useEffect(() => {
        getDoc(doc(db, 'siteConfig', 'trialAccess')).then(snap => {
            if (snap.exists()) setContentMode(snap.data().mode || 'paid');
        }).catch(() => {});
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

    // 카테고리 이미지: Firestore(useSiteDesign) 데이터 우선, 없으면 기본값
    const DEFAULT_CATEGORIES = [
        { label: "일이 손에 안 잡히고 지칠 때", subLabel: "(번아웃 & 커리어 슬럼프)", img: '/images/cat_burnout_v10.png', id: 'BURNOUT' },
        { label: "내 가치를 증명하고 부를 쌓고 싶을 때", subLabel: "(연봉협상 & 경제적 자유)", img: '/images/cat_wealth_v11.png', id: 'WEALTH' },
        { label: "마음이 답답하고 위로가 필요할 때", subLabel: "(우울 & 고독 & 치유)", img: '/images/cat_healing_v8.png', id: 'HEALING' },
        { label: "어떻게 살아야 할지 막막할 때", subLabel: "(자아성찰 & 인생철학)", img: '/images/cat_philosophy_v8.png', id: 'PHILOSOPHY' }
    ];
    const firestoreCategories = design?.main_categories;
    const categories = (Array.isArray(firestoreCategories) && firestoreCategories.length === DEFAULT_CATEGORIES.length)
        ? DEFAULT_CATEGORIES.map((def, i) => ({ ...def, img: firestoreCategories[i]?.img || def.img }))
        : DEFAULT_CATEGORIES;

    // Memoized all books for efficiency
    const allBooks = useMemo(() => {
        const merged = getAllBooks(true);
        // Remove duplicates by title
        return merged.filter((book, i, arr) => arr.findIndex(b => b.title === book.title) === i);
    }, [getAllBooks]);
    const publicAllBooks = useMemo(() => allBooks.filter(b => b.isPublic !== false), [allBooks]);

    // Mapping for Category Chips to Category Page IDs
    const chipToIdMap = {
        '자기계발': 'SELF_DEV',
        '경제': 'ECONOMY',
        '경영': 'MANAGEMENT',
        '인문': 'HUMANITIES',
        '심리': 'PSYCHOLOGY'
    };

    // ── Firestore 섹션 데이터 ──────────────────────────────────────────
    const getSrcFile = (src) => {
        if (!src) return '';
        const clean = src.split('?')[0];
        const parts = clean.split('/');
        return parts[parts.length - 1].replace(/\.[^.]+$/, '').toLowerCase();
    };

    const dedupeHistory = (raw) => {
        const seenFile = new Set();
        const seenId = new Set();
        return raw.filter(h => {
            const fileKey = getSrcFile(h.src);
            const idKey = (h.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (fileKey && seenFile.has(fileKey)) return false;
            if (idKey && seenId.has(idKey)) return false;
            if (fileKey) seenFile.add(fileKey);
            if (idKey) seenId.add(idKey);
            return true;
        });
    };

    const [listenHistory, setListenHistory] = useState(() => {
        try {
            const raw = JSON.parse(localStorage.getItem('archiview_listen_history') || '[]');
            const deduped = dedupeHistory(raw);
            if (deduped.length !== raw.length) localStorage.setItem('archiview_listen_history', JSON.stringify(deduped));
            return deduped;
        } catch { return []; }
    });

    // 히스토리 변경 감지 (미니 플레이어 재생 시 업데이트)
    useEffect(() => {
        const onStorage = () => {
            try {
                const raw = JSON.parse(localStorage.getItem('archiview_listen_history') || '[]');
                setListenHistory(dedupeHistory(raw));
            } catch {}
        };
        window.addEventListener('storage', onStorage);
        const interval = setInterval(onStorage, 3000);
        return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
    }, []);

    const [weeklyFocusRaw, setWeeklyFocusRaw] = useState(() => {
        try { return JSON.parse(localStorage.getItem('wf_cache') || '[]'); } catch { return []; }
    });
    const [weeklyFocusVideos, setWeeklyFocusVideos] = useState(() => {
        try { return JSON.parse(localStorage.getItem('wfv_cache') || '[]'); } catch { return []; }
    });
    const [weeklyMostViewedRaw, setWeeklyMostViewedRaw] = useState(() => loadJsonCache('wmv_cache', []));
    const [originalArchivesRaw, setOriginalArchivesRaw] = useState(() => loadJsonCache('original_cache', []));
    const [knowledgeInsightsRaw, setKnowledgeInsightsRaw] = useState(() => loadJsonCache('insights_rank_cache', []));
    const [popularArchives, setPopularArchives] = useState([
        { id: "wealth-way", title: "부자들이 돈을 보는 방식", listens: "12.4k" },
        { id: "decision-making", title: "억만장자의 의사결정", listens: "10.1k" },
        { id: "warren-buffett", title: "워런 버핏 사고법", listens: "8.9k" },
        { id: "leverage", title: "레버리지: 부의 추월차선", listens: "7.5k" },
        { id: "story-power", title: "스토리의 힘", listens: "6.8k" },
    ]);

    useEffect(() => {
        document.title = "The Archiview | 출퇴근 15분, 성공한 사람들의 인사이트";
    }, []);

    // 위클리포커스 스케줄 자동 적용 — 월요일 6시 이후 Firestore 업데이트
    useEffect(() => {
        if (!enableDeferredData) return;
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
            } catch {}
        };
        applySchedule();
    }, [enableDeferredData]);

    useEffect(() => {
        if (!enableDeferredData) return;
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
                if (data.videos?.length) {
                    setWeeklyFocusVideos(data.videos);
                    try { localStorage.setItem('wfv_cache', JSON.stringify(data.videos)); } catch {}
                }
            }
        });
        const unsub3 = onSnapshot(doc(db, 'site_config', 'weekly_most_viewed'), (snap) => {
            if (snap.exists()) {
                const books = snap.data().books || [];
                setWeeklyMostViewedRaw(books);
                try { localStorage.setItem('wmv_cache', JSON.stringify(books)); } catch {}
            }
        });
        const unsub4 = onSnapshot(doc(db, 'site_config', 'original_archives'), (snap) => {
            if (snap.exists()) {
                const books = snap.data().books || [];
                setOriginalArchivesRaw(books);
                try { localStorage.setItem('original_cache', JSON.stringify(books)); } catch {}
            }
        });
        const unsub5 = onSnapshot(collection(db, 'youtube_videos'), (snap) => {
            const videos = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((v) => !v.hidden);
            setKnowledgeInsightsRaw(videos);
            try { localStorage.setItem('insights_rank_cache', JSON.stringify(videos)); } catch {}
        });
        return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
    }, [enableDeferredData]);

    const bookLookup = useMemo(() => {
        const map = new Map();
        publicAllBooks.forEach(b => map.set(b.id, b));
        return map;
    }, [publicAllBooks]);
    const allBookVisibility = useMemo(() => {
        const map = new Map();
        allBooks.forEach(b => map.set(b.id, b.isPublic !== false));
        return map;
    }, [allBooks]);
    const allBookVisibilityByTitle = useMemo(() => {
        const normalize = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
        const map = new Map();
        allBooks.forEach(b => {
            const key = normalize(b.title);
            if (key) map.set(key, b.isPublic !== false);
        });
        return map;
    }, [allBooks]);
    const isVisibleItem = useCallback((item) => {
        if (item?.isPublic === false) return false;
        const byId = allBookVisibility.get(item?.id);
        if (byId === false) return false;
        if (typeof byId === 'undefined') {
            const key = String(item?.title || '').replace(/\s+/g, '').toLowerCase();
            if (key && allBookVisibilityByTitle.get(key) === false) return false;
        }
        return true;
    }, [allBookVisibility, allBookVisibilityByTitle]);

    const enrich = useCallback((list) => list
        .filter(isVisibleItem)
        .map(item => {
        const bookData = bookLookup.get(item.id) || {};
        return { 
            ...bookData, 
            ...item, 
            cover: item.cover || bookData.cover || '', 
            purchaseLink: item.purchaseLink || bookData.purchaseLink || '', 
            author: item.author || bookData.author || '' 
        };
    }), [bookLookup, isVisibleItem]);

    const enrichedPopularArchives = useMemo(() => enrich(popularArchives), [popularArchives, enrich]);

    // Weekly Focus: 캐시 우선 표시 → allBooks 로드 후 enriched 버전으로 교체
    const weeklyFocusBooks = useMemo(() => {
        if (weeklyFocusRaw.length > 0) {
            const enriched = enrich(weeklyFocusRaw);
            if (publicAllBooks.length > 0) {
                try { localStorage.setItem('wf_enriched_cache', JSON.stringify(enriched)); } catch {}
                return enriched;
            }
            try {
                const cached = JSON.parse(localStorage.getItem('wf_enriched_cache') || '[]');
                if (cached.length > 0) return cached;
            } catch {}
            return enriched;
        }
        return publicAllBooks
            .filter(b => b.section === 'WEEKLY_FOCUS')
            .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
            .slice(0, 5);
    }, [weeklyFocusRaw, publicAllBooks, enrich]);

    // 개인화: 퀴즈 페르소나 + 날짜 시드로 Today Contents 선택
    const persona = localStorage.getItem('quizResult') || localStorage.getItem('myResultType') || null;
    const { todayBooks, todayVideos } = useMemo(() => {
        const books = weeklyFocusBooks.length > 0 ? weeklyFocusBooks : [];
        const videos = weeklyFocusVideos.length > 0 ? weeklyFocusVideos : [];
        if (!books.length && !videos.length) return { todayBooks: [], todayVideos: [] };
        return getTodayContents(books, videos, persona);
    }, [weeklyFocusBooks, weeklyFocusVideos, persona]);

    // 주간 최다조회: Firestore 데이터 우선, 없으면 popular_archives fallback
    const enrichedWeeklyMostViewed = useMemo(() => {
        if (weeklyMostViewedRaw.length > 0) return enrich(weeklyMostViewedRaw);
        return enrichedPopularArchives;
    }, [weeklyMostViewedRaw, enrichedPopularArchives, enrich]);

    const topKnowledgeInsights = useMemo(() => {
        const getThumb = (url) => {
            const match = String(url || '').match(/(?:v=|youtu\.be\/)([^&\s]+)/);
            return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
        };
        const safeNum = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        };
        return [...knowledgeInsightsRaw]
            .filter((v) => !v.hidden)
            .sort((a, b) => safeNum(b.views) - safeNum(a.views))
            .slice(0, 5)
            .map((v) => ({
                ...v,
                viewsCount: Math.max(safeNum(v.views), 0),
                thumbnail: getThumb(v.url),
            }));
    }, [knowledgeInsightsRaw]);

    const originalContents = useMemo(() => {
        if (originalArchivesRaw.length > 0) return enrich(originalArchivesRaw);
        return publicAllBooks.filter(b => b.section === 'ARCHIVIEW_ORIGINAL').slice(0, 20);
    }, [originalArchivesRaw, publicAllBooks, enrich]);

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
        <div className="bg-black text-white font-sans antialiased min-h-screen w-full max-w-full flex flex-col relative overflow-x-hidden selection:bg-orange-500/30">
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
                <main className="flex-grow pb-16 w-full max-w-full overflow-x-hidden">
                    <MainHeader />

                    <section className="relative pt-0 pb-0 overflow-hidden" style={{ aspectRatio: '1/1', width: '100%' }}>
                        {/* Full background image - face focused */}
                        <div className="absolute inset-0 z-0 overflow-hidden">
                            {design.main_hero?.type === 'video' && design.main_hero?.src && (
                                <video
                                    src={design.main_hero.src}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    preload="auto"
                                    poster={design.main_hero_poster || undefined}
                                    className="w-full h-full object-cover"
                                />
                            )}
                            {design.main_hero?.type !== 'video' && design.main_hero?.src && (
                                <img src={design.main_hero.src} alt="" className="w-full h-full object-cover" />
                            )}
                            {/* Left solid → transparent: 텍스트 왼쪽, 얼굴 오른쪽 */}
                            <div className="absolute inset-0" style={{
                                background: 'linear-gradient(to right, rgba(16,18,24,0.85) 35%, rgba(16,18,24,0.5) 60%, transparent 100%)'
                            }}></div>
                            {/* Bottom fade */}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent"></div>
                        </div>

                        {/* Hero Text Only */}
                        <div className="relative z-10 px-6" style={{ paddingTop: 'clamp(50px, 10vw, 60px)' }}>

                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={sectionVariants}
                                style={{ maxWidth: '60%', marginTop: 'clamp(24px, 9vw, 40px)', marginBottom: '1.5rem' }}
                            >
                                <h1 className="font-black leading-[1.3] mb-5 tracking-tight">
                                    <span style={{ fontSize: 'clamp(24px, 6.5vw, 31px)' }}>출퇴근 15분,</span><br />
                                    <span style={{ fontSize: 'clamp(18px, 5.2vw, 23px)', fontWeight: 300 }}>
                                        성공한 사람들의<br />
                                        <span className="flex items-center gap-[6px]">
                                            인사이트를 듣다
                                            <span className="inline-flex items-center gap-[2px] opacity-90 h-[24px]">
                                                <motion.div animate={{ height: [8, 14, 8] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }} className="w-[3px] bg-white rounded-sm" />
                                                <motion.div animate={{ height: [14, 20, 14] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.1 }} className="w-[3px] bg-white rounded-sm" />
                                                <motion.div animate={{ height: [18, 10, 18] }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.2 }} className="w-[3px] bg-white rounded-sm" />
                                                <motion.div animate={{ height: [10, 16, 10] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut", delay: 0.3 }} className="w-[3px] bg-white rounded-sm" />
                                            </span>
                                        </span>
                                    </span>
                                </h1>
                                <p className="text-gray-300 font-medium leading-relaxed mb-6" style={{ fontSize: 'clamp(11px, 2.5vw, 12px)' }}>
                                    책 한 권 읽을 시간 없는<br />직장인들을 위한<br />오디오 인사이트 플랫폼
                                </p>
                            </motion.div>

                        </div>

                        {/* ⭐ Social Proof Section */}
                        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-3">
                            <div className="glass-card bg-zinc-900/60 border border-white/5 rounded-none px-4 py-2 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className="material-symbols-outlined text-orange-500 text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    ))}
                                </div>
                                <h3 className="text-[12px] font-black tracking-tight text-white mb-1">이미 <span className="text-orange-500">15,400명</span>의 직장인들이 매일 아침 성장하고 있습니다.</h3>
                                <div className="relative h-[28px] overflow-hidden">
                                    {userReviews.map((review, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: idx === reviewIndex ? 1 : 0, y: idx === reviewIndex ? 0 : 10 }}
                                            transition={{ duration: 0.5 }}
                                            className="absolute inset-0 flex items-center justify-center px-2"
                                            style={{ pointerEvents: idx === reviewIndex ? 'auto' : 'none' }}
                                        >
                                            <p className="text-white text-[11px] font-bold leading-snug break-keep text-center">
                                                "{review.text}" <span className="text-orange-500/70 text-[10px] font-black whitespace-nowrap shrink-0 ml-1">- {review.name}</span>
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </section>

                        {/* 이어 듣기 섹션 */}
                        {(() => {
                            const deduped = dedupeHistory(listenHistory);
                            const items = deduped.slice(0, 2);
                            if (!items.length) return null;
                            const fmt = (s) => { if (!s || isNaN(s)) return '0:00'; const m = Math.floor(s/60); const sec = Math.floor(s%60); return `${m}:${sec<10?'0':''}${sec}`; };
                            const userName = user?.displayName?.split(' ')[0] || '';
                            return (
                                <section className="px-6 pt-7 pb-7">
                                    <div className="mb-5">
                                        <h2 className="text-[20px] font-black tracking-tight leading-none mb-1.5 text-white">
                                            {userName ? <><span className="text-orange-400">{userName}님</span>의 이어 듣기</> : '이어 듣기'}
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-[2px] bg-orange-500" />
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">멈췄던 콘텐츠를 이어서 들어보세요</p>
                                        </div>
                                    </div>
                                    <div className={`grid gap-3 ${items.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`} style={{alignItems:'stretch'}}>
                                        {items.map((item) => {
                                            const pct = item.duration > 0 ? Math.min(100, Math.round((item.currentTime / item.duration) * 100)) : 0;
                                            const remaining = item.duration > 0 ? item.duration - item.currentTime : 0;
                                            const isYt = item.id?.startsWith('yt-');
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        if (!user) { navigate('/login'); return; }
                                                        if (isYt) {
                                                            navigate(`/yt-podcast/${item.id.replace('yt-', '')}`);
                                                        } else {
                                                            playPodcastMP3(item.src, item.title, item.cover, item.id, false, item.currentTime || 0);
                                                        }
                                                    }}
                                                    className="relative flex flex-col overflow-hidden bg-[#111318] border border-zinc-700/50 hover:border-zinc-500/70 transition-all duration-300 active:scale-[0.98] text-left shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                                                >
                                                    {/* 커버 이미지 */}
                                                    <div className="relative w-full overflow-hidden bg-zinc-900" style={{aspectRatio:'3/2'}}>
                                                        <img
                                                            src={item.cover || '/images/covers/default_custom.jpg'}
                                                            alt={item.title}
                                                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                                            onError={e => { e.target.src = '/images/covers/default_custom.jpg'; }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                                                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 px-2 py-1 rounded-full">
                                                            <span className="flex items-end gap-[1px]" style={{height:10}}>
                                                                {[{h:4,d:'0s'},{h:8,d:'0.2s'},{h:10,d:'0.07s'},{h:6,d:'0.28s'},{h:3,d:'0.14s'}].map((b,i)=>(
                                                                    <span key={i} style={{display:'inline-block',width:1.2,height:b.h,borderRadius:2,background:'#f97316',animationName:'waveBar',animationDuration:'0.9s',animationTimingFunction:'ease-in-out',animationIterationCount:'infinite',animationDirection:'alternate',animationDelay:b.d}} />
                                                                ))}
                                                            </span>
                                                            <span className="text-[10px] font-black text-orange-400">{pct}%</span>
                                                        </div>
                                                    </div>
                                                    {/* 얇은 진행바 */}
                                                    <div className="w-full h-[2px] bg-zinc-800">
                                                        <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all" style={{width:`${pct}%`}} />
                                                    </div>
                                                    {/* 정보 - flex-1로 늘려서 버튼을 항상 하단에 */}
                                                    <div className="p-3 flex flex-col flex-1">
                                                        <p className="text-[12px] font-black text-white leading-snug line-clamp-2 mb-2">{item.title}</p>
                                                        <p className="text-[10px] text-zinc-500 font-medium mb-3">
                                                            {remaining > 5 ? `남은 시간 ${fmt(remaining)}` : '거의 완료'}
                                                        </p>
                                                        <div className="mt-auto flex items-center justify-center gap-1.5 py-2 bg-zinc-800/80 border border-zinc-700/50 hover:bg-zinc-700/80 transition-colors">
                                                            <span className="material-symbols-outlined text-orange-400" style={{fontSize:13,fontVariationSettings:"'FILL' 1"}}>play_circle</span>
                                                            <span className="text-[10px] font-black text-orange-400 tracking-wide">이어 재생</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })()}

                         {/* 2️⃣ Weekly Focus */}
                        <div id="weekly-focus" className="relative z-[20] space-y-4 w-full bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-none pt-7 pb-7 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                            <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">
                                        {user?.displayName?.split(' ')[0] ? <><span className="text-orange-400">{user.displayName.split(' ')[0]}님</span>의 Today Contents</> : 'Today Contents'}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                        <p className="text-[11px] font-bold text-gray-500 tracking-wide whitespace-nowrap">월요일부터 금요일까지 나에게 맞는 콘텐츠를 추천합니다.</p>
                                    </div>
                                </div>
                            </div>
                            {todayBooks.length === 0 && booksLoading ? (
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
                            ) : todayBooks.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-white/30 text-xs font-bold">도서 정보가 없습니다.</p>
                                </div>
                            ) : todayBooks.map((book, idx) => {
                                const isThisPlaying = podcastPlaying && podcastInfo?.id === book.id;
                                return (
                                    <div key={idx} className="relative group">
                                        <div onClick={() => navigate(`/review/${book.id || book.title.toLowerCase().replace(/\s+/g, '-')}`)} className="cursor-pointer glass-card rounded-none p-4 flex gap-5 items-center hover:bg-white/5 transition-all w-full border border-white/5">
                                            <div className="w-[70px] h-[98px] rounded-none overflow-hidden flex-shrink-0 shadow-xl">
                                                <img alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={book.cover} loading="lazy" decoding="async" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <h3 className="font-black text-[16px] mb-1.5 leading-snug truncate text-white">{book.title}</h3>
                                                <p className="text-[11px] text-gray-400 mb-2 line-clamp-1 italic font-medium">{cleanText(book.desc) || '성공적인 인생을 위한 핵심 근력을 키워주는 방법론...'}</p>
                                                <BookCardActions book={book} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* 유튜브 영상 2개 */}
                            {todayVideos.slice(0, 2).map((v, idx) => {
                                const ytUrl = v.youtubeUrl || `https://www.youtube.com/watch?v=${v.id}`;
                                const likesNum = v.likes ? (v.likes >= 1000 ? (v.likes / 1000).toFixed(1) + 'k' : v.likes) : null;
                                return (
                                    <div key={v.id || idx} className="relative group">
                                        <div className="glass-card rounded-none p-4 flex gap-5 items-center border border-white/5 hover:bg-white/5 transition-all w-full">
                                            {/* 썸네일 */}
                                            <div className="relative w-[70px] h-[98px] rounded-none overflow-hidden flex-shrink-0 shadow-2xl bg-black">
                                                {v.thumbnail
                                                    ? <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                                                    : <div className="w-full h-full flex items-center justify-center bg-zinc-900" />}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-white text-[15px] ml-[1px]">play_arrow</span>
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-1 pb-1">
                                                    <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">YouTube</span>
                                                </div>
                                            </div>
                                            {/* 텍스트 + 버튼 */}
                                            <div className="flex-grow min-w-0">
                                                <div className="flex items-start gap-2 mb-1.5">
                                                    <h3 className="font-black text-[15px] leading-snug line-clamp-2 text-white flex-1">{v.title}</h3>
                                                    {likesNum && (
                                                        <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                                                            <span className="material-symbols-outlined text-red-400 text-[13px]">favorite</span>
                                                            <span className="text-[10px] font-black text-red-400">{likesNum}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400 mb-3 line-clamp-1 italic font-medium">{v.desc || v.channel}</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white transition-all whitespace-nowrap">
                                                        <span className="material-symbols-outlined text-[14px]">smart_display</span>
                                                        유튜브보기
                                                    </a>
                                                    <button
                                                        onClick={() => { if (!user) { navigate('/login'); return; } navigate(`/yt-podcast/${v.id}`); }}
                                                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-none bg-gradient-to-b from-[#c02a2a] via-[#a01f1f] to-[#751515] border border-[#c0392b]/60 shadow-[0_2px_8px_rgba(160,31,31,0.5),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-2px_0_rgba(0,0,0,0.3)] text-[10px] font-black text-white transition-all whitespace-nowrap active:scale-95">
                                                        <span className="flex items-end gap-[1.5px]" style={{height:13}}>
                                                            {[{h:5,d:'0s'},{h:11,d:'0.2s'},{h:13,d:'0.07s'},{h:8,d:'0.28s'},{h:4,d:'0.14s'}].map((b,i)=>(
                                                                <span key={i} style={{display:'inline-block',width:1.5,height:b.h,borderRadius:2,background:'currentColor',animationName:'waveBar',animationDuration:'0.9s',animationTimingFunction:'ease-in-out',animationIterationCount:'infinite',animationDirection:'alternate',animationDelay:b.d}} />
                                                            ))}
                                                        </span>
                                                        팟캐스트
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>


                    {/* 3️⃣ 직장인이 많이 듣는 컨텐츠 */}
                    <motion.section id="insight" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-6 pt-7 pb-7">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5">직장인이 가장 많이 듣는 인사이트</h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">지금 직장인의 고민으로 가장 많이 듣는 인사이트</p>
                                </div>
                            </div>
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
                                                    <span className="mr-1.5 flex items-center gap-[2px]" style={{height:14}}>
                                                        {[1,2,3,4].map(i => (
                                                            <span key={i} style={{
                                                                display:'inline-block',
                                                                width:2.5,
                                                                borderRadius:2,
                                                                background:'#f97316',
                                                                animationName:'waveBar',
                                                                animationDuration:'0.9s',
                                                                animationTimingFunction:'ease-in-out',
                                                                animationIterationCount:'infinite',
                                                                animationDelay:`${(i-1)*0.15}s`,
                                                                height: i===1||i===4 ? 7 : i===2 ? 13 : 10,
                                                            }} />
                                                        ))}
                                                    </span>
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

                    {/* 쿠팡 파트너스 배너 */}
                    <div style={{ width: '100%', textAlign: 'center', paddingTop: '25px', paddingBottom: '6px' }}>
                        <iframe
                            src="https://ads-partners.coupang.com/widgets.html?id=976190&template=banner&trackingCode=AF5571749&subId=&width=320&height=100"
                            width="320"
                            height="100"
                            frameBorder="0"
                            scrolling="no"
                            referrerPolicy="unsafe-url"
                            style={{ border: 'none', display: 'inline-block' }}
                        />
                        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', margin: '2px 0 0', lineHeight: 1.2, textAlign: 'center' }}>이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
                    </div>

                    {/* 4️⃣ 인기 아카이뷰 */}
                    <motion.section id="most-viewed" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-6 pt-7 pb-7">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">최다 조회 아카이뷰</h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">이번주 가장 많이 들은 아카이뷰</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-5">
                            {enrichedWeeklyMostViewed.map((item, i) => (
                                <div key={i} className={`flex items-start gap-3 ${i !== enrichedWeeklyMostViewed.length - 1 ? 'pb-5 border-b border-white/5' : 'pb-0'}`}>
                                    <span className="text-3xl font-black text-white/50 italic w-5 text-left flex-shrink-0 pt-1 -ml-[3px]">{i + 1}</span>
                                    <Link to={`/review/${item.id || item.title.toLowerCase().replace(/\s+/g, '-')}`} className="flex-shrink-0">
                                        <div className="w-[60px] h-[82px] rounded-none overflow-hidden shadow-lg border border-white/10 bg-zinc-800">
                                            {item.cover
                                                ? <img src={item.cover} alt={item.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                                : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-white/20 text-xl">menu_book</span></div>
                                            }
                                        </div>
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <Link to={`/review/${item.id || item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                                            <h4 className="text-white font-black text-[14px] tracking-tight truncate">{item.title}</h4>
                                        </Link>
                                        {item.author && <p className="text-gray-500 text-[12px] font-medium mt-0.5 truncate">{item.author}</p>}
                                        {item.listens && <p className="text-gray-600 text-[11px] font-black mt-0.5 uppercase tracking-[0.1em]">{item.listens} LISTENS</p>}

                                        <BookCardActions book={item} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.section>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 4.5️⃣ 지식 인사이트 TOP 5 */}
                    {topKnowledgeInsights.length > 0 && (
                        <motion.section id="insights-rank" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-6 pt-7 pb-7">
                            <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">지식 인사이트</h2>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                        <p className="text-[11px] font-bold text-gray-500 tracking-wide whitespace-nowrap">유튜브에서 배우는 성공한 사람들의 인사이트</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-5">
                                {topKnowledgeInsights.map((item, i) => (
                                    <div key={item.id || i} className={`flex items-start gap-3 ${i !== topKnowledgeInsights.length - 1 ? 'pb-5 border-b border-white/5' : 'pb-0'}`}>
                                        <span className="text-3xl font-black text-white/50 italic w-5 text-left flex-shrink-0 pt-1 -ml-[3px]">{i + 1}</span>
                                        <Link to={`/yt-podcast/${item.id}`} className="flex-shrink-0">
                                            <div className="w-[60px] h-[82px] rounded-none overflow-hidden shadow-lg border border-white/10 bg-zinc-800">
                                                {item.thumbnail
                                                    ? <img src={item.thumbnail} alt={item.title || 'insight'} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                                    : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-white/20 text-xl">play_circle</span></div>
                                                }
                                            </div>
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <Link to={`/yt-podcast/${item.id}`}>
                                                <h4 className="text-white font-black text-[14px] tracking-tight truncate">{item.title || '지식 인사이트'}</h4>
                                            </Link>
                                            {item.channel && <p className="text-gray-500 text-[12px] font-medium mt-0.5 truncate">{item.channel}</p>}
                                            <p className="text-gray-600 text-[11px] font-black mt-0.5 uppercase tracking-[0.1em]">{item.viewsCount.toLocaleString()} VIEWS</p>
                                            <div className="mt-3 grid w-full grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => { if (!user) { navigate('/login'); return; } navigate(`/yt-podcast/${item.id}`); }}
                                                    className="group relative inline-flex h-[38px] w-full items-center justify-center gap-1.5 overflow-hidden border border-[#8d0a1e] bg-gradient-to-b from-[#d70e32] to-[#a30522] px-2 text-[11px] font-black tracking-[-0.01em] text-white shadow-[0_8px_20px_rgba(123,6,32,0.35)] transition-all duration-200 hover:from-[#e21239] hover:to-[#b80726]"
                                                >
                                                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-80"></span>
                                                    <span className="material-symbols-outlined text-[15px] text-white group-hover:scale-110 transition-transform">equalizer</span>
                                                    <span>팟캐스트</span>
                                                </button>
                                                {item.url && (
                                                    <a
                                                        href={item.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="group relative inline-flex h-[38px] w-full items-center justify-center gap-1.5 overflow-hidden border border-white/15 bg-gradient-to-b from-[#141820] to-[#0b0d12] px-2 text-[11px] font-black tracking-[-0.01em] text-white shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:border-white/30 hover:from-[#1a1f28] hover:to-[#10141c]"
                                                    >
                                                        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-70"></span>
                                                        <span className="material-symbols-outlined text-[15px] text-[#ffd36a] group-hover:scale-110 transition-transform">play_circle</span>
                                                        <span>유튜브보기</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 📖 나의 도서습관 알아보기 Section */}
                    <motion.section
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={sectionVariants}
                        className="px-4 pt-7 pb-7"
                    >
                        {/* Section Header */}
                        <div className="mb-6 px-1">
                            <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">나를 위한 다음 단계</h2>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-[2px]" style={{ background: '#8b5cf6' }}></div>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">READING PERSONALITY TEST</p>
                            </div>
                        </div>

                        {/* Card */}
                        <div style={{ background: '#0e0a1a', border: '1px solid rgba(139,92,246,0.25)' }}>
                            {/* Card Top: badges + image */}
                            <div className="relative flex items-start justify-between px-5 pt-5 pb-4 gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[9px] font-black px-2 py-1 tracking-[0.15em] uppercase" style={{ background: '#8b5cf6', color: '#fff' }}>무료 테스트</span>
                                        <span className="text-[9px] font-bold tracking-[0.1em] uppercase" style={{ color: 'rgba(167,139,250,0.8)' }}>아카이뷰 추천</span>
                                    </div>
                                    <h3 className="text-[19px] font-black text-white leading-[1.25] tracking-tight break-keep">
                                        "지금 나에게 맞는 책"을<br />찾고 싶다면, 먼저<br />나를 알아야 합니다
                                    </h3>
                                </div>
                                <div className="flex-shrink-0 w-[88px] h-[88px] overflow-hidden" style={{ border: '1px solid rgba(139,92,246,0.3)' }}>
                                    <img src="/images/photo_selfdev.png" alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                </div>
                            </div>

                            {/* Description */}
                            <p className="px-5 pb-4 text-[12px] text-white/45 leading-relaxed">
                                12가지 질문으로 분석하는 나만의 독서 유형. 성장형·공감형·사색형·창의형 중 어떤 유형인지 확인하고, 딱 맞는 도서와 콘텐츠를 추천받으세요.
                            </p>

                            {/* Checklist */}
                            <div className="px-5 pb-5 space-y-2.5">
                                {[
                                    '나의 독서 성향과 강점 파악',
                                    '유형별 맞춤 도서 & 오디오 추천',
                                    '독서 습관을 바꿀 1년·5년·10년 로드맵',
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 15, marginTop: 1, color: '#8b5cf6' }}>check_circle</span>
                                        <span className="text-[12px] text-white/60 font-medium leading-snug">{item}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Button */}
                            <div className="px-5 pb-5">
                                <button
                                    onClick={() => {
                                        if (!user) {
                                            sessionStorage.setItem('loginRedirect', '/quiz');
                                            navigate('/login');
                                        } else {
                                            const savedResult = localStorage.getItem('quizResult');
                                            const savedScores = localStorage.getItem('quizScores');
                                            if (savedResult && savedScores) {
                                                navigate('/result', { state: { resultType: savedResult, scores: JSON.parse(savedScores) } });
                                            } else {
                                                navigate('/quiz');
                                            }
                                        }
                                    }}
                                    className="w-full h-[54px] flex items-center justify-center gap-2 font-black text-[14px] tracking-tight transition-all active:scale-95"
                                    style={{ background: user && localStorage.getItem('quizResult') ? '#111111' : '#8b5cf6', color: '#fff', border: user && localStorage.getItem('quizResult') ? '1px solid rgba(255,255,255,0.15)' : 'none' }}
                                >
                                    {user && localStorage.getItem('quizResult') ? '내 결과 보기' : '독서 성향 테스트 시작하기'}
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                                </button>
                                <p className="text-center text-[10px] text-white/20 mt-2.5 leading-snug">
                                    * 약 3분 소요 · 무료 · 회원가입 불필요
                                </p>
                            </div>
                        </div>
                    </motion.section>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 🎬 2.5 아카이뷰 Originals Section */}
                    {originalContents.length > 0 && (
                        <motion.section
                            id="original"
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
                                                loading="lazy"
                                                decoding="async"
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

                                            <BookCardActions book={content} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* ✨ 2.8 Celeb Picks Section */}
                    <motion.section id="celeb" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-6 pt-7 pb-7">
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
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter truncate w-full text-center">{celeb.role}</p>
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

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 6️⃣ 추천 역량 강화 (CPA Promotion - Video Production) */}
                    <motion.section
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={sectionVariants}
                        className="px-4 sm:px-6 pt-7 pb-7 w-full max-w-full"
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">성장을 위한 다음 단계</h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Creator Insights</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative group overflow-hidden glass-card bg-[#13151a] border border-white/5 rounded-none p-6 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-600/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-purple-600/20 transition-all duration-700"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="bg-purple-600/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded-none uppercase tracking-tighter shadow-lg">FREE COURSE</span>
                                    <span className="text-zinc-500 text-[11px] font-medium tracking-tight italic">아카이뷰 추천</span>
                                </div>
                                <h3 className="text-white text-[18px] font-black leading-tight break-keep mb-4">온라인 강의 100%<br />무료 수강 이벤트!</h3>

                                <p className="text-zinc-400 text-[12px] font-medium leading-relaxed mb-5 break-keep">
                                    사회공헌활동의 일환으로 조건 없이 3과정까지 무료 수강 기회를 제공합니다. 온라인에서 언제 어디서나 수강 가능하며, 시험 합격 시 자격증 신청도 가능합니다.
                                </p>

                                <div className="space-y-2.5 mb-7 bg-white/[0.02] p-4 border-l border-purple-500/40">
                                    {[
                                        "개설 과정 중 3과정 전액 무료 수강",
                                        "종강 후에도 완료 과정 무료 복습 가능",
                                        "교재 및 시험예상문답 무료 다운로드"
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-3">
                                            <span className="material-symbols-outlined text-purple-500 text-[16px] mt-0.5">check_circle</span>
                                            <span className="text-zinc-300 text-[12px] font-bold leading-tight">{item}</span>
                                        </div>
                                    ))}
                                </div>

                                <a
                                    href="http://dbdbdeep.com/ma/link.php?lncd=S00278634FC05984642W"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full h-14 bg-white text-black font-black text-[15px] flex items-center justify-center gap-2 hover:bg-purple-600 hover:text-white transition-all active:scale-95 shadow-[0_15px_35px_rgba(147,51,234,0.2)]"
                                >
                                    무료 수강 신청하기
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </a>

                                <p className="mt-5 text-[9px] text-zinc-600 font-medium text-center opacity-80">
                                    * 위 링크를 통해 신청 시 아카이뷰는 제휴 마케팅 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </motion.section>

                    
                    {/* 5️⃣ 멤버십 안내 (구버전 숨김) */}
                    {false && (
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
                        <div className="mb-2 bg-zinc-900/50 border border-white/5 p-5 rounded-none relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full -mr-10 -mt-10"></div>
                            
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 mb-4">
                                <div className="flex items-end gap-[2px] h-4">
                                    {[1,2,3,4,5].map(i => (
                                        <motion.div key={i} className="w-[3px] bg-orange-500"
                                            animate={{ height: ['30%','100%','30%'] }}
                                            transition={{ repeat: Infinity, duration: 0.8 + (i % 3) * 0.2, ease: 'easeInOut' }} />
                                    ))}
                                </div>
                                <span className="text-orange-500 text-[11px] font-bold tracking-[0.25em] uppercase">CREATOR INSIGHTS v2</span>
                            </motion.div>
                            
                            <motion.h3 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                                className="text-[20px] font-black tracking-tight leading-none mb-4 text-white">
                                아카이뷰는<br />
                                <span className="text-orange-500">이런 분께 추천합니다</span>
                            </motion.h3>
                            <div className="space-y-3">
                                {[
                                    "직장을 다니지만 지적 채워짐이 필요하신 분",
                                    "친구에게 책을 선물하고 싶은데 선택이 어려우신 분",
                                    "성장하고 싶은데 항상 제자리라 느껴지시는 분",
                                    "성공한 사람들의 인사이트가 절실하신 분",
                                    "서점 가기 전, 무슨 도서를 살지 고민되시는 분"
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex items-start gap-3 bg-white/[0.02] border border-white/5 rounded-lg p-3"
                                    >
                                        <span className="material-symbols-outlined text-orange-500 text-[18px] mt-0.5">check_circle</span>
                                        <p className="text-white/80 text-[12px] leading-relaxed flex-1">{item}</p>
                                    </motion.div>
                                ))}
                            </div>
                            <p className="mt-4 text-[12px] font-medium text-gray-500 bg-white/5 p-2 border-l-2 border-orange-500/30">
                                아카이뷰를 통해 바쁜 일상 속에서도 당신만의 <span className="text-white">지식과 통찰</span>을 얻을 수 있습니다.
                            </p>
                        </div>

                        <div className="glass-card rounded-none p-4 sm:p-6 bg-white/[0.02] border border-white/5 relative overflow-hidden group w-full max-w-full">
                            {/* Subtle background glow */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-none pointer-events-none group-hover:bg-orange-500/20 transition-all duration-700"></div>

                            <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-2 sm:gap-4 w-full">
                                {/* Free Column */}
                                <div className="bg-black/40 border border-white/5 rounded-none p-3 sm:p-4 relative z-10 min-w-0">
                                    <h3 className="text-[12px] font-black text-white/50 text-center mb-4 uppercase tracking-widest border-b border-white/5 pb-2">일반 회원</h3>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-white/30 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/30 leading-tight break-words whitespace-normal">주간 무료 콘텐츠</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through leading-tight break-words whitespace-normal">모든 에피소드 감상</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through leading-tight break-words whitespace-normal">핵심 요약 PDF 제공</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through leading-tight break-words whitespace-normal">핵심 실천 가이드 제공</span>
                                        </li>
                                        <li className="flex items-center gap-2 pt-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through leading-tight break-words whitespace-normal">기록노트 연동 성취 트래커</span>
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
                                            <span className="text-[11px] font-bold text-white/90 leading-tight break-words whitespace-normal">모든 팟캐스트 무제한</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/90 leading-tight break-words whitespace-normal">매주 2권 카톡 발송 <span className="text-white/40 font-normal">(6월 서비스 예정)</span></span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/90 leading-tight break-words whitespace-normal">유튜브 지식 인사이트 무제한</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/90 leading-tight break-words whitespace-normal">핵심 실천 가이드 제공</span>
                                        </li>
                                        <li className="flex items-start gap-2 bg-orange-500/10 p-2.5 rounded-none border border-orange-500/20 mt-3 shadow-inner">
                                            <span className="material-symbols-outlined text-orange-500 text-[16px]">fact_check</span>
                                            <div className="flex-1 mt-0.5">
                                                <span className="text-[11px] font-black text-orange-400 block mb-0.5 tracking-tight">기록노트 연동 성취 트래커</span>
                                                <span className="text-[11px] font-bold text-white/60 leading-tight block break-keep">제공된 가이드를 실천하고, 기록노트에서 달성률을 체크하며 성장하세요.</span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                    )}

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 5.5️⃣ 멤버십 추천 안내 (요청 복원) */}
                    <motion.section
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={sectionVariants}
                        className="px-4 sm:px-6 pt-7 pb-3 w-full max-w-full"
                    >
                        <div className="mb-6">
                            <h3 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">아카이뷰는 이런 분께 추천합니다</h3>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Membership Recommendation</p>
                            </div>
                        </div>
                        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-none relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full -mr-10 -mt-10"></div>
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
                                        <span className="text-[12px] font-bold text-gray-300 leading-relaxed break-keep">{item}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-[12px] font-medium text-gray-500 bg-white/5 p-2 border-l-2 border-orange-500/30">
                                아카이뷰를 통해 바쁜 일상 속에서도 당신만의 <span className="text-white">지식과 통찰</span>을 얻을 수 있습니다.
                            </p>
                        </div>
                    </motion.section>

                    {/* 7️⃣ 어떻게 이용하나요? (How it Works) */}
                    {false && (
                    <>
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
                                    <p className="text-[12px] text-zinc-500 font-medium leading-relaxed">번아웃, 연봉협상 등 지금 내게 필요한<br />카테고리에서 책을 고릅니다.</p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-4 items-start relative z-10">
                                <div className="w-12 h-12 rounded-none bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                                    <span className="material-symbols-outlined text-orange-500">headphones</span>
                                </div>
                                <div className="pt-2">
                                    <h3 className="text-[14px] font-black text-orange-500 mb-1 tracking-tight">출퇴근 15분 오디오</h3>
                                    <p className="text-[12px] text-zinc-500 font-medium leading-relaxed">성공한 사람들의 생각과 핵심 레슨을<br />이동하며 스마트하게 듣습니다.</p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-4 items-start relative z-10">
                                <div className="w-12 h-12 rounded-none bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                                    <span className="material-symbols-outlined text-white/60">auto_awesome</span>
                                </div>
                                <div className="pt-2">
                                    <h3 className="text-[14px] font-black text-white mb-1 tracking-tight">핵심 요약본으로 복습</h3>
                                    <p className="text-[12px] text-zinc-500 font-medium leading-relaxed">스크립트와 인사이트 요약본을 통해<br />내 삶에 즉각적으로 적용합니다.</p>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>
                    </>
                    )}

                    {/* 8️⃣ CTA */}
                    <motion.section
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={sectionVariants}
                        className="px-6 pt-3 pb-3"
                    >
                        <div className="relative group">
                            <div className="absolute inset-0 bg-orange-600/5 blur-[50px] rounded-none pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                            <div className="relative glass-card bg-zinc-900/40 rounded-none p-6 border border-white/5 text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                                {contentMode === 'free' ? (
                                    <>
                                        {/* 선착순 배지 */}
                                        <div className="inline-flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 px-3 py-1 rounded-full mb-4">
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                                            <span className="text-[11px] font-bold text-orange-400 tracking-widest uppercase">Limited Free Access</span>
                                        </div>
                                        <h2 className="text-[22px] font-black mb-1 tracking-tight text-white leading-snug">지금 가입하면<br /><span className="text-orange-400">선착순 1,000명</span> 무료!</h2>
                                        <p className="text-[12px] text-white/40 mb-4 mt-1">1,000명 가입 완료시 이벤트 종료 예정!</p>
                                        {/* 프로그레스바 + 남은 자리 */}
                                        {(() => {
                                            const start = new Date('2026-04-20T00:00:00+09:00').getTime();
                                            const end = new Date('2026-05-31T23:59:59+09:00').getTime();
                                            const now = Date.now();
                                            const total = end - start;
                                            const elapsed = Math.min(Math.max(now - start, 0), total);
                                            const remaining = Math.round(1000 - (elapsed / total) * 1000);
                                            const pct = Math.round((elapsed / total) * 100);
                                            return (
                                                <div className="mb-6">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className="text-[11px] text-white/50">마감까지</span>
                                                        <span className="text-[13px] font-black text-orange-400">{remaining.toLocaleString()}명 남음</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all"
                                                            style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-[10px] text-white/30">0명</span>
                                                        <span className="text-[10px] text-white/30">1,000명 마감</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => navigate('/login')}
                                                className="w-full h-[64px] bg-orange-600 hover:bg-orange-500 text-white rounded-none font-black text-[16px] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_15px_30px_-5px_rgba(234,88,12,0.4)]"
                                            >
                                                <span className="material-symbols-outlined text-[20px] font-black">person_add</span>
                                                회원가입하기
                                            </button>
                                            <button
                                                onClick={() => navigate('/login')}
                                                className="w-full h-[56px] bg-white/10 hover:bg-white/15 text-white rounded-none font-bold text-[15px] flex items-center justify-center gap-3 transition-all border border-white/10"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">login</span>
                                                로그인하기
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.section>

                    {/* 8.5️⃣ 프리미엄 배너 (CTA 아래 이동) */}
                    <motion.section
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={sectionVariants}
                        className="px-6 pt-3 pb-7"
                    >
                        <div className="glass-card rounded-none p-5 sm:p-6 bg-white/[0.02] border border-orange-500/30 relative overflow-hidden w-full max-w-full shadow-[0_0_20px_rgba(234,88,12,0.1)]">
                            <div className="absolute top-2 right-2 bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-none shadow-lg">PRO</div>
                            <h3 className="text-[14px] font-black text-orange-500 text-center mb-4 uppercase tracking-widest border-b border-orange-500/20 pb-2">프리미엄</h3>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                    <span className="text-[12px] font-bold text-white/90 leading-tight break-words whitespace-normal">모든 팟캐스트 무제한</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                    <span className="text-[12px] font-bold text-white/90 leading-tight break-words whitespace-normal">매주 2권 카톡 발송 <span className="text-white/40 font-normal">(6월 서비스 예정)</span></span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                    <span className="text-[12px] font-bold text-white/90 leading-tight break-words whitespace-normal">유튜브 지식 인사이트 무제한</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                    <span className="text-[12px] font-bold text-white/90 leading-tight break-words whitespace-normal">핵심 실천 가이드 제공</span>
                                </li>
                                <li className="flex items-start gap-2 bg-orange-500/10 p-2.5 rounded-none border border-orange-500/20 mt-3 shadow-inner">
                                    <span className="material-symbols-outlined text-orange-500 text-[16px]">fact_check</span>
                                    <div className="flex-1 mt-0.5">
                                        <span className="text-[12px] font-black text-orange-400 block mb-0.5 tracking-tight">기록노트 연동 성취 트래커</span>
                                        <span className="text-[11px] font-bold text-white/60 leading-tight block break-keep">제공된 가이드를 실천하고, 기록노트에서 달성률을 체크하며 성장하세요.</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </motion.section>
                    {/* 8️⃣ Footer */}
                    <Footer />
                </main >

                {/* 🧭 Bottom Navigation Dock (Editorial Premium Style) */}
                <BottomNavigation />
            </div >

        </div >
    );
}
