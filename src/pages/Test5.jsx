import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MainHeader from '../components/MainHeader';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useSiteDesign } from '../hooks/useSiteDesign';

const sectionVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Test5() {
    const { design } = useSiteDesign();
    const [youtubeVideos, setYoutubeVideos] = useState([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'youtube_videos'), (snap) => {
            const videos = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => !v.hidden);
            videos.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setYoutubeVideos(videos.slice(0, 10));
        });
        return () => unsub();
    }, []);

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
        <div className="bg-[#0a0c12] min-h-screen text-white font-display">
            <MainHeader />
            {/* 히어로 섹션 */}
            <section className="relative h-[480px] w-full overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0c12]/50 to-[#0a0c12] z-10" />
                {(design?.youtube_hero || design?.main_hero)?.type === 'video' ? (
                    <video
                        src={(design?.youtube_hero || design?.main_hero)?.src}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        poster={design?.youtube_hero_poster || undefined}
                        className="absolute inset-0 w-full h-full object-cover opacity-70"
                        style={{ objectPosition: 'center top' }}
                    />
                ) : (
                    <img src={(design?.youtube_hero || design?.main_hero)?.src || '/images/hero_expert_v5.png'} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-70" style={{ objectPosition: 'center top' }} />
                )}
                <div className="relative z-20 h-full flex flex-col justify-end px-6 pb-16">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 mb-4">
                        <div className="flex items-end gap-[2px] h-4">
                            {[6, 14, 16, 10, 8].map((h, i) => (
                                <div key={i} className="w-[3px] bg-orange-500 rounded-none" style={{ height: h }} />
                            ))}
                        </div>
                        <span className="text-orange-400 text-[11px] font-bold tracking-[0.25em] uppercase">YouTube Insight</span>
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
                <div className="mb-6">
                    <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500 text-[22px]">play_circle</span>유튜브 인사이트
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-[2px] bg-red-500" />
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">YouTube Insights</p>
                    </div>
                </div>

                {youtubeVideos.length === 0 ? (
                    <div className="text-center py-16 text-gray-600">
                        <span className="material-symbols-outlined text-[48px] mb-3 block">play_circle</span>
                        <p className="text-[13px] font-bold">등록된 유튜브 영상이 없습니다</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {youtubeVideos.map((video, idx) => (
                            <YoutubeCard
                                key={video.id}
                                video={video}
                                thumb={getThumbnail(video.url)}
                                embedUrl={getEmbedUrl(video.url)}
                                idx={idx}
                            />
                        ))}
                    </div>
                )}
            </motion.section>

            <div className="h-[80px]" />
            <BottomNavigation />
            <Footer />
        </div>
    );
}

// ── 유튜브 카드 ─────────────────────────────────────────────────
function YoutubeCard({ video, thumb, embedUrl, idx }) {
    const [youtubeOpen, setYoutubeOpen] = useState(false);
    const [likeCount, setLikeCount] = useState(video.likes ?? 1024);
    const [viewCount, setViewCount] = useState(video.views ?? 2130);
    const navigate = useNavigate();

    useEffect(() => {
        setLikeCount(video.likes ?? 1024);
        setViewCount(video.views ?? 2130);
    }, [video.likes, video.views, video.id]);

    const btnBase = "flex items-center justify-center gap-1.5 py-2.5 rounded-none bg-gradient-to-b from-red-600 to-red-700 border border-red-500/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_6px_rgba(0,0,0,0.35)] text-[10px] font-black text-white hover:from-red-500 hover:to-red-600 transition-all active:scale-95 whitespace-nowrap";
    const statBtn = "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-none bg-[#ff0000]/90 border border-red-300/30 text-[10px] font-black text-white hover:bg-[#ff0000] transition-all active:scale-95";

    const handleLike = async () => {
        setLikeCount(prev => prev + 1);
        try {
            await updateDoc(doc(db, 'youtube_videos', video.id), { likes: increment(1) });
        } catch {
            await setDoc(doc(db, 'youtube_videos', video.id), { likes: (video.likes ?? 1024) + 1 }, { merge: true });
        }
    };

    const handlePodcastClick = async () => {
        setViewCount(prev => prev + 1);
        try {
            await updateDoc(doc(db, 'youtube_videos', video.id), { views: increment(1) });
        } catch {
            await setDoc(doc(db, 'youtube_videos', video.id), { views: (video.views ?? 2130) + 1 }, { merge: true });
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
            {/* 썸네일 / 유튜브 플레이어 */}
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
                    <p className="text-[11px] font-bold text-orange-500/80 flex items-center gap-1 mb-3">
                        <span className="material-symbols-outlined text-[13px]">subscriptions</span>
                        {video.channel}
                    </p>
                )}
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={handleLike} className={statBtn}>
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
                        좋아요 {likeCount.toLocaleString()}
                    </button>
                    <div className={statBtn}>
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
                        조회수 {viewCount.toLocaleString()}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={handlePodcastClick} className={btnBase}>
                        <span className="material-symbols-outlined text-[14px]">graphic_eq</span>
                        팟캐스트
                    </button>
                    <button onClick={() => setYoutubeOpen(v => !v)} className={btnBase}>
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {youtubeOpen ? 'stop_circle' : 'play_circle'}
                        </span>
                        {youtubeOpen ? '닫기' : '유튜브 보기'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
