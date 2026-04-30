import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import MainHeader from '../components/MainHeader';
import Footer from '../components/Footer';
import { resultData, generateResultData } from '../data/resultData';
import { recommendations, generateRecommendations } from '../data/recommendations';
import { useAuth } from '../hooks/useAuth';
import { useSiteDesign } from '../hooks/useSiteDesign';
import BookCardActions from '../components/BookCardActions';
import { useBookData } from '../hooks/useBookData';
import PersonaAvatar from '../components/PersonaAvatar';
import { useAudio } from '../contexts/AudioContext';
import { motion } from 'framer-motion';
import { useSavedBooks } from '../hooks/useSavedBooks';

const DAY_KR = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_HEADER = ['월', '화', '수', '목', '금', '토', '일']; // 월 시작

function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

// 이번 달 달력 셀 배열 생성 (월요일 시작, 빈칸 포함)
function buildMonthGrid(year, month) {
    const firstDay = new Date(year, month, 1);
    // getDay(): 0=일 → 월 시작으로 변환 (월=0, 화=1, ..., 일=6)
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

function ReadingChallenge({ dailyListenTime, dailyTarget, user }) {
    const STAMPS_KEY = 'archiview_challenge_stamps';
    const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

    const now = new Date();
    const todayStr  = toDateStr(now);
    const isGoalMet = (dailyListenTime || 0) >= (dailyTarget || 900);

    const [stamps, setStamps] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STAMPS_KEY) || '[]'); } catch { return []; }
    });
    const [showBadge, setShowBadge] = useState(false);

    // 로그인 시 로컬 ↔ Firestore 양방향 병합
    useEffect(() => {
        if (!user?.uid) return;
        import('firebase/firestore').then(({ doc, getDoc, setDoc }) => {
            import('../firebase').then(({ db }) => {
                const local = (() => { try { return JSON.parse(localStorage.getItem(STAMPS_KEY) || '[]'); } catch { return []; } })();
                getDoc(doc(db, 'users', user.uid)).then(snap => {
                    const remote = snap.exists() ? (snap.data().challenge_stamps || []) : [];
                    const merged = [...new Set([...local, ...remote])].sort();
                    setStamps(merged);
                    localStorage.setItem(STAMPS_KEY, JSON.stringify(merged));
                    if (merged.length > remote.length) {
                        setDoc(doc(db, 'users', user.uid), { challenge_stamps: merged }, { merge: true }).catch(() => {});
                    }
                }).catch(() => {});
            });
        });
    }, [user?.uid]);

    const saveStamps = (next) => {
        setStamps(next);
        localStorage.setItem(STAMPS_KEY, JSON.stringify(next));
        if (user?.uid) {
            import('firebase/firestore').then(({ doc, setDoc }) => {
                import('../firebase').then(({ db }) => {
                    setDoc(doc(db, 'users', user.uid), { challenge_stamps: next }, { merge: true }).catch(() => {});
                });
            });
        }
    };

    // 오늘 목표 달성 시 자동 도장 (주 7일 모두)
    useEffect(() => {
        if (!isGoalMet) return;
        if (stamps.includes(todayStr)) return;
        saveStamps([...stamps, todayStr]);
    }, [isGoalMet]);

    // 이번 주 월~일 날짜 배열 (월요일 시작)
    const weekDays = useMemo(() => {
        const dayOfWeek = (now.getDay() + 6) % 7;
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - dayOfWeek + i);
            return d;
        });
    }, [todayStr]);

    // 연속 streak (오늘 포함 최근 평일 연속 도장)
    const streak = useMemo(() => {
        let count = 0;
        const cur = new Date(now);
        for (let i = 0; i < 60; i++) {
            const dow = cur.getDay();
            if (dow !== 0 && dow !== 6) {
                if (stamps.includes(toDateStr(cur))) count++;
                else if (toDateStr(cur) !== todayStr) break;
            }
            cur.setDate(cur.getDate() - 1);
        }
        return count;
    }, [stamps, todayStr]);

    // 이번 달 도장 수 (주 7일 기준)
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`;
    const monthCount = stamps.filter(s => s.startsWith(monthPrefix)).length;
    const allDone = monthCount >= 7;
    useEffect(() => { if (allDone) setShowBadge(true); }, [allDone]);

    // 이번 주 통계 (7일 기준)
    const weekStamps = weekDays.filter(d => stamps.includes(toDateStr(d)));
    const focusHours = (weekStamps.length * 15 / 60).toFixed(1);
    const achieveRate = Math.round((weekStamps.length / 7) * 100);
    const totalRoutine = stamps.length;

    // 바 차트 최대 높이 기준 (이번 주 도장 여부)
    const BAR_MAX = 56;

    const remainMin = Math.max(0, Math.ceil(((dailyTarget || 900) - (dailyListenTime || 0)) / 60));

    return (
        <div>
            <h3 className="text-[14px] font-black text-white mb-3 tracking-tight uppercase flex items-center gap-2">
                <span className="w-1.5 h-4 bg-orange-500 rounded-sm" />
                7일 독서 챌린지
            </h3>

            <div className="rounded-sm overflow-hidden bg-white/[0.02] border border-white/5">

                {/* 나의 루틴 섹션 */}
                <div className="px-5 pt-5 pb-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-bold text-white/40 tracking-wide">나의 루틴</span>
                        <span className="material-symbols-outlined text-white/20" style={{ fontSize: 16 }}>chevron_right</span>
                    </div>
                    <p className="text-[20px] font-black text-white tracking-tight mb-4">
                        {streak > 0 ? `${streak}일 연속 · 기록 중` : '오늘부터 시작해요'}
                    </p>

                    {/* 요일 체크 */}
                    <div className="grid grid-cols-7 gap-2">
                        {weekDays.map((d, i) => {
                            const dStr = toDateStr(d);
                            const isStamped = stamps.includes(dStr);
                            const isToday = dStr === todayStr;
                            const dow = d.getDay();
                            const isWknd = dow === 0 || dow === 6;
                            return (
                                <div key={i} className="flex flex-col items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-white/45">
                                        {DAY_LABELS[i]}
                                    </span>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{
                                            border: isStamped ? '2px solid #f97316' : isToday ? '2px solid rgba(249,115,22,0.4)' : '2px solid rgba(255,255,255,0.12)',
                                            background: isStamped ? 'rgba(249,115,22,0.15)' : 'transparent',
                                        }}>
                                        {isStamped && (
                                            <motion.svg
                                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"
                                                style={{ width: 16, height: 16 }}>
                                                <path d="M20 6 9 17l-5-5" />
                                            </motion.svg>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* 오늘 목표 진행 */}
                    {!stamps.includes(todayStr) && (
                        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                            style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
                            <span className="material-symbols-outlined text-orange-400" style={{ fontSize: 14 }}>timer</span>
                            <span className="text-[11px] text-white/55">
                                오늘 목표까지&nbsp;<span className="font-black text-orange-400">{remainMin}분</span>&nbsp;남았어요
                            </span>
                        </div>
                    )}
                </div>

                {/* 구분선 */}
                <div className="border-t border-white/5" />

                {/* 이번 주 리포트 섹션 */}
                <div className="px-5 pt-4 pb-5">
                    <p className="text-[13px] font-bold text-white/40 mb-3 tracking-wide">이번 주 리포트</p>
                    <div className="flex gap-4 items-end">
                        {/* 통계 */}
                        <div className="flex flex-col gap-3 flex-1">
                            <div>
                                <p className="text-[10px] text-white/35 font-bold mb-0.5">집중시간</p>
                                <p className="text-[22px] font-black text-white leading-none">{focusHours}<span className="text-[13px] font-bold text-white/50 ml-0.5">h</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/35 font-bold mb-0.5">달성률</p>
                                <p className="text-[22px] font-black text-white leading-none">{achieveRate}<span className="text-[13px] font-bold text-white/50 ml-0.5">%</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/35 font-bold mb-0.5">총 루틴</p>
                                <p className="text-[22px] font-black text-white leading-none">{totalRoutine}<span className="text-[13px] font-bold text-white/50 ml-0.5">회</span></p>
                            </div>
                        </div>

                        {/* 바 차트 */}
                        <div className="flex items-end gap-1.5 flex-1 justify-end" style={{ height: BAR_MAX + 24 }}>
                            {weekDays.map((d, i) => {
                                const dStr = toDateStr(d);
                                const isStamped = stamps.includes(dStr);
                                const isToday = dStr === todayStr;
                                const isPast = dStr <= todayStr;
                                const dow = d.getDay();
                                const isWknd = dow === 0 || dow === 6;
                                const barH = isStamped ? BAR_MAX : isPast && !isWknd ? 12 : 8;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: barH }}
                                            transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 20 }}
                                            style={{
                                                width: 22,
                                                borderRadius: 6,
                                                background: isStamped
                                                    ? isToday
                                                        ? 'linear-gradient(180deg,#ff9a50,#f97316)'
                                                        : 'linear-gradient(180deg,#fb923c,#ea6a0a)'
                                                    : 'rgba(255,255,255,0.07)',
                                            }}
                                        />
                                        <span className="text-[9px] font-bold text-white/35">
                                            {DAY_LABELS[i]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 7일 달성 뱃지 */}
                {showBadge && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className="mx-5 mb-5 flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.15),rgba(249,115,22,0.1))', border: '1px solid rgba(251,191,36,0.35)' }}>
                        <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 22, color: '#fbbf24', fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                        <div>
                            <p className="text-[12px] font-black text-amber-300 leading-tight">🎉 7일 독서 챌린지 성공!</p>
                            <p className="text-[10px] text-white/40 mt-0.5">이번 달 평일 7일 15분 청취 달성!</p>
                        </div>
                    </motion.div>
                )}
            </div>
            <p className="text-white/35 text-[11px] font-medium leading-relaxed mt-3 pl-1">
                평일 매일 15분 이상 청취하면 도장이 찍혀요. 7일 달성 시 챌린지 성공 뱃지를 획득해요.
            </p>
        </div>
    );
}

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
    const { design } = useSiteDesign();
    const { getAllBooks } = useBookData();
    const { dailyListenTime, dailyTarget, streak } = useAudio();
    const [unlocked, setUnlocked] = useState(false);
    const [myResultType, setMyResultType] = useState(null);
    const [quizResult, setQuizResult] = useState(null);
    const [quizScores, setQuizScores] = useState(null);
    const [hiddenRecs, setHiddenRecs] = useState([]);
    const [finderRecs, setFinderRecs] = useState([]);
    const navigate = useNavigate();
    const { savedBooks, removeBook: removeSavedBook } = useSavedBooks(user);

    useEffect(() => {
        const isUnlocked = localStorage.getItem('premiumUnlocked') === 'true';
        setUnlocked(isUnlocked);
        const fRecs = JSON.parse(localStorage.getItem('finderRecommendations') || '[]');
        setFinderRecs(fRecs);

        const handleStorage = () => {
            const updatedFRecs = JSON.parse(localStorage.getItem('finderRecommendations') || '[]');
            setFinderRecs(updatedFRecs);
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // 페르소나: Firestore ↔ localStorage 양방향 병합
    useEffect(() => {
        const localType   = localStorage.getItem('myResultType');
        const localQuiz   = localStorage.getItem('quizResult');
        const localScores = localStorage.getItem('quizScores');
        if (user) {
            import('firebase/firestore').then(({ doc, getDoc, setDoc }) => {
                import('../firebase').then(({ db }) => {
                    getDoc(doc(db, 'users', user.uid)).then(snap => {
                        const remote = snap.exists() ? snap.data() : {};
                        // quizResult(Quiz.jsx가 저장)와 myResultType(Result.jsx가 저장) 모두 폴백으로 사용
                        const type = remote.myResultType || remote.quizResult || localType || localQuiz;
                        const quiz = remote.quizResult || localQuiz;
                        let scores = null;
                        try {
                            const s = remote.quizScores || localScores;
                            if (s) scores = typeof s === 'string' ? JSON.parse(s) : s;
                        } catch {}
                        setMyResultType(type);
                        setQuizResult(quiz);
                        if (scores) setQuizScores(scores);
                        if (type) localStorage.setItem('myResultType', type);
                        if (quiz) localStorage.setItem('quizResult', quiz);
                        // 로컬에만 있는 데이터를 Firestore에 업로드
                        const toUpload = {};
                        if (type && !remote.myResultType) toUpload.myResultType = type;
                        if (quiz && !remote.quizResult)   toUpload.quizResult   = quiz;
                        if (scores && !remote.quizScores) toUpload.quizScores   = scores;
                        if (Object.keys(toUpload).length > 0) {
                            setDoc(doc(db, 'users', user.uid), toUpload, { merge: true }).catch(() => {});
                        }
                    }).catch(() => {
                        setMyResultType(localType);
                        setQuizResult(localQuiz);
                        try { if (localScores) setQuizScores(JSON.parse(localScores)); } catch {}
                    });
                });
            });
        } else {
            setMyResultType(localType);
            setQuizResult(localQuiz);
            try {
                if (localScores) setQuizScores(JSON.parse(localScores));
            } catch {}
        }
    }, [user?.uid]);

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

                {/* ── Hero Section ── */}
                <section className="relative h-[480px] w-full overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#101218]/50 to-[#101218] z-10" />
                    {design.library_hero.type === 'image' ? (
                        <img src={design.library_hero.src} alt="hero" className="absolute inset-0 w-full h-full object-cover opacity-70" style={{ objectPosition: 'center center' }} />
                    ) : (
                        <video
                            src={design.library_hero.src}
                            poster={design.library_hero_poster || undefined}
                            className="absolute inset-0 w-full h-full object-cover opacity-70"
                            style={{ objectPosition: 'center center' }}
                            autoPlay muted loop playsInline
                        />
                    )}
                    <div className="relative z-20 h-full flex flex-col justify-end px-6 pb-16">
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 mb-4">
                            <div className="flex items-end gap-[2px] h-4">
                                {[6, 14, 16, 10, 8].map((h, i) => (
                                    <div key={i} className="w-[3px] bg-orange-500 rounded-none" style={{ height: h }} />
                                ))}
                            </div>
                            <span className="text-orange-400 text-[11px] font-bold tracking-[0.25em] uppercase">My Library</span>
                        </motion.div>
                        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="text-[35px] font-light leading-tight tracking-tighter mb-4">
                            나만의<br /><span className="font-bold">지식 서재</span>
                        </motion.h1>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 }} className="text-white/55 text-sm leading-relaxed max-w-xs">
                            읽고 싶은 책, 분석된 성향, 큐레이션 결과까지<br />모든 독서 데이터를 한 곳에서 관리하세요
                        </motion.p>
                    </div>
                </section>

                <main className="px-6 pt-2 pb-24 animate-fade-in flex-grow space-y-6">

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
                                    className="relative overflow-hidden bg-white/[0.02] border border-white/5 group cursor-pointer rounded-sm"
                                >
                                    <div className="relative p-5 flex items-center gap-4 z-10">
                                        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-orange-500/20 shadow-lg">
                                            <PersonaAvatar type={resType} />
                                        </div>
                                        <div className="flex-1 min-w-0 relative z-10">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-orange-500 block mb-1">My Persona</span>
                                            <h3 className="text-white text-base font-black leading-tight mb-0.5 truncate">{teaserResult.subtitle}</h3>
                                            <p className="text-white/40 text-[10px] font-bold truncate">{teaserResult.persona} · {typeMeta.label}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-orange-500/50 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all">chevron_right</span>
                                    </div>
                                </div>
                            );
                        })() : (
                            <div className="relative rounded-sm overflow-hidden bg-white/[0.02] border border-white/5 group">
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
                                <div className="relative bg-white/[0.02] border border-white/5 p-5 rounded-sm w-full">
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

                    {/* ── 7일 독서 챌린지 ── */}
                    <ReadingChallenge dailyListenTime={dailyListenTime} dailyTarget={dailyTarget} user={user} />

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
