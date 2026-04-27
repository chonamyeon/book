import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../contexts/AudioContext';
import { useLocation } from 'react-router-dom';

const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function InsightBanner() {
    const { dailyListenTime, dailyTarget, streak, podcastInfo } = useAudio();
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(true);
    const isReviewMode = location.pathname.startsWith('/review');
    // MiniPlayer가 표시될 때는 그 위로 올라가야 함 (MiniPlayer 높이 ~70px)
    const miniPlayerActive = !!podcastInfo && !isReviewMode;
    const bottomOffset = miniPlayerActive ? 84 + 70 : 84;

    // Persist hidden state for the session
    useEffect(() => {
        const isHidden = sessionStorage.getItem('insightBannerHidden');
        if (isHidden) setIsVisible(false);
    }, []);

    const handleClose = (e) => {
        e.stopPropagation();
        setIsVisible(false);
        sessionStorage.setItem('insightBannerHidden', 'true');
    };

    if (!isVisible) return null;

    // 15 blocks total (1 per minute)
    const totalBlocks = 30; // Increased for a wider look
    const filledBlocks = Math.min(totalBlocks, Math.floor(dailyListenTime / (dailyTarget / totalBlocks)));
    const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(Math.max(0, totalBlocks - filledBlocks));

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 100, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="fixed left-1/2 w-[calc(100%-40px)] max-w-[360px] z-[9999]"
                    style={{ bottom: bottomOffset }}
                >
                    <div className="relative overflow-hidden group rounded-none">
                        {/* Premium Glassmorphism Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 blur-xl opacity-50" />
                        
                        <div className="relative bg-[#101218]/95 border border-white/10 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-none">
                            {/* Close Button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-1 right-1 w-10 h-10 flex items-center justify-center rounded-none text-white/40 hover:text-white transition-all z-10"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>

                            <div className="flex flex-col gap-3">
                                {/* Header Row */}
                                <div className="flex items-center justify-between pr-8">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-[13px] font-black tracking-tight text-white/90 uppercase">오늘의 인사이트 타임</h3>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-none bg-orange-500/10 border border-orange-500/20">
                                        <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">ON AIR</span>
                                        <div className="w-1.5 h-1.5 rounded-none bg-orange-500 animate-pulse shadow-[0_0_5px_rgba(249,115,22,0.8)]" />
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="flex items-baseline justify-between">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[24px] font-black text-white tracking-tighter tabular-nums leading-none">
                                            {formatTime(dailyListenTime)}
                                        </span>
                                        <span className="text-[10px] font-bold text-white/40 tracking-tight uppercase">Min Listened</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[14px] font-bold text-white/60 tracking-tight">
                                            / {formatTime(dailyTarget)} <span className="text-white/20 ml-1 font-black">GOAL</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Row */}
                                <div className="space-y-2">
                                    <div className="text-[14px] font-mono tracking-[0.12em] text-orange-500/90 leading-none filter drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">
                                        {progressBar}
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[12px] font-black text-white/70 tracking-tight">{streak}일 연속 달성 중</span>
                                        </div>
                                        <span className="text-[9px] font-black text-orange-500/50 uppercase tracking-[0.2em]">Growing Daily</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
