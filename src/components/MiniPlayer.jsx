import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAudio } from '../contexts/AudioContext';

const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

export default function MiniPlayer() {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        podcastPlaying, podcastInfo, currentTime, duration,
        playPodcastMP3, pausePodcastMP3, seekPodcastMP3, closePodcastMP3
    } = useAudio();

    if (!podcastInfo) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const goToPodcast = () => {
        if (podcastInfo.id) {
            navigate(`/story/${podcastInfo.id}`);
        }
    };

    const isReviewMode = location.pathname.startsWith('/review');
    const bottomNavH = isReviewMode ? 0 : 56;

    return (
        <div style={{
            position: 'fixed',
            bottom: `calc(${bottomNavH}px + env(safe-area-inset-bottom, 0px))`,
            left: '50%',
            transform: 'translate3d(-50%, 0, 0)',
            width: '100%',
            maxWidth: 430,
            background: 'rgba(10, 10, 20, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '0 16px 10px',
            paddingTop: 6,
            zIndex: 60,
            boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
            willChange: 'transform',
        }}>
            {/* Progress bar — clickable */}
            <div
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: 'rgba(255,255,255,0.07)', cursor: 'pointer'
                }}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    seekPodcastMP3(ratio * duration);
                }}
            >
                <div style={{
                    width: `${progress}%`, height: '100%',
                    background: 'linear-gradient(90deg, #f97316, #fb923c)',
                    transition: 'width 0.3s linear',
                    borderRadius: '0 2px 2px 0'
                }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Cover */}
                <div
                    onClick={goToPodcast}
                    style={{ cursor: 'pointer', flexShrink: 0, position: 'relative' }}
                >
                    <img
                        src={podcastInfo.cover || '/images/covers/default_custom.jpg'}
                        alt=""
                        style={{
                            width: 44, height: 44,
                            borderRadius: 8,
                            objectFit: 'cover',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    />
                    {podcastPlaying && (
                        <div style={{
                            position: 'absolute', bottom: 2, right: 2,
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#f97316',
                            boxShadow: '0 0 6px #f97316',
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }} />
                    )}
                </div>

                {/* Info */}
                <div
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={goToPodcast}
                >
                    <div style={{
                        color: '#f1f5f9',
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.01em'
                    }}>
                        {podcastInfo.title || 'Podcast'}
                    </div>
                    <div style={{
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: 11,
                        marginTop: 2,
                        fontVariantNumeric: 'tabular-nums'
                    }}>
                        {fmt(currentTime)} / {fmt(duration)}
                    </div>
                </div>

                {/* 책 대화보기 */}
                <button
                    onClick={goToPodcast}
                    style={{
                        flexShrink: 0,
                        background: 'rgba(249,115,22,0.12)',
                        border: '1px solid rgba(249,115,22,0.35)',
                        borderRadius: 8,
                        padding: '6px 10px',
                        display: 'flex', alignItems: 'center', gap: 4,
                        cursor: 'pointer',
                        color: 'rgba(251,146,60,0.95)',
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>menu_book</span>
                    <span>대화보기</span>
                </button>

                {/* Play / Pause — perfectly round */}
                <button
                    onClick={() => podcastPlaying
                        ? pausePodcastMP3()
                        : playPodcastMP3(podcastInfo.src, podcastInfo.title, podcastInfo.cover, podcastInfo.id)
                    }
                    style={{
                        flexShrink: 0,
                        width: 38,
                        height: 38,
                        minWidth: 38,
                        minHeight: 38,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f97316, #fb923c)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#fff',
                        boxShadow: '0 4px 16px rgba(249,115,22,0.45)',
                        padding: 0,
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {podcastPlaying ? 'pause' : 'play_arrow'}
                    </span>
                </button>

                {/* Close */}
                <button
                    onClick={closePodcastMP3}
                    style={{
                        flexShrink: 0,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.3)',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.7); }
                }
            `}</style>
        </div>
    );
}
