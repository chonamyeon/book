import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { getDoc, doc } from 'firebase/firestore';
import { useAudio } from '../contexts/AudioContext';
import './ReviewDetail.css';

function Avatar({ role }) {
    const [err, setErr] = useState(false);
    const src = role === 'A' ? '/images/james101.jpg' : '/images/stella101.jpg';
    if (err) return <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#666' }}>person</span>;
    return <img src={src} alt={role === 'A' ? '제임스' : '스텔라'} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}

export default function YtPodcast() {
    const { id } = useParams();
    const navigate = useNavigate();
    const podcastId = `yt-${id}`;

    const [vidData, setVidData] = useState(null);
    const [script, setScript] = useState([]);
    const [timestamps, setTimestamps] = useState(null);
    const [loading, setLoading] = useState(true);

    const { playPodcastMP3, pausePodcastMP3, podcastPlaying, podcastInfo, currentTime, duration, seekPodcastMP3 } = useAudio();

    const isThisPlaying = podcastPlaying && podcastInfo?.id === podcastId;
    const isMyPodcast = podcastInfo?.id === podcastId;

    useEffect(() => {
        (async () => {
            try {
                const [vidSnap, scSnap, tsSnap] = await Promise.all([
                    getDoc(doc(db, 'youtube_videos', id)),
                    getDoc(doc(db, 'scripts', podcastId)),
                    getDoc(doc(db, 'timestamps', podcastId)),
                ]);
                const vid = vidSnap.exists() ? vidSnap.data() : {};
                const sc = scSnap.exists() ? scSnap.data() : {};
                const ts = tsSnap.exists() ? tsSnap.data() : {};
                const m = (vid.url || '').match(/(?:v=|youtu\.be\/)([^&\s]+)/);
                const thumb = m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
                setVidData({ ...vid, thumb, audioUrl: sc.audioUrl || ts.audioUrl || null });
                setScript(sc.script || sc.lines || []);
                if (ts.segments?.length) setTimestamps(ts.segments);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    // 데이터 로드 완료 후 자동 재생
    useEffect(() => {
        if (!vidData?.audioUrl) return;
        playPodcastMP3(vidData.audioUrl, vidData.title, vidData.thumb, podcastId);
    }, [vidData?.audioUrl]);

    const activeTurnIndex = useMemo(() => {
        if (!script.length || !duration) return -1;
        if (timestamps?.length) {
            for (let i = timestamps.length - 1; i >= 0; i--) {
                if (timestamps[i]?.start != null && currentTime >= timestamps[i].start) return i;
            }
            return 0;
        }
        const total = script.reduce((s, t) => s + (t.text?.length || 1), 0);
        let elapsed = 0;
        for (let i = 0; i < script.length; i++) {
            const d = ((script[i].text?.length || 1) / total) * duration;
            if (currentTime < elapsed + d) return i;
            elapsed += d;
        }
        return script.length - 1;
    }, [script, timestamps, currentTime, duration]);

    // timestamps 없어도 duration 있으면 비례 계산으로 싱크 모드 활성화
    const hasSyncData = script.length > 0 && !!duration;
    const chatEndRef = useRef(null);
    const containerRef = useRef(null);
    const [userScrolled, setUserScrolled] = useState(false);

    useEffect(() => {
        if (userScrolled || activeTurnIndex < 0) return;
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [activeTurnIndex, userScrolled]);

    const getRole = (line) => {
        const spk = (line.speaker || line.role || '').toLowerCase();
        return (spk === '스텔라' || spk === 'stella' || spk === 'b') ? 'B' : 'A';
    };

    const fmt = (s) => { if (!s || isNaN(s)) return '0:00'; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec < 10 ? '0' : ''}${sec}`; };
    const pct = isMyPodcast && duration ? (currentTime / duration * 100) : 0;

    return (
        <div className="rv-root podcast-view" style={{ background: '#0d0b08' }}>
            {/* 탑바 */}
            <div className="rv-topbar visible">
                <button className="rv-close-btn" onClick={() => navigate(-1)}>
                    <span className="material-symbols-outlined">close</span>
                </button>
                <div className="rv-topbar-title-wrap">
                    <div className="rv-topbar-tab-toggle">
                        <button className="rv-topbar-tab-btn active">팟캐스트</button>
                    </div>
                </div>
                <button className="rv-close-btn" onClick={() => navigate('/')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>home</span>
                </button>
            </div>

            {/* 팟캐스트 스테이지 */}
            <div className="rv-podcast-stage">
                {/* 채팅 */}
                <div
                    ref={containerRef}
                    onScroll={() => {
                        const el = containerRef.current;
                        if (el) setUserScrolled(el.scrollHeight - el.scrollTop - el.clientHeight > 60);
                    }}
                    className={`rv-chat-container${hasSyncData ? ' sync-active' : ''}`}
                >
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(212,175,55,0.7)' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🎙️</div>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>불러오는 중...</p>
                        </div>
                    ) : script.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(212,175,55,0.7)' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🎙️</div>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>아직 대본이 없어요</p>
                        </div>
                    ) : script.map((line, i) => {
                        if (hasSyncData) {
                            const center = activeTurnIndex < 0 ? 1 : activeTurnIndex;
                            if (i < center - 1 || i > center + 1) return null;
                        }
                        const role = getRole(line);
                        const isActive = i === activeTurnIndex;
                        return (
                            <div
                                key={i}
                                className={`rv-chat-row ${role === 'A' ? 'james' : 'stella'}${isActive ? ' active' : ''}`}
                                style={hasSyncData ? {
                                    transform: isActive ? 'scale(1.03)' : 'scale(0.95)',
                                    opacity: isActive ? 1 : 0.45,
                                    transition: 'transform 0.35s ease, opacity 0.35s ease',
                                } : undefined}
                            >
                                <div className={`rv-chat-avatar ${role === 'A' ? 'james' : 'stella'}`}>
                                    <Avatar role={role} />
                                </div>
                                <div className="rv-chat-bubble-wrap">
                                    <div className="rv-chat-name">{i % 2 === 0 ? '제임스' : '스텔라'}</div>
                                    <div className={`rv-chat-bubble ${role === 'A' ? 'james' : 'stella'}${isActive ? ' active' : ''}`}>
                                        {line.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>
            </div>
        </div>
    );
}
