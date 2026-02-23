import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const AudioContext = createContext();

export const useAudio = () => useContext(AudioContext);

export const AudioProvider = ({ children }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [activeAudioId, setActiveAudioId] = useState(null);

    const speechAudio = useRef(null);
    const musicAudio = useRef(null);
    const stopSignal = useRef(false);

    useEffect(() => {
        speechAudio.current = new Audio();
        musicAudio.current = new Audio();

        const unlock = () => {
            if (speechAudio.current) { speechAudio.current.play().catch(() => { }); speechAudio.current.pause(); }
            if (musicAudio.current) { musicAudio.current.play().catch(() => { }); musicAudio.current.pause(); }
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock);
    }, []);

    const playMusic = async (url) => {
        if (!musicAudio.current) return;
        musicAudio.current.src = url;
        musicAudio.current.loop = true;
        musicAudio.current.volume = 0.1;
        try { await musicAudio.current.play(); } catch (e) { }
    };

    const stopAll = () => {
        stopSignal.current = true;
        if (speechAudio.current) { speechAudio.current.pause(); speechAudio.current.src = ''; }
        if (musicAudio.current) { musicAudio.current.pause(); musicAudio.current.src = ''; }
        setIsSpeaking(false);
        setActiveAudioId(null);
        setTimeout(() => { stopSignal.current = false; }, 200);
    };

    const playPodcast = async (script, id = "podcast") => {
        if (isSpeaking) return stopAll();
        setIsSpeaking(true);
        setActiveAudioId(id);
        stopSignal.current = false;

        // 배경음악만 깔아줌
        await playMusic("/music/carefree.mp3");

        // [핵심] ID에서 순수 영문 이름만 추출 (예: review-factfulness -> factfulness)
        const baseId = id.toLowerCase().replace(/[^a-z0-9]/g, '').replace('review', '').replace('pick', '').replace('weekly', '');

        // 유저님이 원하시는 단일 파일 경로 후보 (두 가지 다 체크)
        const urls = [
            `/audio/${baseId}.mp3?v=${Date.now()}`,
            `/audio/fact.mp3?v=${Date.now()}` // 팩트풀니스 예외처리
        ];

        console.log("[AUDIO-SYS] Searching for MP3 for baseId:", baseId);

        let finalUrl = null;
        for (const url of urls) {
            try {
                const res = await fetch(url, { method: 'HEAD' });
                if (res.ok) { finalUrl = url; break; }
            } catch (e) { }
        }

        if (finalUrl) {
            console.log("[AUDIO-SYS] Found local MP3! Playing:", finalUrl);
            await new Promise((resolve) => {
                speechAudio.current.src = finalUrl;
                speechAudio.current.onended = () => resolve();
                speechAudio.current.onerror = () => resolve();
                speechAudio.current.play().catch(() => resolve());

                const checkStop = setInterval(() => {
                    if (stopSignal.current) {
                        speechAudio.current.pause();
                        clearInterval(checkStop);
                        resolve();
                    }
                }, 100);
            });
        } else {
            console.error("[AUDIO-SYS] FATAL: No local MP3 found. TTS is DISABLED.");
            // TTS는 이제 절대 나오지 않습니다.
        }

        setIsSpeaking(false);
        setActiveAudioId(null);
    };

    const speakReview = (text, id) => playPodcast([], id); // 보이스리뷰도 동일 로직 사용 (TTS 차단)

    return (
        <AudioContext.Provider value={{ isSpeaking, activeAudioId, playPodcast, speakReview, stopAll }}>
            {children}
        </AudioContext.Provider>
    );
};
