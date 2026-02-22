import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const AudioContext = createContext();

export const useAudio = () => useContext(AudioContext);

export const AudioProvider = ({ children }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [activeAudioId, setActiveAudioId] = useState(null);

    // Permanent elements for mobile stability
    const speechAudio = useRef(null);
    const musicAudio = useRef(null);

    // Web Audio API for iOS volume control
    const webAudioCtx = useRef(null);
    const musicGainNode = useRef(null);
    const musicSourceNode = useRef(null);

    const stopSignal = useRef(false);
    const audioUrlRef = useRef(null);
    const musicFadeInterval = useRef(null);

    useEffect(() => {
        speechAudio.current = new Audio();
        musicAudio.current = new Audio();

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (isMobile) {
            musicAudio.current.crossOrigin = "anonymous"; // iOS Web Audio API 호환성
        }

        // 아이폰/모바일의 볼륨 제약을 우회하기 위해 모바일에서만 Web Audio API를 사용합니다.
        // PC는 표준 HTML5 Audio 볼륨 제어가 더 안정적이므로 기존 방식을 유지합니다.
        const initWebAudio = () => {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            if (!isMobile) return;

            try {
                if (webAudioCtx.current) return;

                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) return;

                webAudioCtx.current = new AudioContextClass();
                musicGainNode.current = webAudioCtx.current.createGain();

                // musicAudio 요소를 소스로 연결하여 Web Audio 그래프 구축
                musicSourceNode.current = webAudioCtx.current.createMediaElementSource(musicAudio.current);
                musicSourceNode.current.connect(musicGainNode.current);
                musicGainNode.current.connect(webAudioCtx.current.destination);

                // 초기 볼륨 설정
                musicGainNode.current.gain.value = 0.01;
            } catch (e) {
                console.error("Web Audio Init Failed:", e);
            }
        };

        const unlock = () => {
            try {
                initWebAudio();
                if (webAudioCtx.current && webAudioCtx.current.state === 'suspended') {
                    webAudioCtx.current.resume();
                }
                if (speechAudio.current) { speechAudio.current.play().catch(() => { }); speechAudio.current.pause(); }
                if (musicAudio.current) { musicAudio.current.play().catch(() => { }); musicAudio.current.pause(); }
            } catch (e) {
                console.error("Unlock error:", e);
            }
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('touchstart', unlock);
        document.addEventListener('click', unlock);

        return () => {
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
            if (musicFadeInterval.current) clearInterval(musicFadeInterval.current);
        };
    }, []);

    const fetchGoogleTTSBlob = async (text, voiceName) => {
        const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
        if (!apiKey) return null;
        const ssml = `<speak>${text.replace(/~/g, '')}</speak>`;

        try {
            const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { ssml },
                    voice: { languageCode: 'ko-KR', name: voiceName },
                    audioConfig: { audioEncoding: 'MP3', pitch: 0.0, speakingRate: 1.0 }
                })
            });
            const data = await response.json();
            if (!data.audioContent) return null;
            const binary = atob(data.audioContent);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
            return new Blob([array], { type: 'audio/mp3' });
        } catch (error) {
            console.error('TTS Fetch Error:', error);
            return null;
        }
    };

    const playSpeechBlob = (blob) => {
        return new Promise((resolve) => {
            if (!speechAudio.current) return resolve();
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

            const url = URL.createObjectURL(blob);
            audioUrlRef.current = url;

            speechAudio.current.src = url;
            speechAudio.current.onended = () => resolve();
            speechAudio.current.onerror = () => resolve();
            speechAudio.current.play().catch(() => resolve());

            const checkStop = setInterval(() => {
                if (stopSignal.current) {
                    speechAudio.current.pause();
                    clearInterval(checkStop);
                    resolve();
                }
            }, 50);
        });
    };

    const setMusicVolume = (vol) => {
        if (musicGainNode.current && webAudioCtx.current) {
            // iOS/모바일: GainNode를 통한 정밀 볼륨 조절 (브라우저 제약 우회)
            musicGainNode.current.gain.value = vol;
            // 모바일에서 audio.volume은 1로 고정하여 GainNode가 볼륨을 완전히 제어하게 함
            if (musicAudio.current) musicAudio.current.volume = 1;
        } else if (musicAudio.current) {
            // PC: 표준 HTML5 Audio 볼륨 조절 (가장 안정적임)
            musicAudio.current.volume = Math.min(1, vol);
        }
    };

    const playMusic = (urls, maxVolume = 0.1) => {
        return new Promise((resolve) => {
            if (!musicAudio.current) return resolve();
            if (musicFadeInterval.current) clearInterval(musicFadeInterval.current);

            const urlList = Array.isArray(urls) ? urls : [urls];
            let urlIndex = 0;

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            // 볼륨 상향: 모바일(0.12), PC(0.25)
            const targetVolume = isMobile ? 0.12 : 0.25;
            const fadeStep = isMobile ? 0.01 : 0.015;

            const tryPlay = () => {
                if (stopSignal.current) return resolve();
                if (urlIndex >= urlList.length) return resolve();

                // Web Audio 컨텍스트 상태 확인 및 재개
                if (webAudioCtx.current && webAudioCtx.current.state === 'suspended') {
                    webAudioCtx.current.resume();
                }

                musicAudio.current.src = urlList[urlIndex];
                musicAudio.current.load();
                setMusicVolume(0.01);
                musicAudio.current.loop = true; // 배경음악은 루프되어야 함

                musicAudio.current.play().then(() => {
                    // 재생 시작되면 즉시 resolve하여 나레이션이 시작되게 함
                    resolve();

                    if (stopSignal.current) {
                        musicAudio.current.pause();
                        musicAudio.current.src = '';
                        setMusicVolume(0);
                        return;
                    }

                    let vol = 0.01;
                    const fId = setInterval(() => {
                        if (stopSignal.current) {
                            clearInterval(fId);
                            setMusicVolume(0);
                            return;
                        }
                        if (vol < targetVolume) {
                            vol = Math.min(targetVolume, vol + fadeStep);
                            setMusicVolume(vol);
                        } else {
                            clearInterval(fId);
                        }
                    }, 100);
                }).catch((e) => {
                    console.error("Play error:", e);
                    if (stopSignal.current) return resolve();
                    if (urlList.length > 1) {
                        urlIndex++;
                        tryPlay();
                    } else {
                        resolve();
                    }
                });
            };

            musicAudio.current.onerror = () => {
                if (stopSignal.current) return;
                urlIndex++;
                tryPlay();
            };

            tryPlay();

            const monitorTime = () => {
                if (stopSignal.current) {
                    musicAudio.current?.removeEventListener('timeupdate', monitorTime);
                    return;
                }
                if (musicAudio.current && musicAudio.current.currentTime >= 10) {
                    musicAudio.current.removeEventListener('timeupdate', monitorTime);
                    musicAudio.current.onerror = null;

                    let fadeVol = targetVolume;
                    musicFadeInterval.current = setInterval(() => {
                        if (stopSignal.current) {
                            clearInterval(musicFadeInterval.current);
                            setMusicVolume(0);
                            return;
                        }
                        if (fadeVol > 0.00001) {
                            fadeVol -= 0.0001;
                            setMusicVolume(Math.max(0, fadeVol));
                        } else {
                            if (musicAudio.current) {
                                musicAudio.current.pause();
                                musicAudio.current.src = '';
                            }
                            setMusicVolume(0);
                            if (musicFadeInterval.current) {
                                clearInterval(musicFadeInterval.current);
                                musicFadeInterval.current = null;
                            }
                        }
                    }, 50);
                }
            };
            musicAudio.current.addEventListener('timeupdate', monitorTime);
            setTimeout(resolve, 3500);
        });
    };


    const stopAll = () => {
        stopSignal.current = true;
        setMusicVolume(0);

        if (speechAudio.current) {
            speechAudio.current.pause();
            speechAudio.current.src = '';
        }
        if (musicAudio.current) {
            musicAudio.current.pause();
            musicAudio.current.src = '';
            // 모든 이벤트 핸들러 제거 시도
            musicAudio.current.onended = null;
            musicAudio.current.onerror = null;
        }
        if (musicFadeInterval.current) {
            clearInterval(musicFadeInterval.current);
            musicFadeInterval.current = null;
        }
        setIsSpeaking(false);
        setActiveAudioId(null);
        setTimeout(() => { stopSignal.current = false; }, 200);
    };

    const playPodcast = async (script, id = "podcast") => {
        if (isSpeaking) return stopAll();
        setIsSpeaking(true);
        setActiveAudioId(id);
        stopSignal.current = false;

        const pianoMusic = ["/music/carefree.mp3"];
        // 배경음악 재생
        await playMusic(pianoMusic);

        // [최적화] 정적 MP3 파일이 서버에 존재하면 TTS 대신 해당 파일을 바로 재생합니다.
        // id가 'pick-sapiens'나 'weekly-sapiens'일 수 있으므로 'sapiens'만 추출합니다.
        const baseId = id.replace('pick-', '').replace('weekly-', '');
        const staticAudioUrl = `/audio/${baseId}.mp3`;

        try {
            const checkRes = await fetch(staticAudioUrl, { method: 'HEAD' });
            if (checkRes.ok) {
                if (!stopSignal.current) {
                    await new Promise((resolve) => {
                        if (!speechAudio.current) return resolve();
                        speechAudio.current.src = staticAudioUrl;

                        const onEnded = () => {
                            speechAudio.current.removeEventListener('ended', onEnded);
                            speechAudio.current.removeEventListener('error', onError);
                            resolve();
                        };
                        const onError = (e) => {
                            console.error("Audio playback error:", e);
                            speechAudio.current.removeEventListener('ended', onEnded);
                            speechAudio.current.removeEventListener('error', onError);
                            resolve();
                        };

                        speechAudio.current.addEventListener('ended', onEnded);
                        speechAudio.current.addEventListener('error', onError);

                        speechAudio.current.play().catch(err => {
                            console.error("Play failed:", err);
                            resolve();
                        });

                        const checkStop = setInterval(() => {
                            if (stopSignal.current) {
                                speechAudio.current.pause();
                                clearInterval(checkStop);
                                resolve();
                            }
                        }, 50);
                    });
                }
                setIsSpeaking(false);
                setActiveAudioId(null);
                return;
            }
        } catch (e) {
            console.log("Static audio check failed, falling back to TTS:", e);
        }

        // 고품질 한글 음성 엔진과 자연스러운 호흡을 위한 SSML 프리미엄 합성 함수 활용
        const fetchPremiumTTS = async (text, voiceName) => {
            const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
            if (!apiKey) return null;

            // 지나친 수동 break 태그는 오히려 호흡을 어색하게 만듭니다.
            // 구글 번역 엔진의 자연스러운 지능형 휴지를 믿고 최소한의 태그만 사용합니다.
            const cleanedText = text.replace(/~/g, '').trim();
            const ssml = `<speak><p>${cleanedText}</p></speak>`;

            try {
                const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: { ssml },
                        voice: { languageCode: 'ko-KR', name: voiceName },
                        audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 1.02 } // 1.02배속이 모바일에서 가장 자연스럽습니다.
                    })
                });
                const data = await response.json();
                if (!data.audioContent) return null;
                const binary = atob(data.audioContent);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
                return new Blob([array], { type: 'audio/mp3' });
            } catch (error) {
                console.error('Premium TTS Fetch Error:', error);
                return null;
            }
        };

        const getVoice = (role) => role === 'A' ? 'ko-KR-Chirp3-HD-Achird' : 'ko-KR-Chirp3-HD-Leda';

        let prefetch = fetchPremiumTTS(script[0].text, getVoice(script[0].role));

        for (let i = 0; i < script.length; i++) {
            if (stopSignal.current) break;
            const blob = await prefetch;
            if (stopSignal.current) break;

            if (i < script.length - 1) {
                prefetch = fetchPremiumTTS(script[i + 1].text, getVoice(script[i + 1].role));
            }

            if (blob) await playSpeechBlob(blob);
            if (stopSignal.current) break;

            // 화자 전환 간격을 실감나는 라디오 수준인 600ms로 고정합니다.
            await new Promise(r => setTimeout(r, 600));
        }
        setIsSpeaking(false);
        setActiveAudioId(null);
    };

    const speakReview = async (text, id = "review") => {
        if (isSpeaking) return stopAll();
        setIsSpeaking(true);
        setActiveAudioId(id);
        stopSignal.current = false;

        const pianoMusic = ["/music/carefree.mp3"];

        // 배경음악 재생 (기본 규격 볼륨 적용)
        await playMusic(pianoMusic);

        const titleMap = {
            "sapiens": "사피엔스", "1984": "1984", "demian": "데미안",
            "vegetarian": "채식주의자", "factfulness": "팩트풀니스",
            "almond": "아몬드", "leverage": "레버리지", "one-thing": "원씽",
            "ubermensch": "위버멘쉬"
        };
        const displayTitle = titleMap[id.replace('pick-', '')] || "이 책";

        const intros = [
            { role: 'A', text: `안녕하세요? 아카이뷰 에디터 제임스입니다. 오늘은 시대를 뛰어넘는 깊은 가치를 담은 도서, ${displayTitle}의 리뷰 디테일을 함께 살펴보겠습니다.` },
            { role: 'B', text: `반갑습니다. 스텔라입니다. ${displayTitle} 속에 담긴 핵심적인 지혜들을 지금부터 차근차근 전해드릴게요.` }
        ];

        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 5);
        const script = [...intros];

        let currentRole = 'A';
        paragraphs.forEach((p, idx) => {
            if (idx % 2 === 0) { // 50% Compression
                const sentences = p.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
                // Grouping into smaller 2-sentence chunks for better breathing and role transitions
                const chunkCount = 2;
                for (let i = 0; i < sentences.length; i += chunkCount) {
                    const chunk = sentences.slice(i, i + chunkCount).join(' ').trim();
                    if (chunk) {
                        script.push({ role: currentRole, text: chunk });
                        currentRole = currentRole === 'A' ? 'B' : 'A';
                    }
                }
            }
        });

        script.push({ role: 'A', text: `지금까지 ${displayTitle}의 핵심 리뷰를 제임스와 스텔라가 전해드렸습니다.` });
        script.push({ role: 'B', text: `도서에 대한 더 자세한 내용은 아카이뷰 리뷰 디테일 페이지에서 꼭 확인해 주세요. 감사합니다.` });

        const fetchPremiumTTS = async (text, voiceName) => {
            const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
            if (!apiKey) return null;

            const cleanedText = text.replace(/~/g, '').trim();
            const ssml = `<speak><p>${cleanedText}</p></speak>`;

            try {
                const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: { ssml },
                        voice: { languageCode: 'ko-KR', name: voiceName },
                        audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 1.02 }
                    })
                });
                const data = await response.json();
                if (!data.audioContent) return null;
                const binary = atob(data.audioContent);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
                return new Blob([array], { type: 'audio/mp3' });
            } catch (error) {
                console.error('TTS Fetch Error:', error);
                return null;
            }
        };

        let prefetch = fetchPremiumTTS(script[0].text, 'ko-KR-Chirp3-HD-Achird');

        for (let i = 0; i < script.length; i++) {
            if (stopSignal.current) break;
            const blob = await prefetch;
            if (stopSignal.current) break;

            if (i < script.length - 1) {
                const nextVoice = script[i + 1].role === 'A' ? 'ko-KR-Chirp3-HD-Achird' : 'ko-KR-Chirp3-HD-Leda';
                prefetch = fetchPremiumTTS(script[i + 1].text, nextVoice);
            }

            if (blob) await playSpeechBlob(blob);
            if (stopSignal.current) break;
            // Relaxed dialogue pause for better flow
            await new Promise(r => setTimeout(r, 600));
        }

        setIsSpeaking(false);
        setActiveAudioId(null);
    };

    return (
        <AudioContext.Provider value={{ isSpeaking, activeAudioId, playPodcast, speakReview, stopAll }}>
            {children}
        </AudioContext.Provider>
    );
};
