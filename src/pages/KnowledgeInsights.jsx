import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MainHeader from '../components/MainHeader';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { useSiteDesign } from '../hooks/useSiteDesign';
import { useAuth } from '../hooks/useAuth';

const sectionVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const TABS = [
    { id: 'ALL',        label: '전체' },
    { id: 'SELF_DEV',   label: '자기계발' },
    { id: 'ECONOMY',    label: '경제' },
    { id: 'MANAGEMENT', label: '경영' },
    { id: 'HUMANITIES', label: '인문' },
    { id: 'PSYCHOLOGY', label: '심리' },
];

const CAT_MATCH = {
    SELF_DEV:   v => (v.category || '').includes('SELF_DEV')   || (v.category || '').includes('자기계발'),
    ECONOMY:    v => (v.category || '').includes('ECONOMY')    || (v.category || '').includes('경제'),
    MANAGEMENT: v => (v.category || '').includes('MANAGEMENT') || (v.category || '').includes('경영'),
    HUMANITIES: v => (v.category || '').includes('HUMANITIES') || (v.category || '').includes('인문'),
    PSYCHOLOGY: v => (v.category || '').includes('PSYCHOLOGY') || (v.category || '').includes('심리'),
};

export default function KnowledgeInsights() {
    const { design } = useSiteDesign();
    const [youtubeVideos, setYoutubeVideos] = useState([]);
    const [activeTab, setActiveTab] = useState('ALL');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'youtube_videos'), (snap) => {
            const videos = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => !v.hidden);
            videos.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setYoutubeVideos(videos.slice(0, 20));
        });
        return () => unsub();
    }, []);

    const bumpVideoCounter = (videoId, field, minBase) => {
        setYoutubeVideos(prev => prev.map(v => {
            if (v.id !== videoId) return v;
            const current = Math.max(Number(v[field]) || 0, minBase);
            return { ...v, [field]: current + 1 };
        }));
    };

    const getThumbnail = (url) => {
        if (!url) return null;
        const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
        return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
    };

    const getEmbedUrl = (url) => {
        if (!url) return null;
        const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
        return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    };

    return (
        <>
        <Helmet>
            <title>지식 인사이트 | 아카이뷰 ARCHIVIEW</title>
            <meta name="description" content="자기계발, 경제, 경영, 인문, 심리 분야 유튜브 인사이트 영상 모음. 바쁜 직장인을 위한 핵심 지식 콘텐츠를 아카이뷰에서 만나보세요." />
            <meta property="og:title" content="지식 인사이트 | 아카이뷰 ARCHIVIEW" />
            <meta property="og:description" content="자기계발, 경제, 경영, 인문, 심리 분야 유튜브 인사이트 영상 모음. 바쁜 직장인을 위한 핵심 지식 콘텐츠를 아카이뷰에서 만나보세요." />
            <meta property="og:url" content="https://archiview.store/insights" />
            <link rel="canonical" href="https://archiview.store/insights" />
        </Helmet>
        <div className="bg-[#0a0c12] min-h-screen text-white font-display">
            <MainHeader />
            {/* 히어로 섹션 */}
            <section className="relative h-[480px] w-full overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0c12]/50 to-[#0a0c12] z-10" />
                {design.youtube_hero.type === 'image' ? (
                    <img
                        src={design.youtube_hero.src}
                        alt="hero"
                        className="absolute inset-0 w-full h-full object-cover opacity-70"
                        style={{ objectPosition: 'center center' }}
                    />
                ) : (
                    <video
                        src={design.youtube_hero.src}
                        poster={design.youtube_hero_poster || undefined}
                        className="absolute inset-0 w-full h-full object-cover opacity-70"
                        style={{ objectPosition: 'center center' }}
                        autoPlay muted loop playsInline
                    />
                )}
                <div className="relative z-20 h-full flex flex-col justify-end px-6 pb-16">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 mb-4">
                        <div className="flex items-end gap-[2px] h-4">
                            {[6, 14, 16, 10, 8].map((h, i) => (
                                <div key={i} className="w-[3px] bg-red-500 rounded-none" style={{ height: h }} />
                            ))}
                        </div>
                        <span className="text-red-500 text-[11px] font-bold tracking-[0.25em] uppercase">YouTube Insight</span>
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                        className="text-[35px] font-light leading-tight tracking-tighter mb-4">
                        지식을 넓히는<br />
                        <span className="font-bold">유튜브 인사이트</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 }}
                        className="text-white/55 text-sm leading-relaxed max-w-xs">
                        세상의 통찰을 담은 영상에서<br />핵심 지식과 대화를 경험하세요
                    </motion.p>
                </div>
            </section>

            {/* 유튜브 인사이트 섹션 */}
            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-6 pt-2 pb-8">
                <div className="mb-4">
                    <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500 text-[22px]">play_circle</span>유튜브 인사이트
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-[2px] bg-red-500" />
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">YouTube Insights</p>
                    </div>
                </div>

                {/* 카테고리 탭 */}
                <div className="flex gap-1.5 mb-6">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-1.5 text-[12px] font-black tracking-tight transition-all rounded-none border ${
                                activeTab === tab.id
                                    ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20'
                                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-red-600/30'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {(() => {
                    const filtered = activeTab === 'ALL'
                        ? youtubeVideos
                        : youtubeVideos.filter(CAT_MATCH[activeTab] || (() => false));
                    return filtered.length === 0 ? (
                        <div className="text-center py-16 text-gray-600">
                            <span className="material-symbols-outlined text-[48px] mb-3 block">play_circle</span>
                            <p className="text-[13px] font-bold">해당 카테고리 영상이 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {filtered.map((video, idx) => (
                                <YoutubeCard
                                    key={video.id}
                                    video={video}
                                    thumb={getThumbnail(video.url)}
                                    embedUrl={getEmbedUrl(video.url)}
                                    idx={idx}
                                    onLikeBump={() => bumpVideoCounter(video.id, 'likes', 1024)}
                                    onViewBump={() => bumpVideoCounter(video.id, 'views', 2130)}
                                />
                            ))}
                        </div>
                    );
                })()}
            </motion.section>

            <div className="h-[80px]" />
            <BottomNavigation />
            <Footer />
        </div>
        </>
    );
}

