import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../contexts/AudioContext';

const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

export default function MiniPlayer() {
    const navigate = useNavigate();
    const {
        podcastPlaying, podcastInfo, currentTime, duration,
        playPodcastMP3, pausePodcastMP3, seekPodcastMP3, closePodcastMP3
    } = useAudio();

    if (!podcastInfo) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const goToPodcast = () => {
        if (podcastInfo.id) {
            navigate(`/review/${podcastInfo.id}?tab=podcast`);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 430,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 12px',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
            zIndex: 9999,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
        }}>
            {/* Progress bar */}
            <div
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: 'rgba(255,255,255,0.1)', cursor: 'pointer'
                }}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    seekPodcastMP3(ratio * duration);
                }}
            >
                <div style={{
                    width: `${progress}%`, height: '100%',
                    background: 'linear-gradient(90deg, #e94560, #ff6b6b)',
                    transition: 'width 0.3s ease'
                }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Cover - Click to go back */}
                <div onClick={goToPodcast} style={{ cursor: 'pointer', position: 'relative' }}>
                    {podcastInfo.cover && (
                        <img src={podcastInfo.cover} alt="" style={{
                            width: 40, height: 40, borderRadius: 6, objectFit: 'cover',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }} />
                    )}
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
                        borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.2s'
                    }} className="hover-show">
                        <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 18 }}>menu_book</span>
                    </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={goToPodcast}>
                    <div style={{
                        color: '#fff', fontSize: 13, fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                        🎙️ {podcastInfo.title || 'Podcast'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                        {fmt(currentTime)} / {fmt(duration)}
                    </div>
                </div>

                {/* Controls */}
                {/* Go back button (Text version) */}
                <button
                    onClick={goToPodcast}
                    style={{
                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', 
                        borderRadius: '8px', padding: '6px 10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff', fontSize: '10px', fontWeight: '700',
                        whiteSpace: 'nowrap', transition: 'all 0.2s'
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 14, marginRight: 4 }}>menu_book</span>
                    <span>책 대화보기</span>
                </button>

                <button
                    onClick={() => podcastPlaying
                        ? pausePodcastMP3()
                        : playPodcastMP3(podcastInfo.src, podcastInfo.title, podcastInfo.cover, podcastInfo.id)
                    }
                    style={{
                        background: 'linear-gradient(135deg, #e94560, #ff6b6b)',
                        border: 'none', borderRadius: '50%', width: 36, height: 36,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff', boxShadow: '0 2px 10px rgba(233,69,96,0.4)'
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {podcastPlaying ? 'pause' : 'play_arrow'}
                    </span>
                </button>

                <button
                    onClick={closePodcastMP3}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.4)', padding: 4
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
            </div>
        </div>
    );
}
