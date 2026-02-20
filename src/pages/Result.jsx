import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { recommendations } from '../data/recommendations';
import { resultData } from '../data/resultData';
import BottomNavigation from '../components/BottomNavigation';

export default function Result() {
    const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15:00
    const location = useLocation();

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        // Check for existing premium unlock
        const unlocked = localStorage.getItem('premiumUnlocked') === 'true';
        if (unlocked) {
            setIsPremiumUnlocked(true);
        }

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Default to 'growth' if accessed directly or no result type passed
    const resultType = location.state?.resultType || localStorage.getItem('myResultType') || 'growth';
    const currentRecommendation = recommendations[resultType];
    const data = resultData[resultType];

    const handleUnlock = () => {
        // [Adari] Payment logic here
        const confirmed = window.confirm("PG_LINK: [특별 할인가 9,900원] 결제를 진행하시겠습니까? (Toss/Kakao)");
        if (confirmed) {
            setIsPremiumUnlocked(true);
            localStorage.setItem('premiumUnlocked', 'true');
            // Store the result type so Library can access it
            localStorage.setItem('myResultType', resultType);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'The Archive - 인지 분석 결과',
                text: `${data.persona} - 나의 독서 성향 분석 결과입니다.`,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('링크가 클립보드에 복사되었습니다.');
            });
        }
    };

    const handleInstagramShare = () => {
        // Direct upload to Instagram is not possible via web API, 
        // so we prompt for share sheet (where Instagram can be selected) or give instructions.
        if (navigator.share) {
            navigator.share({
                title: 'The Archive',
                text: `${data.persona} - 나의 인지 분석 결과! #TheArchive #독서테스트`,
                url: window.location.href,
            }).catch(console.error);
        } else {
            alert('인스타그램으로 공유하려면 모바일 기기를 사용하시거나 스크린샷을 찍어 직접 업로드해 주세요.');
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between bg-background-light/80 dark:bg-background-dark/80 px-4 py-4 backdrop-blur-md border-b border-primary/10 dark:border-white/10">
                <Link to="/quiz" className="flex size-10 items-center justify-center rounded-full hover:bg-primary/10 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </Link>
                <h1 className="text-lg font-bold tracking-tight">테스트 결과</h1>
                <button onClick={handleShare} className="flex size-10 items-center justify-center rounded-full hover:bg-primary/10 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-2xl">share</span>
                </button>
            </header>

            <main className="flex-1 pb-24">
                {/* Hero Section: Reading Persona */}
                <section className="flex flex-col items-center px-6 py-8 text-center animate-fade-in-up">
                    <div className="relative mb-6">
                        {/* Decorative Glow */}
                        <div className="absolute inset-0 scale-110 rounded-full bg-primary/20 blur-3xl dark:bg-blue-500/10"></div>
                        {/* Persona Graphic - Dynamic Image */}
                        <div className="relative flex size-48 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/5 p-4 dark:border-white/10">
                            <div className="size-40 rounded-full bg-cover bg-center shadow-2xl" style={{ backgroundImage: `url('${data.image}')` }}></div>
                            <div className="absolute -bottom-2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white ring-4 ring-background-dark">검증된 분석 결과</div>
                        </div>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-primary dark:text-white">{data.persona}</h2>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 font-medium">{data.subtitle}</p>
                    <div className="mt-4 flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 dark:bg-white/5">
                        <span className="material-symbols-outlined text-sm text-blue-500">verified</span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">과학적으로 입증된 결과</span>
                    </div>
                </section>

                {/* Metric Cards Grid */}
                <section className="px-4 py-4 animate-fade-in-up delay-100">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="flex flex-col items-center justify-center rounded-xl bg-primary/5 p-4 text-center dark:bg-primary/20 border border-primary/10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{data.metrics.wpm.label}</span>
                            <span className="text-xl font-extrabold text-primary dark:text-white">{data.metrics.wpm.value}</span>
                            <span className="text-[10px] font-bold text-emerald-500">{data.metrics.wpm.change}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-xl bg-primary/5 p-4 text-center dark:bg-primary/20 border border-primary/10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{data.metrics.accuracy.label}</span>
                            <span className="text-xl font-extrabold text-primary dark:text-white">{data.metrics.accuracy.value}</span>
                            <span className="text-[10px] font-bold text-emerald-500">{data.metrics.accuracy.rank}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-xl bg-primary/5 p-4 text-center dark:bg-primary/20 border border-primary/10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{data.metrics.retention.label}</span>
                            <span className="text-xl font-extrabold text-primary dark:text-white">{data.metrics.retention.value}</span>
                            <span className="text-[10px] font-bold text-emerald-500">{data.metrics.retention.rank}</span>
                        </div>
                    </div>

                    {/* Metric Interpretation Guide */}
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-100 dark:border-white/5">
                        <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">info</span> 지표 해석 가이드
                        </h4>
                        <ul className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            <li><strong className="text-primary dark:text-slate-300">분당 단어 수 (WPM):</strong> 귀하의 인지 반응 속도를 기반으로 예측된 텍스트 처리 효율성입니다.</li>
                            <li><strong className="text-primary dark:text-slate-300">정확도/논리력:</strong> 텍스트의 핵심 구조와 인과관계를 파악하는 정확성을 의미합니다.</li>
                            <li><strong className="text-primary dark:text-slate-300">기억력/적용력:</strong> 습득한 정보를 장기 기억으로 전환하고 응용하는 잠재 역량입니다.</li>
                        </ul>
                        <p className="mt-2 text-[10px] text-slate-400 italic">
                            * 위 수치는 귀하의 응답 패턴을 50만 건의 독서 행동 데이터와 대조하여 도출된 예측값입니다.
                        </p>
                    </div>
                </section>

                {/* Summary Text */}
                <section className="px-6 py-4 animate-fade-in-up delay-200">
                    <h3 className="text-lg font-bold">성과 요약</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{data.summary}</p>
                </section>

                {/* Share Actions */}
                <section className="px-6 py-4 flex gap-3 animate-fade-in-up delay-300">
                    <button
                        onClick={handleShare}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold transition-all active:scale-95 shadow-xl hover:shadow-primary/20"
                    >
                        <span className="material-symbols-outlined text-xl">share</span>
                        결과 공유하기
                    </button>
                    <button
                        onClick={handleInstagramShare}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white font-bold transition-all active:scale-95 shadow-xl hover:shadow-[#dc2743]/30"
                    >
                        <span className="material-symbols-outlined text-xl">photo_camera</span>
                        인스타 업로드
                    </button>
                </section>

                {/* Gated Premium Section */}
                <section className="relative mx-4 mt-8 mb-12 overflow-hidden rounded-3xl border border-primary/20 dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-fade-in-up delay-500">
                    <div className="p-6 md:p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-primary dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gold font-bold">workspace_premium</span>
                                    프리미엄 정밀 분석 리포트
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-1 font-bold uppercase tracking-wider">Big Data Cognitive Analysis Suite</p>
                            </div>
                        </div>

                        {/* Blurred Content / Real Content */}
                        <div className={`space-y-8 transition-all duration-700 ${!isPremiumUnlocked ? 'filter blur-xl opacity-20 pointer-events-none select-none h-[500px] overflow-hidden' : ''}`}>
                            {/* 1. Radar Chart Component (SVG) */}
                            <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-2xl border border-primary/5 dark:border-white/5 relative">
                                <h4 className="text-sm font-bold text-primary dark:text-white mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-500">radar</span>
                                    5-Dimension 인지 역량 모델
                                </h4>
                                <div className="flex flex-col items-center gap-8">
                                    {/* SVG Radar Chart */}
                                    <div className="relative size-48 shrink-0">
                                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl transform text-xs">
                                            {/* Background Web */}
                                            <polygon points="50,5 95,30 95,75 50,95 5,75 5,30" fill="none" stroke="#ddd" strokeWidth="0.5" className="dark:stroke-white/20" />
                                            <polygon points="50,20 80,35 80,65 50,80 20,65 20,35" fill="none" stroke="#ddd" strokeWidth="0.5" className="dark:stroke-white/20" />

                                            {/* Data Polygon (Dynamic) */}
                                            <polygon points={data.radarChart.points} fill="rgba(212, 175, 55, 0.4)" stroke="#d4af37" strokeWidth="2" className="animate-pulse-slow" />

                                            {/* Labels */}
                                            <text x="50" y="4" textAnchor="middle" fontSize="6" className="fill-slate-600 dark:fill-slate-300 font-bold">집중력</text>
                                            <text x="96" y="28" textAnchor="start" fontSize="6" className="fill-slate-600 dark:fill-slate-300 font-bold">논리성</text>
                                            <text x="96" y="78" textAnchor="start" fontSize="6" className="fill-slate-600 dark:fill-slate-300 font-bold">속독력</text>
                                            <text x="50" y="99" textAnchor="middle" fontSize="6" className="fill-slate-600 dark:fill-slate-300 font-bold">기억력</text>
                                            <text x="4" y="78" textAnchor="end" fontSize="6" className="fill-slate-600 dark:fill-slate-300 font-bold">공감력</text>
                                            <text x="4" y="28" textAnchor="end" fontSize="6" className="fill-slate-600 dark:fill-slate-300 font-bold">어휘력</text>
                                        </svg>
                                    </div>
                                    <div className="w-full text-center">
                                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                            귀하의 인지 패턴은 <strong className="text-primary dark:text-gold">{data.persona}</strong>에 가깝습니다. 특히 <strong>{data.metrics.accuracy.label}</strong>과 <strong>{data.metrics.retention.label}</strong> 영역에서 탁월한 수치를 보입니다.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Comparative Bar Charts & Deep Dive */}
                            <div className="space-y-8">
                                <h4 className="text-sm font-bold text-primary dark:text-white mb-4 flex items-center gap-2 border-b border-primary/10 dark:border-white/10 pb-2">
                                    <span className="material-symbols-outlined text-green-500">analytics</span>
                                    Big Data 비교 분석 (N=50,214)
                                </h4>

                                {/* Analysis Item 1: Cognitive Load */}
                                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-xl">
                                    <div className="flex justify-between items-end mb-2">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">인지 부하 처리량 (Cognitive Load Capacity)</span>
                                            <h5 className="text-lg font-black text-primary dark:text-white">{data.bigData.load.percentile} <span className="text-xs font-normal text-slate-500 ml-1">({data.bigData.load.rank})</span></h5>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-green-600">{data.bigData.load.score}</span>
                                            <span className="text-[10px] text-slate-400 block">/ 100 pt</span>
                                        </div>
                                    </div>
                                    {/* Comparative Bar */}
                                    <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden relative mb-3">
                                        <div className="absolute top-0 left-0 h-full bg-slate-400 w-[45%] opacity-30"></div> {/* Average Marker Area */}
                                        <div className="absolute top-0 left-[44%] h-full w-[2px] bg-slate-500 z-10"></div> {/* Average Line */}
                                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-gold shadow-lg transition-all duration-1000 ease-out" style={{ width: `${data.bigData.load.score}%` }}></div> {/* User Score */}
                                    </div>
                                    <div className="flex justify-between text-[9px] text-slate-400 font-medium mb-3">
                                        <span>Average ({data.bigData.load.avg})</span>
                                        <span>You ({data.bigData.load.score})</span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-white/10 pt-3 mt-2">
                                        {data.bigData.load.desc}
                                    </p>
                                </div>

                                {/* Analysis Item 2: Inference Speed */}
                                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-xl">
                                    <div className="flex justify-between items-end mb-2">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">맥락 추론 속도 (Inference Speed)</span>
                                            <h5 className="text-lg font-black text-primary dark:text-white">{data.bigData.inference.percentile} <span className="text-xs font-normal text-slate-500 ml-1">({data.bigData.inference.rank})</span></h5>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-blue-500">{data.bigData.inference.score}</span>
                                            <span className="text-[10px] text-slate-400 block">/ 100 pt</span>
                                        </div>
                                    </div>
                                    {/* Comparative Bar */}
                                    <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden relative mb-3">
                                        <div className="absolute top-0 left-0 h-full bg-slate-400 w-[52%] opacity-30"></div>
                                        <div className="absolute top-0 left-[51%] h-full w-[2px] bg-slate-500 z-10"></div>
                                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-lg transition-all duration-1000 ease-out" style={{ width: `${data.bigData.inference.score}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[9px] text-slate-400 font-medium mb-3">
                                        <span>Average ({data.bigData.inference.avg})</span>
                                        <span>You ({data.bigData.inference.score})</span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-white/10 pt-3 mt-2">
                                        {data.bigData.inference.desc}
                                    </p>
                                </div>

                                {/* Analysis Item 3: Vocabulary Depth (New) */}
                                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-xl">
                                    <div className="flex justify-between items-end mb-2">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">어휘 다양성 (Lexical Diversity)</span>
                                            <h5 className="text-lg font-black text-primary dark:text-white">{data.bigData.vocabulary.percentile} <span className="text-xs font-normal text-slate-500 ml-1">({data.bigData.vocabulary.rank})</span></h5>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-purple-500">{data.bigData.vocabulary.score}</span>
                                            <span className="text-[10px] text-slate-400 block">/ 100 pt</span>
                                        </div>
                                    </div>
                                    {/* Comparative Bar */}
                                    <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden relative mb-3">
                                        <div className="absolute top-0 left-0 h-full bg-slate-400 w-[38%] opacity-30"></div>
                                        <div className="absolute top-0 left-[37%] h-full w-[2px] bg-slate-500 z-10"></div>
                                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-pink-400 shadow-lg transition-all duration-1000 ease-out" style={{ width: `${data.bigData.vocabulary.score}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[9px] text-slate-400 font-medium mb-3">
                                        <span>Average ({data.bigData.vocabulary.avg})</span>
                                        <span>You ({data.bigData.vocabulary.score})</span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-white/10 pt-3 mt-2">
                                        {data.bigData.vocabulary.desc}
                                    </p>
                                </div>
                            </div>

                            {/* 3. Expert Comments */}
                            <div className="bg-primary/5 dark:bg-white/5 p-5 rounded-2xl border-l-4 border-primary dark:border-gold">
                                <h4 className="text-sm font-bold text-primary dark:text-white mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xl">auto_awesome</span>
                                    AI 큐레이터의 종합 제언
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                                    {data.bigData.comment}
                                </p>
                            </div>

                            {/* 4. Tailored Book Recommendations (Premium) */}
                            <div className="pt-8 border-t border-primary/10 dark:border-white/10">
                                <div className="mb-6">
                                    <span className="text-xs font-bold text-gold uppercase tracking-wider">AI 큐레이션</span>
                                    <h4 className="text-lg font-bold text-primary dark:text-white mt-1">
                                        귀하를 위한 추천 도서 Top 5
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">{currentRecommendation.desc}</p>
                                </div>
                                <div className="space-y-4">
                                    {currentRecommendation.books.map((book, index) => (
                                        <div
                                            key={index}
                                            className="flex gap-4 p-4 rounded-xl bg-white dark:bg-white/5 border border-primary/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all group"
                                        >
                                            <div className="w-16 h-24 shrink-0 rounded-md overflow-hidden bg-slate-200 shadow-md">
                                                <img
                                                    src={book.cover}
                                                    alt={book.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <h5 className="font-bold text-primary dark:text-white text-sm line-clamp-1">{book.title}</h5>
                                                <p className="text-xs text-slate-500 mb-1">{book.author}</p>
                                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight line-clamp-2 mb-3">{book.desc}</p>

                                                <div className="flex gap-2">
                                                    <a
                                                        href={book.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 bg-gold hover:bg-gold-light text-primary text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95"
                                                    >
                                                        구매하기 <span className="material-symbols-outlined text-xs">shopping_cart</span>
                                                    </a>
                                                    <button
                                                        onClick={() => {
                                                            const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
                                                            const isSaved = saved.some(b => b.title === book.title);
                                                            if (isSaved) {
                                                                const filtered = saved.filter(b => b.title !== book.title);
                                                                localStorage.setItem('savedBooks', JSON.stringify(filtered));
                                                                alert('서재에서 삭제되었습니다.');
                                                            } else {
                                                                saved.push(book);
                                                                localStorage.setItem('savedBooks', JSON.stringify(saved));
                                                                alert('서재에 추가되었습니다.');
                                                            }
                                                            window.dispatchEvent(new Event('storage'));
                                                        }}
                                                        className="flex-1 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95"
                                                    >
                                                        추천지정 <span className="material-symbols-outlined text-xs">bookmark</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 5. Tailored Travel Recommendations (Premium) */}
                            <div className="pt-8 border-t border-primary/10 dark:border-white/10">
                                <div className="mb-6">
                                    <span className="text-xs font-bold text-gold uppercase tracking-wider">AI 큐레이션 2</span>
                                    <h4 className="text-lg font-bold text-primary dark:text-white mt-1">
                                        귀하에게 딱 맞는 여행지 Top 5
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">{currentRecommendation.travelDesc}</p>
                                </div>
                                <div className="space-y-4">
                                    {currentRecommendation.travel && currentRecommendation.travel.map((place, index) => (
                                        <div
                                            key={index}
                                            className="relative overflow-hidden rounded-xl bg-slate-900 group shadow-md hover:shadow-xl transition-all"
                                        >
                                            {/* Image Background */}
                                            <div className="absolute inset-0">
                                                <img src={place.image} alt={place.place} className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-50 transition-all duration-700" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                                            </div>

                                            {/* Content */}
                                            <div className="relative p-5 flex flex-col items-start justify-end h-32">
                                                <span className="text-[10px] font-bold text-gold bg-black/30 px-2 py-0.5 rounded-full mb-2 backdrop-blur-sm border border-white/10">{place.country}</span>
                                                <h5 className="text-lg font-bold text-white leading-tight mb-1">{place.place}</h5>
                                                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{place.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isPremiumUnlocked && (
                                <div className="mt-8 p-4 bg-green-500/10 rounded-xl text-green-600 text-sm font-bold text-center border border-green-500/20 shadow-inner flex flex-col items-center gap-2 animate-fade-in">
                                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                                    <span>모든 데이터 분석 및 추천 도서 잠금이 해제되었습니다.</span>
                                </div>
                            )}
                        </div>

                        {/* Enhanced Overlay CTA */}
                        {!isPremiumUnlocked && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-sm p-6 text-center">
                                {/* Time Sale Badge */}
                                <div className="mb-8 animate-bounce-subtle">
                                    <div className="bg-red-600 text-white text-[11px] font-black px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] uppercase tracking-[0.2em] border border-white/20">
                                        ⚡ Limited Time Sale ⚡
                                    </div>
                                </div>

                                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/20 shadow-2xl w-full max-w-sm">
                                    <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-gold/20 to-gold/5 mx-auto ring-1 ring-gold/30">
                                        <span className="material-symbols-outlined text-5xl text-gold animate-pulse">lock</span>
                                    </div>

                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">당신만을 위한<br />정밀 분석이 완료되었습니다</h4>
                                    <p className="mb-6 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                        상위 1%의 인지 처리 패턴과<br />
                                        인물 기반 맞춤 도서/여행지 추천을 확인하세요.
                                    </p>

                                    {/* Price Section */}
                                    <div className="mb-6 flex flex-col items-center">
                                        <span className="text-slate-400 line-through text-sm font-bold opacity-75 mb-1">정가 ₩29,000</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-4xl font-black text-red-500">₩9,900</span>
                                            <span className="text-xs font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded">66% OFF</span>
                                        </div>
                                    </div>

                                    {/* Countdown Timer */}
                                    <div className="mb-8 bg-slate-100 dark:bg-white/5 py-3 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">할인 마감까지 남은 시간</p>
                                        <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-widest flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-red-500 animate-pulse">alarm</span>
                                            {formatTime(timeLeft)}
                                        </div>
                                    </div>

                                    <button onClick={handleUnlock} className="group relative w-full overflow-hidden rounded-2xl bg-gold text-slate-900 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                                        <div className="relative flex items-center justify-center gap-3 py-5 px-6">
                                            <span className="text-base font-black uppercase tracking-tight">리포트 평생 소장하기</span>
                                            <span className="material-symbols-outlined font-bold">arrow_forward</span>
                                        </div>
                                    </button>

                                    <div className="mt-6 flex items-center justify-center gap-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest opacity-80">
                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">shield_check</span> 안전 결제</span>
                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">history_edu</span> 분석 저장</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Brand Message Section */}
                <section className="px-8 py-16 text-center border-t border-white/5 opacity-80 mb-8">
                    <h2 className="serif-title text-2xl text-white mb-4 tracking-tight">아카이드: 생각의 시간</h2>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto font-light">
                        "책을 기록하는 '아카이드'의 공간에서,<br />
                        오롯이 나만의 '생각의 시간'을 갖는다"
                    </p>
                </section>
            </main>

            {/* Bottom Navigation */}
            <BottomNavigation />
        </div>
    );
}
