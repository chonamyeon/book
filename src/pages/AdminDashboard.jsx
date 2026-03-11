import React, { useState, useEffect, useRef, useMemo } from 'react';

// IndexedDB 헬퍼 — TTS 배치 버퍼 영구 저장
const TTS_DB = 'tts-cache';
const TTS_STORE = 'batches';
function openTtsDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(TTS_DB, 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore(TTS_STORE);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}
async function saveBatchBuffer(key, buffer) {
    const db = await openTtsDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TTS_STORE, 'readwrite');
        tx.objectStore(TTS_STORE).put(buffer, key);
        tx.oncomplete = resolve;
        tx.onerror = e => reject(e.target.error);
    });
}
async function loadBatchBuffer(key) {
    const db = await openTtsDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TTS_STORE, 'readonly');
        const req = tx.objectStore(TTS_STORE).get(key);
        req.onsuccess = e => resolve(e.target.result || null);
        req.onerror = e => reject(e.target.error);
    });
}
async function clearBatchBuffers(bookId, total) {
    const db = await openTtsDb();
    const tx = db.transaction(TTS_STORE, 'readwrite');
    for (let i = 0; i < total; i++) tx.objectStore(TTS_STORE).delete(`${bookId}-${i}`);
}

function createWavFromPcm(pcmBuffers, sampleRate = 24000, channels = 1, bitDepth = 16) {
    const totalLength = pcmBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const buffer = new ArrayBuffer(44 + totalLength);
    const view = new DataView(buffer);
    const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + totalLength, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bitDepth / 8, true);
    view.setUint16(32, channels * bitDepth / 8, true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, 'data');
    view.setUint32(40, totalLength, true);
    let offset = 44;
    for (const buf of pcmBuffers) { new Uint8Array(buffer).set(new Uint8Array(buf), offset); offset += buf.byteLength; }
    return buffer;
}
import { io } from 'socket.io-client';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    addDoc
} from 'firebase/firestore';
import { useBookData } from '../hooks/useBookData';
import { bookScripts } from '../data/bookScripts';

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const storedAuth = localStorage.getItem('adminAuthData');
        if (storedAuth) {
            try {
                const { timestamp } = JSON.parse(storedAuth);
                const now = new Date().getTime();
                // 1 day = 24 * 60 * 60 * 1000 ms = 86400000 ms
                if (now - timestamp < 86400000) {
                    return true;
                }
                localStorage.removeItem('adminAuthData');
            } catch (e) {
                console.error('Failed to parse adminAuthData', e);
            }
        }
        return false;
    });
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const { getAllBooks, loading: booksLoading, overrides } = useBookData();

    // 🆕 Password Check
    const handleAuth = (e) => {
        e.preventDefault();
        if (password === '0815') {
            setIsAuthenticated(true);
            localStorage.setItem('adminAuthData', JSON.stringify({ timestamp: new Date().getTime() }));
        } else {
            alert('비밀번호가 올바르지 않습니다.');
            setPassword('');
        }
    };

    // Real-time Data States (기존 로직 유지)
    const [realUsers, setRealUsers] = useState([]);
    const [realSales, setRealSales] = useState([]);
    const realBooks = useMemo(() => {
        // useBookData의 overrides가 변경될 때마다 getAllBooks가 새로 생성되므로 
        // 여기서 자동으로 최신 데이터를 가져옵니다.
        return getAllBooks(true) || [];
    }, [getAllBooks]);
    const [isLoading, setIsLoading] = useState(true);

    // Book Management State
    const [isAddingBook, setIsAddingBook] = useState(false);
    const [newBook, setNewBook] = useState({ title: '', author: '', price: '', stock: 0, description: '' });

    // Popular Archives Management State
    const [popularList, setPopularList] = useState([]);
    const [popularSearch, setPopularSearch] = useState('');
    const [popularSaving, setPopularSaving] = useState(false);


    // 1. Listen for Users
    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("lastLogin", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRealUsers(usersData);
            setIsLoading(false);
        }, (error) => {
            console.error("Firestore Users Error:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. Listen for Sales
    useEffect(() => {
        const q = query(collection(db, "sales"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const salesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRealSales(salesData);
        }, (error) => {
            console.error("Firestore Sales Error:", error);
        });
        return () => unsubscribe();
    }, []);

    // 3. Books synchronization is now handled automatically via useMemo above.

    // 4. Listen for Popular Archives
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'site_config', 'popular_archives'), (snap) => {
            if (snap.exists() && snap.data().books?.length) {
                setPopularList(snap.data().books);
            }
        });
        return () => unsub();
    }, []);

    // Toss Payments Init
    const handlePayment = async () => {
        try {
            const tossPayments = await loadTossPayments('test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq');
            await tossPayments.requestPayment('카드', {
                amount: 15000,
                orderId: `ORDER-${new Date().getTime()}`,
                orderName: '프리미엄 멤버십 테스트 결제',
                customerName: '김토스',
                successUrl: window.location.origin + '/admin',
                failUrl: window.location.origin + '/admin',
            });
        } catch (error) {
            console.error('Payment Error:', error);
            alert('결제 요청 중 오류가 발생했습니다: ' + error.message);
        }
    };

    // Management Functions
    const handleAddBook = async (e) => {
        e.preventDefault();
        try {
            const bookId = newBook.title.toLowerCase().replace(/\s+/g, '-');
            await setDoc(doc(db, "book_overrides", bookId), {
                ...newBook,
                isDeleted: false, // 삭제된 적이 있다면 복구
                isPublic: true,  // 초기 공개 상태
                updatedAt: serverTimestamp()
            });
            setIsAddingBook(false);
            setNewBook({ title: '', author: '', price: '', stock: 0 });
            alert('도서가 성공적으로 등록되었습니다.');
        } catch (error) {
            console.error("Error adding book:", error);
        }
    };

    const handleDeleteBook = async (bookId) => {
        if (window.confirm('정말 삭제하시겠습니까? 이 도서는 시스템에서 즉시 숨겨지며 나중에 복구할 수 없습니다.')) {
            try {
                // 오버라이드에 isDeleted: true를 설정하여 물리 삭제 대신 필터링 처리 (로컬 파일 보호)
                await setDoc(doc(db, "book_overrides", bookId), {
                    isDeleted: true,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                alert('삭제되었습니다.');
            } catch (error) {
                console.error("Error deleting book:", error);
                alert('삭제 중 오류가 발생했습니다.');
            }
        }
    };

    const handleUpdateUserStatus = async (userId, status) => {
        try {
            await updateDoc(doc(db, "users", userId), { status });
        } catch (error) {
            console.error("Error updating user:", error);
        }
    };

    const handleUpdateCoverPath = async (bookId, path) => {
        try {
            await setDoc(doc(db, "book_overrides", bookId), {
                cover: path,
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert('표지 경로가 업데이트되었습니다.');
        } catch (error) {
            console.error("Error updating cover path:", error);
            alert('업데이트 중 오류가 발생했습니다.');
        }
    };

    const handleUpdatePurchaseLink = async (bookId, link) => {
        try {
            await setDoc(doc(db, "book_overrides", bookId), {
                purchaseLink: link,
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert('구매 링크가 저장되었습니다.');
        } catch (error) {
            console.error("Error updating link:", error);
            alert('링크 저장 중 오류가 발생했습니다.');
        }
    };

    const handleTogglePublic = async (bookId, currentValue) => {
        try {
            await setDoc(doc(db, "book_overrides", bookId), {
                isPublic: !currentValue,
                updatedAt: serverTimestamp()
            }, { merge: true });
            // realBooks는 useMemo와 useBookData의 snapshot에 의해 자동 업데이트됩니다.
        } catch (error) {
            console.error("Error toggling public:", error);
        }
    };

    const handleUpdateBookField = async (bookId, field, value) => {
        try {
            await setDoc(doc(db, "book_overrides", bookId), {
                [field]: value,
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert(`${field} 정보가 저장되었습니다.`);
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    // Calculate dynamic stats safely
    const stats = [
        { title: '전체 회원수', value: (realUsers || []).length.toLocaleString(), change: '+오늘', icon: 'group' },
        {
            title: '누적 매출',
            value: `₩${(realSales || []).reduce((acc, s) => {
                const amountStr = String(s?.amount || '0');
                const cleanAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
                return acc + cleanAmount;
            }, 0).toLocaleString()}`,
            change: '실시간',
            icon: 'payments'
        },
        { title: '관리 도서', value: (realBooks || []).length.toLocaleString(), change: 'Total', icon: 'auto_stories' },
        { title: '최근 거래', value: (realSales || []).length.toLocaleString(), change: '건', icon: 'trending_up' },
    ];

    const [logs, setLogs] = useState([]);
    const [podcastProgress, setPodcastProgress] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedBookId, setSelectedBookId] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [manualContent, setManualContent] = useState('');
    const [inputMode, setInputMode] = useState('text'); // 'file' or 'text'
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [bookSearchQuery, setBookSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [filterCeleb, setFilterCeleb] = useState('');

    // 🆕 External Book Search State
    const [externalSearchQuery, setExternalSearchQuery] = useState('');
    const [externalSearchResults, setExternalSearchResults] = useState([]);
    const [isSearchingExternal, setIsSearchingExternal] = useState(false);
    const [isCrawling, setIsCrawling] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // ── AI 대본 생성 탭 상태 ─────────────────────────────────
    const [scriptForm, setScriptForm] = useState({
        bookId: '', title: '', author: '',
        themes: '',
        targetMin: 2300, targetMax: 2500,
        turnLimit: 45,
        speakerA: '제임스', speakerB: '스텔라'
    });
    const [scriptApiKey, setScriptApiKey] = useState(() => localStorage.getItem('scriptApiKey') || '');
    const [scriptLogs, setScriptLogs] = useState([]);
    const [scriptProgress, setScriptProgress] = useState(0);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [generatedScript, setGeneratedScript] = useState([]);
    const [isTtsRunning, setIsTtsRunning] = useState(false);
    const [ttsLogs, setTtsLogs] = useState([]);
    const [ttsProgress, setTtsProgress] = useState(0);
    const ttsLogEndRef = useRef(null);
    const ttsLogContainerRef = useRef(null);
    const [ttsModel, setTtsModel] = useState('pro');
    const [quotaResults, setQuotaResults] = useState([]);
    const [isCheckingQuota, setIsCheckingQuota] = useState(false);
    const [existingScript, setExistingScript] = useState(null); // Firestore 기존 대본
    const [isLoadingScript, setIsLoadingScript] = useState(false);
    const [isScriptEditorOpen, setIsScriptEditorOpen] = useState(false);
    // 이어받기: 배치별 PCM 버퍼 저장 (null = 미완료)
    const [savedPcmBuffers, setSavedPcmBuffers] = useState([]);
    const [failedBatches, setFailedBatches] = useState([]);
    const [wavFileName, setWavFileName] = useState('');
    const [wavUploading, setWavUploading] = useState(false);
    const [wavUploadLog, setWavUploadLog] = useState('');

    // 인트로/아웃트로 병합
    const [mergeIntroFile, setMergeIntroFile] = useState(null);
    const [mergeMainFile, setMergeMainFile] = useState(null);
    const [mergeOutroFile, setMergeOutroFile] = useState(null);
    const [merging, setMerging] = useState(false);
    const [mergeLog, setMergeLog] = useState('');
    const ffmpegRef = React.useRef(new FFmpeg());

    // 🆕 Google Books API 검색
    const handleGoogleBooksSearch = async () => {
        const queryTerm = externalSearchQuery || scriptForm.title || newBook.title;
        if (!queryTerm.trim()) return alert('검색어를 입력해 주세요.');

        setIsSearchingExternal(true);
        try {
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryTerm)}&maxResults=10`);
            const data = await response.json();
            setExternalSearchResults(data.items || []);
            if (!data.items?.length) alert('검색 결과가 없습니다.');
        } catch (error) {
            console.error('Google Books API Error:', error);
            alert('검색 중 오류가 발생했습니다.');
        } finally {
            setIsSearchingExternal(false);
        }
    };

    const openExternalSearch = (site) => {
        const queryTerm = externalSearchQuery || scriptForm.title || newBook.title;
        if (!queryTerm.trim()) return alert('검색어를 입력하세요.');
        let url = '';
        if (site === 'kyobo') {
            url = `https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(queryTerm)}`;
        } else if (site === 'yes24') {
            url = `https://www.yes24.com/Product/Search?domain=ALL&query=${encodeURIComponent(queryTerm)}`;
        }
        window.open(url, '_blank');
    };

    const handleCrawlBookInfo = async (title, author, targetBookId = null) => {
        if (!title) return alert('도서 제목이 필요합니다.');
        setIsCrawling(true);
        try {
            const response = await fetch('http://127.0.0.1:3001/api/book/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, author }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || '크롤링 실패');
            }
            const data = await response.json();

            if (data.description || data.coverUrl) {
                if (targetBookId) {
                    let msg = '';
                    if (data.description) {
                        const textarea = document.getElementById(`desc-${targetBookId}`);
                        if (textarea) {
                            textarea.value = data.description;
                            msg += ' 상세 정보';
                        }
                    }
                    if (data.coverUrl) {
                        const coverInput = document.getElementById(`cover-${targetBookId}`);
                        if (coverInput) {
                            coverInput.value = data.coverUrl;
                            msg += (msg ? ' 및' : '') + ' 표지 이미지';
                        }
                    }
                    alert(`${msg}를 가져왔습니다. 하단의 "설정 저장"을 눌러 최종 반영하세요.`);
                } else {
                    setNewBook(prev => ({
                        ...prev,
                        description: data.description || prev.description,
                        cover: data.coverUrl || prev.cover
                    }));
                    alert('신규 도서 등록 폼에 상세 정보와 표지가 입력되었습니다.');
                }
            } else {
                alert('가져올 수 있는 정보가 없습니다.');
            }
        } catch (error) {
            console.error('Crawling error:', error);
            alert(`정보를 가져오는 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsCrawling(false);
        }
    };

    const handleAnalyzeBook = async (title, author, targetBookId) => {
        const textarea = document.getElementById(`desc-${targetBookId}`);
        const currentDesc = textarea ? textarea.value : null;
        if (!currentDesc || currentDesc.length < 50) return alert('분석을 위해 먼저 교보 정보를 가져오거나 도서 설명을 입력해주세요.');

        setIsAnalyzing(true);
        try {
            const response = await fetch('http://127.0.0.1:3001/api/book/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, author, description: currentDesc }),
            });
            if (!response.ok) throw new Error('분석 실패');
            const data = await response.json();
            if (data.analysis) {
                textarea.value = `[GEMINI 2.0 ANALYSIS]\n${data.analysis}\n\n[ORIGINAL INFO]\n${currentDesc}`;
                alert('Gemini 2.0이 도서 분석을 완료했습니다. 하단의 "설정 저장"을 눌러 반영하세요.');
            }
        } catch (e) {
            console.error('Analysis Error:', e);
            alert('분석 중 오류 발생: ' + e.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const applyBookInfo = (item, targetBookId = null) => {
        const info = item.volumeInfo;
        const title = info.title || '';
        const author = info.authors ? info.authors.join(', ') : '';
        const desc = info.description || '';

        if (targetBookId) {
            const textArea = document.getElementById(`desc-${targetBookId}`);
            if (textArea) {
                const currentVal = textArea.value;
                textArea.value = currentVal ? `${currentVal}\n\n${desc}` : desc;
                alert('설명이 텍스트 영역에 추가되었습니다. "설명 저장" 버튼을 눌러 저장하세요.');
            } else {
                handleUpdateBookField(targetBookId, 'description', desc);
            }
        } else {
            setNewBook(prev => ({
                ...prev,
                title: title,
                author: author,
                description: desc
            }));
            setIsAddingBook(true);
            alert('도서 정보가 등록 폼에 입력되었습니다.');
        }
    };

    const handleMerge = async () => {
        if (!mergeMainFile) return alert('메인 WAV 파일을 선택하세요.');
        setMerging(true);
        setMergeLog('⏳ FFmpeg 로딩 중...');
        try {
            const ffmpeg = ffmpegRef.current;
            if (!ffmpeg.loaded) {
                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
            }
            const inputs = [];
            if (mergeIntroFile) {
                await ffmpeg.writeFile('intro.audio', await fetchFile(mergeIntroFile));
                inputs.push('intro.audio');
            }
            await ffmpeg.writeFile('main.wav', await fetchFile(mergeMainFile));
            inputs.push('main.wav');
            if (mergeOutroFile) {
                await ffmpeg.writeFile('outro.audio', await fetchFile(mergeOutroFile));
                inputs.push('outro.audio');
            }
            setMergeLog('🎵 병합 중...');
            const inputArgs = inputs.flatMap(f => ['-i', f]);
            const filterArg = inputs.length > 1
                ? `concat=n=${inputs.length}:v=0:a=1[out]`
                : 'anull[out]';
            await ffmpeg.exec([
                ...inputArgs,
                '-filter_complex', filterArg,
                '-map', '[out]',
                '-codec:a', 'libmp3lame',
                '-q:a', '2',
                'output.mp3',
            ]);
            setMergeLog('💾 MP3 변환 완료, 다운로드 중...');
            const data = await ffmpeg.readFile('output.mp3');
            const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            const outName = `${scriptForm.bookId || 'output'}.mp3`;
            const a = document.createElement('a');
            a.href = url; a.download = outName; a.click();
            URL.revokeObjectURL(url);
            setWavFileName(outName);
            setMergeLog(`✅ ${outName} 다운로드 완료! public/audio/ 폴더에 복사 후 아래에서 활성화하세요.`);
        } catch (e) {
            setMergeLog(`❌ 실패: ${e.message}`);
        } finally {
            setMerging(false);
        }
    };

    useEffect(() => {
        const container = ttsLogContainerRef.current;
        if (container) container.scrollTop = container.scrollHeight;
    }, [ttsLogs]);

    const handleWavUpload = async () => {
        const fileName = wavFileName.trim() || `${scriptForm.bookId}.wav`;
        const bookId = scriptForm.bookId;
        if (!bookId) return alert('도서 ID를 먼저 입력하세요.');
        const audioUrl = `/audio/${fileName}`;
        setWavUploading(true);
        setWavUploadLog('💾 Firestore 저장 중...');
        try {
            await setDoc(doc(db, 'book_overrides', bookId), {
                audioUrl,
                isPodcast: true,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            setWavUploadLog(`✅ 완료! (${audioUrl}) 배포 후 활성화됩니다.`);
        } catch (e) {
            setWavUploadLog(`❌ 실패: ${e.message}`);
        } finally {
            setWavUploading(false);
        }
    };

    const handleCheckQuota = async () => {
        const geminiKeys = [
            import.meta.env.VITE_GEMINI_API_KEY,
            import.meta.env.VITE_GEMINI_API_KEY2,
            import.meta.env.VITE_GEMINI_API_KEY3,
            import.meta.env.VITE_GEMINI_API_KEY4,
            import.meta.env.VITE_GEMINI_API_KEY5,
            import.meta.env.VITE_GEMINI_API_KEY6,
            import.meta.env.VITE_GEMINI_API_KEY7,
            import.meta.env.VITE_GEMINI_API_KEY8,
        ].filter(Boolean);

        setIsCheckingQuota(true);
        setQuotaResults(geminiKeys.map((_, i) => ({ name: `키 ${i + 1}`, pro: '...', flash: '...' })));

        const checkOne = async (key, modelId) => {
            const isFlash = modelId.includes('flash');
            const speechConfig = isFlash
                ? {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            { speaker: '제임스', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
                            { speaker: '스텔라', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                        ]
                    }
                }
                : { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } };
            try {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`,
                    {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: '안녕' }] }],
                            generationConfig: {
                                responseModalities: ['audio'],
                                speechConfig
                            }
                        })
                    }
                );
                if (res.ok) return 'ok';
                if (res.status === 429) return 'over';
                if (res.status === 404) return 'none';
                return `err_${res.status}`;
            } catch { return 'fail'; }
        };

        const results = [];
        for (let i = 0; i < geminiKeys.length; i++) {
            const [pro, flash] = await Promise.all([
                checkOne(geminiKeys[i], 'gemini-2.5-pro-preview-tts'),
                checkOne(geminiKeys[i], 'gemini-2.5-flash-preview-tts'),
            ]);
            results.push({ name: `키 ${i + 1}`, pro, flash });
            setQuotaResults([
                ...results,
                ...geminiKeys.slice(i + 1).map((_, j) => ({ name: `키 ${i + j + 2}`, pro: '...', flash: '...' }))
            ]);
        }
        setIsCheckingQuota(false);
    };

    const handleRunTts = async () => {
        if (!generatedScript.length) return alert('먼저 대본을 생성하세요.');

        const geminiKeys = [
            import.meta.env.VITE_GEMINI_API_KEY,
            import.meta.env.VITE_GEMINI_API_KEY2,
            import.meta.env.VITE_GEMINI_API_KEY3,
            import.meta.env.VITE_GEMINI_API_KEY4,
            import.meta.env.VITE_GEMINI_API_KEY5,
            import.meta.env.VITE_GEMINI_API_KEY6,
            import.meta.env.VITE_GEMINI_API_KEY7,
            import.meta.env.VITE_GEMINI_API_KEY8,
        ].filter(Boolean);

        const BATCH = 100;
        const batches = [];
        for (let i = 0; i < generatedScript.length; i += BATCH) batches.push(generatedScript.slice(i, i + BATCH));

        const speakerA = scriptForm.speakerA || '제임스';
        const speakerB = scriptForm.speakerB || '스텔라';
        const modelId = ttsModel === 'pro'
            ? 'gemini-2.5-pro-preview-tts'
            : 'gemini-2.5-flash-preview-tts';
        const modelLabel = ttsModel === 'pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash';

        // IndexedDB에서 이전 배치 버퍼 로드 (세션 넘어도 유지)
        setIsTtsRunning(true);
        setTtsLogs([`🔍 이전 진행 상황 확인 중...`]);
        const pcmBuffers = new Array(batches.length).fill(null);
        let resumeCount = 0;
        for (let b = 0; b < batches.length; b++) {
            const cached = await loadBatchBuffer(`${scriptForm.bookId}-${b}`);
            if (cached) { pcmBuffers[b] = cached; resumeCount++; }
        }
        const newFailed = [];
        const isResume = resumeCount > 0;

        setTtsLogs([`🎙️ TTS ${isResume ? `이어받기 (${resumeCount}개 캐시 복원)` : '시작'} — ${generatedScript.length}턴 · ${batches.length}번 호출 · ${modelLabel} 멀티스피커`]);
        setTtsProgress(0);

        for (let b = 0; b < batches.length; b++) {
            // 이미 성공한 배치는 건너뜀
            if (pcmBuffers[b] !== null) {
                setTtsLogs(prev => [...prev, `⏭️ 배치 [${b + 1}/${batches.length}] 스킵 (캐시 복원)`]);
                continue;
            }

            const batch = batches[b];
            setTtsProgress(Math.round((b / batches.length) * 90));
            setTtsLogs(prev => {
                const filtered = prev.filter(l => !l.startsWith('⏳'));
                return [...filtered, `⏳ 배치 [${b + 1}/${batches.length}] — ${batch.length}턴 처리 중...`];
            });

            const multiText = batch.map(line => `${line.speaker}: ${line.text}`).join('\n');

            const fetchTimeout = ttsModel === 'pro' ? 900000 : 600000; // Pro: 900s, Flash: 600s (for BATCH 100)
            const expectedSec = fetchTimeout / 1000;
            let success = false;
            let attempts = 0;
            while (!success && attempts < geminiKeys.length) {
                const key = geminiKeys[(b + attempts) % geminiKeys.length];
                // try/catch 스코프 문제로 인해 밖에 선언
                let timerInterval = null;
                let timeoutId = null;
                try {
                    const controller = new AbortController();
                    timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

                    // 1초마다 경과 시간 업데이트
                    let elapsed = 0;
                    timerInterval = setInterval(() => {
                        elapsed++;
                        const pct = Math.min(Math.round((elapsed / expectedSec) * 100), 99);
                        setTtsLogs(prev => {
                            const filtered = prev.filter(l => !l.startsWith('🔄'));
                            return [...filtered, `🔄 배치 ${b + 1} 생성 중... ${elapsed}초 / 예상 ${expectedSec}초 (${pct}%)`];
                        });
                    }, 1000);

                    const res = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`,
                        {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            signal: controller.signal,
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: multiText }] }],
                                generationConfig: {
                                    responseModalities: ['audio'],
                                    speechConfig: {
                                        multiSpeakerVoiceConfig: {
                                            speakerVoiceConfigs: [
                                                { speaker: speakerA, voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
                                                { speaker: speakerB, voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                                            ]
                                        }
                                    }
                                }
                            })
                        }
                    );
                    // fetch() 완료 → 이제 body 다운로드 중 표시 (타이머는 계속 유지)
                    setTtsLogs(prev => {
                        const filtered = prev.filter(l => !l.startsWith('🔄'));
                        return [...filtered, `📥 배치 ${b + 1} 응답 수신 중... (오디오 데이터 다운로드)`];
                    });

                    // AbortController는 clearTimeout 하지 않음 — body reading 중 hang 시 자동 abort
                    if (!res.ok) {
                        const errJson = await res.json().catch(() => null);
                        clearTimeout(timeoutId);
                        clearInterval(timerInterval);
                        setTtsLogs(prev => prev.filter(l => !l.startsWith('📥')));
                        const msg = errJson?.error?.message || `HTTP ${res.status}`;
                        throw new Error(msg);
                    }
                    const data = await res.json();
                    clearTimeout(timeoutId);
                    clearInterval(timerInterval);
                    setTtsLogs(prev => prev.filter(l => !l.startsWith('📥')));
                    const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                    if (!part) throw new Error('응답에 오디오 데이터 없음 (candidates 비어있거나 안전 필터 차단)');
                    const pcm = Uint8Array.from(atob(part), c => c.charCodeAt(0)).buffer;
                    pcmBuffers[b] = pcm;
                    await saveBatchBuffer(`${scriptForm.bookId}-${b}`, pcm); // IndexedDB 저장
                    success = true;
                    setTtsLogs(prev => {
                        const filtered = prev.filter(l => !l.startsWith('⏳'));
                        return [...filtered, `✅ 배치 [${b + 1}/${batches.length}] 완료`];
                    });
                } catch (e) {
                    clearInterval(timerInterval);
                    setTtsLogs(prev => prev.filter(l => !l.startsWith('🔄')));
                    attempts++;
                    if (attempts < geminiKeys.length) {
                        const isAbort = e.name === 'AbortError';
                        const is429 = e.message.includes('429') || e.message.includes('quota') || e.message.includes('RESOURCE_EXHAUSTED');
                        const retryMatch = e.message.match(/retry in (\d+(?:\.\d+)?)s/i);
                        const waitSec = isAbort ? 60 : is429 ? 0 : retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 2 : 40;
                        const reason = isAbort ? '타임아웃' : is429 ? '할당량 소진, 다음 키 시도' : 'API 오류';
                        setTtsLogs(prev => [...prev, `⚠️ 배치 ${b + 1} 재시도 (${attempts}/${geminiKeys.length}) — ${reason}${waitSec > 0 ? `, ${waitSec}초 대기 중...` : ''}`]);
                        if (waitSec > 0) await new Promise(r => setTimeout(r, waitSec * 1000));
                    } else {
                        const failMsg = `❌ 배치 ${b + 1} 실패 — 모든 키 소진\n오류: ${e.message}`;
                        setTtsLogs(prev => [...prev, failMsg]);
                        alert(`배치 ${b + 1} 실패!\n\n${e.message}\n\n모든 API 키가 소진되었습니다.`);
                        newFailed.push(b + 1);
                    }
                }
            }

            // Pro: 35초, Flash: 30초 배치 간 딜레이
            if (b < batches.length - 1) {
                const batchDelay = ttsModel === 'pro' ? 35000 : 30000;
                setTtsLogs(prev => [...prev, `⏱ 다음 배치까지 ${batchDelay / 1000}초 대기...`]);
                await new Promise(r => setTimeout(r, batchDelay));
            }
        }

        // 현재까지 받은 버퍼 저장 (이어받기용)
        setSavedPcmBuffers([...pcmBuffers]);
        setFailedBatches(newFailed);

        const successBuffers = pcmBuffers.filter(Boolean);
        setTtsLogs(prev => [...prev.filter(l => !l.startsWith('⏳')),
        newFailed.length > 0
            ? `⚠️ ${newFailed.length}개 배치 실패 (배치 ${newFailed.join(', ')}). 내일 다시 접속해도 이어받기 가능합니다.`
            : '🎵 WAV 파일 생성 중...'
        ]);
        const wavBuffer = createWavFromPcm(successBuffers);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${scriptForm.bookId}_tts.wav`; a.click();
        setTtsProgress(100);
        // 전체 성공 시 캐시 정리
        if (newFailed.length === 0) {
            await clearBatchBuffers(scriptForm.bookId, batches.length);
            setTtsLogs(prev => [...prev, `🎉 완료! ${scriptForm.bookId}_tts.wav 다운로드됨 (캐시 정리됨)`]);
        } else {
            setTtsLogs(prev => [...prev, `💾 진행 상황 저장됨 — 이어받기 버튼으로 재시도하세요.`]);
        }
        setIsTtsRunning(false);
    };

    const handleGenerateScript = async (overrides = {}) => {
        const { bookId, title, author, themes, targetMin, targetMax, turnLimit, speakerA, speakerB } = { ...scriptForm, ...overrides };
        if (!scriptApiKey) return alert('Claude API 키를 입력하세요.');
        if (!bookId || !title || !author) return alert('Book ID, 제목, 저자는 필수입니다.');

        setIsGeneratingScript(true);
        setScriptLogs(['🚀 Claude API 호출 중...']);
        setScriptProgress(10);
        setGeneratedScript([]);

        // 경과 시간 표시 타이머
        const startTime = Date.now();
        const timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setScriptLogs(prev => {
                const filtered = prev.filter(l => !l.startsWith('⏱'));
                return [...filtered, `⏱ 대기 중... ${elapsed}초 경과`];
            });
        }, 3000);

        const themesBlock = themes
            ? `- 핵심 주제 / 반드시 다룰 내용:\n${themes.split('\n').filter(Boolean).map(t => `  ${t}`).join('\n')}`
            : '';

        const prompt = `당신은 아카이뷰 오리지널 팟캐스트 대본(Script 2.0)을 쓰는 프로 작가입니다.
이 대본은 제임스와 스텔라가 책의 인사이트를 바탕으로 직장인과 현대인의 삶을 유쾌하고 깊이 있게 나누는 콘텐츠입니다.

[책 정보]
- 제목: ${title}
- 저자: ${author}
${themesBlock}

[❗️중요: 작성 지침 - 반드시 준수❗️]
1) **상황 몰입 중심 (Scenario-First)**: 책의 챕터나 내용을 나열하는 설명적 비중은 대폭 줄이세요. 그 대신, 책의 인사이트를 우리의 실제 삶(일상, 직장)에 어떻게 '대입'할 수 있는지에 대한 구체적인 상황극과 대화의 비중을 80% 이상으로 구성하세요.
2) **내용의 사실성 (Fact-Only)**: 책의 핵심 지식은 반드시 제공된 팩트에 기반해야 합니다. 다만 그것을 설명하기보다 "이거 딱 우리 부장님 이야기 아니야?" 혹은 "어제 카페에서 본 그 상황이랑 똑같네" 식의 연결고리로 활용하세요.
3) **위트와 유머**: 직장인들이 무릎을 칠만한 위트와 유머를 섞어주세요. 딱딱한 교양 정보가 아니라, 무조건 재미있어야 합니다.
4) **생활 밀착형 상황**: 지하철, 마트, 운동, 친구 모임 등 일상 전반의 다채로운 상황을 에피소드로 활용하세요.

[화자 정보]
- **제임스 (${speakerA}, 남성)**: 책의 지혜를 위트 있게 현실로 끌어오는 가이드.
- **스텔라 (${speakerB}, 여성)**: 현실적인 관점에서 뼈 때리는 질문을 던지는 리액터.

【대본의 6단계 구조 - 반드시 순서대로 준수】
1. 공감 질문: 일상의 아주 구체적인 상황 속 의문으로 시작
2. 책 소개: 핵심 메시지를 현실의 결핍과 연결해 짧고 강렬하게 소개
3. 인사이트 대입: 책의 개념을 설명하는 것이 아니라, 실제 상황에 '적용'하는 대화 중심
4. 현실 공감 수다: 해당 인사이트가 필요한 일상/직장 에피소드로 위트 있게 티키타카
5. 갈등 및 토론: 현실적 적용의 어려움이나 다른 시각을 나누며 깊이 있는 대화
6. 작은 실천 제안: 오늘 당장 일상에서 써먹을 수 있는 아주 작은 행동 하나 제안 후 위트 있게 마무리

【핵심 작성 규칙】
1) **설명 최소화**: "이 책의 다음 챕터는~" 또는 "~라고 설명합니다" 식의 강의형 말투는 10% 이하로 줄이세요.
2) **상황 최대화**: "어제 내가 이랬는데 말이야" 식의 경험 공유와 에피소드 중심으로 구성하세요.
3) **절대 분량 엄수**: 전체 대화는 무조건 **50턴(제임스와 스텔라가 각 25번씩 발화) 이상**으로 구성하세요. 각 턴의 대사 길이를 길게 작성하여 전체 글자 수가 무조건 **최소 ${targetMin}자 이상 (권장 ${targetMax}자)**이 되도록 알차게 채우세요. 분량이 부족하게 나오는 것은 치명적인 오류입니다.
4) 톤앤매너: 인사 생략, 바로 1단계 시작. [웃음] 등 지시문 금지.

[출력 형식 - JSON 배열만 출력]
[
  {"speaker": "${speakerA}", "text": "..."},
  {"speaker": "${speakerB}", "text": "..."}
]`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000); // 180초 타임아웃

            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': scriptApiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-5',
                    max_tokens: 8192,
                    system: "You are an assistant that outputs ONLY a valid JSON array. No conversational text whatsoever. Do not use markdown tags.",
                    messages: [
                        { role: 'user', content: prompt },
                        { role: 'assistant', content: "[" }
                    ]
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.error?.message || `API 오류 ${res.status}`);
            }

            setScriptProgress(70);
            setScriptLogs(prev => [...prev, '✅ 응답 수신, 파싱 중...']);

            const data = await res.json();
            let rawText = data.content?.[0]?.text?.trim() || "";

            // 프리필(pre-fill)을 위해 '['로 시작하게 만들었으므로 앞에 붙여줍니다.
            if (!rawText.startsWith('[')) {
                rawText = '[' + rawText;
            }

            // 가끔 끝나는 부분을 제대로 안 닫았을 때 대비
            if (!rawText.endsWith(']')) {
                // 약간의 휴리스틱: 마지막이 ]가 아니면 ]를 붙임
                rawText = rawText + ']';
            }

            let script = [];
            try {
                // \n이나 특수문자 등에 대한 예외를 막기 위해
                const pureJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                script = JSON.parse(pureJson);
            } catch (err) {
                console.error("Claude JSON Parse Error:", err, "Raw Output:", rawText);
                throw new Error('파싱 에러: ' + err.message + ' (일부 응답: ' + rawText.slice(0, 50) + '...)');
            }

            const charCount = script.reduce((s, t) => s + (t.text ? t.text.replace(/[\s\uFEFF\xA0]/g, '').length : 0), 0);

            setScriptProgress(100);
            setScriptLogs(prev => [...prev, `✨ 완료! ${script.length}턴 · ${charCount.toLocaleString()}자`]);
            setGeneratedScript(script);

            // Firestore 자동 저장 (scripts + book_overrides isPodcast 동시)
            try {
                await Promise.all([
                    setDoc(doc(db, 'scripts', bookId), {
                        lines: script, title, author,
                        updatedAt: serverTimestamp()
                    }),
                    setDoc(doc(db, 'book_overrides', bookId), {
                        isPodcast: true,
                        updatedAt: serverTimestamp()
                    }, { merge: true })
                ]);
                setScriptLogs(prev => [...prev, `💾 저장 완료 (대본 + isPodcast 플래그) → 성우 다이렉트 탭에서 바로 사용 가능`]);
            } catch (e) {
                setScriptLogs(prev => [...prev, `⚠️ Firestore 저장 실패: ${e.message}`]);
            }
        } catch (e) {
            clearInterval(timerInterval);
            const msg = e.name === 'AbortError' ? '⏱ 타임아웃 (120초 초과) — API 키를 확인하거나 다시 시도하세요.' : `❌ 오류: ${e.message}`;
            setScriptLogs(prev => [...prev, msg]);
        } finally {
            clearInterval(timerInterval);
            setIsGeneratingScript(false);
        }
    };

    const handleSaveScript = async () => {
        if (!generatedScript.length) return;
        const bookId = scriptForm.bookId;
        if (!bookId) return alert('Book ID가 없습니다.');

        setIsLoadingScript(true);
        try {
            await setDoc(doc(db, 'scripts', bookId), {
                lines: generatedScript,
                title: scriptForm.title,
                author: scriptForm.author,
                updatedAt: serverTimestamp()
            });
            setScriptLogs(prev => [...prev, `✅ 대본 수정사항 Firestore 저장 완료`]);
            alert('성공적으로 저장되었습니다.');
        } catch (e) {
            alert('저장 실패: ' + e.message);
        } finally {
            setIsLoadingScript(false);
        }
    };

    const handleDeleteScript = async () => {
        const bookId = scriptForm.bookId;
        if (!bookId) return alert('Book ID가 없습니다.');

        if (!window.confirm('기존에 생성된 대본을 영구적으로 삭제하시겠습니까? (Firestore 데이터 삭제)')) return;

        setIsLoadingScript(true);
        try {
            await deleteDoc(doc(db, 'scripts', bookId));

            // isPodcast 플래그도 끔
            await setDoc(doc(db, 'book_overrides', bookId), {
                isPodcast: false,
                updatedAt: serverTimestamp()
            }, { merge: true });

            setExistingScript(null);
            setGeneratedScript([]);
            setScriptLogs(prev => [...prev, `🗑️ '${bookId}' 대본이 삭제되었습니다.`]);
            alert('대본이 삭제되었습니다.');
        } catch (e) {
            alert('삭제 실패: ' + e.message);
        } finally {
            setIsLoadingScript(false);
        }
    };

    const handleClearTtsCache = async () => {
        if (!scriptForm.bookId) return;
        if (!window.confirm('기존에 생성된 TTS 오디오 캐시를 모두 삭제하시겠습니까? 대본을 수정했다면 캐시를 삭제해야 수정된 내용으로 다시 생성됩니다.')) return;

        try {
            // 배치 수 계산 (BATCH=100)
            const totalBatches = Math.ceil(generatedScript.length / 100) || 10;
            await clearBatchBuffers(scriptForm.bookId, totalBatches + 5); // 넉넉하게 삭제
            setTtsLogs(prev => [...prev, `🗑️ '${scriptForm.bookId}' TTS 캐시가 초기화되었습니다.`]);
            setSavedPcmBuffers([]);
            setFailedBatches([]);
            setTtsProgress(0);
            alert('캐시가 삭제되었습니다. 다시 TTS 변환을 클릭하면 처음부터 새로 생성합니다.');
        } catch (e) {
            alert('캐시 삭제 실패: ' + e.message);
        }
    };

    const handleScriptDownloadJSON = () => {
        if (!generatedScript.length) return;
        const blob = new Blob([JSON.stringify(generatedScript, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `${scriptForm.bookId}_script.json`; a.click();
        URL.revokeObjectURL(url);
    };

    const handleScriptDownloadTXT = () => {
        if (!generatedScript.length) return;
        const text = generatedScript.map((line, i) =>
            `[${i + 1}] ${line.speaker}\n${line.text}`
        ).join('\n\n');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `${scriptForm.bookId}_대본.txt`; a.click();
        URL.revokeObjectURL(url);
    };
    // ─────────────────────────────────────────────────────────

    // ── 성우 다이렉트 탭 상태 ────────────────────────────────
    const [mp3UploadFile, setMp3UploadFile] = useState(null);
    const [mp3Uploading, setMp3Uploading] = useState(false);
    const [mp3UploadLog, setMp3UploadLog] = useState('');
    const [voiceBook, setVoiceBook] = useState('');
    const [voiceFile, setVoiceFile] = useState(null);
    const [voiceMerging, setVoiceMerging] = useState(false);
    const [voiceLogs, setVoiceLogs] = useState([]);
    const [voiceProgress, setVoiceProgress] = useState(0);
    const [voiceIntro, setVoiceIntro] = useState('default');
    const [voiceOutro, setVoiceOutro] = useState('default');
    const [voiceDragOver, setVoiceDragOver] = useState(false);

    // 선택 도서의 대본 (bookScripts 또는 Firestore)
    const [firestoreScript, setFirestoreScript] = useState([]);
    useEffect(() => {
        if (!voiceBook) { setFirestoreScript([]); return; }
        if (bookScripts[voiceBook]) { setFirestoreScript([]); return; } // 로컬에 있으면 스킵
        import('firebase/firestore').then(({ getDoc, doc: fsDoc }) => {
            getDoc(fsDoc(db, 'scripts', voiceBook)).then(snap => {
                if (snap.exists()) {
                    const lines = snap.data().lines || [];
                    // { speaker, text } → { role, text } 변환
                    setFirestoreScript(lines.map(l => ({
                        role: l.speaker === '스텔라' ? 'B' : 'A',
                        text: l.text,
                        speaker: l.speaker
                    })));
                }
            }).catch(() => { });
        });
    }, [voiceBook]);
    const voiceScript = voiceBook
        ? (bookScripts[voiceBook] ? bookScripts[voiceBook] : firestoreScript)
        : [];

    // 도서별 트랙 현황: realBooks에서 audioUrl / voiceAudioUrl 체크
    const trackStatus = (realBooks || []).map(b => ({
        id: b.id || '',
        title: b.title || '',
        hasAI: !!(b.audioUrl),
        hasVoice: !!(b.voiceAudioUrl),
    }));

    // 성우 대본 TXT 다운로드
    const handleVoiceScriptDownload = () => {
        if (!voiceBook) return alert('도서를 먼저 선택하세요.');
        if (!voiceScript.length) return alert('해당 도서의 대본이 없습니다.');
        const text = voiceScript.map((line, i) =>
            `[${i + 1}] ${line.speaker || (line.role === 'A' ? '제임스' : '스텔라')}\n${line.text}`
        ).join('\n\n');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${voiceBook}_대본.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleMp3Upload = async () => {
        if (!mp3UploadFile) return alert('MP3 파일을 선택하세요.');
        if (!voiceBook) return alert('도서를 먼저 선택하세요.');
        setMp3Uploading(true);
        setMp3UploadLog('⬆️ Firebase Storage 업로드 중...');
        try {
            const storageRef = ref(storage, `audio/${voiceBook}_voice.mp3`);
            await uploadBytes(storageRef, mp3UploadFile);
            const voiceAudioUrl = await getDownloadURL(storageRef);
            setMp3UploadLog('💾 Firestore 저장 중...');
            await setDoc(doc(db, 'book_overrides', voiceBook), {
                voiceAudioUrl,
                isPodcast: true,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            setMp3UploadLog('✅ 완료! 프런트에 팟캐스트가 활성화됩니다.');
            setMp3UploadFile(null);
        } catch (e) {
            setMp3UploadLog(`❌ 실패: ${e.message}`);
        } finally {
            setMp3Uploading(false);
        }
    };

    // 도서 관리 탭 - 도서별 팟캐스트 오디오 경로 저장
    const handleBookPodcastPath = async (bookKey, audioUrl) => {
        const isPodcast = audioUrl.trim().length > 0;
        await setDoc(doc(db, 'book_overrides', bookKey), {
            audioUrl: audioUrl.trim(),
            isPodcast,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    };

    // 성우 MP3 업로드 + 인트로/아웃트로 병합 요청
    const handleVoiceMerge = async () => {
        if (!voiceBook) return alert('도서를 선택하세요.');
        if (!voiceFile) return alert('성우 MP3 파일을 업로드하세요.');
        setVoiceMerging(true);
        setVoiceProgress(0);
        setVoiceLogs(prev => [...prev, `[SYSTEM] '${voiceBook}' 성우 오디오 병합 시작...`]);
        const formData = new FormData();
        formData.append('voiceFile', voiceFile);
        formData.append('bookId', voiceBook);
        formData.append('introType', voiceIntro);
        formData.append('outroType', voiceOutro);
        try {
            const res = await fetch('http://127.0.0.1:3001/api/voice/merge', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            setVoiceLogs(prev => [...prev, `[SYSTEM] ${data.message || '병합 요청 완료'}`]);
        } catch (e) {
            setVoiceLogs(prev => [...prev, `[ERROR] 서버 연결 실패. node scripts/server.mjs 실행 필요`]);
            setVoiceMerging(false);
        }
    };

    // 드래그앤드롭 핸들러
    const handleVoiceDrop = (e) => {
        e.preventDefault();
        setVoiceDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'audio/mpeg') {
            setVoiceFile(file);
            setVoiceLogs(prev => [...prev, `[FILE] ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) 로드됨`]);
        } else {
            alert('MP3 파일만 업로드 가능합니다.');
        }
    };
    // ────────────────────────────────────────────────────────

    // 새 책 원스톱 등록
    const [newBookReg, setNewBookReg] = useState({ bookId: '', title: '', author: '', celebrity: '', customCeleb: '', category: 'NOVEL', customCategory: '', desc: '', purchaseLink: '', section: 'EDITORS_PICK' });
    const [isRegistering, setIsRegistering] = useState(false);
    const [autoGenScript, setAutoGenScript] = useState(true);
    const CELEB_LIST = [
        { slug: 'bill-gates', name: '빌 게이츠' }, { slug: 'elon-musk', name: '일론 머스크' },
        { slug: 'rm-bts', name: 'RM (BTS)' }, { slug: 'han-kang', name: '한강' },
        { slug: 'haruki-murakami', name: '무라카미 하루키' }, { slug: 'oprah-winfrey', name: '오프라 윈프리' },
        { slug: 'barack-obama', name: '오바마' }, { slug: 'warren-buffett', name: '워렌 버핏' },
        { slug: 'steve-jobs', name: '스티브 잡스' }, { slug: 'emma-watson', name: '엠마 왓슨' },
        { slug: 'stephen-king', name: '스티븐 킹' }, { slug: 'masayoshi-son', name: '손정의' },
        { slug: 'mark-zuckerberg', name: '마크 저커버그' }, { slug: 'brene-brown', name: '브레네 브라운' },
        { slug: 'jeff-bezos', name: '제프 베이조스' }, { slug: 'tim-cook', name: '팀 쿡' },
        { slug: 'michelle-obama', name: '미셸 오바마' }, { slug: 'iu', name: '아이유' },
        { slug: 'archiview-editor', name: '아카이뷰 에디터' },
    ];
    const CATEGORIES = ['NOVEL', 'ECONOMY', 'PHILOSOPHY', 'PSYCHOLOGY', 'SCIENCE', 'SELF_HELP', 'HISTORY', 'ESSAY', 'BIOGRAPHY', 'POLITICS'];
    const SECTIONS = [
        { id: 'WEEKLY_FOCUS', name: '위클리 포커스' },
        { id: 'EDITORS_PICK', name: '에디터 픽' },
        { id: 'GURU_CHOICE', name: '구루 초이스' },
        { id: 'BURNOUT', name: '번아웃 & 커리어 슬럼프' },
        { id: 'WEALTH', name: '연봉협상 & 경제적 자유' },
        { id: 'HEALING', name: '우울 & 고독 & 치유' },
        { id: 'PHILOSOPHY', name: '자아성찰 & 인생철학' },
        { id: 'ARCHIVIEW_ORIGINAL', name: '아카이뷰 오리지널' }
    ];

    // 한글 → 로마자 변환
    const romanizeKorean = (str) => {
        const INITIALS = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
        const VOWELS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
        const FINALS = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'p', 'l', 't', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
        return str.split('').map(char => {
            const code = char.charCodeAt(0);
            if (code >= 0xAC00 && code <= 0xD7A3) {
                const offset = code - 0xAC00;
                const final = offset % 28;
                const vowel = Math.floor(offset / 28) % 21;
                const initial = Math.floor(offset / 28 / 21);
                return INITIALS[initial] + VOWELS[vowel] + FINALS[final];
            }
            return char;
        }).join('');
    };

    // 제목 → Book ID 자동 생성
    const autoGenerateId = (title) => {
        return romanizeKorean(title)
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 40) || `book-${Date.now()}`;
    };

    const handleTitleChange = (val) => {
        const autoId = autoGenerateId(val);
        setNewBookReg(prev => {
            const isAutoGenerated = prev.bookId === '' || /^book-\d+$/.test(prev.bookId) || prev.bookId === autoGenerateId(prev.title);
            const isValidId = !/^book-\d+$/.test(autoId) && autoId !== '';
            return { ...prev, title: val, bookId: isAutoGenerated && isValidId ? autoId : prev.bookId };
        });
    };

    const getFinalCeleb = () => newBookReg.celebrity === '__custom__' ? newBookReg.customCeleb : newBookReg.celebrity;
    const getFinalCategory = () => newBookReg.category === '__custom__' ? newBookReg.customCategory : newBookReg.category;

    const handleRegisterBook = async () => {
        const celeb = getFinalCeleb();
        const category = getFinalCategory();
        if (!newBookReg.bookId || !newBookReg.title || !newBookReg.author || !celeb) {
            alert('Book ID, 제목, 저자, 셀럽은 필수입니다.'); return;
        }
        if (autoGenScript && !scriptApiKey) {
            alert('AI 대본 자동 생성을 위해 Claude API 키가 필요합니다.\n「AI 대본 생성」 탭에서 먼저 API 키를 입력해주세요.'); return;
        }
        // 미리보기 확인
        const preview = `📚 등록 정보 확인\n\n` +
            `Book ID: ${newBookReg.bookId}\n` +
            `제목: ${newBookReg.title}\n` +
            `저자: ${newBookReg.author}\n` +
            `셀럽: ${celeb}\n` +
            `카테고리: ${category}\n` +
            `섹션: ${SECTIONS.find(s => s.id === newBookReg.section)?.name}\n` +
            `설명: ${newBookReg.desc || '(자동 생성)'}\n` +
            `구매링크: ${newBookReg.purchaseLink || '(없음)'}\n` +
            `AI 대본 생성: ${autoGenScript ? '✅ 자동 생성' : '❌ 생략'}\n\n` +
            `이 정보로 등록하시겠습니까?`;
        if (!window.confirm(preview)) return;

        setIsRegistering(true);
        setLogs(prev => [...prev, `[SYSTEM] '${newBookReg.title}' Firestore 저장 중...`]);
        try {
            await setDoc(doc(db, 'book_overrides', newBookReg.bookId), {
                title: newBookReg.title,
                author: newBookReg.author,
                celebritySlug: celeb,
                category,
                description: newBookReg.desc || `${newBookReg.author}의 ${newBookReg.title}`,
                purchaseLink: newBookReg.purchaseLink || '',
                section: newBookReg.section,
                isPublic: true,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            setLogs(prev => [...prev, `[SAVED] ✅ '${newBookReg.title}' Firestore 저장 완료`]);

            if (autoGenScript) {
                setLogs(prev => [...prev, `[SCRIPT] AI 대본 자동 생성 시작 (Claude API)...`]);
                await handleGenerateScript({
                    bookId: newBookReg.bookId,
                    title: newBookReg.title,
                    author: newBookReg.author,
                });
                setLogs(prev => [...prev, `[DONE] ✨ 원스톱 등록 완료! 「AI 대본 생성」 탭에서 TTS로 오디오를 생성하세요.`]);
            } else {
                setLogs(prev => [...prev, `[DONE] ✅ 도서 등록 완료`]);
            }
            setIsRegistering(false);
            setNewBookReg({ bookId: '', title: '', author: '', celebrity: '', customCeleb: '', category: 'NOVEL', customCategory: '', desc: '', purchaseLink: '', section: 'EDITORS_PICK' });
        } catch (e) {
            setLogs(prev => [...prev, `[ERROR] 등록 실패: ${e.message}`]);
            setIsRegistering(false);
        }
    };

    // Socket.io - 등록 완료 시 폼 리셋
    useEffect(() => {
        const socket = io('http://127.0.0.1:3001');
        socket.on('log', (data) => {
            const msg = typeof data === 'string' ? data : data.message;
            setLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
            // 완료 또는 실패 시 버튼 리셋
            if (msg?.includes('원스톱 등록 완료') || msg?.includes('등록 실패')) {
                setIsRegistering(false);
                setIsGenerating(false);
            }
        });
        socket.on('progress', (data) => {
            if (data.percent !== undefined) setPodcastProgress(data.percent);
        });
        // AI 대본 생성 이벤트
        socket.on('script-log', (data) => {
            const msg = typeof data === 'string' ? data : data.message;
            setScriptLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
            if (msg?.includes('완료') && msg?.includes('성우에게')) setIsGeneratingScript(false);
            if (msg?.includes('❌')) setIsGeneratingScript(false);
        });
        socket.on('script-progress', (data) => {
            if (data.percent !== undefined) setScriptProgress(data.percent);
        });
        socket.on('script-complete', (data) => {
            if (data?.script) setGeneratedScript(data.script);
            setIsGeneratingScript(false);
        });
        // 성우 다이렉트 이벤트
        socket.on('voice-log', (data) => {
            const msg = typeof data === 'string' ? data : data.message;
            setVoiceLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
            if (msg?.includes('병합 완료') || msg?.includes('병합 실패')) setVoiceMerging(false);
        });
        socket.on('voice-progress', (data) => {
            if (data.percent !== undefined) setVoiceProgress(data.percent);
        });
        // 병합 완료 → Firestore 자동 저장
        socket.on('tts-log', ({ message }) => setTtsLogs(prev => [...prev, message]));
        socket.on('tts-progress', ({ percent }) => setTtsProgress(percent));
        socket.on('tts-complete', ({ bookId, audioPath }) => {
            setTtsLogs(prev => [...prev, `🎉 완료! ${audioPath}`]);
            setTtsProgress(100);
            setIsTtsRunning(false);
        });

        socket.on('voice-complete', async ({ bookId, voiceAudioUrl }) => {
            try {
                await setDoc(doc(db, 'book_overrides', bookId), {
                    voiceAudioUrl,
                    updatedAt: serverTimestamp(),
                }, { merge: true });
                setVoiceLogs(prev => [...prev, `[SAVED] Firestore 자동 저장 완료 → voiceAudioUrl: ${voiceAudioUrl}`]);
                setVoiceMerging(false);
                setVoiceFile(null);
            } catch (e) {
                setVoiceLogs(prev => [...prev, `[ERROR] Firestore 저장 실패: ${e.message}`]);
                setVoiceMerging(false);
            }
        });
        return () => socket.disconnect();
    }, []);

    // --- 원스톱 등록 UI (podcast 탭 내) ---
    const registrationUI = (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-3xl space-y-4">
            <h3 className="text-emerald-400 font-black text-lg flex items-center gap-2">
                <span className="material-symbols-outlined">library_add</span>
                새 책 원스톱 등록
            </h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                    <label className="text-[9px] text-slate-500 font-bold ml-1">책 제목 <span className="text-emerald-400">*</span></label>
                    <input value={newBookReg.title} onChange={e => handleTitleChange(e.target.value)} placeholder="미드나잇 라이브러리" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-400 outline-none" />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold ml-1">BOOK ID <span className="text-emerald-400/60">(자동생성)</span></label>
                    <input value={newBookReg.bookId} onChange={e => setNewBookReg({ ...newBookReg, bookId: e.target.value })} placeholder="auto-generated" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-emerald-300/70 focus:border-emerald-400 outline-none font-mono" />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold ml-1">저자 <span className="text-emerald-400">*</span></label>
                    <input value={newBookReg.author} onChange={e => setNewBookReg({ ...newBookReg, author: e.target.value })} placeholder="매트 헤이그" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-400 outline-none" />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold ml-1">노출 섹션 <span className="text-emerald-400">*</span></label>
                    <select value={newBookReg.section} onChange={e => setNewBookReg({ ...newBookReg, section: e.target.value })} className="w-full bg-black/40 border border-emerald-400/40 rounded-xl px-3 py-2.5 text-xs text-emerald-300 focus:border-emerald-400 outline-none font-bold">
                        {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold ml-1">셀럽 <span className="text-emerald-400">*</span></label>
                    <select value={newBookReg.celebrity} onChange={e => setNewBookReg({ ...newBookReg, celebrity: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-400 outline-none">
                        <option value="">선택</option>
                        {CELEB_LIST.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                        <option value="__custom__">✏️ 직접 입력</option>
                    </select>
                    {newBookReg.celebrity === '__custom__' && (
                        <input value={newBookReg.customCeleb} onChange={e => setNewBookReg({ ...newBookReg, customCeleb: e.target.value })} placeholder="새 셀럽 slug (예: taylor-swift)" className="w-full mt-1 bg-black/40 border border-emerald-400/30 rounded-xl px-3 py-2.5 text-xs text-emerald-300 focus:border-emerald-400 outline-none font-mono" />
                    )}
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold ml-1">카테고리</label>
                    <select value={newBookReg.category} onChange={e => setNewBookReg({ ...newBookReg, category: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-400 outline-none">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__custom__">✏️ 직접 입력</option>
                    </select>
                    {newBookReg.category === '__custom__' && (
                        <input value={newBookReg.customCategory} onChange={e => setNewBookReg({ ...newBookReg, customCategory: e.target.value })} placeholder="새 카테고리 (예: ART)" className="w-full mt-1 bg-black/40 border border-emerald-400/30 rounded-xl px-3 py-2.5 text-xs text-emerald-300 focus:border-emerald-400 outline-none" />
                    )}
                </div>
                <div className="space-y-1 col-span-2">
                    <label className="text-[9px] text-slate-500 font-bold ml-1">한 줄 설명</label>
                    <input value={newBookReg.desc} onChange={e => setNewBookReg({ ...newBookReg, desc: e.target.value })} placeholder="인생을 바꾸는 책" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-400 outline-none" />
                </div>
                <div className="space-y-1 col-span-2">
                    <label className="text-[9px] text-slate-500 font-bold ml-1">구매 링크 <span className="text-slate-600">(선택)</span></label>
                    <input value={newBookReg.purchaseLink} onChange={e => setNewBookReg({ ...newBookReg, purchaseLink: e.target.value })} placeholder="쿠팡/아마존/알리 파트너스 링크" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-400 outline-none" />
                </div>
            </div>
            {/* AI 대본 자동 생성 옵션 */}
            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <input type="checkbox" id="autoGenScript" checked={autoGenScript} onChange={e => setAutoGenScript(e.target.checked)} className="w-4 h-4 accent-blue-400 cursor-pointer" />
                <label htmlFor="autoGenScript" className="text-xs text-blue-300 font-bold cursor-pointer flex-1">
                    AI 대본 자동 생성 (Claude API)
                </label>
                {autoGenScript && !scriptApiKey && (
                    <span className="text-[9px] text-yellow-400">⚠️ 「AI 대본 생성」 탭에서 API 키 필요</span>
                )}
                {autoGenScript && scriptApiKey && (
                    <span className="text-[9px] text-emerald-400">✅ API 키 준비됨</span>
                )}
            </div>
            <button onClick={handleRegisterBook} disabled={isRegistering} className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg transition-all ${isRegistering ? 'bg-slate-700 text-slate-500' : 'bg-emerald-500 text-white hover:bg-emerald-400 active:scale-[0.98]'}`}>
                {isRegistering ? (<><span className="material-symbols-outlined animate-spin">sync</span> 등록 진행 중...</>) : (<><span className="material-symbols-outlined">rocket_launch</span> 원스톱 등록 시작</>)}
            </button>
            <p className="text-[9px] text-slate-600 text-center">Firestore 저장 · AI 대본 생성(선택) · 이후 「AI 대본 생성」 탭에서 TTS 오디오 제작 가능</p>
        </div>
    );

    const handleGeneratePodcast = async () => {
        if (!selectedBookId) {
            alert('도서를 선택해 주세요.');
            return;
        }

        setIsGenerating(true);
        setLogs(prev => [...prev, `[SYSTEM] '${selectedBookId}' 팟캐스트 생성을 요청합니다...`]);
        setPodcastProgress(0);

        const formData = new FormData();
        if (inputMode === 'file' && uploadFile) {
            formData.append('file', uploadFile);
        } else {
            formData.append('content', manualContent);
        }
        formData.append('bookId', selectedBookId);
        formData.append('outputName', `${selectedBookId}.mp3`);

        try {
            const response = await fetch('http://127.0.0.1:3001/api/podcast/generate', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            setLogs(prev => [...prev, `[SYSTEM] ${data.message || '요청 성공'}`]);
        } catch (error) {
            console.error('Podcast Gen Error:', error);
            const errorMsg = error.message === 'Failed to fetch'
                ? '서버(3001) 연결 실패. 백엔드 서버가 실행 중인지 확인하세요.'
                : error.message;
            setLogs(prev => [...prev, `[ERROR] 서버 연결 실패: ${errorMsg}`]);
            setIsGenerating(false);
        }
    };

    const handleGenerateText = async () => {
        if (!selectedBookId) {
            alert('도서를 먼저 선택해 주세요!');
            return;
        }

        setIsGeneratingText(true);
        setLogs(prev => [...prev, `[SYSTEM] '${selectedBookId}' 원고 생성을 시작합니다...`]);

        try {
            const response = await fetch('http://127.0.0.1:3001/api/podcast/generate-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId: selectedBookId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '서버 응답 오류');
            }

            const data = await response.json();
            if (data.text) {
                setManualContent(data.text);
                setInputMode('text');
                setLogs(prev => [...prev, `[SYSTEM] AI 원고 생성 완료! 아래 편집기를 확인하세요.`]);
            } else {
                setLogs(prev => [...prev, `[ERROR] 원고 생성 실패: 응답 데이터가 비어 있습니다.`]);
            }
        } catch (error) {
            console.error('Text Gen Error:', error);
            const errorMsg = error.message === 'Failed to fetch'
                ? '서버(3001) 연결 실패. 백엔드 서버가 실행 중인지 확인하세요.'
                : error.message;
            alert('오류 발생: ' + errorMsg);
            setLogs(prev => [...prev, `[ERROR] 원고 생성 실패: ${errorMsg}`]);
        } finally {
            setIsGeneratingText(false);
        }
    };

    const handleDownloadTxt = () => {
        if (!manualContent) return alert('생성된 원고가 없습니다.');
        const element = document.createElement("a");
        const file = new Blob([manualContent], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${selectedBookId}.txt`;
        document.body.appendChild(element);
        element.click();
    };

    const tabNames = {
        'dashboard': '대시보드',
        'members': '회원 관리',
        'books': '도서 관리',
        'popular': '인기 아카이뷰',
        'script': 'AI 대본 생성',
        'podcast': 'AI 팟캐스트',
        'voice': '성우 다이렉트',
        'sales': '매출 관리',
        'payment': '결제 설정'
    };

    // If initial loading is still happening from auth or first fetch
    if (isLoading && realUsers.length === 0 && activeTab === 'dashboard') {
        return (
            <div className="bg-background-dark min-h-screen flex items-center justify-center">
                <div className="text-gold animate-pulse">데이터 로드 중...</div>
            </div>
        );
    }

    // If not authenticated, show password gate
    if (!isAuthenticated) {
        return (
            <div className="bg-slate-950 min-h-screen flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-[40px] p-12 text-center backdrop-blur-xl shadow-2xl">
                    <div className="size-20 bg-gold rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-gold/20">
                        <span className="material-symbols-outlined text-primary text-4xl font-black">lock</span>
                    </div>
                    <h2 className="text-white font-black text-3xl mb-2 tracking-tighter uppercase leading-none">Access Restricted</h2>
                    <p className="text-slate-500 text-sm mb-10 font-medium">관리자 전용 보안 채널입니다. 패스워드를 입력하세요.</p>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter Master Password"
                            className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-6 py-5 text-center text-white focus:border-gold outline-none transition-all font-mono"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="w-full py-5 bg-gold text-primary font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl uppercase tracking-[0.2em] text-sm"
                        >
                            Establish Connection
                        </button>
                    </form>
                    <button onClick={() => window.location.href = '/'} className="mt-8 text-slate-600 text-xs font-bold hover:text-white transition-colors uppercase tracking-widest">Return to Base</button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-pc-exclusive bg-slate-950 font-display text-slate-100 antialiased min-h-screen">
            {/* 
                [FIX] 레이아웃 치우침 현상 해결: 
                부모 폭 제한이 이미 풀렸으므로 표준 w-full을 사용함.
            */}
            <div className="w-full relative min-h-screen flex flex-col">
                {/* Admin 전용 와이드 상단바 */}
                <div className="w-full bg-[#0f1115] border-b border-white/5 sticky top-0 z-[110] backdrop-blur-md">
                    <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-10 bg-gold rounded-xl flex items-center justify-center shadow-lg shadow-gold/20">
                                <span className="material-symbols-outlined text-primary font-black">shield_person</span>
                            </div>
                            <div>
                                <h1 className="text-white font-black text-xl tracking-tight uppercase">Control Center</h1>
                                <p className="text-gold/50 text-[10px] font-black tracking-[0.2em]">THE ARCHIVIEW MASTER</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-white text-xs font-bold uppercase tracking-widest">Admin Uplink</span>
                                <span className="text-emerald-400 text-[9px] font-mono anim-pulse">● SECURE CONNECTION</span>
                            </div>
                            <button onClick={() => window.location.href = '/'} className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                    </div>
                </div>

                <main className="max-w-[1600px] w-full mx-auto px-6 md:px-10 pt-10 pb-24 space-y-10 animate-fade-in-up flex-1">
                    {/* PC Optimized Tab Navigation */}
                    <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10 overflow-x-auto scrollbar-hide backdrop-blur-xl sticky top-[100px] z-[100] shadow-2xl">
                        {Object.keys(tabNames).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-4 px-6 rounded-xl text-sm font-black tracking-widest whitespace-nowrap transition-all flex items-center justify-center gap-3 ${activeTab === tab
                                    ? 'bg-gold text-primary shadow-[0_10px_25px_rgba(212,175,55,0.3)] scale-[1.02] z-10'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-xl">
                                    {tab === 'dashboard' ? 'dashboard' : tab === 'members' ? 'group' : tab === 'books' ? 'menu_book' : tab === 'popular' ? 'trending_up' : tab === 'script' ? 'draw' : tab === 'podcast' ? 'podcasts' : tab === 'voice' ? 'record_voice_over' : tab === 'sales' ? 'payments' : 'settings'}
                                </span>
                                {tabNames[tab].toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Dashboard View - PC Grid */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {stats.map((stat, idx) => (
                                    <div key={idx} className="bg-white/5 p-10 rounded-[40px] border border-white/10 relative overflow-hidden group hover:bg-white/10 transition-all hover:-translate-y-2">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                                            <span className="material-symbols-outlined text-7xl text-gold">{stat.icon}</span>
                                        </div>
                                        <p className="text-slate-500 text-xs uppercase tracking-[0.3em] font-black mb-3">{stat.title}</p>
                                        <h3 className="text-5xl font-black text-white mb-4 tracking-tighter">{stat.value}</h3>
                                        <span className="inline-block px-4 py-1 rounded-full text-[10px] bg-gold/10 text-gold font-black border border-gold/20">
                                            {stat.change}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Recent Activity - Wider Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                <div className="lg:col-span-2 bg-white/5 rounded-[48px] border border-white/10 p-12 backdrop-blur-md">
                                    <div className="flex items-center justify-between mb-12">
                                        <h3 className="text-white font-black text-2xl flex items-center gap-4">
                                            <span className="material-symbols-outlined text-gold text-3xl">notifications_active</span>
                                            실시간 거래 모니터링
                                        </h3>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                            <div className="size-2 rounded-full bg-emerald-500 animate-ping"></div>
                                            <span className="text-[10px] text-emerald-400 font-black font-mono tracking-widest">LIVE DATA FEED</span>
                                        </div>
                                    </div>
                                    <div className="space-y-10">
                                        {realSales.slice(0, 6).map((sale, i) => (
                                            <div key={i} className="flex gap-8 items-center p-6 rounded-[32px] hover:bg-white/5 transition-all group border border-transparent hover:border-white/5">
                                                <div className="size-16 rounded-2xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20 group-hover:scale-110 transition-transform">
                                                    <span className="material-symbols-outlined text-3xl">shopping_cart</span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="text-gold font-black text-lg uppercase">{sale.userName || 'VIP CLIENT'}</span>
                                                        <span className="text-slate-600 font-mono text-xs">#{sale.id?.substring(0, 8)}</span>
                                                    </div>
                                                    <p className="text-slate-200 text-xl font-medium leading-relaxed">
                                                        <span className="text-white font-black">[{sale.bookTitle}]</span> 도서를 성공적으로 구매했습니다.
                                                    </p>
                                                    <span className="text-xs text-slate-500 font-bold tracking-widest mt-2 block">{sale.timestamp ? new Date(sale.timestamp.seconds * 1000).toLocaleString() : 'PROCESSING...'}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-gold font-black text-3xl tracking-tighter">+{sale.amount}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-gradient-to-br from-gold/20 via-gold/5 to-transparent rounded-[48px] border border-gold/20 p-12 flex flex-col justify-center items-center text-center shadow-2xl">
                                        <span className="material-symbols-outlined text-8xl text-gold mb-8 animate-pulse">shield_person</span>
                                        <h4 className="text-white font-black text-3xl mb-6 leading-tight tracking-tighter">MASTER<br />ADMINISTRATOR</h4>
                                        <p className="text-slate-400 text-base font-light leading-relaxed mb-10">
                                            최고 관리자 모드입니다. <br /> 모든 데이터 수정 사항은 <br /> 실시간으로 전 서버에 동기화됩니다.
                                        </p>
                                        <div className="w-full p-6 bg-black/40 rounded-3xl border border-white/5 mb-8">
                                            <div className="flex justify-between text-xs font-black uppercase mb-2">
                                                <span className="text-slate-500">Server Status</span>
                                                <span className="text-emerald-400">Stable</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="w-[98%] h-full bg-emerald-500"></div>
                                            </div>
                                        </div>
                                        <button className="w-full py-5 bg-white text-primary font-black rounded-2xl shadow-xl hover:bg-gold hover:text-primary transition-all uppercase tracking-widest text-sm">Download Analytics</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Members View - Wider List */}
                    {activeTab === 'members' && (
                        <div className="space-y-10">
                            <div className="flex justify-between items-end">
                                <div className="space-y-2">
                                    <h3 className="text-white font-black text-5xl italic tracking-tighter uppercase">User Database</h3>
                                    <p className="text-slate-500 text-lg font-medium">총 {realUsers.length}명의 회원이 정밀 관리되고 있습니다.</p>
                                </div>
                                <div className="flex gap-4">
                                    <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black text-white hover:bg-white/10 transition-all uppercase tracking-widest">Export CSV</button>
                                    <div className="bg-gold/10 border border-gold/20 rounded-2xl px-6 py-4 flex items-center gap-3">
                                        <div className="size-2 rounded-full bg-gold animate-ping"></div>
                                        <span className="text-xs font-black text-gold uppercase tracking-widest">Sync Active</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-[48px] border border-white/10 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-px bg-white/10">
                                    {realUsers.map((user) => (
                                        <div key={user.id} className="p-10 bg-background-dark flex items-center justify-between hover:bg-white/5 transition-all group">
                                            <div className="flex items-center gap-8">
                                                <div className="size-20 rounded-3xl bg-slate-800 border-4 border-white/5 flex items-center justify-center text-slate-300 font-black text-3xl overflow-hidden group-hover:border-gold/50 transition-all shadow-2xl">
                                                    {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : user.displayName?.charAt(0)}
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-white text-2xl font-black leading-tight tracking-tight">{user.displayName || 'GUEST USER'}</p>
                                                    <p className="text-slate-500 text-base font-bold font-mono">{user.email}</p>
                                                    <div className="flex items-center gap-3 pt-2">
                                                        <span className="text-[10px] font-black text-slate-600 uppercase bg-white/5 px-2 py-1 rounded">ID: {user.id?.substring(0, 12)}</span>
                                                        <span className="text-[10px] font-black text-slate-600 uppercase">Login: {user.lastLogin ? new Date(user.lastLogin.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-6">
                                                <select
                                                    value={user.status || '활동중'}
                                                    onChange={(e) => handleUpdateUserStatus(user.id, e.target.value)}
                                                    className={`bg-black/60 text-xs font-black px-6 py-3 border-2 rounded-2xl outline-none focus:border-gold transition-all cursor-pointer ${user.status === '정지' ? 'text-red-400 border-red-500/30' : 'text-emerald-400 border-emerald-500/30'
                                                        }`}
                                                >
                                                    <option value="활동중">ACTIVE</option>
                                                    <option value="정지">SUSPENDED</option>
                                                    <option value="휴면">INACTIVE</option>
                                                </select>
                                                <button className="text-slate-700 hover:text-white transition-colors p-2">
                                                    <span className="material-symbols-outlined text-3xl">open_in_new</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Books View - PC Grid Layout */}
                    {activeTab === 'books' && (
                        <div className="space-y-12">
                            <div className="flex justify-between items-center">
                                <div className="space-y-3">
                                    <h3 className="text-white font-black text-5xl italic tracking-tighter uppercase">Library Master</h3>
                                    <p className="text-slate-500 text-xl font-medium italic">현재 {realBooks.length}권의 명작들이 시스템에 등록되어 있습니다.</p>
                                </div>
                                <button
                                    onClick={() => setIsAddingBook(!isAddingBook)}
                                    className="px-10 py-5 rounded-[24px] bg-gold text-primary font-black text-base flex items-center gap-4 hover:bg-white hover:scale-105 transition-all shadow-[0_20px_50px_rgba(212,175,55,0.3)]"
                                >
                                    <span className="material-symbols-outlined text-2xl">library_add</span>
                                    REGISTER MASTER BOOK
                                </button>
                            </div>

                            {/* 🆕 External Metadata Search Panel */}
                            <div className="bg-white/5 p-8 rounded-[40px] border border-white/10 space-y-6 mb-10">
                                <div className="flex items-center justify-between gap-4">
                                    <h4 className="text-white font-black text-xl flex items-center gap-3">
                                        <span className="material-symbols-outlined text-blue-400">explore</span>
                                        글로벌 도서 정보 검색
                                    </h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => openExternalSearch('kyobo')} className="px-4 py-2 bg-[#5cb85c]/20 text-[#5cb85c] text-[10px] font-black rounded-xl border border-[#5cb85c]/30 hover:bg-[#5cb85c]/30 transition-all">KYOBObook</button>
                                        <button onClick={() => openExternalSearch('yes24')} className="px-4 py-2 bg-[#2478c1]/20 text-[#2478c1] text-[10px] font-black rounded-xl border border-[#2478c1]/30 hover:bg-[#2478c1]/30 transition-all">YES24</button>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1 bg-black/60 border-2 border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-400 transition-colors shadow-inner flex items-center px-4">
                                        <span className="material-symbols-outlined text-slate-500 mr-2">public</span>
                                        <input
                                            type="text"
                                            placeholder="Google Books API로 도서 검색 (제목/작가)..."
                                            value={externalSearchQuery}
                                            onChange={(e) => setExternalSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleGoogleBooksSearch()}
                                            className="flex-1 bg-transparent border-none text-white text-base py-4 outline-none font-bold"
                                        />
                                    </div>
                                    <button
                                        onClick={handleGoogleBooksSearch}
                                        disabled={isSearchingExternal}
                                        className="px-8 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <span className={`material-symbols-outlined ${isSearchingExternal ? 'animate-spin' : ''}`}>
                                            {isSearchingExternal ? 'sync' : 'search'}
                                        </span>
                                        검색
                                    </button>
                                </div>

                                {externalSearchResults.length > 0 && (
                                    <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x">
                                        {externalSearchResults.map((item, idx) => (
                                            <div key={idx} className="flex-shrink-0 w-80 bg-black/40 rounded-3xl p-6 border border-white/5 snap-center space-y-4 hover:border-blue-400/50 transition-all group">
                                                <div className="flex gap-4">
                                                    <div className="w-20 aspect-[3/4] bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-white/10">
                                                        <img src={item.volumeInfo.imageLinks?.thumbnail} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h5 className="text-white font-black text-sm truncate uppercase">{item.volumeInfo.title}</h5>
                                                        <p className="text-blue-400 text-[10px] font-bold mt-1 truncate">{item.volumeInfo.authors?.join(', ')}</p>
                                                        <p className="text-slate-500 text-[9px] mt-2 line-clamp-2 leading-relaxed">{item.volumeInfo.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setNewBook(prev => ({
                                                                ...prev,
                                                                title: item.volumeInfo.title,
                                                                author: item.volumeInfo.authors?.join(', ') || '',
                                                                description: item.volumeInfo.description || ''
                                                            }));
                                                            setIsAddingBook(true);
                                                            alert('도서 정보가 하단 "새 도서 등록" 폼에 입력되었습니다.');
                                                            window.scrollTo({ top: document.querySelector('form')?.offsetTop || 1000, behavior: 'smooth' });
                                                        }}
                                                        className="flex-1 py-2.5 bg-blue-600/20 text-blue-400 text-[10px] font-black rounded-xl border border-blue-600/30 hover:bg-blue-600 hover:text-white transition-all"
                                                    >
                                                        신규 등록 적용
                                                    </button>
                                                    <a href={item.volumeInfo.infoLink} target="_blank" rel="noreferrer" className="px-4 py-2.5 bg-white/5 text-slate-500 text-[10px] font-black rounded-xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center">상세보기</a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex bg-black/60 border-2 border-white/10 rounded-2xl overflow-hidden focus-within:border-gold transition-colors shadow-inner">
                                    <span className="material-symbols-outlined text-slate-500 font-extralight text-3xl p-4">search</span>
                                    <input
                                        type="text"
                                        placeholder="도서명으로 검색..."
                                        value={bookSearchQuery}
                                        onChange={(e) => setBookSearchQuery(e.target.value)}
                                        className="flex-1 bg-transparent border-none text-white text-lg font-bold placeholder:text-slate-600 outline-none px-4"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold outline-none"
                                    >
                                        <option value="">모든 카테고리</option>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <select
                                        value={filterSection}
                                        onChange={(e) => setFilterSection(e.target.value)}
                                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold outline-none"
                                    >
                                        <option value="">모든 노출 섹션</option>
                                        {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <select
                                        value={filterCeleb}
                                        onChange={(e) => setFilterCeleb(e.target.value)}
                                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold outline-none"
                                    >
                                        <option value="">모든 유명인사</option>
                                        {CELEB_LIST.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {isAddingBook && (
                                <form onSubmit={handleAddBook} className="bg-white/5 p-12 rounded-[56px] border border-gold/30 space-y-10 animate-scale-in backdrop-blur-3xl shadow-3xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                                        <div className="space-y-3">
                                            <label className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] ml-2">Book Title</label>
                                            <input type="text" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-6 py-5 text-base text-white focus:border-gold outline-none transition-all" required />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] ml-2">Author Name</label>
                                            <input type="text" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })} className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-6 py-5 text-base text-white focus:border-gold outline-none transition-all" required />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] ml-2">List Price</label>
                                            <input type="text" value={newBook.price} onChange={e => setNewBook({ ...newBook, price: e.target.value })} className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-6 py-5 text-base text-white focus:border-gold outline-none transition-all" placeholder="22,000" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] ml-2">Current Stock</label>
                                            <input type="number" value={newBook.stock} onChange={e => setNewBook({ ...newBook, stock: parseInt(e.target.value) || 0 })} className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-6 py-5 text-base text-white focus:border-gold outline-none transition-all" />
                                        </div>
                                        <div className="space-y-3 md:col-span-4">
                                            <div className="flex justify-between items-center ml-2">
                                                <label className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">Description / Introduction</label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCrawlBookInfo(newBook.title, newBook.author)}
                                                    disabled={isCrawling}
                                                    className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/40 transition-all flex items-center gap-2"
                                                >
                                                    <span className={`material-symbols-outlined text-xs ${isCrawling ? 'animate-spin' : ''}`}>
                                                        {isCrawling ? 'sync' : 'language'}
                                                    </span>
                                                    {isCrawling ? '크롤링 중...' : '교보문고 상세 정보 가져오기'}
                                                </button>
                                            </div>
                                            <textarea
                                                value={newBook.description}
                                                onChange={e => setNewBook({ ...newBook, description: e.target.value })}
                                                className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-6 py-5 text-base text-white focus:border-gold outline-none transition-all h-32 resize-none"
                                                placeholder="도서에 대한 상세 설명을 입력하세요 (구글 검색 결과 또는 교보문고 크롤링 자동 입력 가능)"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-6 pt-6">
                                        <button type="submit" className="flex-1 bg-gold text-primary font-black py-6 rounded-2xl shadow-2xl hover:brightness-110 active:scale-95 transition-all text-lg tracking-widest">PUSH TO PRODUCTION</button>
                                        <button type="button" onClick={() => setIsAddingBook(false)} className="px-12 bg-white/10 text-white font-black py-6 rounded-2xl hover:bg-white/20 transition-all uppercase tracking-widest">Cancel</button>
                                    </div>
                                </form>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-10">
                                {[...realBooks]
                                    .filter(book => {
                                        const matchSearch = book.title.toLowerCase().includes(bookSearchQuery.toLowerCase());
                                        const matchCategory = filterCategory === '' || book.category === filterCategory;
                                        const matchSection = filterSection === '' || book.section === filterSection;
                                        const matchCeleb = filterCeleb === '' || (book.celebName === filterCeleb || book.celebrity === filterCeleb);
                                        return matchSearch && matchCategory && matchSection && matchCeleb;
                                    })
                                    .reverse()
                                    .map((book) => {
                                        const bookKey = book.id || book.title.toLowerCase().replace(/\s+/g, '-');
                                        return (
                                            <div key={bookKey} className="bg-white/5 p-10 rounded-[48px] border border-white/10 flex flex-col gap-8 group hover:bg-white/10 transition-all border-t-8 border-t-transparent hover:border-t-gold shadow-2xl relative overflow-hidden">
                                                <div className="flex gap-8 items-start relative z-10">
                                                    <div className="w-32 aspect-[3/4] bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] shrink-0 group-hover:scale-105 transition-transform duration-700">
                                                        <img src={book.cover} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-3">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <h4 className="text-white text-2xl font-black truncate leading-tight tracking-tight uppercase">{book.title}</h4>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button
                                                                    onClick={() => handleTogglePublic(bookKey, book.isPublic !== false)}
                                                                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${book.isPublic !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' : 'bg-slate-700/50 text-slate-500 border border-slate-600/30 hover:bg-slate-600/50'}`}
                                                                >
                                                                    {book.isPublic !== false ? '● 공개' : '○ 비공개'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteBook(bookKey)}
                                                                    className="text-slate-700 hover:text-red-500 transition-colors p-2"
                                                                >
                                                                    <span className="material-symbols-outlined text-2xl">delete_forever</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-600 font-mono tracking-wider ml-0.5">ID: {bookKey}</p>
                                                        <p className="text-gold font-black italic text-base">{book.author}</p>
                                                        <div className="flex flex-wrap gap-2 pt-2">
                                                            <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black text-slate-400 uppercase border border-white/5">{book.category || 'GENERAL'}</span>
                                                            {book.section && (
                                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border flex items-center gap-1 ${book.section === 'BURNOUT' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                                                    book.section === 'WEALTH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                                                        book.section === 'HEALING' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                                            book.section === 'PHILOSOPHY' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                                                                'bg-gold/20 text-gold border-gold/40'
                                                                    }`}>
                                                                    <span className="material-symbols-outlined text-[10px]">
                                                                        {book.section === 'BURNOUT' ? 'battery_alert' :
                                                                            book.section === 'WEALTH' ? 'payments' :
                                                                                book.section === 'HEALING' ? 'favorite' :
                                                                                    book.section === 'PHILOSOPHY' ? 'psychology' :
                                                                                        'stars'}
                                                                    </span>
                                                                    {(SECTIONS.find(s => s.id === book.section)?.name || book.section)}
                                                                </span>
                                                            )}
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${book.stock > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                                {book.stock > 0 ? `Stock: ${book.stock}` : 'OUT OF STOCK'}
                                                            </span>
                                                        </div>
                                                        <p className="text-white text-3xl font-black tracking-tighter mt-4">₩{book.price}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6 pt-8 border-t border-white/5 relative z-10">
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-2">Internal Cover Path</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                id={`cover-${bookKey}`}
                                                                type="text"
                                                                defaultValue={book.cover || ''}
                                                                className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-300 focus:border-gold outline-none font-mono shadow-inner min-w-0"
                                                            />
                                                            <button onClick={() => {
                                                                const val = document.getElementById(`cover-${bookKey}`).value;
                                                                handleUpdateCoverPath(bookKey, val);
                                                            }} className="px-5 bg-gold text-primary font-black rounded-2xl hover:bg-white transition-colors text-xs shrink-0">수정</button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-2">Global Affiliate Link</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                id={`link-${bookKey}`}
                                                                type="text"
                                                                defaultValue={book.purchaseLink || ''}
                                                                className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-300 focus:border-gold outline-none font-mono shadow-inner min-w-0"
                                                            />
                                                            <button onClick={() => {
                                                                const val = document.getElementById(`link-${bookKey}`).value;
                                                                handleUpdatePurchaseLink(bookKey, val);
                                                            }} className="px-5 bg-gold text-primary font-black rounded-2xl hover:bg-white transition-colors text-xs shrink-0">수정</button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-2">노출 섹션 (Select/Input)</label>
                                                        <div className="flex gap-2 items-center">
                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value) document.getElementById(`section-${bookKey}`).value = e.target.value;
                                                                }}
                                                                className="w-28 bg-black/60 border border-white/10 rounded-xl px-2 py-2 text-[10px] text-slate-300 focus:border-gold outline-none shadow-inner shrink-0"
                                                            >
                                                                <option value="">▼ 선택 ▼</option>
                                                                {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                            </select>
                                                            <input
                                                                id={`section-${bookKey}`}
                                                                type="text"
                                                                defaultValue={book.section || ''}
                                                                placeholder="직접 입력"
                                                                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-slate-300 focus:border-gold outline-none shadow-inner min-w-0"
                                                            />
                                                            <button onClick={() => {
                                                                const val = document.getElementById(`section-${bookKey}`).value;
                                                                handleUpdateBookField(bookKey, 'section', val);
                                                            }} className="px-4 py-2 bg-gold text-primary font-black rounded-xl hover:bg-white transition-colors text-[10px] shrink-0">수정</button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-2">카테고리 (Select/Input)</label>
                                                        <div className="flex gap-2 items-center">
                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value) document.getElementById(`category-${bookKey}`).value = e.target.value;
                                                                }}
                                                                className="w-28 bg-black/60 border border-white/10 rounded-xl px-2 py-2 text-[10px] text-slate-300 focus:border-gold outline-none shadow-inner shrink-0"
                                                            >
                                                                <option value="">▼ 선택 ▼</option>
                                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                            </select>
                                                            <input
                                                                id={`category-${bookKey}`}
                                                                type="text"
                                                                defaultValue={book.category || ''}
                                                                placeholder="직접 입력"
                                                                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-slate-300 focus:border-gold outline-none shadow-inner min-w-0"
                                                            />
                                                            <button onClick={() => {
                                                                const val = document.getElementById(`category-${bookKey}`).value;
                                                                handleUpdateBookField(bookKey, 'category', val);
                                                            }} className="px-4 py-2 bg-gold text-primary font-black rounded-xl hover:bg-white transition-colors text-[10px] shrink-0">수정</button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-2">유명인사 셀럽 (Select/Input)</label>
                                                        <div className="flex gap-2 items-center">
                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value) document.getElementById(`celeb-${bookKey}`).value = e.target.value;
                                                                }}
                                                                className="w-28 bg-black/60 border border-white/10 rounded-xl px-2 py-2 text-[10px] text-slate-300 focus:border-gold outline-none shadow-inner shrink-0"
                                                            >
                                                                <option value="">▼ 선택 ▼</option>
                                                                {CELEB_LIST.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                                                            </select>
                                                            <input
                                                                id={`celeb-${bookKey}`}
                                                                type="text"
                                                                defaultValue={book.celebName || book.celebrity || ''}
                                                                placeholder="직접 입력"
                                                                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-slate-300 focus:border-gold outline-none shadow-inner min-w-0"
                                                            />
                                                            <button onClick={() => {
                                                                const val = document.getElementById(`celeb-${bookKey}`).value;
                                                                handleUpdateBookField(bookKey, 'celebrity', val);
                                                            }} className="px-4 py-2 bg-gold text-primary font-black rounded-xl hover:bg-white transition-colors text-[10px] shrink-0">수정</button>
                                                        </div>
                                                    </div>


                                                    {/* 도서 상세 설명 (구글 검색 연동) */}
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] ml-2">Description / Info</label>
                                                        <div className="relative group/desc">
                                                            <textarea
                                                                id={`desc-${bookKey}`}
                                                                defaultValue={book.description || ''}
                                                                placeholder="구글 북 검색을 통해 정보를 가져올 수 있습니다."
                                                                className="w-full h-32 bg-black/60 border border-white/10 rounded-2xl px-4 py-4 text-xs text-slate-300 focus:border-gold outline-none shadow-inner leading-relaxed resize-none"
                                                            ></textarea>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleCrawlBookInfo(book.title, book.author, bookKey)}
                                                                disabled={isCrawling}
                                                                className="flex-[1.5] bg-emerald-500/20 border border-emerald-500/30 py-2.5 rounded-xl text-[10px] font-black text-emerald-400 hover:bg-emerald-500/40 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <span className={`material-symbols-outlined text-sm ${isCrawling ? 'animate-spin' : ''}`}>
                                                                    {isCrawling ? 'sync' : 'language'}
                                                                </span>
                                                                {isCrawling ? '크롤링 중...' : '교보 정보 가져오기'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setExternalSearchQuery(book.title);
                                                                    handleGoogleBooksSearch();
                                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                    alert('페이지 상단의 글로벌 검색 결과를 확인하세요.');
                                                                }}
                                                                className="flex-1 bg-white/5 border border-white/10 py-2.5 rounded-xl text-[10px] font-black text-slate-400 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">search</span>
                                                                구글 검색
                                                            </button>
                                                            <button
                                                                onClick={() => handleAnalyzeBook(book.title, book.author, bookKey)}
                                                                disabled={isAnalyzing}
                                                                className="flex-1 bg-violet-500/20 border border-violet-500/30 py-2.5 rounded-xl text-[10px] font-black text-violet-400 hover:bg-violet-500/40 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <span className={`material-symbols-outlined text-sm ${isAnalyzing ? 'animate-spin' : ''}`}>
                                                                    {isAnalyzing ? 'sync' : 'psychology'}
                                                                </span>
                                                                {isAnalyzing ? '분석 중...' : '제미나이 심층 분석'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const val = document.getElementById(`desc-${bookKey}`).value;
                                                                    handleUpdateBookField(bookKey, 'description', val);
                                                                }}
                                                                className="px-5 bg-gold text-primary font-black rounded-xl hover:bg-white transition-colors text-xs shrink-0"
                                                            >
                                                                설정 저장
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* AI 대본 생성 바로가기 */}
                                                    <button
                                                        onClick={() => {
                                                            setScriptForm(prev => ({
                                                                ...prev,
                                                                bookId: bookKey,
                                                                title: book.title || '',
                                                                author: book.author || '',
                                                                themes: book.description || '',
                                                            }));
                                                            setActiveTab('script');
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-black text-xs uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <span className="material-symbols-outlined text-base">draw</span>
                                                        AI 대본 생성 (자동 설명 참조)
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* ── AI 대본 생성 탭 ────────────────────────────────────── */}
                    {activeTab === 'script' && (
                        <div className="space-y-10 animate-fade-in">
                            {/* 헤더 */}
                            <div className="bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/20 rounded-[28px] p-10">
                                <div className="flex items-center gap-5 mb-4">
                                    <div className="size-14 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
                                        <span className="material-symbols-outlined text-emerald-400 text-3xl">draw</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-3">
                                                <h3 className="text-white font-black text-4xl italic tracking-tighter uppercase flex items-center gap-4">
                                                    AI 대본 생성
                                                    <span className="bg-red-500 text-white text-[10px] px-3 py-1 rounded-full not-italic animate-pulse">LATEST VERSION v2.5</span>
                                                </h3>
                                                <p className="text-slate-500 text-xl font-medium italic">Claude Sonnet 4.5를 이용해 매끄럽고 유쾌한 팟캐스트 시나리오를 자동 생성합니다.</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={handleDeleteScript}
                                                    className="px-10 py-5 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 font-black text-sm flex items-center gap-3 hover:bg-red-500 hover:text-white transition-all shadow-xl"
                                                >
                                                    <span className="material-symbols-outlined font-black">delete_sweep</span>
                                                    기존 대본 삭제 (Delete)
                                                </button>
                                                <button
                                                    onClick={handleSaveScript}
                                                    className="px-10 py-5 rounded-2xl bg-gold text-primary font-black text-sm flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(212,175,55,0.3)]"
                                                >
                                                    <span className="material-symbols-outlined font-black">save</span>
                                                    수정 내용 저장 (Save Script)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                {/* LEFT — 입력 폼 */}
                                <div className="space-y-6">
                                    <div className="bg-white/3 border border-white/8 rounded-[24px] p-8 space-y-5">
                                        <p className="text-emerald-400 text-xs font-black uppercase tracking-widest">STEP 1 · API 키 입력</p>
                                        <div className="space-y-2">
                                            <label className="text-slate-400 text-xs font-bold uppercase">Claude API Key</label>
                                            <input
                                                type="password"
                                                value={scriptApiKey}
                                                onChange={e => { setScriptApiKey(e.target.value); localStorage.setItem('scriptApiKey', e.target.value); }}
                                                placeholder="sk-ant-..."
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 font-mono"
                                            />
                                            <p className="text-slate-600 text-xs">한번 입력하면 브라우저에 저장됩니다.</p>
                                        </div>

                                        <p className="text-emerald-400 text-xs font-black uppercase tracking-widest pt-2">STEP 2 · 책 정보 입력</p>

                                        <div className="space-y-2">
                                            <label className="text-slate-400 text-xs font-bold uppercase">기존 도서에서 선택</label>
                                            <select
                                                value={scriptForm.bookId}
                                                onChange={async e => {
                                                    const selected = getAllBooks(true).find(b => b.id === e.target.value);
                                                    setExistingScript(null);
                                                    if (selected) {
                                                        const themeMatches = (selected.review || '').match(/■\s*핵심\s*주제\s*\d+[^:：]*[:：]\s*([^\n]+)/g);
                                                        const themes = themeMatches
                                                            ? themeMatches.map(m => m.replace(/■\s*핵심\s*주제\s*\d+[^:：]*[:：]\s*/, '').trim()).join('\n')
                                                            : (selected.desc || '');
                                                        setScriptForm(p => ({
                                                            ...p,
                                                            bookId: selected.id,
                                                            title: selected.title || '',
                                                            author: selected.author || '',
                                                            themes: selected.description || themes,
                                                        }));
                                                        // 로컬 bookScripts 먼저 확인
                                                        if (bookScripts[selected.id] && bookScripts[selected.id].length > 0) {
                                                            setExistingScript(bookScripts[selected.id]);
                                                        } else {
                                                            // Firestore scripts 확인
                                                            try {
                                                                const snap = await getDoc(doc(db, 'scripts', selected.id));
                                                                if (snap.exists()) {
                                                                    const data = snap.data();
                                                                    const script = data.script || data.lines || data.content || null;
                                                                    if (script && Array.isArray(script) && script.length > 0) {
                                                                        setExistingScript(script);
                                                                    }
                                                                }
                                                            } catch (e) { /* 무시 */ }
                                                        }
                                                    }
                                                }}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50"
                                            >
                                                <option value="">— 도서를 선택하세요 —</option>
                                                {getAllBooks(true).map(b => (
                                                    <option key={b.id} value={b.id}>{b.title} · {b.author}</option>
                                                ))}
                                            </select>
                                            {/* 기존 대본 존재 알림 */}
                                            {existingScript && (
                                                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                                                        <span className="text-emerald-400 text-xs font-bold">기존 대본 있음 ({existingScript.length}턴)</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleDeleteScript}
                                                            className="text-xs font-black text-red-300 bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-all"
                                                        >
                                                            삭제
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const sA = scriptForm.speakerA || '제임스';
                                                                const sB = scriptForm.speakerB || '스텔라';
                                                                const converted = existingScript.map(line => ({
                                                                    speaker: line.speaker || (line.role === 'A' ? sA : sB),
                                                                    text: line.text,
                                                                }));
                                                                setGeneratedScript(converted);
                                                                setScriptLogs([`📂 기존 대본 불러옴 (${converted.length}턴)`]);
                                                            }}
                                                            className="text-xs font-black text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg transition-all"
                                                        >
                                                            불러오기
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            <p className="text-slate-600 text-xs">선택하면 아래 항목이 자동 입력됩니다.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-slate-400 text-xs font-bold uppercase">Book ID *</label>
                                                <input
                                                    value={scriptForm.bookId}
                                                    onChange={e => setScriptForm(p => ({ ...p, bookId: e.target.value }))}
                                                    placeholder="예: the-one-thing"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-slate-400 text-sm outline-none focus:border-emerald-500/50 font-mono"
                                                    readOnly
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-slate-400 text-xs font-bold uppercase">저자 *</label>
                                                <input
                                                    value={scriptForm.author}
                                                    onChange={e => setScriptForm(p => ({ ...p, author: e.target.value }))}
                                                    placeholder="예: 게리 켈러"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-slate-400 text-xs font-bold uppercase">책 제목 *</label>
                                            <input
                                                value={scriptForm.title}
                                                onChange={e => setScriptForm(p => ({ ...p, title: e.target.value }))}
                                                placeholder="예: 원씽 (The ONE Thing)"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-slate-400 text-xs font-bold uppercase">핵심 주제 / 다룰 내용 (줄바꿈으로 구분)</label>
                                            <textarea
                                                value={scriptForm.themes}
                                                onChange={e => setScriptForm(p => ({ ...p, themes: e.target.value }))}
                                                rows={5}
                                                placeholder={"예:\n멀티태스킹은 신화다\n도미노 효과 - 하나가 연쇄 반응\n의지력은 근육처럼 소모된다\nTime Blocking - 하루 4시간 성역"}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 resize-none font-mono"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-slate-400 text-xs font-bold uppercase">화자 A (남성)</label>
                                                <input
                                                    value={scriptForm.speakerA}
                                                    onChange={e => setScriptForm(p => ({ ...p, speakerA: e.target.value }))}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-slate-400 text-xs font-bold uppercase">화자 B (여성)</label>
                                                <input
                                                    value={scriptForm.speakerB}
                                                    onChange={e => setScriptForm(p => ({ ...p, speakerB: e.target.value }))}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-slate-400 text-xs font-bold uppercase">최소 글자</label>
                                                <input type="number"
                                                    value={scriptForm.targetMin}
                                                    onChange={e => setScriptForm(p => ({ ...p, targetMin: Number(e.target.value) }))}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-slate-400 text-xs font-bold uppercase">최대 글자</label>
                                                <input type="number"
                                                    value={scriptForm.targetMax}
                                                    onChange={e => setScriptForm(p => ({ ...p, targetMax: Number(e.target.value) }))}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-slate-400 text-xs font-bold uppercase">최대 턴 수</label>
                                                <input type="number"
                                                    value={scriptForm.turnLimit}
                                                    onChange={e => setScriptForm(p => ({ ...p, turnLimit: Number(e.target.value) }))}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleGenerateScript}
                                            disabled={isGeneratingScript}
                                            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all ${isGeneratingScript ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-emerald-500/20'}`}
                                        >
                                            {isGeneratingScript
                                                ? <><span className="material-symbols-outlined animate-spin text-2xl">settings_accent</span> GENERATING ({scriptProgress}%)</>
                                                : <><span className="material-symbols-outlined text-2xl">auto_awesome</span> GENERATE SCRIPT</>
                                            }
                                        </button>
                                    </div>

                                    {/* 진행 로그 */}
                                    {scriptLogs.length > 0 && (
                                        <div className="bg-black/60 border border-white/8 rounded-[20px] p-6">
                                            <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-3">GENERATION LOG</p>
                                            {scriptProgress > 0 && scriptProgress < 100 && (
                                                <div className="w-full bg-white/5 rounded-full h-1.5 mb-4">
                                                    <div className="h-1.5 bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${scriptProgress}%` }} />
                                                </div>
                                            )}
                                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                                {scriptLogs.map((log, i) => (
                                                    <p key={i} className={`text-xs font-mono ${log.includes('❌') ? 'text-red-400' : log.includes('✨') ? 'text-emerald-400' : 'text-slate-400'}`}>{log}</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT — 대본 미리보기 + 다운로드 */}
                                <div className="space-y-6">
                                    <div className="bg-white/3 border border-white/8 rounded-[24px] p-8">
                                        <div className="flex items-center justify-between mb-5">
                                            <p className="text-emerald-400 text-xs font-black uppercase tracking-widest">STEP 3 · 대본 미리보기</p>
                                            {generatedScript.length > 0 && (
                                                <span className="text-slate-500 text-xs">{generatedScript.length}턴 · {generatedScript.reduce((s, t) => s + t.text.replace(/[\s\uFEFF\xA0]/g, '').length, 0).toLocaleString()}자</span>
                                            )}
                                        </div>

                                        {generatedScript.length === 0 ? (
                                            <div className="h-64 flex items-center justify-center text-slate-600 text-sm">
                                                대본을 생성하면 여기에 미리보기가 표시됩니다.
                                            </div>
                                        ) : (
                                            <div className="space-y-6 max-h-[650px] overflow-y-auto px-1 relative">
                                                {/* Edit Controls Toolbar */}
                                                <div className="sticky top-0 z-[110] flex gap-3 justify-end pb-4 bg-slate-950 px-2 pt-2 mb-2 border-b-2 border-emerald-500/30">
                                                    <div className="mr-auto flex items-center gap-3">
                                                        <div className="size-3 rounded-full bg-red-500 animate-ping"></div>
                                                        <span className="text-[11px] text-white font-black tracking-widest uppercase">System: Editor Active v2.5</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setIsScriptEditorOpen(true)}
                                                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600/20 text-emerald-400 border-2 border-emerald-500/30 text-[11px] font-black rounded-xl hover:bg-emerald-500 hover:text-white transition-all uppercase"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">edit_note</span>
                                                        전체 대사 대량 편집 (Modal)
                                                    </button>
                                                    <button
                                                        onClick={handleSaveScript}
                                                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-gold to-yellow-500 text-primary text-[11px] font-black rounded-xl shadow-[0_10px_40px_rgba(212,175,55,0.3)] hover:scale-105 active:scale-95 transition-all uppercase"
                                                    >
                                                        <span className="material-symbols-outlined text-sm font-black">done_all</span>
                                                        수정 완료 및 저장 (APPLY)
                                                    </button>
                                                </div>

                                                <div className="p-5 bg-emerald-500/10 rounded-2xl border-2 border-emerald-500/20 mb-8 flex items-center gap-5 animate-bounce-slow">
                                                    <div className="size-12 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                                                        <span className="material-symbols-outlined text-white text-2xl">touch_app</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h5 className="text-emerald-400 font-black text-sm uppercase tracking-tight">수정하시려면 대사를 바로 클릭하세요!</h5>
                                                        <p className="text-emerald-500/70 text-[10px] font-medium leading-relaxed uppercase tracking-widest">말풍선 안의 글자를 클릭하면 입력창으로 바뀝니다. 수정 후 상단의 '수정 완료'를 눌러주세요.</p>
                                                    </div>
                                                </div>

                                                {/* Script Bubble List */}
                                                <div className="space-y-4">
                                                    {generatedScript.map((line, i) => (
                                                        <div key={i} className={`flex gap-3 ${line.speaker === (scriptForm.speakerA || 'James') ? '' : 'flex-row-reverse'}`}>
                                                            <div className={`size-10 rounded-2xl flex items-center justify-center text-xs font-black flex-shrink-0 shadow-lg ${line.speaker === (scriptForm.speakerA || 'James') ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'bg-pink-600/20 text-pink-400 border border-pink-500/20'}`}>
                                                                {line.speaker?.[0] ?? '?'}
                                                            </div>
                                                            <div className={`flex-1 overflow-hidden rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-all shadow-xl bg-[#1e2228] ${line.speaker === (scriptForm.speakerA || 'James') ? 'rounded-tl-none' : 'rounded-tr-none'}`}>
                                                                <div className={`px-4 py-2 flex justify-between items-center border-b border-white/5 ${line.speaker === (scriptForm.speakerA || 'James') ? 'bg-blue-500/5' : 'bg-pink-500/5'}`}>
                                                                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${line.speaker === (scriptForm.speakerA || 'James') ? 'text-blue-400' : 'text-pink-400'}`}>{line.speaker}</span>
                                                                    <span className="text-[9px] text-slate-700 font-mono">STEP {i + 1}</span>
                                                                </div>
                                                                <textarea
                                                                    className="w-full bg-transparent text-slate-200 text-sm leading-relaxed outline-none resize-none p-5 transition-all min-h-[5.5em] block focus:bg-white/5"
                                                                    value={line.text}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setGeneratedScript(prev => {
                                                                            const next = [...prev];
                                                                            next[i] = { ...next[i], text: val };
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    onFocus={(e) => {
                                                                        e.target.style.height = 'auto';
                                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                                    }}
                                                                    onInput={(e) => {
                                                                        e.target.style.height = 'auto';
                                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                                    }}
                                                                    rows={1}
                                                                    placeholder="수정할 대사를 입력하세요..."
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── [🆕 대본 전체 편집 모달] ────────────────────────── */}
                                        {isScriptEditorOpen && (
                                            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fade-in">
                                                <div className="bg-[#1a1d23] border border-white/10 w-full max-w-4xl h-[85vh] rounded-[48px] flex flex-col overflow-hidden shadow-2xl">
                                                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                                        <div>
                                                            <h4 className="text-white font-black text-2xl uppercase tracking-tight">Script Master Editor</h4>
                                                            <p className="text-slate-500 text-xs font-bold mt-1">각 대사의 텍스트를 자유롭게 수정하세요. (턴 수: {generatedScript.length})</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setIsScriptEditorOpen(false)}
                                                            className="size-12 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined">close</span>
                                                        </button>
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-black/20">
                                                        {generatedScript.map((line, idx) => (
                                                            <div key={idx} className="flex gap-4 group">
                                                                <div className="w-20 shrink-0 text-right space-y-1 pt-3">
                                                                    <p className={`text-[10px] font-black uppercase ${line.speaker === scriptForm.speakerA ? 'text-blue-400' : 'text-pink-400'}`}>{line.speaker}</p>
                                                                    <p className="text-[9px] text-slate-700 font-mono italic">LINE #{idx + 1}</p>
                                                                </div>
                                                                <textarea
                                                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-slate-200 text-sm leading-relaxed focus:border-emerald-500 focus:bg-white/10 outline-none transition-all min-h-[80px]"
                                                                    value={line.text}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setGeneratedScript(prev => {
                                                                            const next = [...prev];
                                                                            next[idx] = { ...next[idx], text: val };
                                                                            return next;
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="p-8 border-t border-white/5 bg-[#1a1d23] flex justify-end gap-4">
                                                        <button
                                                            onClick={() => setIsScriptEditorOpen(false)}
                                                            className="px-8 py-4 rounded-xl text-slate-400 font-black text-sm hover:text-white transition-all"
                                                        >
                                                            닫기
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setIsScriptEditorOpen(false);
                                                                alert('편집 내용이 반영되었습니다. [Firestore 저장]을 눌러 영구 저장하세요.');
                                                            }}
                                                            className="px-8 py-4 bg-emerald-500 text-white font-black text-sm rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                                                        >
                                                            편집 완료
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 다운로드 + TTS 버튼 */}
                                    {generatedScript.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={handleScriptDownloadTXT}
                                                    className="py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-xl">description</span>
                                                    TXT 다운로드
                                                </button>
                                                <button
                                                    onClick={handleSaveScript}
                                                    disabled={isLoadingScript}
                                                    className="py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-black text-sm uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-xl">{isLoadingScript ? 'sync' : 'save'}</span>
                                                    {isLoadingScript ? '저장 중...' : 'Firestore 저장'}
                                                </button>
                                            </div>

                                            {/* TTS 모델 선택 + 변환 버튼 */}
                                            <div className="flex bg-black/40 p-1 rounded-xl gap-1">
                                                <button
                                                    onClick={() => setTtsModel('pro')}
                                                    className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${ttsModel === 'pro' ? 'bg-violet-500/30 text-violet-300' : 'text-slate-600 hover:text-slate-400'}`}
                                                >
                                                    2.5 Pro
                                                </button>
                                                <button
                                                    onClick={() => setTtsModel('flash')}
                                                    className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${ttsModel === 'flash' ? 'bg-emerald-500/30 text-emerald-300' : 'text-slate-600 hover:text-slate-400'}`}
                                                >
                                                    2.5 Flash
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleRunTts}
                                                    disabled={isTtsRunning}
                                                    className={`flex-1 py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isTtsRunning ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : ttsModel === 'pro' ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30' : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30'}`}
                                                >
                                                    <span className="material-symbols-outlined text-xl">{isTtsRunning ? 'sync' : 'record_voice_over'}</span>
                                                    {isTtsRunning ? `TTS 변환 중... (${ttsProgress}%)` : `🎙️ TTS 변환 → WAV`}
                                                </button>
                                                <button
                                                    onClick={handleClearTtsCache}
                                                    className="px-6 py-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center"
                                                    title="TTS 캐시 초기화"
                                                >
                                                    <span className="material-symbols-outlined text-xl">delete_sweep</span>
                                                </button>
                                            </div>

                                            {/* 이어받기 버튼 */}
                                            {failedBatches.length > 0 && !isTtsRunning && (
                                                <button
                                                    onClick={handleRunTts}
                                                    className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-xl">replay</span>
                                                    이어받기 — 실패 배치 {failedBatches.join(', ')} 재시도
                                                </button>
                                            )}

                                            {/* 인트로/아웃트로 병합 → MP3 */}
                                            <div className="bg-black/40 border border-white/8 rounded-2xl p-4 space-y-3">
                                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">인트로 + 메인 + 아웃트로 → MP3 병합</p>
                                                {[
                                                    { label: '인트로 (선택)', file: mergeIntroFile, setter: setMergeIntroFile },
                                                    { label: '메인 WAV *', file: mergeMainFile, setter: setMergeMainFile },
                                                    { label: '아웃트로 (선택)', file: mergeOutroFile, setter: setMergeOutroFile },
                                                ].map(({ label, file, setter }) => (
                                                    <label key={label} className="flex items-center gap-3 cursor-pointer bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 hover:border-white/20 transition-all">
                                                        <span className="material-symbols-outlined text-slate-500 text-base">audio_file</span>
                                                        <span className="text-xs text-slate-500 w-28 shrink-0">{label}</span>
                                                        <span className="text-xs text-slate-300 flex-1 truncate">{file ? file.name : '파일 선택'}</span>
                                                        <input type="file" accept="audio/*" className="hidden" onChange={e => setter(e.target.files[0] || null)} />
                                                    </label>
                                                ))}
                                                <button
                                                    onClick={handleMerge}
                                                    disabled={merging || !mergeMainFile}
                                                    className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${merging || !mergeMainFile ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30'}`}
                                                >
                                                    <span className="material-symbols-outlined text-base">{merging ? 'sync' : 'merge'}</span>
                                                    {merging ? '병합 중...' : '병합 → MP3 다운로드'}
                                                </button>
                                                {mergeLog && (
                                                    <p className={`text-xs font-mono leading-relaxed ${mergeLog.includes('❌') ? 'text-red-400' : mergeLog.includes('✅') ? 'text-emerald-400' : 'text-slate-400'}`}>{mergeLog}</p>
                                                )}
                                            </div>

                                            {/* 오디오 파일 → 팟캐스트 등록 */}
                                            <div className="bg-black/40 border border-white/8 rounded-2xl p-4 space-y-3">
                                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">오디오 파일 → 팟캐스트 등록</p>
                                                <p className="text-xs text-slate-500">파일을 <span className="text-emerald-400 font-mono">public/audio/</span> 폴더에 복사 후 파일명 입력</p>
                                                <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                                                    <span className="text-slate-500 text-xs font-mono">/audio/</span>
                                                    <input
                                                        type="text"
                                                        value={wavFileName}
                                                        onChange={e => { setWavFileName(e.target.value); setWavUploadLog(''); }}
                                                        placeholder={`${scriptForm.bookId || 'bookId'}.wav`}
                                                        className="bg-transparent text-sm text-white flex-1 outline-none placeholder-slate-600 font-mono"
                                                    />
                                                </div>
                                                {(wavFileName.trim() || scriptForm.bookId) && (
                                                    <audio controls src={`/audio/${wavFileName.trim() || `${scriptForm.bookId}.wav`}`} className="w-full rounded-xl" />
                                                )}
                                                <button
                                                    onClick={handleWavUpload}
                                                    disabled={wavUploading}
                                                    className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${wavUploading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30'}`}
                                                >
                                                    <span className="material-symbols-outlined text-base">{wavUploading ? 'sync' : 'check_circle'}</span>
                                                    {wavUploading ? '저장 중...' : '팟캐스트 활성화'}
                                                </button>
                                                {wavUploadLog && (
                                                    <p className={`text-xs font-mono ${wavUploadLog.includes('❌') ? 'text-red-400' : wavUploadLog.includes('✅') ? 'text-emerald-400' : 'text-slate-400'}`}>{wavUploadLog}</p>
                                                )}
                                            </div>

                                            {/* TTS 로그 */}
                                            {ttsLogs.length > 0 && (
                                                <div ref={ttsLogContainerRef} className="bg-black/60 border border-white/8 rounded-[20px] p-4 space-y-1 max-h-40 overflow-y-auto">
                                                    {ttsLogs.map((log, i) => (
                                                        <p key={i} className={`text-xs font-mono ${log.includes('❌') ? 'text-red-400' : log.includes('🎉') || log.includes('✅') ? 'text-emerald-400' : 'text-slate-400'}`}>{log}</p>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 할당량 확인 */}
                                            <button
                                                onClick={handleCheckQuota}
                                                disabled={isCheckingQuota}
                                                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${isCheckingQuota ? 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed' : 'bg-white/3 border-white/10 text-slate-400 hover:bg-white/8 hover:text-white'}`}
                                            >
                                                <span className="material-symbols-outlined text-base">{isCheckingQuota ? 'sync' : 'monitor_heart'}</span>
                                                {isCheckingQuota ? '할당량 확인 중...' : 'API 키 할당량 확인'}
                                            </button>

                                            {quotaResults.length > 0 && (
                                                <div className="bg-black/60 border border-white/8 rounded-[20px] overflow-hidden">
                                                    <div className="grid grid-cols-3 text-[10px] font-black uppercase tracking-widest text-slate-600 px-4 py-2 border-b border-white/5">
                                                        <span>키</span>
                                                        <span className="text-center text-violet-500">Pro</span>
                                                        <span className="text-center text-emerald-600">Flash</span>
                                                    </div>
                                                    {quotaResults.map((r, i) => {
                                                        const badge = (status) => {
                                                            if (status === 'ok') return <span className="text-emerald-400 font-black text-[10px]">✅ 가능</span>;
                                                            if (status === 'over') return <span className="text-red-400 font-black text-[10px]">❌ 소진</span>;
                                                            if (status === 'none') return <span className="text-slate-600 text-[10px]">미지원</span>;
                                                            if (status === '...') return <span className="text-slate-600 text-[10px] animate-pulse">...</span>;
                                                            return <span className="text-amber-400 text-[10px]">⚠️ {status}</span>;
                                                        };
                                                        return (
                                                            <div key={i} className="grid grid-cols-3 px-4 py-2 border-b border-white/3 last:border-0 items-center">
                                                                <span className="text-slate-400 text-xs font-mono">{r.name}</span>
                                                                <span className="text-center">{badge(r.pro)}</span>
                                                                <span className="text-center">{badge(r.flash)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Podcast Mode - PC Dual Panel */}
                    {activeTab === 'podcast' && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 animate-fade-in items-start">
                            <div className="space-y-12">
                                {registrationUI}
                                <div className="bg-black rounded-[48px] border-4 border-white/5 overflow-hidden flex flex-col h-[600px] shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
                                    <div className="bg-white/5 px-10 py-6 border-b border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="size-3 rounded-full bg-red-500"></div>
                                            <div className="size-3 rounded-full bg-amber-500"></div>
                                            <div className="size-3 rounded-full bg-emerald-500"></div>
                                            <span className="text-xs font-black font-mono text-slate-400 uppercase tracking-[0.4em] ml-4">System Core Log v4.0</span>
                                        </div>
                                        <span className="text-[10px] text-slate-600 font-mono">ENCRYPTED UPLINK: ACTIVE</span>
                                    </div>
                                    <div className="p-10 font-mono text-sm text-emerald-400 overflow-y-auto space-y-4 flex-1 scrollbar-hide bg-[#050505]">
                                        {logs.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-800 space-y-4">
                                                <span className="material-symbols-outlined text-6xl animate-pulse">terminal</span>
                                                <p className="text-sm font-black uppercase tracking-widest">Waiting for Engine Initialization...</p>
                                            </div>
                                        ) : (
                                            logs.map((log, i) => (
                                                <div key={i} className="animate-fade-in-shorter border-l-4 border-emerald-500/30 pl-6 py-1">
                                                    <span className="text-emerald-900 mr-4">[{i + 1}]</span>
                                                    {log}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-16 rounded-[64px] space-y-12 h-fit sticky top-32 shadow-3xl backdrop-blur-3xl">
                                <div className="space-y-4">
                                    <div className="inline-block px-4 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-[10px] font-black uppercase tracking-widest">Advanced AI Engine</div>
                                    <h3 className="text-white font-black text-6xl italic flex items-center gap-6 tracking-tighter leading-none">
                                        PODCAST<br />FACTORY
                                    </h3>
                                    <p className="text-slate-500 text-lg font-medium max-w-md">인공지능 제임스와 스텔라의 고품격 대담을 생성합니다. 도서를 선택하고 공정을 시작하세요.</p>
                                </div>
                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <label className="text-xs text-slate-400 font-black uppercase tracking-widest ml-2">Master Source Selector</label>
                                        <select
                                            value={selectedBookId}
                                            onChange={e => setSelectedBookId(e.target.value)}
                                            className="w-full bg-black/60 border-2 border-white/10 rounded-[24px] px-8 py-6 text-xl text-white focus:border-gold outline-none transition-all shadow-inner font-black appearance-none cursor-pointer"
                                        >
                                            <option value="">SELECT SOURCE 도서</option>
                                            {realBooks.map(b => (
                                                <option key={b.id || b.title} value={b.id || b.title}>{b.title.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <button onClick={handleGenerateText} disabled={isGeneratingText} className={`py-6 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-4 border-2 ${isGeneratingText ? 'bg-slate-800 text-slate-500 border-white/5' : 'bg-gold text-primary border-gold hover:bg-white hover:border-white active:scale-95 shadow-xl'}`}>
                                            <span className="material-symbols-outlined text-2xl">{isGeneratingText ? 'sync' : 'psychology'}</span>
                                            {isGeneratingText ? 'GENERATING...' : 'AI SCRIPT GEN'}
                                        </button>
                                        <button onClick={handleDownloadTxt} className="py-6 bg-white/5 text-slate-300 border-2 border-white/10 rounded-2xl text-sm font-black hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-widest">
                                            <span className="material-symbols-outlined text-2xl">download</span>
                                            Download .TXT
                                        </button>
                                    </div>

                                    <div className="flex bg-black/60 p-2 rounded-2xl gap-3">
                                        <button onClick={() => setInputMode('text')} className={`flex-1 py-4 text-xs font-black rounded-xl transition-all ${inputMode === 'text' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>MANUAL EDITOR</button>
                                        <button onClick={() => setInputMode('file')} className={`flex-1 py-4 text-xs font-black rounded-xl transition-all ${inputMode === 'file' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>FILE UPLINK</button>
                                    </div>

                                    {inputMode === 'text' ? (
                                        <textarea value={manualContent} onChange={e => setManualContent(e.target.value)} placeholder="분석할 도서의 텍스트나 핵심 내용을 여기에 붙여넣으세요..." className="w-full h-80 bg-black/60 border-2 border-white/10 rounded-[32px] px-8 py-8 text-base text-white focus:border-gold outline-none transition-all resize-none font-mono leading-relaxed shadow-inner" />
                                    ) : (
                                        <div className="bg-black/60 border-4 border-dashed border-white/5 rounded-[32px] p-20 flex flex-col items-center justify-center gap-6 group hover:border-gold/50 transition-all cursor-pointer">
                                            <span className="material-symbols-outlined text-8xl text-slate-800 group-hover:text-gold transition-colors">upload_file</span>
                                            <input type="file" accept=".txt" onChange={e => setUploadFile(e.target.files[0])} className="text-sm text-slate-600 font-black font-mono tracking-tighter" />
                                            <p className="text-slate-700 font-bold uppercase text-xs">Drop source TXT file here</p>
                                        </div>
                                    )}

                                    <button onClick={handleGeneratePodcast} disabled={isGenerating} className={`w-full py-8 rounded-[32px] font-black text-2xl flex items-center justify-center gap-6 shadow-[0_30px_60px_rgba(212,175,55,0.2)] transition-all ${isGenerating ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-gold text-primary hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_40px_80px_rgba(212,175,55,0.3)]'}`}>
                                        {isGenerating ? (<><span className="material-symbols-outlined animate-spin text-4xl">settings_accent</span> MANUFACTURING ({podcastProgress}%)</>) : (<><span className="material-symbols-outlined text-4xl">rocket_launch</span> EXECUTE PRODUCTION</>)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── 성우 다이렉트 탭 ─────────────────────────────────── */}
                    {activeTab === 'voice' && (
                        <div className="space-y-10 animate-fade-in">
                            {/* 헤더 */}
                            <div className="flex justify-between items-end">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                                        <div className="size-2 rounded-full bg-violet-400 animate-ping"></div>
                                        <span className="text-violet-400 text-[10px] font-black uppercase tracking-widest">Voice Actor Direct Studio</span>
                                    </div>
                                    <h3 className="text-white font-black text-5xl italic tracking-tighter uppercase">성우 다이렉트</h3>
                                    <p className="text-slate-500 text-lg font-medium">AI TTS와 병행 · 성우가 직접 녹음한 MP3로 고품질 팟캐스트를 제작합니다</p>
                                </div>
                            </div>

                            {/* 도서별 트랙 현황 */}
                            <div className="bg-white/5 rounded-[40px] border border-white/10 p-8">
                                <h4 className="text-white font-black text-lg mb-6 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-gold">bar_chart</span>
                                    도서별 오디오 트랙 현황
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-3 max-h-52 overflow-y-auto scrollbar-hide pr-1">
                                    {trackStatus.slice(0, 40).map(book => (
                                        <div key={book.id} className="flex items-center justify-between bg-black/40 rounded-2xl px-4 py-3 border border-white/5 gap-2">
                                            <span className="text-xs text-slate-300 font-bold truncate flex-1">{book.title}</span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span title="AI TTS" className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${book.hasAI ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-white/5 text-slate-700 border-white/5'}`}>AI</span>
                                                <span title="성우" className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${book.hasVoice ? 'bg-violet-500/15 text-violet-400 border-violet-500/25' : 'bg-white/5 text-slate-700 border-white/5'}`}>성우</span>
                                            </div>
                                        </div>
                                    ))}
                                    {trackStatus.length === 0 && (
                                        <div className="col-span-full text-center text-slate-700 text-sm py-8">등록된 도서가 없습니다</div>
                                    )}
                                </div>
                            </div>

                            {/* 메인 2컬럼 */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">

                                {/* LEFT — 도서 선택 + 대본 미리보기 */}
                                <div className="space-y-6">
                                    {/* 도서 선택 */}
                                    <div className="bg-white/5 rounded-[40px] border border-white/10 p-8 space-y-5">
                                        <h4 className="text-white font-black text-xl flex items-center gap-3">
                                            <span className="material-symbols-outlined text-violet-400">auto_stories</span>
                                            STEP 1 · 도서 선택
                                        </h4>
                                        <select
                                            value={voiceBook}
                                            onChange={e => { setVoiceBook(e.target.value); setVoiceLogs([]); setVoiceProgress(0); }}
                                            className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-6 py-5 text-lg text-white focus:border-violet-400 outline-none transition-all font-black appearance-none cursor-pointer"
                                        >
                                            <option value="">도서를 선택하세요</option>
                                            {realBooks.map(b => {
                                                const bid = b.id || b.title;
                                                const hasLocal = !!bookScripts[bid];
                                                const hasFirestore = !hasLocal && firestoreScript.length > 0 && voiceBook === bid;
                                                return (
                                                    <option key={bid} value={bid}>
                                                        {b.title} {hasLocal ? '📄' : hasFirestore ? '☁️' : '⚠️'}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {voiceBook && !voiceScript.length && (
                                            <p className="text-amber-400 text-xs font-bold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-base">warning</span>
                                                이 도서의 대본이 아직 없습니다. 팟캐스트 탭에서 먼저 대본을 생성하세요.
                                            </p>
                                        )}
                                        {voiceScript.length > 0 && (
                                            <div className="flex items-center justify-between p-4 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-violet-400">check_circle</span>
                                                    <div>
                                                        <p className="text-violet-300 text-xs font-black">대본 확인됨</p>
                                                        <p className="text-slate-500 text-[10px]">{voiceScript.length}개 대사 · 제임스 + 스텔라</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleVoiceScriptDownload}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-black rounded-xl border border-violet-500/30 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-base">download</span>
                                                    대본 TXT 다운로드
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* 대본 미리보기 */}
                                    {voiceScript.length > 0 && (
                                        <div className="bg-white/5 rounded-[40px] border border-white/10 overflow-hidden">
                                            <div className="px-8 py-5 border-b border-white/10 flex items-center justify-between">
                                                <h4 className="text-white font-black flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-violet-400">article</span>
                                                    STEP 2 · 대본 미리보기 <span className="text-slate-600 text-sm font-normal ml-2">(성우 참고용)</span>
                                                </h4>
                                                <span className="text-[10px] text-slate-600 font-mono">{voiceScript.length} lines</span>
                                            </div>
                                            <div className="p-6 space-y-3 max-h-[520px] overflow-y-auto scrollbar-hide">
                                                {voiceScript.map((line, i) => (
                                                    <div key={i} className={`flex gap-3 ${line.role === 'A' ? '' : 'flex-row-reverse'}`}>
                                                        <div className={`shrink-0 size-7 rounded-full flex items-center justify-center text-[10px] font-black border ${line.role === 'A' ? 'bg-gold/10 text-gold border-gold/20' : 'bg-violet-500/10 text-violet-400 border-violet-500/20'}`}>
                                                            {line.role === 'A' ? 'J' : 'S'}
                                                        </div>
                                                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${line.role === 'A' ? 'bg-white/5 text-slate-200 rounded-tl-sm' : 'bg-violet-500/10 text-violet-200 rounded-tr-sm'}`}>
                                                            <p className={`text-[9px] font-black mb-1 ${line.role === 'A' ? 'text-gold/60' : 'text-violet-400/60'}`}>
                                                                {line.role === 'A' ? '제임스' : '스텔라'}
                                                            </p>
                                                            {line.text}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT — 업로드 + 설정 + 병합 + 로그 */}
                                <div className="space-y-6 sticky top-32">
                                    {/* MP3 업로드 */}
                                    <div className="bg-white/5 rounded-[40px] border border-white/10 p-8 space-y-5">
                                        <h4 className="text-white font-black text-xl flex items-center gap-3">
                                            <span className="material-symbols-outlined text-violet-400">mic</span>
                                            STEP 3 · 성우 MP3 업로드
                                        </h4>
                                        <div
                                            onDragOver={e => { e.preventDefault(); setVoiceDragOver(true); }}
                                            onDragLeave={() => setVoiceDragOver(false)}
                                            onDrop={handleVoiceDrop}
                                            className={`relative border-4 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${voiceDragOver ? 'border-violet-400 bg-violet-500/10' : voiceFile ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/10 hover:border-violet-400/40 hover:bg-white/5'}`}
                                        >
                                            {voiceFile ? (
                                                <>
                                                    <span className="material-symbols-outlined text-5xl text-violet-400">audio_file</span>
                                                    <p className="text-violet-300 font-black text-sm">{voiceFile.name}</p>
                                                    <p className="text-slate-500 text-xs">{(voiceFile.size / 1024 / 1024).toFixed(1)} MB</p>
                                                    <button onClick={() => setVoiceFile(null)} className="text-slate-600 hover:text-red-400 text-xs font-bold transition-colors">제거</button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-5xl text-slate-700">upload_file</span>
                                                    <p className="text-slate-500 text-sm font-bold">MP3 파일을 여기에 드래그하거나</p>
                                                    <label className="px-6 py-2.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-black rounded-xl border border-violet-500/30 transition-all cursor-pointer">
                                                        파일 선택
                                                        <input type="file" accept="audio/mpeg,audio/mp3,.mp3" className="hidden" onChange={e => {
                                                            const f = e.target.files[0];
                                                            if (f) { setVoiceFile(f); setVoiceLogs(prev => [...prev, `[FILE] ${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB) 로드됨`]); }
                                                        }} />
                                                    </label>
                                                    <p className="text-slate-700 text-[10px]">MP3 형식만 가능</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* 인트로 / 아웃트로 설정 */}
                                    <div className="bg-white/5 rounded-[40px] border border-white/10 p-8 space-y-5">
                                        <h4 className="text-white font-black text-xl flex items-center gap-3">
                                            <span className="material-symbols-outlined text-violet-400">tune</span>
                                            STEP 4 · 인트로 / 아웃트로 설정
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">인트로</p>
                                                {['default', 'none'].map(val => (
                                                    <label key={val} className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${voiceIntro === val ? 'bg-violet-500/10 border-violet-500/30 text-violet-300' : 'bg-black/30 border-white/5 text-slate-500 hover:border-white/20'}`}>
                                                        <input type="radio" name="intro" value={val} checked={voiceIntro === val} onChange={() => setVoiceIntro(val)} className="accent-violet-500" />
                                                        <span className="text-xs font-bold">{val === 'default' ? '기본 인트로' : '인트로 없음'}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">아웃트로</p>
                                                {['default', 'none'].map(val => (
                                                    <label key={val} className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${voiceOutro === val ? 'bg-violet-500/10 border-violet-500/30 text-violet-300' : 'bg-black/30 border-white/5 text-slate-500 hover:border-white/20'}`}>
                                                        <input type="radio" name="outro" value={val} checked={voiceOutro === val} onChange={() => setVoiceOutro(val)} className="accent-violet-500" />
                                                        <span className="text-xs font-bold">{val === 'default' ? '기본 아웃트로' : '아웃트로 없음'}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 병합 실행 버튼 */}
                                    <button
                                        onClick={handleVoiceMerge}
                                        disabled={voiceMerging || !voiceBook || !voiceFile}
                                        className={`w-full py-7 rounded-[32px] font-black text-xl flex items-center justify-center gap-5 transition-all shadow-2xl ${voiceMerging || !voiceBook || !voiceFile
                                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                            : 'bg-violet-600 text-white hover:bg-violet-500 hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_50px_rgba(139,92,246,0.3)]'
                                            }`}
                                    >
                                        {voiceMerging ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
                                                병합 중... {voiceProgress > 0 ? `(${voiceProgress}%)` : ''}
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-3xl">merge</span>
                                                인트로 + 성우 MP3 + 아웃트로 병합 실행
                                            </>
                                        )}
                                    </button>

                                    {/* 진행률 바 */}
                                    {voiceMerging && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                                                <span>병합 진행률</span>
                                                <span>{voiceProgress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${voiceProgress}%` }}></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 실시간 로그 터미널 */}
                                    <div className="bg-black rounded-[40px] border-4 border-white/5 overflow-hidden h-64 flex flex-col shadow-[0_30px_60px_rgba(0,0,0,0.7)]">
                                        <div className="bg-white/5 px-8 py-4 border-b border-white/10 flex items-center gap-3">
                                            <div className="size-2.5 rounded-full bg-red-500"></div>
                                            <div className="size-2.5 rounded-full bg-amber-500"></div>
                                            <div className="size-2.5 rounded-full bg-violet-500"></div>
                                            <span className="text-[10px] font-mono text-slate-600 ml-3 uppercase tracking-widest">Voice Merge Log</span>
                                        </div>
                                        <div className="p-6 font-mono text-xs text-violet-300 overflow-y-auto space-y-3 flex-1 scrollbar-hide bg-[#050505]">
                                            {voiceLogs.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full text-slate-800 space-y-3">
                                                    <span className="material-symbols-outlined text-5xl animate-pulse">mic_none</span>
                                                    <p className="text-xs font-black uppercase tracking-widest">Waiting for voice input...</p>
                                                </div>
                                            ) : voiceLogs.map((log, i) => (
                                                <div key={i} className="border-l-2 border-violet-500/30 pl-4 py-0.5 animate-fade-in">
                                                    <span className="text-violet-900 mr-3">[{i + 1}]</span>
                                                    <span className={log.startsWith('[ERROR]') ? 'text-red-400' : log.startsWith('[FILE]') ? 'text-amber-400' : 'text-violet-300'}>{log}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* MP3 직접 업로드 → 팟캐스트 등록 */}
                                    <div className="bg-black/40 border border-white/8 rounded-2xl p-4 space-y-3">
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">MP3 업로드 → 팟캐스트 등록</p>
                                        <label className="flex items-center gap-3 cursor-pointer bg-black/40 border border-white/10 rounded-xl px-4 py-3 hover:border-white/20 transition-all">
                                            <span className="material-symbols-outlined text-slate-400 text-xl">audio_file</span>
                                            <span className="text-sm text-slate-400 flex-1 truncate">{mp3UploadFile ? mp3UploadFile.name : 'MP3 파일 선택'}</span>
                                            <input type="file" accept=".mp3,audio/mpeg" className="hidden" onChange={e => { setMp3UploadFile(e.target.files[0] || null); setMp3UploadLog(''); }} />
                                        </label>
                                        <button
                                            onClick={handleMp3Upload}
                                            disabled={mp3Uploading || !mp3UploadFile || !voiceBook}
                                            className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mp3Uploading || !mp3UploadFile || !voiceBook ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30'}`}
                                        >
                                            <span className="material-symbols-outlined text-base">{mp3Uploading ? 'sync' : 'cloud_upload'}</span>
                                            {mp3Uploading ? '업로드 중...' : '업로드 & 팟캐스트 활성화'}
                                        </button>
                                        {mp3UploadLog && (
                                            <p className={`text-xs font-mono ${mp3UploadLog.includes('❌') ? 'text-red-400' : mp3UploadLog.includes('✅') ? 'text-emerald-400' : 'text-slate-400'}`}>{mp3UploadLog}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* ─────────────────────────────────────────────────────── */}

                    {/* 인기 아카이뷰 관리 */}
                    {activeTab === 'popular' && (() => {
                        const filteredBooks = popularSearch.trim()
                            ? realBooks.filter(b => b.title?.includes(popularSearch) || b.author?.includes(popularSearch))
                            : [];
                        const savePopular = async () => {
                            if (popularList.length === 0) { alert('등록된 도서가 없습니다.'); return; }
                            setPopularSaving(true);
                            try {
                                await setDoc(doc(db, 'site_config', 'popular_archives'), { books: popularList.slice(0, 5) });
                                alert('저장 완료! 메인 화면에 반영되었습니다. ✅');
                            } catch (e) { alert('저장 실패: ' + e.message); }
                            setPopularSaving(false);
                        };
                        const addToPopular = (book) => {
                            if (popularList.length >= 5) { alert('최대 5개까지 등록 가능합니다.'); return; }
                            if (popularList.some(b => b.id === book.id)) { alert('이미 등록된 도서입니다.'); return; }
                            setPopularList(prev => [...prev, { id: book.id, title: book.title, cover: book.cover || '', author: book.author || '', purchaseLink: book.purchaseLink || '', listens: book.listens || '' }]);
                            setPopularSearch('');
                        };
                        const removeFromPopular = (id) => setPopularList(prev => prev.filter(b => b.id !== id));
                        const moveUp = (i) => { if (i === 0) return; const arr = [...popularList];[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; setPopularList(arr); };
                        const moveDown = (i) => { if (i === popularList.length - 1) return; const arr = [...popularList];[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; setPopularList(arr); };
                        return (
                            <div className="space-y-10">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-3">
                                        <h3 className="text-white font-black text-5xl italic tracking-tighter uppercase">Popular Archives</h3>
                                        <p className="text-slate-500 text-xl font-medium italic">메인 화면에 표시될 인기 아카이뷰 5개를 설정합니다.</p>
                                    </div>
                                    <button onClick={savePopular} disabled={popularSaving} className="px-10 py-5 rounded-[24px] bg-gold text-primary font-black text-base flex items-center gap-4 hover:bg-white hover:scale-105 transition-all shadow-[0_20px_50px_rgba(212,175,55,0.3)] disabled:opacity-50">
                                        <span className="material-symbols-outlined text-2xl">{popularSaving ? 'sync' : 'save'}</span>
                                        {popularSaving ? '저장 중...' : '메인에 저장'}
                                    </button>
                                </div>

                                {/* 현재 등록된 목록 */}
                                <div className="bg-white/5 p-8 rounded-[40px] border border-white/10 space-y-4">
                                    <h4 className="text-white font-black text-xl flex items-center gap-3">
                                        <span className="material-symbols-outlined text-gold">format_list_numbered</span>
                                        현재 등록 목록 ({popularList.length}/5)
                                    </h4>
                                    {popularList.length === 0 && (
                                        <p className="text-slate-500 text-sm text-center py-8">아직 등록된 도서가 없습니다. 아래에서 도서를 검색해 추가하세요.</p>
                                    )}
                                    <div className="space-y-3">
                                        {popularList.map((book, i) => (
                                            <div key={book.id} className="flex items-center gap-4 bg-black/40 rounded-2xl p-4 border border-white/5">
                                                <span className="text-2xl font-black text-gold/50 w-8 text-center">{i + 1}</span>
                                                <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800 border border-white/10">
                                                    {book.cover ? <img src={book.cover} alt={book.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-white/20">menu_book</span></div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-black text-sm truncate">{book.title}</p>
                                                    <p className="text-slate-500 text-[11px] font-bold mt-0.5">{book.author}</p>
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <span className="text-slate-600 text-[10px] font-mono">{book.id}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => moveUp(i)} disabled={i === 0} className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-20">
                                                        <span className="material-symbols-outlined text-sm text-white">arrow_upward</span>
                                                    </button>
                                                    <button onClick={() => moveDown(i)} disabled={i === popularList.length - 1} className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-20">
                                                        <span className="material-symbols-outlined text-sm text-white">arrow_downward</span>
                                                    </button>
                                                    <button onClick={() => removeFromPopular(book.id)} className="size-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-all ml-1">
                                                        <span className="material-symbols-outlined text-sm text-red-400">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 도서 검색 & 추가 */}
                                <div className="bg-white/5 p-8 rounded-[40px] border border-white/10 space-y-6">
                                    <h4 className="text-white font-black text-xl flex items-center gap-3">
                                        <span className="material-symbols-outlined text-blue-400">search</span>
                                        도서 검색 & 추가
                                    </h4>
                                    <div className="flex gap-3">
                                        <div className="flex-1 bg-black/60 border-2 border-white/10 rounded-2xl overflow-hidden focus-within:border-gold transition-colors flex items-center px-4">
                                            <span className="material-symbols-outlined text-slate-500 mr-2">search</span>
                                            <input
                                                type="text"
                                                placeholder="도서 제목 또는 저자 검색..."
                                                value={popularSearch}
                                                onChange={(e) => setPopularSearch(e.target.value)}
                                                className="flex-1 bg-transparent text-white text-base py-4 outline-none font-bold"
                                            />
                                        </div>
                                    </div>
                                    {popularSearch.trim() && (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredBooks.length === 0 && <p className="text-slate-500 text-sm text-center py-4">검색 결과가 없습니다.</p>}
                                            {filteredBooks.slice(0, 20).map((book) => (
                                                <div key={book.id} className="flex items-center gap-4 bg-black/40 rounded-2xl p-4 border border-white/5 hover:border-white/15 transition-all">
                                                    <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800 border border-white/10">
                                                        {book.cover ? <img src={book.cover} alt={book.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-white/20">menu_book</span></div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-black text-sm truncate">{book.title}</p>
                                                        <p className="text-slate-500 text-[11px] font-bold mt-0.5">{book.author}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => addToPopular(book)}
                                                        disabled={popularList.some(b => b.id === book.id) || popularList.length >= 5}
                                                        className="px-5 py-2.5 rounded-xl bg-gold/20 text-gold text-[11px] font-black border border-gold/30 hover:bg-gold hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                                                    >
                                                        {popularList.some(b => b.id === book.id) ? '등록됨' : '+ 추가'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Sales & Payment View - Same Wide Style... (중략) */}
                    {activeTab === 'sales' && (
                        <div className="space-y-10">
                            <h3 className="text-white font-black text-5xl italic uppercase tracking-tighter">Transaction Ledger</h3>
                            <div className="bg-white/5 rounded-[56px] border border-white/10 overflow-hidden shadow-3xl backdrop-blur-2xl">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/10">
                                            <th className="px-12 py-8 text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Reference ID</th>
                                            <th className="px-12 py-8 text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Service/Item</th>
                                            <th className="px-12 py-8 text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Client Entity</th>
                                            <th className="px-12 py-8 text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Status</th>
                                            <th className="px-12 py-8 text-right text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {realSales.map((sale) => (
                                            <tr key={sale.id} className="hover:bg-white/10 transition-all group">
                                                <td className="px-12 py-10 text-sm font-mono text-slate-500 uppercase tracking-tighter">#TX-{sale.id.substring(0, 12)}</td>
                                                <td className="px-12 py-10 font-black text-white text-xl">{sale.bookTitle || 'PREMIUM PASS'}</td>
                                                <td className="px-12 py-10 text-slate-400 text-lg font-bold uppercase tracking-tight">{sale.userName || 'ANONYMOUS'}</td>
                                                <td className="px-12 py-10">
                                                    <span className="px-5 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-500/10">VERIFIED</span>
                                                </td>
                                                <td className="px-12 py-10 text-right text-3xl font-black text-gold tracking-tighter">₩{sale.amount || '0'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="flex flex-col items-center justify-center py-32 space-y-12">
                            <h3 className="text-white font-black text-6xl italic tracking-tighter uppercase leading-none text-center">Financial<br />Core System</h3>
                            <div className="bg-white/5 rounded-[80px] border border-white/10 p-24 w-full max-w-4xl text-center space-y-12 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-gold to-transparent opacity-30"></div>
                                <div className="size-32 bg-gold/10 rounded-full flex items-center justify-center mx-auto border-2 border-gold/20 shadow-2xl">
                                    <span className="material-symbols-outlined text-7xl text-gold">account_balance_wallet</span>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-white font-black text-4xl tracking-tight">TOSS PAYMENTS SETTINGS</h4>
                                    <p className="text-slate-500 text-lg font-light leading-relaxed max-w-2xl mx-auto">
                                        시스템의 결제 게이트웨이 설정을 관리합니다. 현재 **샌드박스(테스트)** 환경이 활성화되어 있으며, 실결제 전환 시 인증키 교체가 필요합니다.
                                    </p>
                                </div>
                                <div className="flex gap-6 justify-center">
                                    <button
                                        onClick={handlePayment}
                                        className="px-16 py-8 bg-blue-600 text-white font-black text-xl rounded-[32px] shadow-2xl hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                                    >
                                        Execute Gateway Test
                                    </button>
                                    <button className="px-16 py-8 bg-white/5 border-2 border-white/10 text-white font-black text-xl rounded-[32px] hover:bg-white/10 transition-all uppercase tracking-widest">
                                        View Live API Keys
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* PC 환경에서는 하단 바를 숨기거나 다르게 처리 */}
                <div className="lg:hidden">
                    <BottomNavigation />
                </div>
            </div >
        </div >
    );
}
