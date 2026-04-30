import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { recommendations } from '../data/recommendations';
import { resultData, futureVision } from '../data/resultData';
import { generateResultQRCard } from '../utils/shareCard';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import MainHeader from '../components/MainHeader';
import BookCardActions from '../components/BookCardActions';
import KakaoAdFit from '../components/KakaoAdFit';
import PersonaAvatar from '../components/PersonaAvatar';

const TYPE_META = {
    growth:        { label: '성장·실행형', colorFrom: 'from-blue-600',   colorTo: 'to-cyan-400',    key: 'A', icon: 'trending_up',      bgFrom: 'from-blue-900',   bgTo: 'to-primary' },
    entertainment: { label: '창의·탐험형', colorFrom: 'from-violet-600', colorTo: 'to-fuchsia-400', key: 'B', icon: 'auto_stories',     bgFrom: 'from-violet-900', bgTo: 'to-primary' },
    empathy:       { label: '공감·관계형', colorFrom: 'from-rose-500',   colorTo: 'to-amber-400',   key: 'C', icon: 'favorite',         bgFrom: 'from-rose-900',   bgTo: 'to-primary' },
    mindfulness:   { label: '사색·마음형', colorFrom: 'from-emerald-600',colorTo: 'to-teal-400',    key: 'D', icon: 'self_improvement',  bgFrom: 'from-emerald-900',bgTo: 'to-primary' },
};

const TYPE_ORDER = ['growth', 'entertainment', 'empathy', 'mindfulness'];

const FUTURE_STEP_STYLES = [
    { border: 'border-gold/30', bg: 'bg-gold/10',  badge: 'bg-gold/20 text-gold border-gold/20',  circle: 'border-gold/60',  year: 'text-gold' },
    { border: 'border-white/10', bg: 'bg-white/5', badge: 'bg-white/10 text-slate-400 border-white/10', circle: 'border-white/30', year: 'text-slate-400' },
    { border: 'border-white/5',  bg: 'bg-white/5', badge: 'bg-white/5 text-slate-500 border-white/10',  circle: 'border-white/20', year: 'text-slate-500' },
];

