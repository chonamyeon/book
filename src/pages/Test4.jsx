import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../hooks/useAuth';
import { useSavedBooks } from '../hooks/useSavedBooks';
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
import { useSeoulCalendarDayKey } from '../hooks/useCalendarDay';
import { resolvePodcastPlaySrc } from '../utils/resolvePodcastPlaySrc';

export default function Test4() {
    const { design, loading: designLoading } = useSiteDesign();
    const { user } = useAuth();
    const { savedBooks, addBook: addSavedBook } = useSavedBooks(user);
    const [persona, setPersona] = useState(() => localStorage.getItem('quizResult') || localStorage.getItem('myResultType') || null);
    const [quizScoresState, setQuizScoresState] = useState(() => { try { return JSON.parse(localStorage.getItem('quizScores') || 'null'); } catch { return null; } });
    const seoulYmd = useSeoulCalendarDayKey();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    // autoplay intent: searchParams 감지 → state로 보존 (SW navigate & 초기 로드 모두 처리)
    const [autoplayIntent, setAutoplayIntent] = useState(null);
    const [autoplayOverlay, setAutoplayOverlay] = useState(null); // { intent, book }
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
        }, 6000);
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
        try { src = decodeURIComponent(src); } catch {}
        const clean = src.split('?')[0];
        const parts = clean.split('/');
        return parts[parts.length - 1].replace(/\.[^.]+$/, '').toLowerCase();
    };

    const dedupeHistory = (raw) => {
        // 1단계: id도 없고 재생 데이터도 없는 완전한 불량 항목 제거
        const cleaned = raw.filter(h => h.id || (h.duration > 0) || (h.currentTime > 0));

        // 2단계: 완전한 데이터(id+duration)를 가진 항목이 dedup에서 먼저 살아남도록 정렬
        const sorted = [...cleaned].sort((a, b) => {
            const sA = (a.id ? 2 : 0) + (a.duration > 0 ? 1 : 0);
            const sB = (b.id ? 2 : 0) + (b.duration > 0 ? 1 : 0);
            if (sB !== sA) return sB - sA;
            return (b.timestamp || 0) - (a.timestamp || 0);
        });

        // 3단계: 파일명·id·타이틀 + 교차 비교(한글 제목 ↔ 영문 id)로 중복 제거
        const seenFile = new Set();
        const seenId = new Set();
        const seenTitle = new Set();
        return sorted.filter(h => {
            const fileKey = getSrcFile(h.src);
            const idKey = (h.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const titleKey = (h.title || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9가-힣]/g, '');
            if (fileKey && seenFile.has(fileKey)) return false;
            if (idKey && seenId.has(idKey)) return false;
            if (titleKey && seenTitle.has(titleKey)) return false;
            // 교차 비교: title="stoner" ↔ id="stoner" 매칭 (한글/영문 같은 책)
            if (titleKey && seenId.has(titleKey)) return false;
            if (idKey && seenTitle.has(idKey)) return false;
            if (fileKey) seenFile.add(fileKey);
            if (idKey) seenId.add(idKey);
            if (titleKey) seenTitle.add(titleKey);
            return true;
        });
    };

    const [listenHistory, setListenHistory] = useState(() => {
        try {
            const raw = JSON.parse(localStorage.getItem('archiview_listen_history') || '[]');
            return dedupeHistory(raw);
        } catch { return []; }
    });

    // 로그인 시 Firestore에서 히스토리 + 페르소나 로드
    useEffect(() => {
        if (!user) return;
        getDoc(doc(db, 'users', user.uid)).then(snap => {
            if (!snap.exists()) return;
            const data = snap.data();
            // 이어듣기 히스토리
            if (data.listenHistory?.length) {
                const remote = data.listenHistory;
                const local = JSON.parse(localStorage.getItem('archiview_listen_history') || '[]');
                const merged = [...remote];
                for (const h of local) {
                    const localTitle = (h.title || '').toLowerCase();
                    const isDup = merged.some(r =>
                        (r.id && h.id && r.id === h.id) ||
                        (r.title && h.title && r.title.toLowerCase() === localTitle)
                    );
                    if (!isDup) merged.push(h);
                }
                const deduped = dedupeHistory(merged.sort((a, b) => b.timestamp - a.timestamp)).slice(0, 20);
                setListenHistory(deduped);
                localStorage.setItem('archiview_listen_history', JSON.stringify(deduped));
                // Firestore의 불량 데이터도 정제된 버전으로 영구 덮어쓰기
                setDoc(doc(db, 'users', user.uid), { listenHistory: deduped }, { merge: true }).catch(() => {});
            }
            // 페르소나
            const remotePersona = data.quizResult || data.myResultType;
            if (remotePersona) {
                setPersona(remotePersona);
                localStorage.setItem('quizResult', remotePersona);
            }
            if (data.quizScores) {
                setQuizScoresState(data.quizScores);
                try { localStorage.setItem('quizScores', JSON.stringify(data.quizScores)); } catch {}
            }
        }).catch(() => {});
    }, [user?.uid]);

    // 히스토리 변경 감지 (미니 플레이어 재생 시 업데이트)
    useEffect(() => {
        const onStorage = () => {
            try {
                const raw = JSON.parse(localStorage.getItem('archiview_listen_history') || '[]');
                setListenHistory(dedupeHistory(raw));
            } catch {}
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
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

    // weekly_focus_schedule(주마다 2권)으로 weekly_focus(60권) 자동 덮어쓰기 제거 — 60권이 2권으로 사라지던 원인

    // 사이트 콘텐츠는 거의 변경되지 않으므로 onSnapshot(실시간) → getDoc(1회 fetch)로 변경
    // 발열·배터리 절약: 5개 WebSocket 상시 연결 제거
    useEffect(() => {
        if (!enableDeferredData) return;
        let cancelled = false;

        (async () => {
            try {
                const [s1, s2, s3, s4] = await Promise.all([
                    getDoc(doc(db, 'site_config', 'popular_archives')),
                    getDoc(doc(db, 'site_config', 'weekly_focus')),
                    getDoc(doc(db, 'site_config', 'weekly_most_viewed')),
                    getDoc(doc(db, 'site_config', 'original_archives')),
                ]);
                if (cancelled) return;

                if (s1.exists() && s1.data().books?.length) setPopularArchives(s1.data().books);
                if (s2.exists()) {
                    const data = s2.data();
                    if (data.books?.length) {
                        setWeeklyFocusRaw(data.books);
                        try { localStorage.setItem('wf_cache', JSON.stringify(data.books)); } catch {}
                    }
                    if (data.videos?.length) {
                        setWeeklyFocusVideos(data.videos);
                        try { localStorage.setItem('wfv_cache', JSON.stringify(data.videos)); } catch {}
                    }
                }
                if (s3.exists()) {
                    const books = s3.data().books || [];
                    setWeeklyMostViewedRaw(books);
                    try { localStorage.setItem('wmv_cache', JSON.stringify(books)); } catch {}
                }
                if (s4.exists()) {
                    const books = s4.data().books || [];
                    setOriginalArchivesRaw(books);
                    try { localStorage.setItem('original_cache', JSON.stringify(books)); } catch {}
                }

                // youtube_videos: collection getDocs 한 번만
                const { getDocs } = await import('firebase/firestore');
                const ytSnap = await getDocs(collection(db, 'youtube_videos'));
                if (cancelled) return;
                const videos = ytSnap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .filter((v) => !v.hidden);
                setKnowledgeInsightsRaw(videos);
                try { localStorage.setItem('insights_rank_cache', JSON.stringify(videos)); } catch {}
            } catch {}
        })();

        return () => { cancelled = true; };
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

    // 위클리: 어드민·Firestore 순서와 **권 수 전체**로 짝(2권) 슬롯을 돌리므로 isVisibleItem 으로 줄이지 않음
    // (줄이면 2권만 남고 pairCount=1 → 자정이 돼도 (0,1)만 나와 "안 바뀌는" 것처럼 보임)
    const enrichWeeklyList = useCallback((list) => (list || []).map((item) => {
        const bookData = bookLookup.get(item.id) || {};
        return {
            ...bookData,
            ...item,
            cover: item.cover || bookData.cover || '',
            purchaseLink: item.purchaseLink || bookData.purchaseLink || '',
            author: item.author || bookData.author || '',
            podcastFile: bookData.podcastFile || item.podcastFile,
        };
    }), [bookLookup]);

    const enrich = useCallback((list) => list
        .filter(isVisibleItem)
        .map(item => {
        const bookData = bookLookup.get(item.id) || {};
        return { 
            ...bookData, 
            ...item, 
            cover: item.cover || bookData.cover || '', 
            purchaseLink: item.purchaseLink || bookData.purchaseLink || '', 
            author: item.author || bookData.author || '',
            // 주간 슬롯(item)이 오래된 podcastFile을 넣는 경우 → 카탈로그(bookData) 우선
            podcastFile: bookData.podcastFile || item.podcastFile,
        };
    }), [bookLookup, isVisibleItem]);

    const enrichedPopularArchives = useMemo(() => enrich(popularArchives), [popularArchives, enrich]);

    // Weekly Focus: 캐시 우선 표시 → allBooks 로드 후 enriched 버전으로 교체
    const weeklyFocusBooks = useMemo(() => {
        if (weeklyFocusRaw.length > 0) {
            const enriched = enrichWeeklyList(weeklyFocusRaw);
            if (publicAllBooks.length > 0) {
                try { localStorage.setItem('wf_enriched_cache', JSON.stringify(enriched)); } catch {}
                return enriched;
            }
            // 카탈로그 로딩 전: 옛날에 캐시된 짧은 목록(5권 등)이 60권 머지를 덮지 않게 함
            try {
                const cached = JSON.parse(localStorage.getItem('wf_enriched_cache') || '[]');
                if (cached.length > 0 && cached.length >= enriched.length) return cached;
            } catch {}
            return enriched;
        }
        return publicAllBooks
            .filter(b => b.section === 'WEEKLY_FOCUS')
            .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
            .slice(0, 5);
    }, [weeklyFocusRaw, publicAllBooks, enrichWeeklyList]);

    // 오늘의 2권/2영상: seoulYmd(YYYYMMDD)가 바뀌면(한국 자정) 자동 갱신 — useSyncExternalStore
    const { todayBooks, todayVideos } = useMemo(() => {
        const books = weeklyFocusBooks.length > 0 ? weeklyFocusBooks : [];
        const videos = weeklyFocusVideos.length > 0 ? weeklyFocusVideos : [];
        if (!books.length && !videos.length) return { todayBooks: [], todayVideos: [] };
        return getTodayContents(books, videos, null, seoulYmd);
    }, [weeklyFocusBooks, weeklyFocusVideos, seoulYmd]);

    // 1단계: ?autoplay 파라미터 감지 → state 보존 + URL 즉시 클리어
    // searchParams가 바뀔 때마다 실행 → 초기 로드 & SW client.navigate() 모두 처리
    useEffect(() => {
        const intent = searchParams.get('autoplay');
        if (!intent) return;
        setAutoplayIntent(intent);
        setSearchParams({}, { replace: true });
    }, [searchParams, setSearchParams]);

    // FCM_AUTOPLAY는 App 레벨 AutoplayRouter에서 /?autoplay= 로 navigate 처리
    // → 위 searchParams 감지 effect가 자동으로 autoplayIntent 설정

    // 2단계: 출퇴근 ?autoplay= — 오늘 도서 로딩 후 자동 재생, 브라우저가 막을 때만 터치 오버레이
    useEffect(() => {
        if (!autoplayIntent) return;
        if (todayBooks.length === 0) {
            const cancel = setTimeout(() => setAutoplayIntent(null), 15000);
            return () => clearTimeout(cancel);
        }

        const savedIntent = autoplayIntent;
        const book = savedIntent === 'back' && todayBooks[1] ? todayBooks[1] : todayBooks[0];
        if (!book) {
            setAutoplayIntent(null);
            return;
        }
        const src = resolvePodcastPlaySrc(book, (bid) => bookLookup.get(bid));
        if (!src) {
            setAutoplayIntent(null);
            return;
        }
        const sid = book.id || String(book.title || '').toLowerCase().replace(/\s+/g, '-');
        const bookPayload = { ...book, src };

        const tid = setTimeout(() => {
            setAutoplayIntent(null);
            playPodcastMP3(
                src,
                book.title,
                book.cover,
                sid,
                true,
                0,
                () => setAutoplayOverlay({ intent: savedIntent, book: bookPayload })
            );
        }, 0);

        return () => clearTimeout(tid);
    }, [autoplayIntent, todayBooks, bookLookup, playPodcastMP3]);

    // SW 타이머 재등록: SW는 30초 후 종료돼 타이머가 날아가므로 앱 열 때마다 재등록
    useEffect(() => {
        const reRegisterSW = () => {
            if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
            if (!('serviceWorker' in navigator)) return;
            const on = localStorage.getItem('commute_on') === 'true';
            if (!on) return;
            const commuteGo = localStorage.getItem('commute_go');
            const commuteBack = localStorage.getItem('commute_back');
            if (!commuteGo && !commuteBack) return;
            let commuteDays;
            try { commuteDays = JSON.parse(localStorage.getItem('commute_days')) || [0,1,2,3,4]; }
            catch { commuteDays = [0,1,2,3,4]; }
            navigator.serviceWorker.ready.then((reg) => {
                if (reg?.active) reg.active.postMessage({ type: 'SCHEDULE_NOTIFICATIONS', commuteGo, commuteBack, commuteDays });
            }).catch(() => {});
        };
        reRegisterSW(); // 마운트 시
        const onVisible = () => { if (document.visibilityState === 'visible') reRegisterSW(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

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

    const handleAutoplayOverlayTap = () => {
        if (!autoplayOverlay) return;
        const { book } = autoplayOverlay;
        setAutoplayOverlay(null);
        const sid = book.id || book.title?.toLowerCase().replace(/\s+/g, '-');
        playPodcastMP3(book.src, book.title, book.cover, sid, true, 0);
    };

    return (
        <>
        {/* 알림 탭 자동재생 오버레이 */}
        {autoplayOverlay && (
            <div
                onClick={handleAutoplayOverlayTap}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.82)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 20, cursor: 'pointer',
                }}
            >
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {autoplayOverlay.intent === 'go' ? '출근길 콘텐츠' : '퇴근길 콘텐츠'}
                </div>
                {autoplayOverlay.book.cover && (
                    <img src={autoplayOverlay.book.cover} alt="" style={{ width: 100, height: 100, borderRadius: 16, objectFit: 'cover', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} />
                )}
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', textAlign: 'center', maxWidth: 260, lineHeight: 1.4 }}>
                    {autoplayOverlay.book.title}
                </div>
                <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#f97316,#fb923c)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 32px rgba(249,115,22,0.6)',
                    marginTop: 8,
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#fff' }}>play_arrow</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                    탭하면 바로 재생됩니다
                </div>
            </div>
        )}
        <Helmet>
            <title>아카이뷰 ARCHIVIEW | 출퇴근길 책 요약, 인사이트, 오디오 독서</title>
            <meta name="description" content="독서 성향 분석, 맞춤 도서 추천, 책 핵심 요약 오디오까지. 출퇴근 15분으로 성공한 사람들의 인사이트를 들어보세요." />
            <meta property="og:title" content="아카이뷰 ARCHIVIEW | 출퇴근길 책 요약, 인사이트, 오디오 독서" />
            <meta property="og:description" content="독서 성향 분석, 맞춤 도서 추천, 책 핵심 요약 오디오까지. 출퇴근 15분으로 성공한 사람들의 인사이트를 들어보세요." />
            <meta property="og:url" content="https://archiview.store/" />
            <link rel="canonical" href="https://archiview.store/" />
        </Helmet>
        <div className="bg-black text-white font-sans antialiased min-h-[100dvh] w-full max-w-full flex flex-col relative overflow-x-hidden selection:bg-orange-500/30">
            {/* Styles Injection for Glassmorphism */}
            <style>{`
                .glass-card {
                    background: rgba(18, 20, 28, 0.92);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .cursive-font {
                    font-family: 'Alex Brush', cursive;
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="max-w-md mx-auto w-full flex-grow relative flex flex-col">
                <main className="flex-grow pb-16 w-full max-w-full">
                    <MainHeader />

                    <section className="relative pt-0 pb-0 overflow-hidden" style={{ aspectRatio: '1/1', width: '100%' }}>
                        {/* Full background image - face focused */}
                        <div className="absolute inset-0 z-0 overflow-hidden">
                            {design.main_hero.type === 'image' ? (
                                <img src={design.main_hero.src} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <video
                                    src={design.main_hero.src}
                                    poster={design.main_hero_poster || undefined}
                                    className="w-full h-full object-cover"
                                    autoPlay muted loop playsInline
                                />
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
                                            <span className="av-loader-bars opacity-90" style={{ height: 20, gap: 2 }}>
                                                <span style={{ height: 8 }} /><span style={{ height: 14 }} />
                                                <span style={{ height: 18 }} /><span style={{ height: 10 }} />
                                            </span>
                                        </span>
                                    </span>
                                </h1>
                                <p className="text-gray-300 font-medium leading-relaxed mb-6" style={{ fontSize: 'clamp(11px, 2.5vw, 12px)' }}>
                                    책 한 권 읽을 시간 없는<br />직장인들을 위한<br />오디오 인사이트 플랫폼
                                </p>
                            </motion.div>

                        </div>

                        {/* ⭐ Social Proof — 히어로 하단에 자연스럽게 융화 */}
                        <div className="absolute bottom-0 left-0 right-0 z-10"
                            style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.72) 55%, #0a0b0f 100%)', paddingTop: 32, paddingBottom: 16 }}>
                            <div className="text-center px-5">
                                {/* 별 + 멤버 수 한 줄 */}
                                <div className="flex items-center justify-center flex-wrap gap-x-1 gap-y-0.5 mb-0.5">
                                    {[1,2,3,4,5].map(s => (
                                        <span key={s} className="material-symbols-outlined text-orange-400 text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    ))}
                                    <span className="text-orange-400/80 text-[12px] sm:text-[13px] font-bold tracking-tight ml-1">이미 <span className="text-orange-400">15,400명</span>이 듣고 있습니다</span>
                                </div>
                                {/* 리뷰 텍스트 페이드 */}
                                <div className="relative min-h-[32px] max-h-[50px] overflow-hidden flex items-start justify-center -mt-px">
                                    {userReviews.map((review, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: idx === reviewIndex ? 1 : 0, y: idx === reviewIndex ? 0 : 6 }}
                                            transition={{ duration: 0.6 }}
                                            className="absolute inset-0 flex items-start justify-center px-0.5 pt-0.5"
                                            style={{ pointerEvents: idx === reviewIndex ? 'auto' : 'none' }}
                                        >
                                            <p className="text-white/75 text-[12px] sm:text-[13px] font-semibold leading-snug break-keep text-center">
                                                &ldquo;{review.text}&rdquo; <span className="text-orange-400/90 text-[11px] sm:text-[12px] font-bold whitespace-nowrap">— {review.name}</span>
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
                                    <div className={`grid w-full min-w-0 gap-3 ${items.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`} style={{ alignItems: 'stretch' }}>
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
                                                            // localStorage에서 최신 재생 위치를 직접 읽어 stale state 문제 해결
                                                            let freshStart = item.currentTime || 0;
                                                            try {
                                                                const hist = JSON.parse(localStorage.getItem('archiview_listen_history') || '[]');
                                                                const fresh = hist.find(h => h.id === item.id);
                                                                if (fresh?.currentTime > 0) freshStart = fresh.currentTime;
                                                            } catch {}
                                                            playPodcastMP3(item.src, item.title, item.cover, item.id, false, freshStart);
                                                        }
                                                    }}
                                                    className="btn-card-pressable relative flex flex-col min-h-0 min-w-0 w-full h-full overflow-hidden bg-[#111318] border border-zinc-700/50 hover:border-zinc-500/70 transition-all duration-300 active:scale-[0.98] text-left shadow-[0_4px_20px_rgba(0,0,0,0.4)] [touch-action:manipulation]"
                                                >
                                                    {/* 커버 이미지 */}
                                                    <div className="relative w-full min-h-0 overflow-hidden bg-zinc-900 shrink-0" style={{aspectRatio:'3/2'}}>
                                                        <img
                                                            src={item.cover || '/images/covers/default_custom.jpg'}
                                                            alt={item.title}
                                                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                                            onError={e => { e.target.src = '/images/covers/default_custom.jpg'; }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                                                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/85 border border-white/10 px-2 py-1 rounded-full">
                                                            <span className="flex items-end gap-[1px]" style={{height:10}}>
                                                                {[{h:4,d:'0s'},{h:8,d:'0.2s'},{h:10,d:'0.07s'},{h:6,d:'0.28s'},{h:3,d:'0.14s'}].map((b,i)=>(
                                                                    <span key={i} style={{display:'inline-block',width:1.2,height:b.h,borderRadius:2,background:'#f97316'}} />
                                                                ))}
                                                            </span>
                                                            <span className="text-[10px] font-black text-orange-400">{pct}%</span>
                                                        </div>
                                                    </div>
                                                    {/* 얇은 진행바 */}
                                                    <div className="w-full h-[2px] bg-zinc-800 shrink-0">
                                                        <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all" style={{width:`${pct}%`}} />
                                                    </div>
                                                    {/* 정보: items-stretch로 하단 막대가 카드 가로 100% 꽉 참 (모바일 Safari) */}
                                                    <div className="p-2.5 sm:p-3 flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full items-stretch">
                                                        <p className="text-[11px] sm:text-[12px] font-black text-white leading-snug line-clamp-2 mb-1.5 w-full">{item.title}</p>
                                                        <p className="text-[9px] sm:text-[10px] text-zinc-500 font-medium mb-2 w-full">
                                                            {remaining > 5 ? `남은 시간 ${fmt(remaining)}` : '거의 완료'}
                                                        </p>
                                                        <div
                                                            className="listen-continue-cta mt-auto box-border flex h-9 sm:h-9 w-full max-w-full min-w-0 self-stretch shrink-0 grow-0 items-center justify-center gap-1.5 rounded-md border border-zinc-700/50 bg-zinc-800/80 px-2 active:bg-zinc-700/80 transition-colors [flex-basis:auto]"
                                                        >
                                                            <span className="material-symbols-outlined text-orange-400 text-[17px] leading-none shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                                                            <span className="text-[11px] sm:text-[11px] font-bold text-orange-400 tracking-tight leading-none">이어 재생</span>
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
                        <div id="weekly-focus" className="relative z-[20] space-y-4 w-full bg-white/[0.03] border border-white/5 rounded-none pt-7 pb-7 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
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
                                                                <span key={i} style={{display:'inline-block',width:1.5,height:b.h,borderRadius:2,background:'currentColor'}} />
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
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-none bg-white/10 border border-white/10 text-[12.5px] font-black text-white uppercase tracking-widest drop-shadow-md">
                                                    <span className="mr-1.5 flex items-center gap-[2px]" style={{height:14}}>
                                                        {[1,2,3,4].map(i => (
                                                            <span key={i} style={{
                                                                display:'inline-block',
                                                                width:2.5,
                                                                borderRadius:2,
                                                                background:'#f97316',
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
                                            <div className="absolute right-6 bottom-6 size-10 rounded-none bg-white/5 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
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

                    {/* Personalized content guide */}
                    <motion.section
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={sectionVariants}
                        className="px-4 pt-7 pb-7"
                    >
                        <div className="mb-7 px-1">
                            <h2 className="text-[22px] font-black leading-none tracking-tight text-white">나에게 맞는 콘텐츠만</h2>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="h-[2px] w-7 bg-[#ff6b00]" />
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Personalized for you</p>
                            </div>
                        </div>

                        <div className="relative overflow-x-hidden overflow-y-visible border border-[#ff6b00]/25 bg-[#050507] px-4 py-4 shadow-[0_20px_55px_rgba(0,0,0,0.45)]">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,107,0,0.16),transparent_30%),linear-gradient(145deg,rgba(255,107,0,0.08),transparent_38%,rgba(255,255,255,0.04))]" />
                            <div className="pointer-events-none absolute -right-12 top-8 h-52 w-52 rounded-full border border-[#ff6b00]/10" />
                            <div className="pointer-events-none absolute -right-5 top-20 h-32 w-32 rounded-full border border-[#ff6b00]/15" />

                            <div className="relative z-10">
                                <div className="grid items-start gap-3" style={{ gridTemplateColumns: '1fr 38%' }}>
                                    <div className="flex min-w-0 flex-col justify-center">
                                        <div className="mb-3 flex flex-wrap gap-1.5">
                                            <span className="inline-flex items-center gap-1 rounded-full border border-[#ff6b00]/30 bg-[#ff6b00]/15 px-2.5 py-1 text-[10px] font-black text-[#ff8a1f]">
                                                <span className="material-symbols-outlined text-[13px]">headphones</span>
                                                개인맞춤 설정
                                            </span>
                                        </div>
                                        <p className="text-[17px] font-black leading-[1.45] tracking-tight text-white" style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}>
                                            출근길 아침 1권의 오디오,<br />퇴근길 하루에 어울리는<br />1권 요약 오디오
                                        </p>
                                    </div>

                                    <div className="min-w-0 w-full overflow-visible pt-1.5">
                                        <div className="relative grid grid-cols-2 overflow-visible border border-[#ff6b00]/25 bg-zinc-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]" style={{ minHeight: 120 }}>
                                            {[
                                                { label: '출근', bgPos: '22% center', alt: '아침 출근길에 오디오 콘텐츠를 듣는 사용자' },
                                                { label: '퇴근', bgPos: '78% center', alt: '저녁 퇴근길에 오디오 콘텐츠를 듣는 사용자' },
                                            ].map((shot) => (
                                                <div
                                                    key={shot.label}
                                                    className="relative min-w-0 overflow-hidden border-r border-[#ff6b00]/20 last:border-r-0"
                                                    role="img"
                                                    aria-label={shot.alt}
                                                    style={{
                                                        minHeight: 120,
                                                        backgroundImage: "url('/images/personalized-commute-split.png')",
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: shot.bgPos,
                                                        backgroundRepeat: 'no-repeat',
                                                    }}
                                                >
                                                    <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                                                    <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/80 px-2.5 py-0.5 text-[9px] font-black text-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                                                        {shot.label}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="absolute bottom-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[#ff6b00]/35 bg-black/65">
                                                <span className="material-symbols-outlined text-[17px] text-[#ff6b00]">graphic_eq</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-stretch" style={{ gap: 3 }}>
                                    <button
                                        onClick={() => navigate('/quiz')}
                                        className="group flex min-w-0 flex-1 flex-col border border-[#ff6b00]/25 bg-black/45 py-2.5 text-left transition-all active:scale-[0.98]"
                                        style={{ minHeight: 100, padding: '10px 6px' }}
                                        aria-label="독서 성향 분석하기"
                                    >
                                        <span className="mb-1.5 block text-[11px] font-black uppercase text-[#ff6b00]">Step 01</span>
                                        <span className="block text-[11px] font-black leading-tight text-white">독서 성향 분석</span>
                                        <span className="mt-auto inline-flex h-6 items-center rounded-full bg-[#ff6b00] text-[10px] font-black text-black group-hover:bg-[#ff8a1f]" style={{ padding: '0 8px', width: 'fit-content' }}>분석하기</span>
                                    </button>
                                    <div className="flex flex-shrink-0 items-center justify-center" style={{ width: 18 }}>
                                        <span className="material-symbols-outlined flex items-center justify-center rounded-full border border-[#ff6b00]/45 bg-black/75 text-[#ff6b00]" style={{ fontSize: 18, width: 18, height: 18 }}>chevron_right</span>
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col border border-white/10 bg-white/[0.03] py-2.5" style={{ minHeight: 100, padding: '10px 6px' }}>
                                        <span className="mb-1.5 block text-[11px] font-black uppercase text-[#ff6b00]">Step 02</span>
                                        <span className="block text-[11px] font-black leading-tight text-white">맞춤 도서 추천</span>
                                        <span className="mt-2 block text-[9px] font-bold leading-snug text-white/40">취향과 시간대에 맞춰 큐레이션</span>
                                    </div>
                                    <div className="flex flex-shrink-0 items-center justify-center" style={{ width: 18 }}>
                                        <span className="material-symbols-outlined flex items-center justify-center rounded-full border border-[#ff6b00]/45 bg-black/75 text-[#ff6b00]" style={{ fontSize: 18, width: 18, height: 18 }}>chevron_right</span>
                                    </div>
                                    <button
                                        onClick={() => navigate('/profile')}
                                        className="group flex min-w-0 flex-1 flex-col border border-[#ff6b00]/25 bg-black/45 text-left transition-all active:scale-[0.98]"
                                        style={{ minHeight: 100, padding: '10px 6px' }}
                                        aria-label="알림 설정"
                                    >
                                        <span className="mb-1.5 block text-[11px] font-black uppercase text-[#ff6b00]">Step 03</span>
                                        <span className="block font-black leading-tight text-white" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>출퇴근 알림발송</span>
                                        <span className="mt-auto inline-flex h-6 items-center rounded-full bg-[#ff6b00] text-[10px] font-black text-black group-hover:bg-[#ff8a1f]" style={{ padding: '0 8px', width: 'fit-content' }}>알림 설정</span>
                                    </button>
                                </div>
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

                    {/* 🎯 개인 맞춤 콘텐츠 섹션 */}
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
        </>
    );
}