function YoutubeCard({ video, thumb, embedUrl, idx, onLikeBump, onViewBump }) {
    const [youtubeOpen, setYoutubeOpen] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();
    const likeCount = Math.max(Number(video.likes) || 0, 1024);
    const viewCount = Math.max(Number(video.views) || 0, 2130);

    const btnBase = "flex items-center justify-center gap-1.5 py-2.5 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white transition-all active:scale-95 whitespace-nowrap";
    const podcastBtn = "flex items-center justify-center gap-1.5 py-2.5 rounded-none bg-gradient-to-b from-red-600 to-red-700 border border-red-500/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_6px_rgba(0,0,0,0.35)] text-[10px] font-black text-white hover:from-red-500 hover:to-red-600 transition-all active:scale-95 whitespace-nowrap";

    const handleLike = async () => {
        onLikeBump?.();
        try {
            const snap = await getDoc(doc(db, 'youtube_videos', video.id));
            const current = snap.exists() ? Number(snap.data()?.likes) || 0 : 0;
            await setDoc(doc(db, 'youtube_videos', video.id), { likes: Math.max(current, 1024) + 1 }, { merge: true });
        } catch {
            await setDoc(doc(db, 'youtube_videos', video.id), { likes: Math.max(Number(video.likes) || 0, 1024) + 1 }, { merge: true });
        }
    };

    const handlePodcastClick = async () => {
        onViewBump?.();
        try {
            const snap = await getDoc(doc(db, 'youtube_videos', video.id));
            const current = snap.exists() ? Number(snap.data()?.views) || 0 : 0;
            await setDoc(doc(db, 'youtube_videos', video.id), { views: Math.max(current, 2130) + 1 }, { merge: true });
        } catch {
            await setDoc(doc(db, 'youtube_videos', video.id), { views: Math.max(Number(video.views) || 0, 2130) + 1 }, { merge: true });
        }
        if (!user) {
            setShowLoginModal(true);
            return;
        }
        navigate(`/yt-podcast/${video.id}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
            className="bg-zinc-900/60 border border-white/5 overflow-hidden"
        >
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                {youtubeOpen && embedUrl ? (
                    <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`${embedUrl}?autoplay=1&rel=0`}
                        title={video.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    <div className="absolute inset-0">
                        {thumb
                            ? <img src={thumb} alt={video.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><span className="material-symbols-outlined text-white/20 text-[64px]">play_circle</span></div>
                        }
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-3 left-3 bg-black/70 px-2 py-0.5 text-[11px] font-black text-white/70">
                            {String(idx + 1).padStart(2, '0')}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4">
                <h3 className="text-[14px] font-black text-white leading-snug mb-1 line-clamp-2">{video.title}</h3>
                {video.channel && (
                    <p className="text-[11px] font-bold text-red-400/80 flex items-center gap-1 mb-3">
                        <span className="material-symbols-outlined text-[13px]">subscriptions</span>
                        {video.channel}
                    </p>
                )}
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <motion.button
                        onClick={handleLike}
                        className={btnBase}
                        whileHover={{ y: -2, scale: 1.02, boxShadow: '0 8px 18px rgba(0,0,0,0.35)' }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <motion.span
                            className="material-symbols-outlined text-[14px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                            whileHover={{ rotate: -8, scale: 1.15 }}
                        >
                            thumb_up
                        </motion.span>
                        {likeCount.toLocaleString()} 좋아요
                    </motion.button>
                    <motion.div
                        className={btnBase}
                        whileHover={{ y: -2, scale: 1.02, boxShadow: '0 8px 18px rgba(0,0,0,0.35)' }}
                    >
                        <motion.span
                            className="material-symbols-outlined text-[14px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                            whileHover={{ scale: 1.15 }}
                        >
                            visibility
                        </motion.span>
                        {viewCount.toLocaleString()} 조회수
                    </motion.div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <motion.button
                        onClick={handlePodcastClick}
                        className={podcastBtn}
                        whileHover={{ y: -2, scale: 1.02, boxShadow: '0 10px 22px rgba(220,38,38,0.35)' }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <span className="inline-flex items-end gap-[2px] h-[14px]">
                            {[0, 1, 2, 3].map((i) => (
                                <span
                                    key={i}
                                    className="w-[2px] bg-white/95 rounded-[1px]"
                                    style={{ height: `${[12, 8, 14, 10][i]}px` }}
                                />
                            ))}
                        </span>
                        팟캐스트
                    </motion.button>
                    <motion.button
                        onClick={() => setYoutubeOpen(v => !v)}
                        className={btnBase}
                        whileHover={{ y: -2, scale: 1.02, boxShadow: '0 8px 18px rgba(0,0,0,0.35)' }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <motion.span
                            className="material-symbols-outlined text-[14px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                            whileHover={{ scale: 1.15 }}
                        >
                            {youtubeOpen ? 'stop_circle' : 'play_circle'}
                        </motion.span>
                        {youtubeOpen ? '닫기' : '유튜브 보기'}
                    </motion.button>
                </div>
            </div>

            {showLoginModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <div className="relative w-full max-w-sm mx-auto bg-[#0e1118] border border-white/10 p-8 space-y-6 shadow-2xl">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="size-16 bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-400 text-3xl">login</span>
                            </div>
                            <h2 className="text-white font-black text-2xl tracking-tight">로그인이 필요해요</h2>
                            <p className="text-slate-400 text-sm leading-relaxed">이 콘텐츠는 회원만 이용할 수 있어요.<br/>무료로 가입하고 바로 시작하세요.</p>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    sessionStorage.setItem('loginRedirect', window.location.pathname + window.location.search);
                                    navigate('/login');
                                }}
                                className="w-full py-4 bg-blue-500 text-white font-black text-sm hover:bg-blue-400 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-base">person</span>
                                로그인 / 회원가입
                            </button>
                            <button onClick={() => setShowLoginModal(false)} className="w-full py-3 bg-white/5 text-slate-400 text-sm font-bold hover:bg-white/10 transition-all">
                                돌아가기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