export default function Result() {
    const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [toastMsg, setToastMsg] = useState('');
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrCardUrl, setQrCardUrl] = useState('');
    const [qrLoading, setQrLoading] = useState(false);
    const location = useLocation();

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 2500);
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        // localStorage 로컬 잠금해제 체크
        const unlocked = localStorage.getItem('premiumUnlocked') === 'true';
        if (unlocked) setIsPremiumUnlocked(true);
        // Firestore 관리자 무료설정 체크
        getDoc(doc(db, 'siteConfig', 'quizResult')).then(snap => {
            if (snap.exists() && snap.data().mode === 'free') {
                setIsPremiumUnlocked(true);
            }
        }).catch(() => {});
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const resultType = location.state?.resultType || localStorage.getItem('myResultType') || 'growth';
    const currentRecommendation = recommendations[resultType];
    const data = resultData[resultType];
    const futureData = futureVision[resultType];

    const scores = data.scores || { A: 8, B: 2, C: 1, D: 1 };
    const totalScore = scores.A + scores.B + scores.C + scores.D || 1;
    const scoreMap = { growth: scores.A, entertainment: scores.B, empathy: scores.C, mindfulness: scores.D };

    const handleUnlock = () => {
        const confirmed = window.confirm("PG_LINK: [특별 할인가 4,900원] 결제를 진행하시겠습니까? (Toss/Kakao)");
        if (confirmed) {
            setIsPremiumUnlocked(true);
            localStorage.setItem('premiumUnlocked', 'true');
            localStorage.setItem('myResultType', resultType);
            const uid = getAuth().currentUser?.uid;
            if (uid) setDoc(doc(db, 'users', uid), { myResultType: resultType }, { merge: true }).catch(() => {});
        }
    };

    const handleQRShare = async () => {
        setShowQRModal(true);
        if (qrCardUrl) return; // 이미 생성됨
        setQrLoading(true);
        try {
            const url = 'https://archiview.store/result';
            const dataUrl = await generateResultQRCard(data, resultType, url);
            setQrCardUrl(dataUrl);
        } catch {
            showToast('카드 생성에 실패했습니다.');
            setShowQRModal(false);
        } finally {
            setQrLoading(false);
        }
    };

    const handleDownloadQR = () => {
        if (!qrCardUrl) return;
        const a = document.createElement('a');
        a.href = qrCardUrl;
        a.download = `archiview-result-${resultType}.png`;
        a.click();
    };

    const handleShareQRImage = async () => {
        if (!qrCardUrl) return;
        try {
            const res = await fetch(qrCardUrl);
            const blob = await res.blob();
            const file = new File([blob], `archiview-result.png`, { type: 'image/png' });
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: 'The Archiview 결과 카드' });
            } else {
                handleDownloadQR();
                showToast('이미지가 저장되었습니다!');
            }
        } catch (e) {
            if (e.name !== 'AbortError') { handleDownloadQR(); showToast('이미지가 저장되었습니다!'); }
        }
    };

    const handleKakaoShare = async () => {
        const url = 'https://archiview.store/result';
        const typeImgMap = {
            growth:        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop&q=80',
            entertainment: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=800&h=400&fit=crop&q=80',
            empathy:       'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&h=400&fit=crop&q=80',
            mindfulness:   'https://images.unsplash.com/photo-1463453091185-61582044d556?w=800&h=400&fit=crop&q=80',
        };
        const imageUrl = typeImgMap[resultType] || typeImgMap.growth;

        const tryShare = () => {
            try {
                if (!window.Kakao) throw new Error('no-sdk');
                if (!window.Kakao.isInitialized()) window.Kakao.init('9cbdeec02a8ce33b5deb576a0e63c380');
                const shareMethod = window.Kakao.Share || window.Kakao.Link;
                if (!shareMethod) throw new Error('no-method');
                shareMethod.sendDefault({
                    objectType: 'feed',
                    content: {
                        title: `📖 ${data.subtitle} — 아카이뷰 독서 성향 분석`,
                        description: `${TYPE_META[resultType]?.label || ''} · ${data.persona}\n\n${(data.summary || '').slice(0, 100)}`,
                        imageUrl,
                        link: { mobileWebUrl: url, webUrl: url },
                    },
                    buttons: [
                        { title: '결과 자세히 보기 →', link: { mobileWebUrl: url, webUrl: url } },
                    ],
                });
            } catch {
                navigator.clipboard.writeText(url)
                    .then(() => showToast('링크가 복사되었습니다! 카카오톡에 붙여넣기하세요.'))
                    .catch(() => showToast('링크: ' + url));
            }
        };
        tryShare();
    };

    return (
        <div className="bg-background-dark font-display text-slate-100 antialiased min-h-screen flex flex-col">
            <MainHeader showBack />

            {/* Toast notification */}
            {toastMsg && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1a2540] border border-white/20 text-white text-xs font-bold px-4 py-2.5 shadow-xl rounded flex items-center gap-2 animate-fade-in">
                    <span className="material-symbols-outlined text-sm text-gold">check_circle</span>
                    {toastMsg}
                </div>
            )}

            <main className="flex-1 pb-24">

                {/* ── 1. HERO ─────────────────────────────────── */}
                <section className="relative overflow-hidden">
                    {/* ambient glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/50 via-primary/10 to-transparent pointer-events-none" />
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/25 rounded-full blur-[80px] pointer-events-none" />

                    <div className="relative flex flex-col items-center px-6 pt-10 pb-10 text-center">
                        {/* Character avatar */}
                        <div className="relative mb-5">
                            <div className="w-28 h-28 rounded-full overflow-hidden ring-2 ring-gold/40 shadow-[0_0_50px_rgba(212,175,55,0.18)]">
                                <PersonaAvatar type={resultType} />
                            </div>
                            {/* type pill */}
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gold text-primary text-[9px] font-black px-3 py-[3px] tracking-[0.15em] uppercase shadow-lg">
                                {TYPE_META[resultType].label}
                            </div>
                        </div>

                        {/* subtitle as main title */}
                        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white leading-tight">
                            {data.subtitle}
                        </h2>
                        {/* persona as secondary label */}
                        <p className="mt-1.5 text-xs text-slate-500 font-medium">{data.persona}</p>
                    </div>
                </section>

                {/* ── 2. 독서 성향 프로필 ───────────────────────── */}
                <section className="px-4 py-4 animate-fade-in-up">
                    <div className="bg-white/5 border border-white/10 p-5 rounded">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.18em] mb-4">
                            독서 성향 프로필
                        </h3>
                        <div className="space-y-3.5">
                            {TYPE_ORDER.map((type) => {
                                const pct = Math.round((scoreMap[type] / totalScore) * 100);
                                const isMain = type === resultType;
                                const meta = TYPE_META[type];
                                return (
                                    <div key={type}>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold ${isMain ? 'text-white' : 'text-slate-500'}`}>
                                                    {meta.label}
                                                </span>
                                                {isMain && (
                                                    <span className="text-[9px] font-black bg-gold/20 text-gold px-1.5 py-0.5 tracking-wide uppercase">
                                                        주 유형
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-xs font-bold tabular-nums ${isMain ? 'text-gold' : 'text-slate-600'}`}>
                                                {pct}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${meta.colorFrom} ${meta.colorTo} transition-all duration-1000 ease-out`}
                                                style={{ width: `${pct}%`, opacity: isMain ? 1 : 0.35 }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ── 3. 성향 요약 ──────────────────────────────── */}
                <section className="px-4 py-3 animate-fade-in-up">
                    <div className="border-l-2 border-gold/50 pl-4 py-1">
                        <h3 className="text-[10px] font-black text-gold uppercase tracking-[0.18em] mb-2">
                            당신의 독서 성향
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-300">{data.summary}</p>
                    </div>
                </section>

                {/* ── 4. 아카이뷰와 함께하면 (미래 타임라인) ──────── */}
                <section className="px-4 pt-6 pb-4 animate-fade-in-up">
                    {/* Section header */}
                    <div className="mb-6">
                        <span className="text-[10px] font-black text-gold uppercase tracking-[0.18em]">
                            성장 로드맵
                        </span>
                        <h3 className="text-xl font-black text-white mt-1 leading-tight">
                            아카이뷰와 함께하면<br />
                            <span className="text-gold">이렇게 달라집니다</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                            매일 출퇴근길 15분의 습관이<br />
                            <strong className="text-slate-400">{data.persona}</strong> 유형의 당신을 어떻게 바꾸는지 확인하세요.
                        </p>
                    </div>

                    {/* Timeline */}
                    <div className="relative">
                        {/* Vertical connector */}
                        <div className="absolute left-[17px] top-5 bottom-5 w-px bg-gradient-to-b from-gold/50 via-gold/20 to-transparent" />

                        <div className="space-y-4">
                            {futureData && futureData.map((item, i) => {
                                const s = FUTURE_STEP_STYLES[i] || FUTURE_STEP_STYLES[2];
                                return (
                                    <div key={i} className="relative flex gap-3.5">
                                        {/* Icon circle */}
                                        <div className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base bg-[#0a1020] border ${s.circle}`}>
                                            {item.icon}
                                        </div>

                                        {/* Card */}
                                        <div className={`flex-1 rounded p-4 border ${s.bg} ${s.border}`}>
                                            <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${s.year}`}>
                                                {item.year}
                                            </span>
                                            <h4 className="text-sm font-bold text-white mt-1.5 mb-2 leading-snug">
                                                {item.title}
                                            </h4>
                                            <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                                {item.desc}
                                            </p>

                                            {/* Details checklist */}
                                            {item.details && item.details.length > 0 && (
                                                <ul className="space-y-2 mb-3 border-t border-white/5 pt-3">
                                                    {item.details.map((detail, di) => (
                                                        <li key={di} className="flex items-start gap-2">
                                                            <span className={`material-symbols-outlined text-xs leading-tight mt-0.5 flex-shrink-0 ${s.year}`}>
                                                                check_circle
                                                            </span>
                                                            <span className="text-[11px] text-slate-300 leading-snug">{detail}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}

                                            <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded border ${s.badge}`}>
                                                <span className="material-symbols-outlined text-xs leading-none">star</span>
                                                {item.highlight}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ── 5. 공유 ──────────────────────────────────── */}
                <section className="px-4 py-4 flex gap-2 animate-fade-in-up">
                    <button
                        onClick={handleQRShare}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-white/10 border border-white/15 text-white text-xs font-bold active:scale-95 transition-transform rounded"
                    >
                        <span className="material-symbols-outlined text-base leading-none">qr_code_2</span>
                        QR 공유
                    </button>
                    <button
                        onClick={handleKakaoShare}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-[#FEE500] text-[#3C1E1E] text-xs font-bold active:scale-95 transition-transform rounded"
                    >
                        <span className="text-base leading-none">💬</span>
                        카카오 공유
                    </button>
                </section>

                {/* ── QR 공유 모달 ─────────────────────────────── */}
                {showQRModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-5"
                        onClick={() => setShowQRModal(false)}
                    >
                        <div
                            className="bg-[#0b1525] border border-white/10 rounded w-full max-w-xs shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* 모달 헤더 */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gold text-base">qr_code_2</span>
                                    <h3 className="text-sm font-black text-white">결과 공유 카드</h3>
                                </div>
                                <button onClick={() => setShowQRModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>

                            {/* 카드 미리보기 */}
                            <div className="p-4">
                                {qrLoading ? (
                                    <div className="h-52 flex flex-col items-center justify-center gap-3">
                                        <span className="material-symbols-outlined text-gold text-3xl animate-spin">progress_activity</span>
                                        <p className="text-xs text-slate-500">카드 생성 중…</p>
                                    </div>
                                ) : qrCardUrl ? (
                                    <>
                                        <div className="rounded overflow-hidden border border-white/10 mb-4 shadow-xl">
                                            <img src={qrCardUrl} alt="QR 공유 카드" className="w-full" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleDownloadQR}
                                                className="flex-1 py-3 bg-gold text-primary text-xs font-black flex items-center justify-center gap-1.5 rounded active:scale-95 transition-transform"
                                            >
                                                <span className="material-symbols-outlined text-sm leading-none">download</span>
                                                저장하기
                                            </button>
                                            <button
                                                onClick={handleShareQRImage}
                                                className="flex-1 py-3 bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5 rounded active:scale-95 transition-transform"
                                            >
                                                <span className="material-symbols-outlined text-sm leading-none">share</span>
                                                공유하기
                                            </button>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── 쿠팡 파트너스 배너 ──────────────────────────── */}
                <section className="px-4 pb-1 flex flex-col items-center gap-1.5 animate-fade-in-up">
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
                </section>

                {/* ── 6. 프리미엄 정밀 분석 (게이티드) ────────────── */}
                <section className="relative mx-4 mt-2 mb-12 overflow-hidden border border-white/10 bg-[#080e1a] animate-fade-in-up">
                    <div className="p-5">

                        {/* Premium header */}
                        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/10">
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gold/10 border border-gold/20 rounded">
                                <span className="material-symbols-outlined text-gold text-xl">workspace_premium</span>
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">정밀 인지 분석 리포트</h3>
                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">
                                    Cognitive Analysis Suite
                                </p>
                            </div>
                        </div>

                        {/* Blurred / Real content */}
                        <div className={`space-y-6 transition-all duration-700 ${!isPremiumUnlocked ? 'filter blur-xl opacity-20 pointer-events-none select-none h-[500px] overflow-hidden' : ''}`}>

                            {/* 6-1. Radar Chart */}
                            <div className="bg-white/5 p-5 border border-white/5 rounded">
                                <h4 className="text-xs font-bold text-white mb-5 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-400 text-base">radar</span>
                                    6차원 인지 역량 모델
                                </h4>
                                <div className="flex flex-col items-center gap-5">
                                    <div className="relative w-56 h-56">
                                        <svg viewBox="-30 -18 160 136" className="w-full h-full drop-shadow-xl overflow-visible">
                                            <polygon points="50,5 95,30 95,75 50,95 5,75 5,30"
                                                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
                                            <polygon points="50,20 80,35 80,65 50,80 20,65 20,35"
                                                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                                            <polygon
                                                points={data.radarChart.points}
                                                fill="rgba(212,175,55,0.22)"
                                                stroke="#D4AF37"
                                                strokeWidth="1.5"
                                                className="animate-pulse-slow"
                                            />
                                            {/* 레이블: 헥사곤 꼭짓점에서 10유닛 바깥, fontSize 7.5 */}
                                            <text x="50"  y="-4"  textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.85)" fontWeight="bold">집중력</text>
                                            <text x="103" y="30"  textAnchor="start"  fontSize="7.5" fill="rgba(255,255,255,0.85)" fontWeight="bold">논리성</text>
                                            <text x="103" y="78"  textAnchor="start"  fontSize="7.5" fill="rgba(255,255,255,0.85)" fontWeight="bold">속독력</text>
                                            <text x="50"  y="108" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.85)" fontWeight="bold">기억력</text>
                                            <text x="-3"  y="78"  textAnchor="end"    fontSize="7.5" fill="rgba(255,255,255,0.85)" fontWeight="bold">공감력</text>
                                            <text x="-3"  y="30"  textAnchor="end"    fontSize="7.5" fill="rgba(255,255,255,0.85)" fontWeight="bold">어휘력</text>
                                        </svg>
                                    </div>
                                    <p className="text-xs text-slate-300 text-center leading-relaxed">
                                        <strong className="text-gold">{data.persona}</strong> 유형은<br />
                                        특히 <strong className="text-white">{data.metrics.accuracy.label}</strong>과{' '}
                                        <strong className="text-white">{data.metrics.retention.label}</strong> 영역에서 강점을 보입니다.
                                    </p>
                                </div>
                            </div>

                            {/* 6-2. 심층 인지 분석 (텍스트, 수치 없음) */}
                            <div>
                                <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-400 text-base">analytics</span>
                                    심층 인지 분석
                                </h4>
                                <div className="space-y-3">
                                    {[
                                        { title: '인지 부하 처리 방식', desc: data.bigData.load.desc,       icon: 'psychology',  color: 'text-blue-400'   },
                                        { title: '맥락 추론 패턴',       desc: data.bigData.inference.desc,  icon: 'hub',         color: 'text-purple-400' },
                                        { title: '어휘 다양성',          desc: data.bigData.vocabulary.desc, icon: 'menu_book',   color: 'text-amber-400'  },
                                    ].map((item, i) => (
                                        <div key={i} className="bg-white/5 p-4 border border-white/5 rounded">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`material-symbols-outlined text-base ${item.color}`}>{item.icon}</span>
                                                <h5 className="text-xs font-bold text-slate-300">{item.title}</h5>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 6-3. AI 큐레이터 종합 제언 */}
                            <div className="bg-gold/5 border-l-4 border-gold p-4 rounded-r">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-gold text-base">auto_awesome</span>
                                    <h4 className="text-xs font-bold text-gold">AI 큐레이터의 종합 제언</h4>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">{data.bigData.comment}</p>
                            </div>

                            {/* 광고 */}
                            <div className="flex justify-center py-3">
                                <KakaoAdFit unit="DAN-aXfyL1HtK8zp0vui" width="320" height="100" />
                            </div>

                            {/* 6-4. 추천 도서 Top 5 */}
                            <div className="pt-4 border-t border-white/10">
                                <div className="mb-4">
                                    <span className="text-[10px] font-black text-gold uppercase tracking-[0.18em]">AI 큐레이션</span>
                                    <h4 className="text-base font-bold text-white mt-1">추천 도서 Top 5</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{currentRecommendation?.desc}</p>
                                </div>
                                <div className="space-y-3">
                                    {currentRecommendation?.books.map((book, index) => (
                                        <div
                                            key={index}
                                            className="flex gap-3 p-3 bg-white/5 border border-white/5 hover:border-gold/20 transition-all group rounded"
                                        >
                                            <div className="w-14 h-20 shrink-0 overflow-hidden bg-slate-800 rounded">
                                                <img
                                                    src={book.cover}
                                                    alt={book.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <h5 className="font-bold text-white text-sm line-clamp-1">{book.title}</h5>
                                                <p className="text-xs text-slate-500 mb-1">{book.author}</p>
                                                <p className="text-[11px] text-slate-400 leading-tight line-clamp-2 mb-2">{book.desc}</p>
                                                <BookCardActions book={book} className="mt-1" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 6-5. 추천 여행지 Top 5 */}
                            <div className="pt-4 border-t border-white/10">
                                <div className="mb-4">
                                    <span className="text-[10px] font-black text-gold uppercase tracking-[0.18em]">AI 큐레이션 2</span>
                                    <h4 className="text-base font-bold text-white mt-1">추천 여행지 Top 5</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{currentRecommendation?.travelDesc}</p>
                                </div>
                                <div className="space-y-2">
                                    {currentRecommendation?.travel?.map((place, index) => (
                                        <div key={index} className="relative overflow-hidden group h-28 rounded">
                                            <img
                                                src={place.image}
                                                alt={place.place}
                                                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 group-hover:opacity-40 transition-all duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                                            <div className="relative h-full flex flex-col justify-end p-3.5">
                                                <span className="text-[9px] font-bold text-gold mb-1">{place.country}</span>
                                                <h5 className="text-sm font-bold text-white leading-tight">{place.place}</h5>
                                                <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">{place.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isPremiumUnlocked && (
                                <div className="mt-4 p-4 bg-emerald-500/10 text-emerald-400 text-sm font-bold text-center border border-emerald-500/20 flex flex-col items-center gap-2 animate-fade-in rounded">
                                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                                    <span>모든 분석 및 추천이 잠금 해제되었습니다.</span>
                                </div>
                            )}
                        </div>

                        {/* ── Lock Overlay ── */}
                        {!isPremiumUnlocked && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[6px] p-5">
                                <div className="bg-[#0b1525]/96 border border-white/10 p-6 w-full max-w-xs shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded">

                                    {/* Sale badge */}
                                    <div className="flex justify-center mb-5">
                                        <div className="bg-red-600 text-white text-[10px] font-black px-4 py-1 uppercase tracking-[0.2em]">
                                            ⚡ Limited Time Sale ⚡
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-[3.5rem] text-gold animate-pulse">lock</span>
                                    </div>

                                    <h4 className="text-xl font-black text-white text-center leading-tight mb-2">
                                        나만을 위한<br />정밀 분석 완료
                                    </h4>
                                    <p className="text-xs text-slate-400 text-center leading-relaxed mb-5">
                                        6차원 인지 역량 심층 분석,<br />
                                        맞춤 도서 Top 5 + 여행지 Top 5
                                    </p>

                                    {/* Price */}
                                    <div className="flex flex-col items-center mb-4">
                                        <span className="text-slate-600 line-through text-sm mb-1">정가 ₩29,000</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-4xl font-black text-red-400">₩4,900</span>
                                            <span className="text-xs font-black text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
                                                66% OFF
                                            </span>
                                        </div>
                                    </div>

                                    {/* Countdown */}
                                    <div className="bg-white/5 py-3 mb-5 text-center border border-white/10 rounded">
                                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                                            할인 마감까지
                                        </p>
                                        <div className="text-3xl font-black text-white font-mono flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-red-400 animate-pulse text-xl">alarm</span>
                                            {formatTime(timeLeft)}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleUnlock}
                                        className="w-full py-4 bg-gold text-primary font-black text-sm uppercase tracking-tight hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(212,175,55,0.28)] rounded"
                                    >
                                        리포트 평생 소장하기 →
                                    </button>

                                    <div className="mt-4 flex items-center justify-center gap-4 text-[9px] font-bold text-slate-700 uppercase tracking-widest">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">shield_check</span> 안전 결제
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">history_edu</span> 분석 저장
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <Footer />
            </main>

            <BottomNavigation />
        </div>
    );
}
