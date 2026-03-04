import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const AudioCtx = createContext();

export const useAudio = () => useContext(AudioCtx);

export const AudioProvider = ({ children }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [activeAudioId, setActiveAudioId] = useState(null);

    // Podcast Player states
    const [podcastPlaying, setPodcastPlaying] = useState(false);
    const [podcastInfo, setPodcastInfo] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const speechAudio = useRef(null);
    const musicAudio = useRef(null); // 사용하지 않지만 기존 구조 유지를 위해 유지
    const podcastAudioRef = useRef(null);
    const stopSignal = useRef(false);

    useEffect(() => {
        speechAudio.current = new Audio();
        musicAudio.current = new Audio();
        podcastAudioRef.current = new Audio();

        const pa = podcastAudioRef.current;
        const onTime = () => setCurrentTime(pa.currentTime);
        const onMeta = () => setDuration(pa.duration);
        const onEnded = () => { setPodcastPlaying(false); setCurrentTime(0); };
        pa.addEventListener('timeupdate', onTime);
        pa.addEventListener('loadedmetadata', onMeta);
        pa.addEventListener('ended', onEnded);

        // 터치/클릭 시 오디오 잠금 해제
        const unlock = () => {
            [speechAudio.current, musicAudio.current, podcastAudioRef.current].forEach(a => {
                if (a) { a.play().catch(() => { }); a.pause(); }
            });
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock, { passive: true });

        return () => {
            pa.removeEventListener('timeupdate', onTime);
            pa.removeEventListener('loadedmetadata', onMeta);
            pa.removeEventListener('ended', onEnded);
        };
    }, []);

    // ❌ 배경음악(carefree.mp3) 기능을 완전히 삭제했습니다.
    const stopAll = () => {
        stopSignal.current = true;
        if (speechAudio.current) {
            speechAudio.current.pause();
            speechAudio.current.src = '';
        }
        if (musicAudio.current) {
            musicAudio.current.pause();
            musicAudio.current.src = '';
        }
        if (podcastAudioRef.current) {
            podcastAudioRef.current.pause();
            podcastAudioRef.current.src = '';
        }
        setIsSpeaking(false);
        setActiveAudioId(null);
        setPodcastPlaying(false);
        setTimeout(() => { stopSignal.current = false; }, 200);
    };

    const playPodcast = async (script, id = "podcast", audioUrl = null) => {
        // 모든 소리 즉시 정지
        stopAll();

        setIsSpeaking(true);
        setActiveAudioId(id);
        stopSignal.current = false;

        // ID에서 불필요한 수식어 제거 및 파일명 결정
        const baseId = id.toLowerCase().replace(/review|pick|weekly|guru/g, '').replace(/^-+/, '').replace(/[^a-z0-9-]/g, '');
        const finalUrl = audioUrl || `/audio/${baseId}.mp3`;

        console.log("🔊 팟캐스트 목소리 재생 시작:", finalUrl);

        if (finalUrl) {
            try {
                // 캐시 방지용 쿼리 추가
                speechAudio.current.src = `${finalUrl}?v=${Date.now()}`;

                await speechAudio.current.play();

                await new Promise((resolve) => {
                    speechAudio.current.onended = () => resolve();
                    speechAudio.current.onerror = (e) => {
                        console.error("❌ 오디오 파일 없음:", finalUrl);
                        resolve();
                    };

                    const checkStop = setInterval(() => {
                        if (stopSignal.current) {
                            speechAudio.current.pause();
                            clearInterval(checkStop);
                            resolve();
                        }
                    }, 100);
                });
            } catch (error) {
                console.error("❌ 재생 오류:", error);
            }
        }

        setIsSpeaking(false);
        setActiveAudioId(null);
    };

    const speakReview = (text, id) => playPodcast([], id);

    // 🆕 MP3 Player Controls (MiniPlayer용)
    const playPodcastMP3 = useCallback((src, title, cover, id = null) => {
        const pa = podcastAudioRef.current;
        if (!pa) return;

        // 동일한 소스인 경우 토글
        if (podcastInfo?.src === src) {
            if (podcastPlaying) {
                pa.pause();
                setPodcastPlaying(false);
            } else {
                pa.play().catch(() => { });
                setPodcastPlaying(true);
            }
            return;
        }

        // 다른 소스인 경우 초기화 후 재생
        if (src) {
            stopAll();
            pa.src = src;
            pa.load(); // 메타데이터 로드 보장
            pa.play().catch(() => { });
            setPodcastPlaying(true);
            setPodcastInfo({ src, title, cover, id });
        }
    }, [podcastInfo, podcastPlaying, stopAll]);

    const pausePodcastMP3 = useCallback(() => {
        podcastAudioRef.current?.pause();
        setPodcastPlaying(false);
    }, []);

    const seekPodcastMP3 = useCallback((time) => {
        if (podcastAudioRef.current) {
            podcastAudioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    }, []);

    const closePodcastMP3 = useCallback(() => {
        const pa = podcastAudioRef.current;
        if (pa) { pa.pause(); pa.src = ''; }
        setPodcastPlaying(false);
        setPodcastInfo(null);
        setCurrentTime(0);
        setDuration(0);
    }, []);

    return (
        <AudioCtx.Provider value={{
            isSpeaking, activeAudioId, playPodcast, speakReview, stopAll,
            podcastPlaying, podcastInfo, currentTime, duration,
            playPodcastMP3, pausePodcastMP3, seekPodcastMP3, closePodcastMP3
        }}>
            {children}
        </AudioCtx.Provider>
    );
};
