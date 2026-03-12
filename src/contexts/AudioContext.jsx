import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { availableAudio } from '../data/availableAudio';

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

    // Insight Tracking states
    const [dailyListenTime, setDailyListenTime] = useState(0); // in seconds
    const [dailyTarget, setDailyTarget] = useState(15 * 60); // 15 mins
    const [streak, setStreak] = useState(0);

    // Script Modal states
    const [scriptModalOpen, setScriptModalOpen] = useState(false);
    const [scriptModalBookId, setScriptModalBookId] = useState(null);

    const speechAudio = useRef(null);
    const musicAudio = useRef(null);
    const podcastAudioRef = useRef(null);
    const stopSignal = useRef(false);
    const lastTickRef = useRef(Date.now());

    // Load progress from localStorage
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const savedData = JSON.parse(localStorage.getItem('archiview_progress') || '{}');
        
        if (savedData.date === today) {
            setDailyListenTime(savedData.listenTime || 0);
        } else {
            // New day, reset daily time but check streak
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (savedData.date === yesterdayStr && savedData.listenTime >= (10 * 60)) { // 10 mins minimum for streak
                 setStreak(prev => (savedData.streak || 0) + 1);
            } else if (savedData.date !== today) {
                 setStreak(savedData.streak || 0); // Keep existing or reset if missed? User requested "3일 연속"
            }
            setDailyListenTime(0);
        }
        
        if (savedData.streak) setStreak(savedData.streak);
    }, []);

    // Save progress to localStorage
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const data = {
            date: today,
            listenTime: dailyListenTime,
            streak: streak
        };
        localStorage.setItem('archiview_progress', JSON.stringify(data));
    }, [dailyListenTime, streak]);

    // Tracking Loop
    useEffect(() => {
        let interval;
        if (podcastPlaying) {
            lastTickRef.current = Date.now();
            interval = setInterval(() => {
                const now = Date.now();
                const delta = (now - lastTickRef.current) / 1000;
                lastTickRef.current = now;
                
                setDailyListenTime(prev => {
                    const newVal = prev + delta;
                    // Check if target met for the first time today to maybe bump streak
                    return newVal;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [podcastPlaying]);

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

        const unlock = () => {
            [speechAudio.current, musicAudio.current].forEach(a => {
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
        stopAll();
        setIsSpeaking(true);
        setActiveAudioId(id);
        stopSignal.current = false;

        const baseId = id.toLowerCase().replace(/review|pick|weekly|guru/g, '').replace(/^-+/, '').replace(/[^a-z0-9-]/g, '');
        const finalUrl = audioUrl || `/audio/${baseId}.mp3`;

        if (finalUrl) {
            try {
                speechAudio.current.src = `${finalUrl}?v=${Date.now()}`;
                await speechAudio.current.play();
                await new Promise((resolve) => {
                    speechAudio.current.onended = () => resolve();
                    speechAudio.current.onerror = () => resolve();
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

    const playPodcastMP3 = useCallback((src, title, cover, id = null) => {
        const pa = podcastAudioRef.current;
        if (!pa) return;

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

        if (src) {
            stopAll();
            pa.src = src;
            pa.load();
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

    const openScriptModal = useCallback((bookId, src, title, cover) => {
        setScriptModalBookId(bookId);
        setScriptModalOpen(true);
        playPodcastMP3(src, title, cover, bookId);
    }, [playPodcastMP3]);

    const closeScriptModal = useCallback(() => {
        setScriptModalOpen(false);
    }, []);

    return (
        <AudioCtx.Provider value={{
            isSpeaking, activeAudioId, playPodcast, speakReview, stopAll,
            podcastPlaying, podcastInfo, currentTime, duration,
            dailyListenTime, dailyTarget, streak,
            playPodcastMP3, pausePodcastMP3, seekPodcastMP3, closePodcastMP3,
            scriptModalOpen, scriptModalBookId, openScriptModal, closeScriptModal
        }}>
            {children}
        </AudioCtx.Provider>
    );
};
