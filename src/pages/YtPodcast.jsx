import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { useAudio } from '../contexts/AudioContext';
import './ReviewDetail.css';

function Avatar({ role }) {
    const [err, setErr] = useState(false);
    const src = role === 'A' ? '/images/james101.jpg' : '/images/stella101.jpg';
    if (err) return <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#666' }}>person</span>;
    return <img src={src} alt={role === 'A' ? '제임스' : '스텔라'} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}

// TTS 품질용 지시문은 데이터에 유지하고, 사용자 화면에서는 숨김 처리
function getViewerText(text = '') {
    const raw = String(text);
    const cleaned = raw.replace(/^\s*(?:\([^()\n]{1,40}\)\s*)+/, '').trim();
    return cleaned || raw.trim();
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

    // 팟캐스트 페이지를 실제로 열었을 때 조회수 1 증가
    useEffect(() => {
        if (!id) return;
        (async () => {
            const fallbackBase = 2130;
            try {
                const snap = await getDoc(doc(db, 'youtube_videos', id));
                const current = snap.exists() ? Number(snap.data()?.views) || 0 : 0;
                await setDoc(doc(db, 'youtube_videos', id), { views: Math.max(current, fallbackBase) + 1 }, { merge: true });
            } catch {
                await setDoc(doc(db, 'youtube_videos', id), { views: fallbackBase + 1 }, { merge: true });
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

    const MINI_H = 68;

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
            <div className="rv-podcast-stage" style={vidData?.audioUrl ? { paddingBottom: MINI_H } : undefined}>
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
                                        {getViewerText(line.text)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>
            </div>
            {/* 하단 고정 미니 플레이어 */}
            {vidData?.audioUrl && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: '50%',
                    transform: 'translate3d(-50%, 0, 0)',
                    width: '100%',
                    maxWidth: 430,
                    background: 'rgba(10,10,20,0.96)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
                    paddingTop: 0,
                    zIndex: 60,
                    boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
                }}>
                    {/* 진행바 */}
                    <div
                        style={{ position: 'relative', height: 3, background: 'rgba(255,255,255,0.07)', cursor: 'pointer' }}
                        onClick={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            seekPodcastMP3((e.clientX - rect.left) / rect.width * duration);
                        }}
                    >
                        <div style={{
                            width: `${pct}%`, height: '100%',
                            background: 'linear-gradient(90deg, #f97316, #fb923c)',
                            transition: 'width 0.3s linear',
                            borderRadius: '0 2px 2px 0'
                        }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 0' }}>
                        {/* 썸네일 */}
                        <div style={{ flexShrink: 0, position: 'relative' }}>
                            <img
                                src={vidData.thumb || '/images/covers/default_custom.jpg'}
                                alt=""
                                style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', boxShadow: '0 2px 12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                            {isThisPlaying && (
                                <div style={{ position: 'absolute', bottom: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 6px #f97316', animation: 'pulse 1.5s ease-in-out infinite' }} />
                            )}
                        </div>
                        {/* 제목/시간 */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {vidData.title || 'Podcast'}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                                {fmt(currentTime)} / {fmt(duration)}
                            </div>
                        </div>
                        {/* 재생/일시정지 */}
                        <button
                            onClick={() => isThisPlaying
                                ? pausePodcastMP3()
                                : playPodcastMP3(vidData.audioUrl, vidData.title, vidData.thumb, podcastId)
                            }
                            style={{
                                flexShrink: 0, width: 38, height: 38, minWidth: 38, minHeight: 38,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #f97316, #fb923c)',
                                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: '#fff',
                                boxShadow: '0 4px 16px rgba(249,115,22,0.45)', padding: 0,
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                {isThisPlaying ? 'pause' : 'play_arrow'}
                            </span>
                        </button>
                    </div>
                    <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.7)} }`}</style>
                </div>
            )}
        </div>
    );
}
