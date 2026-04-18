import { useEffect, useMemo, useRef, useState } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { bookScripts } from '../data/bookScripts';

const Avatar = ({ role }) => {
    const [error, setError] = useState(false);
    const src = role === 'A' ? '/images/james101.jpg' : '/images/stella101.jpg';
    const icon = role === 'A' ? 'person' : 'face';

    if (error) {
        return (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black ${role === 'A' ? 'bg-slate-600' : 'bg-orange-500'}`}>
                <span className="material-symbols-outlined text-sm">{icon}</span>
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={role === 'A' ? '제임스' : '스텔라'}
            onError={() => setError(true)}
            className="w-8 h-8 rounded-full object-cover border-2 border-white/10"
        />
    );
};


export default function PodcastScriptModal() {
    const {
        scriptModalOpen, scriptModalBookId, closeScriptModal,
        podcastPlaying, podcastInfo, currentTime, duration,
    } = useAudio();

    const [timestamps, setTimestamps] = useState(null);

    useEffect(() => {
        if (!scriptModalBookId) { setTimestamps(null); return; }

        // 타임스탬프: public/timestamps/{id}.json (싱크용)
        fetch(`/timestamps/${scriptModalBookId}.json`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                setTimestamps(data?.segments?.length ? data.segments : null);
            })
            .catch(() => setTimestamps(null));
    }, [scriptModalBookId]);

    // bookScripts.js에서 직접 로드
    const script = scriptModalBookId ? (bookScripts[scriptModalBookId] || []) : [];
    const chatEndRef = useRef(null);
    const containerRef = useRef(null);
    const [userScrolled, setUserScrolled] = useState(false);

    // script 각 턴 → Whisper 시작 시간 (인덱스 직접 매핑)
    const turnStartTimes = useMemo(() => {
        if (!timestamps?.length || !script?.length) return null;
        // 턴수가 같으면 1:1 직접 매핑
        if (timestamps.length === script.length) {
            return timestamps.map(ts => ts.start ?? null);
        }
        // 턴수가 다르면 비례 인덱스로 매핑
        return script.map((_, i) => {
            const tsI = Math.round(i * (timestamps.length - 1) / (script.length - 1));
            return timestamps[tsI]?.start ?? null;
        });
    }, [script, timestamps]);

    // 활성 턴 계산 — Whisper 타임스탬프 우선, 없으면 글자수 비례 추정
    const activeTurnIndex = (() => {
        if (!script.length) return -1;

        // Whisper 타임스탬프 사용 (script 인덱스 기준으로 역방향 탐색)
        if (turnStartTimes) {
            for (let i = turnStartTimes.length - 1; i >= 0; i--) {
                if (turnStartTimes[i] != null && currentTime >= turnStartTimes[i]) return i;
            }
            return 0;
        }

        // fallback: 글자수 비례
        if (!duration) return -1;
        const totalChars = script.reduce((sum, t) => sum + (t.text?.length || 1), 0);
        let elapsed = 0;
        for (let i = 0; i < script.length; i++) {
            const turnDuration = ((script[i].text?.length || 1) / totalChars) * duration;
            if (currentTime < elapsed + turnDuration) return i;
            elapsed += turnDuration;
        }
        return script.length - 1;
    })();

    // 활성 턴으로 자동 스크롤
    useEffect(() => {
        if (userScrolled) return;
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeTurnIndex, userScrolled]);

    // 모달 열릴 때 스크롤 리셋
    useEffect(() => {
        if (scriptModalOpen) {
            setUserScrolled(false);
            setTimeout(() => {
                containerRef.current?.scrollTo({ top: 0 });
            }, 100);
        }
    }, [scriptModalOpen]);

    const handleScroll = () => {
        const el = containerRef.current;
        if (!el) return;
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        setUserScrolled(!isAtBottom);
    };

    const isThisPlaying = podcastPlaying && podcastInfo?.id === scriptModalBookId;

    if (!scriptModalOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9998] flex flex-col"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) closeScriptModal(); }}
        >
            {/* 모달 패널 */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex flex-col"
                style={{ height: '92vh', background: '#111318', borderRadius: '20px 20px 0 0' }}
            >
                {/* 헤더 */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/8 flex-shrink-0">
                    <div className="w-1 h-5 bg-orange-500 rounded-full" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">ARCHIVEW PODCAST</p>
                        <h3 className="text-sm font-black text-white truncate">
                            {podcastInfo?.title || '팟캐스트'}
                        </h3>
                    </div>
                    <button
                        onClick={closeScriptModal}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all flex-shrink-0"
                    >
                        <span className="material-symbols-outlined text-white/70" style={{ fontSize: 18 }}>close</span>
                    </button>
                </div>

                {/* 대본 채팅 */}
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {script.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <span className="material-symbols-outlined text-white/20" style={{ fontSize: 48 }}>mic_off</span>
                            <p className="text-white/40 text-sm font-bold">대본을 준비 중입니다</p>
                        </div>
                    ) : (
                        script.map((turn, i) => {
                            const isJames = turn.role === 'A';
                            const isActive = i === activeTurnIndex;
                            return (
                                <div
                                    key={i}
                                    className={`flex gap-2 items-end ${isJames ? '' : 'flex-row-reverse'} transition-opacity duration-300 ${isActive ? 'opacity-100' : activeTurnIndex >= 0 ? 'opacity-40' : 'opacity-100'}`}
                                >
                                    {/* 아바타 */}
                                    <div className="flex-shrink-0 mb-1">
                                        <Avatar role={turn.role} />
                                    </div>

                                    {/* 이름 + 말풍선 */}
                                    <div className={`flex flex-col max-w-[75%] gap-0.5 ${isJames ? 'items-start' : 'items-end'}`}>
                                        <span className="text-[10px] font-bold text-white/40 px-1">
                                            {isJames ? '제임스' : '스텔라'}
                                        </span>
                                        <div
                                            className={`px-3 py-2.5 text-[13px] leading-relaxed font-medium ${isJames
                                                ? 'text-white/90 rounded-[16px_16px_16px_4px]'
                                                : 'text-white rounded-[16px_16px_4px_16px]'
                                                } ${isActive ? 'ring-1 ring-orange-500/60 shadow-lg shadow-orange-500/10' : ''}`}
                                            style={{
                                                background: isJames ? '#1e2028' : '#c2410c',
                                            }}
                                        >
                                            {turn.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div>
        </div>
    );
}
