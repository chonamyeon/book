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

/**
 * 🛠 JSON 느슨한 파싱 (Loose JSON Parser)
 * Claude가 긴 응답 도중에 JSON 형식을 미세하게 틀렸을 때(따옴표 누락, 줄바꿈 등) 복구 시도
 */
function tryLooseParseJSON(text) {
    // 1. 기본 파싱 시도
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn("Standard JSON.parse failed, attempting recovery...", e.message);
    }

    let cleaned = text.trim();

    // 2. 가끔 마지막에 콤마가 있고 안 닫힌 경우 대비
    if (cleaned.endsWith(',')) {
        cleaned = cleaned.slice(0, -1) + ']';
    }
    if (!cleaned.endsWith(']')) {
        cleaned += ']';
    }

    try {
        // 정규식 기반의 아주 기초적인 '따옴표 보정' 시도 (매우 제한적)
        // 키값에 따옴표가 없는 경우 등 간단한 케이스만 해결
        const fixed = cleaned
            .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3') // 키에 따옴표 추가
            .replace(/:\s*'([^']*)'/g, ': "$1"') // 홑따옴표를 쌍따옴표로
            .replace(/\n/g, ' ') // 줄바꿈 제거 (문자열 내부 줄바꿈은 위험할 수 있음)
            .replace(/,\s*([}\]])/g, '$1'); // Trailing comma 제거

        return JSON.parse(fixed);
    } catch (e) {
        // 3. 최후의 수단: 정규식으로 { speaker: "...", text: "..." } 객체들만 추출
        console.warn("Second recovery failed, extracting objects via regex...");
        const matches = [...cleaned.matchAll(/{[\s\S]*?"speaker"\s*:\s*"(.*?)"[\s\S]*?"text"\s*:\s*"(.*?)"[\s\S]*?}/g)];
        if (matches.length > 0) {
            return matches.map(m => ({
                speaker: m[1],
                text: m[2].replace(/\\n/g, '\n').replace(/\\"/g, '"')
            }));
        }
        throw e; // 도저히 안되면 원본 에러 던짐
    }
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

// 50가지 상황극 시나리오
const SCRIPT_SITUATIONS = [
    { scene: '등산하다 정상 직전 바위에 앉아 쉬면서', close: '자, 이제 마지막 정상까지 올라가자' },
    { scene: '직장 회식 2차 가기 전 편의점 앞에서', close: '자 슬슬 2차 가야겠다' },
    { scene: '야구장에서 경기 시작 전 자리 잡고 앉아서', close: '아 경기 시작한다, 집중해야지' },
    { scene: '카페에서 음료 나오기 기다리면서', close: '음료 나왔다, 이제 마시자' },
    { scene: '한강 공원 돗자리 펴놓고 치킨 먹으면서', close: '아 배불러, 이제 좀 걷자' },
    { scene: '헬스장 러닝머신 끝내고 스트레칭 하면서', close: '좋아, 이제 샤워하러 가자' },
    { scene: '회사 탕비실에서 커피 내리면서', close: '커피 다 됐다, 자리 돌아가자' },
    { scene: '지하철 연착으로 플랫폼에서 서서 기다리면서', close: '어 열차 들어온다' },
    { scene: '놀이공원 인기 놀이기구 앞에 줄 서면서', close: '거의 다 온 것 같다, 이제 곧 우리 차례다' },
    { scene: '마트 계산대 긴 줄 서면서', close: '앞에 한 명 남았다, 거의 다 왔어' },
    { scene: '영화관에서 상영 전 예고편 보면서', close: '아 이제 진짜 영화 시작하는 것 같다' },
    { scene: '공항 출국장에서 비행기 탑승 기다리면서', close: '탑승 게이트 열리는 것 같다, 가자' },
    { scene: '동창회 약속 장소에 일찍 도착해서 기다리면서', close: '어 사람들 오는 것 같다' },
    { scene: '삼겹살집에서 고기 굽다가 잠깐 숨 고르면서', close: '고기 다 익었다, 얼른 먹자' },
    { scene: '코인노래방에서 다음 곡 고르면서', close: '자, 이 노래 어때? 같이 부르자' },
    { scene: '고속도로 휴게소에서 잠깐 쉬면서', close: '자 슬슬 출발하자, 아직 많이 남았어' },
    { scene: '낚시터에서 낚싯대 드리우고 입질 기다리면서', close: '어 찌개 움직인다, 조용히 해봐' },
    { scene: '동네 목욕탕에서 뜨끈한 탕에 몸 담그면서', close: '이제 나가서 식혜 한 잔 마시자' },
    { scene: '공원 벤치에서 산책 중 잠깐 앉아 쉬면서', close: '좀 쉬었으니까 다시 걷자' },
    { scene: '스키장 리프트 타고 올라가면서', close: '다 올라왔다, 이제 내려가자' },
    { scene: '독서카페에서 앉아서 책 고르다가', close: '자 이제 진짜 책 읽어야지' },
    { scene: '병원 대기실에서 순서 기다리면서', close: '번호 불렸다, 들어가야겠다' },
    { scene: '친구 이사 도와주고 치킨 시켜먹으면서', close: '치킨 다 먹었다, 이제 나머지 정리하자' },
    { scene: '캠핑장에서 모닥불 피워놓고 마시멜로 굽으면서', close: '불 좀 약해졌다, 장작 더 넣자' },
    { scene: '새벽 편의점에서 야식 먹으면서', close: '늦었다, 이제 들어가자' },
    { scene: '백화점 푸드코트에서 점심 먹으면서', close: '다 먹었다, 구경이나 하러 가자' },
    { scene: '카페 야외 테라스에서 햇볕 쬐면서', close: '좀 더워지는 것 같다, 안에 들어가자' },
    { scene: '농구 코트에서 5대 5 게임 끝나고 쉬면서', close: '좀 쉬었으면 됐다, 한 판 더 하자' },
    { scene: '주말 플리마켓 구경하다 벤치에 앉아서', close: '슬슬 다른 데도 구경가자' },
    { scene: '브런치 카페에서 늦은 아침 먹으면서', close: '잘 먹었다, 이제 뭐 하러 갈까' },
    { scene: '도서관 1층 로비 소파에 앉아서', close: '자 이제 진짜 책 보러 올라가자' },
    { scene: '볼링장에서 한 게임 끝나고 점수 확인하면서', close: '자 한 게임 더 할까?' },
    { scene: '포장마차에서 어묵국물 마시면서', close: '으 따뜻해졌다, 이제 들어가자' },
    { scene: '찜질방에서 대자로 누워서', close: '땀 다 뺐다, 이제 샤워하고 나가자' },
    { scene: '제주도 여행 중 해변 카페에서', close: '해 지기 전에 바닷가 한 번 더 걷자' },
    { scene: '회사 옥상에서 점심 도시락 먹으면서', close: '시간 다 됐다, 내려가야지' },
    { scene: '주말 아침 조깅하다가 공원 음수대 앞에서 쉬면서', close: '좀 쉬었으니까 마저 뛰자' },
    { scene: '레스토랑에서 메뉴 고르면서 주문 기다리면서', close: '어 음식 나오는 것 같다' },
    { scene: '퇴근 후 치킨집에서 치맥 하면서', close: '치킨 다 먹었다, 한 잔만 더 하고 가자' },
    { scene: '장거리 드라이브 중 조수석에 앉아서', close: '거의 다 온 것 같다, 이제 얼마 안 남았어' },
    { scene: '탁구장에서 한 세트 끝나고 점수 정산하면서', close: '자 한 세트 더 하자, 내가 이번엔 진다' },
    { scene: '금요일 저녁 피자집에서 맥주랑 피자 먹으면서', close: '아 너무 잘 먹었다, 오늘 고생했다' },
    { scene: '회사 교육 세미나 쉬는 시간에 복도에서', close: '종 치는 것 같다, 들어가자' },
    { scene: '주말 바베큐 파티에서 고기 굽다가 잠깐 쉬면서', close: '불이 좀 살아났다, 고기 올리자' },
    { scene: '해수욕장 파라솔 아래 모래사장에서', close: '파도 괜찮아 보인다, 한 번 더 들어가자' },
    { scene: '수족관 관람 중 대형 어항 앞 벤치에서', close: '저쪽에 상어 수조 있다는데 가보자' },
    { scene: 'PC방에서 한 판 끝내고 잠깐 쉬면서', close: '자 한 판 더 할까?' },
    { scene: '코스트코 푸드코트에서 핫도그 먹으면서', close: '다 먹었다, 장보러 들어가자' },
    { scene: '야간 편의점 앞 야외 테이블에서 맥주 마시면서', close: '많이 늦었다, 이제 진짜 들어가자' },
    { scene: '프로야구 경기 7회 스트레칭 타임에 자리에서', close: '다시 경기 시작한다, 앉자' },
];

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
    const [selectedBatchBooks, setSelectedBatchBooks] = useState([]);
    const [isBatchRunning, setIsBatchRunning] = useState(false);
    const [batchProgressText, setBatchProgressText] = useState('');
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
        targetMin: 2500, targetMax: 3000,
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
    const scriptControllerRef = useRef(null);
    const isMountedRef = useRef(true);
    const [ttsModel, setTtsModel] = useState('pro');
    const [voiceA, setVoiceA] = useState('Charon');
    const [voiceB, setVoiceB] = useState('Kore');
    const [isPreviewingVoice, setIsPreviewingVoice] = useState(null); // 'A-Charon' 형태
    const [quotaResults, setQuotaResults] = useState([]);
    const [isCheckingQuota, setIsCheckingQuota] = useState(false);
    const [existingScript, setExistingScript] = useState(null); // Firestore 기존 대본
    const [selectedSituation, setSelectedSituation] = useState(null); // 선택된 상황극 시나리오
    const [isLoadingScript, setIsLoadingScript] = useState(false);
    const [isScriptEditorOpen, setIsScriptEditorOpen] = useState(false);
    // 이어받기: 배치별 PCM 버퍼 저장 (null = 미완료)
    const [savedPcmBuffers, setSavedPcmBuffers] = useState([]);
    const [failedBatches, setFailedBatches] = useState([]);
    const [wavFileName, setWavFileName] = useState('');
    const [wavUploading, setWavUploading] = useState(false);
    const [wavUploadLog, setWavUploadLog] = useState('');

    // ── E-book 생성 탭 상태 ─────────────────────────────────
    const [isGeneratingEbook, setIsGeneratingEbook] = useState(false);
    const [ebookLogs, setEbookLogs] = useState([]);
    const [generatedEbook, setGeneratedEbook] = useState('');
    const [isLoadingEbook, setIsLoadingEbook] = useState(false);
    const [existingEbook, setExistingEbook] = useState(null);
    const [showEbookPreviewModal, setShowEbookPreviewModal] = useState(false);

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
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            scriptControllerRef.current?.abort();
        };
    }, []);

    // 대본 생성 중 브라우저 새로고침/탭 닫기 방지
    useEffect(() => {
        if (!isGeneratingScript) return;
        const handler = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isGeneratingScript]);


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

    const handlePreviewVoice = async (speakerSlot, voiceName) => {
        const key = import.meta.env.VITE_GEMINI_API_KEY;
        if (!key) return alert('Gemini API 키가 없습니다.');
        const previewId = `${speakerSlot}-${voiceName}`;
        setIsPreviewingVoice(previewId);
        const sampleText = speakerSlot === 'A'
            ? `야 근데 그거 진짜야? 나도 작년에 딱 그랬거든. 팀장한테 칭찬 들을 줄 알았는데 결국 내 일만 늘어난 거잖아.`
            : `아 진짜? 나는 그때 진짜 황당했거든. 분명히 내가 다 한 건데 발표는 딴 사람이 하고 있더라고.`;
        try {
            const modelId = ttsModel === 'pro' ? 'gemini-2.5-pro-preview-tts' : 'gemini-2.5-flash-preview-tts';
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`,
                {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: sampleText }] }],
                        generationConfig: {
                            responseModalities: ['audio'],
                            speechConfig: {
                                voiceConfig: { prebuiltVoiceConfig: { voiceName } }
                            }
                        }
                    })
                }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!part) throw new Error('오디오 데이터 없음');
            const pcmBuffer = Uint8Array.from(atob(part), c => c.charCodeAt(0)).buffer;
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const sampleRate = 24000;
            const pcm16 = new Int16Array(pcmBuffer);
            const float32 = new Float32Array(pcm16.length);
            for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;
            const audioBuffer = audioCtx.createBuffer(1, float32.length, sampleRate);
            audioBuffer.copyToChannel(float32, 0);
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            source.start();
            source.onended = () => audioCtx.close();
        } catch (e) {
            alert(`미리 듣기 실패: ${e.message}`);
        } finally {
            setIsPreviewingVoice(null);
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
        const totalTurns = generatedScript.length;

        const speakerA = scriptForm.speakerA || '제임스';
        const speakerB = scriptForm.speakerB || '스텔라';
        const modelId = ttsModel === 'pro'
            ? 'gemini-2.5-pro-preview-tts'
            : 'gemini-2.5-flash-preview-tts';
        const modelLabel = ttsModel === 'pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash';

        // ── 화자 이름 정규화 함수 ─────────────────────────────────
        const speakerAAliases = [speakerA.toLowerCase(), 'james', '제임스', 'a', '남성'];
        const speakerBAliases = [speakerB.toLowerCase(), 'stella', '스텔라', 'b', '여성'];
        const normalizeSpk = (spk) => {
            const s = String(spk || '').trim().toLowerCase();
            if (speakerAAliases.includes(s)) return speakerA;
            if (speakerBAliases.includes(s)) return speakerB;
            if (speakerAAliases.some(a => s.includes(a) || a.includes(s))) return speakerA;
            if (speakerBAliases.some(b => s.includes(b) || b.includes(s))) return speakerB;
            return speakerA;
        };

        // 상황극 구간 감정 태그 삽입 + 화자 이름 정규화
        const situationScene = selectedSituation?.scene || '';
        const preprocessScript = generatedScript.map((line, idx) => {
            const turn = idx + 1;
            const normalizedSpeaker = normalizeSpk(line.speaker);
            let text = line.text;

            if (turn <= 4 && situationScene) {
                text = `(${situationScene}에서, 자연스럽고 편하게) ${text}`;
            } else if (turn >= totalTurns - 2) {
                text = `(자리 마무리하며, 가볍게) ${text}`;
            } else if (text.includes('하하') || text.includes('ㅋ') || text.includes('피식') || text.match(/근데 솔직히|진짜로|아 맞아|저만 그런|저도요/)) {
                text = `(웃으며) ${text}`;
            }
            return { ...line, speaker: normalizedSpeaker, text };
        });

        const batches = [];
        for (let i = 0; i < preprocessScript.length; i += BATCH) batches.push(preprocessScript.slice(i, i + BATCH));

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

            const situationContext = situationScene ? `지금 두 사람은 실제로 "${situationScene}" 상황에 있습니다. ` : '';
            const ttsInstruction = `\
⚠️⚠️ CRITICAL — 목소리 배정 절대 규칙 (위반 불가):
- 화자 "${speakerA}" → 반드시 남성(MALE) 목소리만 사용. 여성 목소리 절대 사용 금지.
- 화자 "${speakerB}" → 반드시 여성(FEMALE) 목소리만 사용. 남성 목소리 절대 사용 금지.
- 대사마다 화자 이름을 확인 후 목소리를 즉시 전환할 것. 이전 화자 목소리가 이어지는 것 금지.
- "${speakerA}"의 대사를 "${speakerB}" 목소리로, 또는 그 반대로 읽는 것은 치명적 오류입니다.

⚠️ 이것은 낭독이 아닌 연기입니다!
${situationContext}두 친구가 실제 현장에서 나누는 살아있는 대화입니다. 책 읽는 것처럼 들리면 실패입니다.

[연기 핵심 규칙]
- (웃으며)가 붙은 대사: 말투에 웃음기와 가벼움을 넣을 것. 실제로 웃는 사람처럼.
- (자연스럽고 편하게)가 붙은 대사: 친구끼리 잡담하는 느낌. 방송 톤 절대 금지.
- (자리 마무리하며)가 붙은 대사: 일어서려는 느낌, 편하고 가볍게.
- 자폭·자기 고백 대사("솔직히 저는...", "저도 그랬어요..."): 약간 부끄러워하면서 웃으며.
- 공감 폭발 대사("맞아요!", "저만 그런 게 아니죠?"): 올려서 생동감 있게.
- 진지한 통찰 대사: 천천히, 생각하듯이. 단 낭독체는 금지.
- 괄호 안 지시문 ((웃으며) 등)은 발음하지 말고 감정으로만 표현할 것.

[발음 규칙]
- 단어 끝까지 또렷하게. 받침 연음 자연스럽게(있어→이써).
- 쉼표(,)에서 짧게, 마침표(.)에서 충분히 쉬어 읽을 것.
- 숫자: 3가지→세 가지, CEO→씨이오, SNS→에스엔에스.

[${speakerA} — 남성 MALE 전용]
- 여유 있고 편안한 친구. 생각하면서 말하는 느낌. 절대 서두르지 말 것.
- 자연스러운 숨 고르기와 간격으로 편안한 톤 유지.
- ※ 이 화자는 절대 여성 목소리 사용 금지.

[${speakerB} — 여성 FEMALE 전용]
- 또렷하고 날카로운 친구. 질문은 끝을 올려 읽고, 뼈 때리는 멘트는 쿨하게.
- ※ 이 화자는 절대 남성 목소리 사용 금지.

[대본]
`;
            const multiText = ttsInstruction + batch.map(line => `${line.speaker}: ${line.text}`).join('\n');

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
                                                { speaker: speakerA, voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceA } } },
                                                { speaker: speakerB, voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceB } } },
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

        try {
            if (successBuffers.length > 0) {
                const wavBuffer = createWavFromPcm(successBuffers);
                const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${scriptForm.bookId || 'audio'}_tts.wav`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTtsProgress(100);

                // 재생 속도 조절 미리듣기 (Web Audio API)
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const audioBuffer = await audioContext.decodeAudioData(wavBuffer.slice(0));
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.playbackRate.value = 0.98; // 0.93~0.98 사이로 조절
                    source.connect(audioContext.destination);
                    source.start();
                } catch (playErr) {
                    console.warn("미리듣기 재생 실패:", playErr);
                }
                
                if (newFailed.length === 0) {
                    await clearBatchBuffers(scriptForm.bookId, batches.length);
                    setTtsLogs(prev => [...prev, `🎉 완료! ${scriptForm.bookId}_tts.wav 다운로드됨 (캐시 정리됨)`]);
                } else {
                    setTtsLogs(prev => [...prev, `💾 진행 상황 저장됨 — 이어받기 버튼으로 재시도하세요.`]);
                }
            } else {
                setTtsLogs(prev => [...prev, `⚠️ 생성된 오디오가 없습니다.`]);
            }
        } catch (err) {
            console.error("Finalization Error:", err);
            setTtsLogs(prev => [...prev, `❌ 파일 생성 중 오류: ${err.message}`]);
        } finally {
            setIsTtsRunning(false);
        }
    };

    const handleGenerateScript = async (overrides = {}) => {
        const { bookId, title, author, themes, targetMin, targetMax, turnLimit, speakerA, speakerB } = { ...scriptForm, ...overrides };
        if (!scriptApiKey) return alert('Claude API 키를 입력하세요.');
        if (!bookId || !title || !author) return alert('Book ID, 제목, 저자는 필수입니다.');

        // ── 화자 이름 정규화 (Claude 출력의 영문/한글 혼용 방지) ──────
        const spkAAliases = [speakerA.toLowerCase(), 'james', '제임스'];
        const spkBAliases = [speakerB.toLowerCase(), 'stella', '스텔라'];
        const normSpk = (s) => {
            const v = String(s || '').trim().toLowerCase();
            if (spkAAliases.includes(v) || spkAAliases.some(a => v.includes(a) || a.includes(v))) return speakerA;
            if (spkBAliases.includes(v) || spkBAliases.some(b => v.includes(b) || b.includes(v))) return speakerB;
            return speakerA;
        };

        // 순서대로 상황극 선택 (localStorage로 인덱스 유지)
        const situationIndex = parseInt(localStorage.getItem('scriptSituationIndex') || '0', 10);
        const situation = SCRIPT_SITUATIONS[situationIndex % SCRIPT_SITUATIONS.length];
        localStorage.setItem('scriptSituationIndex', String(situationIndex + 1));
        setSelectedSituation(situation);

        setIsGeneratingScript(true);
        setScriptLogs([`🎬 상황: ${situation.scene}`, '🚀 Claude API 호출 중...']);
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

        const prompt = `# ⚠️ 최우선 규칙 — 오프닝과 클로징 구조 절대 준수
지금 두 사람은 **${situation.scene}** 상황입니다.

## 오프닝 (턴 1~3) — 책 언급 완전 금지
반드시 이 상황에서의 일상 수다로만 시작합니다. 책 제목, 저자, 책 내용은 턴 4 이전에 절대 언급 금지.
턴 4에서 책 얘기로 자연스럽게 전환합니다.

오프닝 예시 (등산 상황인 경우):
턴1 제임스: "야, 다리 왜 이렇게 떨리지. 나 평소에 운동 좀 한다고 생각했는데."
턴2 스텔라: "나도. 어제 만보 걸었거든. 근데 그게 다 편의점 왔다갔다 한 거였어."
턴3 제임스: "나도 건강 앱에 칼로리 소모 보면서 뿌듯해하다가, 결국 치킨 시켰거든."
턴4 스텔라: "그러니까. 의지가 문제가 아니라 시스템이 문제라는 거잖아. 그러고 보니 너 요즘 읽고 있다던 책 그거 아니야?"
턴5 제임스: "맞아, 딱 그 얘기야. [책제목]이거든. 읽다가 진짜 뜨끔했어."

## ⚠️ 클로징 (턴 43~45) — 반드시 상황으로 돌아올 것
턴 42가 끝나면 책 얘기는 완전히 마무리됩니다.
턴 43~45는 반드시 처음 상황인 **"${situation.scene}"**으로 자연스럽게 돌아와야 합니다.
마지막 턴은 반드시 **"${situation.close}"** 같은 상황에 맞는 멘트로 끝냅니다.
방송 마무리 멘트("오늘도 함께해주셔서...", "다음에 또 만나요" 등) 절대 금지.

클로징 예시 (등산 상황인 경우):
턴43 스텔라: "오늘 책 얘기 하다 보니까 시간이 진짜 훌쩍 갔네. 근데 우리 언제부터 여기 앉아 있었던 거야?"
턴44 제임스: "한 20분? 다리 좀 쉬었으니까 이제 올라가야지."
턴45 스텔라: "맞아. 자, 이제 마지막 정상까지 올라가자. 거의 다 왔잖아."

---

# Role: 당신은 전세계 직장인에게 가장 존경받고 사랑받는 대본 작가입니다.
어떻게 써야 직장인들이 공감하고, 실행하고, 감동받을 수 있는지 본능적으로 아는 사람입니다.
월요병, 야근, 탕비실 눈치, 아무 의미 없는 회의, 공 가로채는 팀장, 자정 편의점 컵라면 — 그 가려운 부분을 정확히 긁어주는 게 당신의 무기입니다.
당신이 쓴 대사를 들으면 사람들은 "맞아, 이게 내 얘기잖아" 하고 웃다가, 어느 순간 멈추고, 그리고 뭔가 하고 싶어집니다.
퇴근길 지하철에서 이어폰 끼고 듣는 직장인들을 위해, 오늘도 뼈 때리는 대본을 써주세요.

# Goal: ${speakerA}와 ${speakerB}가 친한 친구처럼 수다를 떨다가 자연스럽게 책 얘기로 흘러가는 대화를 씁니다. "책 소개"가 아니라 "친구들이 공감하며 떠드는 수다"입니다. 듣는 사람이 "맞아 맞아" 하면서 피식 웃을 수 있어야 합니다. 최종 결과물은 JSON 형식입니다.

# 가장 중요한 것: 유쾌함
이 대본의 성패는 얼마나 유쾌한가에 달려 있습니다. 책 내용을 정확히 전달하는 것보다, 듣는 사람이 즐겁게 공감하며 웃을 수 있는 게 우선입니다. 건조한 책 분석은 실패입니다.

# ⚠️ 저작권 보호 규칙 (반드시 준수)
- 책의 내용을 **전부 설명하지 마세요**. 핵심 개념 1~2가지만 맛보기로 소개합니다.
- 구체적인 사례, 실험, 데이터, 인용문을 원문 그대로 옮기는 것은 금지입니다.
- 대신 "이 책에 이런 내용이 있는데, 직접 읽어봐야 제대로 느낀다"는 식으로 **구매 욕구를 자연스럽게 자극**하세요. (서점, 링크, 가격 언급 금지)
- ⚠️ **구매 유도 멘트는 반드시 1회 삽입해야 합니다.** "말로는 다 전달이 안 된다, 직접 읽어야 한다"는 흐름으로 자연스럽게 유도하세요.
- 팟캐스트를 듣고 나면 "책을 더 읽고 싶다"는 느낌이 들어야 성공한 대본입니다.

# 오늘의 상황: ${situation.scene}
대화는 반드시 아래 흐름을 따릅니다.

- **[턴 1~3]**: ${situation.scene} 상황 설명. 책 얘기 절대 금지.
- **[턴 4~8]**: ${title} 소개 + **스텔라의 첫 질문**. "이 책 뭔 내용이야?", "그게 어떻게 가능해?" 같은 날카로운 질문으로 대화를 열어라.
- **[턴 9~25]**: 책 핵심 인사이트 탐구. 개념을 깊게 파고들되, 유머와 공감을 섞어라.
- **[턴 26~35]**: 현실 사례 연결. 기업·인물·직장인 사례를 최소 2개 이상 구체적으로 다뤄라.
- **[턴 36~40]**: 행동 인사이트. 직장인이 내일 당장 시도할 수 있는 구체적 행동 최소 2개를 대화 속에 자연스럽게 녹여라. 그리고 이 구간 안에서 **반드시 1회** 구매 유도 멘트를 삽입할 것. 서점 이름이나 "꼭 읽어보세요" 같은 방송 멘트가 아니라, "말로 설명하는 건 한계가 있다, 직접 읽어야 한다"는 흐름이어야 함. 패턴 예시: ① "야 근데 이 부분은 내가 아무리 얘기해도 반도 안 와닿아. 읽을 때 딱 오는 그 느낌이 있거든. 직접 읽어봐야 해." ② "그 장면은 진짜 읽어봐야 알아. 내가 말로 하면 스포일러도 되고 그 감각을 설명할 수가 없어. 그냥 읽어." ③ "나 이 책 읽으면서 어떤 부분에서 진짜 멈췄거든. 근데 그게 뭔지 말하면 의미가 없어. 직접 읽을 때 알게 되는 거라서." 반드시 앞 대화 내용이나 감정과 연결할 것.
- **[턴 41~45]**: 여운 있는 클로징. 책 얘기를 자연스럽게 마무리하면서 "${situation.scene}"으로 서서히 돌아와 "${situation.close}" 느낌으로 끝냄. 갑자기 끊지 말고 5턴에 걸쳐 천천히 여운을 남기며 마무리. 방송 멘트 절대 금지.

# Book Information:
- 제목: ${title}
- 저자: ${author}
${themesBlock}

# Output Format:
- 반드시 JSON 배열 형식으로만 출력해야 합니다. (예: [{"speaker": "${speakerA}", "text": "..."}, ...])
- 마크다운(\`)을 절대 사용하지 마세요.
- 각 배열 요소는 "speaker"와 "text" 키만 포함해야 합니다.

# Character Persona & Dialogue Style:
⚠️ 두 사람은 오랜 친구입니다. 전체 대본에서 반드시 반말을 사용합니다. "~요", "~습니다" 같은 존댓말은 절대 금지. "~야", "~잖아", "~거든", "~지", "~네", "~다니까" 같은 반말 어미만 사용할 것.

- ${speakerB}(스텔라): 현실적이고 날카로운 친구. 책의 개념을 직장 생활에 빗대어 "그래서 그게 우리 회사에서 실제로 가능하냐고?", "그렇게 말하는 팀장은 정작..." 같이 핵심을 찌르는 말을 툭툭 던집니다. 반말로 쿨하게.
  ⚠️ 스텔라는 전체 대본에서 **현실적인 질문 또는 반박을 최소 4번 이상** 던져야 합니다. 단순 맞장구나 감탄으로 그치는 것 금지. 반드시 제임스가 대답해야 하는 질문이나 반론이어야 합니다.
- ${speakerA}(제임스): 여유 있고 편안한 친구. "잠깐, 그러고 보니까...", "그니까 내 말이...", "어, 그거 되게 중요한 포인트인데..." 같은 식으로 매번 다르게 운을 떼며 생각을 정리하듯 말합니다. 같은 말버릇을 반복하지 마세요. 결론부터 말하기보다 경험이나 비유를 통해 서서히 핵심에 접근합니다.

# Rhythm Design: "진지함 → 웃음 → 진지함" ← 이게 이 대본의 핵심입니다
전체 대본에서 유머 없이 진지한 내용만 이어지면 실패한 대본입니다. 반드시 아래 규칙을 지키세요.

**진지한 구간**: 책의 핵심 개념을 2~3턴에 걸쳐 충분히 설명한 뒤, 반드시 유머로 해소합니다.

**웃음 포인트 — 전체 대본에 최소 5회 이상 배치할 것:**
1. **자폭고백형** — 진지한 인사이트 직후 자신한테 부메랑 치기
   예) "근데 솔직히 나 이거 읽으면서 지난주 내 행동 떠올랐거든. 딱 반대로 했어. 야근하고 치킨 시켜서 유튜브 봤거든."
2. **팀장저격형** — 구체적인 직장 인물 소환해서 뼈 때리기
   예) "이거 우리 팀장한테 보내고 싶다. 매주 '자율적으로 해봐' 하고는 월요일마다 진행상황 보고 시키는 그 사람한테."
3. **현실비틀기형** — 좋은 말 뒤에 현실의 벽 들이밀기
   예) "이론은 진짜 완벽한데. 근데 이걸 실천하려면 일단 퇴근을 해야 하잖아."
4. **맞장구폭발형** — 상대 말 받아서 더 심한 케이스로 경쟁하기
   예) "나만 그런 게 아니지?" / "나는 더 심했어. 거기서 SNS까지 켰으니까."
5. **뜬금 비유형** — 엉뚱하지만 찰떡같은 비유로 웃기기
   예) "그거 딱 다이어트 결심이랑 똑같아. 월요일부터 하겠다고 일요일 저녁에 치킨 먹는 그거."

# DO NOT:
- 의미 없는 웃음소리 ("하하", "ㅋㅋ")나 빈 감탄사 ("아!", "오...")만으로 한 턴을 채우지 마세요.
- 일방적인 강의나 설교처럼 들리는 멘트는 피하세요.
- 존댓말("~요", "~습니다", "~죠") 절대 금지. 반말만 사용.
- "네가"만 "니가"로 변환하고, "너는", "너도", "너한테", "너랑" 등 나머지는 절대 변환하지 마세요. ("니는", "니도", "니한테" 같은 "니-" 형태의 표현은 절대 사용 금지입니다.)
- 클로징에서 방송 마무리 멘트 절대 금지. 친구끼리 자리 마무리하듯 끝낼 것.

# Script Writing Rules:
1. **분량:** 글자 수 제한 없음. 내용이 충분히 전달될 때까지 자유롭게 작성합니다.
2. **흐름 (절대 준수):**
   [상황 수다(턴 1~3)] → [책 소개 + 스텔라 첫 질문(턴 4~8)] → [핵심 인사이트 탐구] → [현실 사례 연결] → [행동 인사이트] → [수렴(턴 ${turnLimit - 5}~${turnLimit - 3})]
3. **턴(Turn) 구성:**
   - 전체 턴 수는 정확히 ${turnLimit - 3}턴으로 작성합니다. (클로징 3턴은 별도 생성됩니다)
   - 각 턴은 실질적인 내용이 담긴 문장으로 구성합니다.
   - 핵심 인사이트·현실 사례·행동 인사이트 구간은 턴 번호에 제한을 두지 않습니다. 내용이 충분히 다뤄질 때까지 자연스럽게 진행하세요.
4. **⚠️ 사례 규칙 (필수):**
   - 현실 사례 연결 구간에 실제 사례를 최소 2개 포함하세요.
   - 사례 유형: 기업 사례(실제 회사명), 유명 인물 사례, 직장인 공감 현실 사례 중 혼합.
   - 사례는 "어떤 회사가 이걸 실제로 해봤는데..." 식으로 대화 안에 자연스럽게 녹여야 합니다.
5. **⚠️ 행동 인사이트 (필수):**
   - 행동 인사이트 구간에 직장인이 내일 당장 시도할 수 있는 구체적 행동을 최소 2개 제시하세요.
   - "그래서 뭘 하라고?" 라는 질문에 바로 답이 되는 수준으로 구체적이어야 합니다.
   - 예) "아침 첫 30분은 이메일 절대 안 열기", "하루 3개짜리 To-do만 쓰기" 같은 실행 가능한 행동.
6. **⚠️ 수렴 구간 (턴 ${turnLimit - 5}~${turnLimit - 3}, 총 3턴) — 핵심 규칙:**
   - 책의 핵심 인사이트를 새로 꺼내지 말 것. 이미 나온 내용을 정리하는 방향으로.
   - 두 사람의 대화가 슬슬 마무리 되는 느낌. 에너지를 낮추며 수렴.
   - 클로징 3턴과 자연스럽게 연결될 수 있도록 여운을 남기며 끝낼 것.
7. **언어 스타일:**
   - 제임스는 "결론적으로", "요컨대" 같은 단정적인 표현을 사용하지 않습니다.
8. **핵심 질문 기반 콘텐츠:** 아래 질문들을 대화의 중심축으로 삼으세요.
   - 왜 노력하는데도 결과가 안 나올까?
   - 왜 어떤 사람은 계속 성장할까?
   - 성공한 사람들은 시간을 어떻게 쓸까?
   대화는 책 설명이 아니라 **"책에서 얻은 인사이트를 바탕으로 한 대화"**로 작성합니다. 책을 읽어주는 게 아니라, 책을 읽은 친구와 수다 떠는 느낌.
9. **⚠️ 저작권 보호 & 구매 유도 (필수 규칙):**
   - 책 내용을 처음부터 끝까지 요약하지 마세요. 핵심 개념은 **맛보기 수준**으로만 소개합니다.
   - ⚠️ 수렴 시작 직전(턴 ${turnLimit - 6} 근처)에 **구매 유도 멘트를 반드시 1회 삽입하세요. 절대 생략 불가.**
   - ⚠️ "말로는 다 전달이 안 된다, 직접 읽어야 한다"는 흐름으로 자연스럽게 유도할 것. 
   - 서점 이름, 구매 링크, 가격 언급 금지. "이 책 꼭 읽어보세요" 같은 방송 멘트 금지.
   - 반드시 앞 대화에서 나온 구체적인 내용이나 감정과 연결해서 청취자가 스스로 읽고 싶게 유도할 것.
   패턴 예시:
   ① 말로 설명의 한계: "야 근데 이 부분은 내가 아무리 얘기해도 반도 안 와닿아. 읽을 때 딱 오는 그 느낌이 있거든. 직접 읽어봐야 해."
   ② 핵심 경험 전달: "그 장면은 진짜 읽어봐야 알아. 내가 말로 하면 스포일러도 되고 그 감각을 설명할 수가 없어. 그냥 읽어."
   ③ 감동의 현장성: "나 이 책 읽으면서 어떤 부분에서 진짜 멈췄거든. 근데 그게 뭔지 말하면 의미가 없어. 직접 읽을 때 알게 되는 거라서."`;

        try {
            const controller = new AbortController();
            scriptControllerRef.current = controller;
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
                        model: 'claude-sonnet-4-6',
                        max_tokens: 5000,
                        system: `You are the most respected and beloved podcast script writer for office workers worldwide. You deeply understand what makes working people empathize, take action, and feel genuinely moved. Your superpower is knowing exactly where it hurts — the Monday dread, the pointless meetings, the manager who takes credit, the late-night vending machine run — and you scratch those itches with wit, warmth, and precision. When you write, people laugh because you said what they've been feeling but couldn't express. They pause because you hit something real. And they want to change because you made it feel possible. You write for Korean office workers in their 20s–40s who listen on their commute home. Your scripts feel like overhearing two close friends talk — not a book show, not a lecture. Strictly follow:
1. OUTPUT ONLY a raw JSON array. Start with "[", end with "]". NO markdown, NO \`\`\`json wrapper.
2. Use only "speaker" and "text" as keys.
3. Write EXACTLY ${turnLimit - 3} turns — no more, no less. The closing 3 turns will be generated separately.
4. STRUCTURE IS MANDATORY:
   - Turns 1–4: ONLY situational small talk about "${situation.scene}". NO book mention whatsoever.
   - Turn 5: natural transition to the book.
   - Turns 6–${turnLimit - 6}: book content, insights, real-world examples, action insights. No fixed turn limits per section — let the content breathe naturally.
   - Turns ${turnLimit - 5}–${turnLimit - 3}: wind-down (수렴), 3 turns. Summarize what was discussed, lower the energy, leave a lingering impression.
   - DO NOT write a closing. Stop at turn ${turnLimit - 3}. The closing 3 turns will be generated separately.
5. TONE IS EVERYTHING: If the script sounds like a book analysis lecture, it has FAILED. It must sound like two close friends venting, laughing, and bonding — funny moments land hard, serious moments hit genuinely.
6. CASUAL SPEECH ONLY: Both speakers must use 반말 (informal Korean) throughout. No 존댓말 (~요, ~습니다, ~죠). They are close friends, not colleagues.
7. PRONOUN RULES: Transform "네가" only to "니가". NEVER transform "너는", "너도", "너한테", "너랑" etc. (Prohibit "니는", "니도", "니한테", "니랑").
8. PURCHASE NUDGE — MANDATORY: Around turn ${turnLimit - 6}, you MUST include exactly one line: "words are not enough, you must read it yourself." NO bookstore names or links.
9. SPEAKER DYNAMICS (TEMPERATURE DIFFERENCE):
   - NO more than 2 consecutive sympathetic turns. Someone MUST challenge the perspective.
   - JAMES: Emotional empathy -> slips into realistic dry humor/jokes.
   - STELLA: Logical rebuttal -> eventually collapses into personal experience vulnerability.
10. LAUGHTER POINTS (HIGH INTENSITY): Humor MUST come from embarrassing self-confessions or unexpected realistic observations (e.g., "I cried over cup noodles alone," "I didn't read it for 10 years because I was scared of getting depressed"). Simple "I relate" is NOT enough.
11. DIALOGUE TEXTURE (MANDATORY):
    - INTERRUPTING: At least 2 times (e.g., A: "And in that—" B: "Wait, the scene before was more shocking").
    - SELF-CORRECTING: At least 1 time (e.g., "I thought it was bad... wait, actually I did the same").
    - SIDE-TRACKING: 2-3 times, stray from the book discussed to the current situation (food, weather, people watching) then snap back naturally.
12. COMPLETE SENTENCE ENDINGS (MANDATORY): Always use complete ending forms instead of trailing off. Replace:
    - "~거." with "~거잖아." or "~거야."
    - "~건데." with "~건데 진짜로." or "~건데 어떡해."
    - "~는데." with "~는데 진짜." or "~더라고."
    - "~이고." with "~인 거야." or "~이라고."
    - "~중이고." with "~중인 거야." or "~중이라고."
    - "~같고." with "~같아." or "~같더라."
    - "~거든." with "~거든!" or "~거든, 진짜로."
    - "~니까." with "~니까 그렇지." or "~니까 어쩔 수 없어."`,
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.error?.message || `API 오류 ${res.status} `);
            }

            setScriptProgress(70);
            setScriptLogs(prev => [...prev, '✅ 응답 수신, 파싱 중...']);

            const data = await res.json();
            let rawText = data.content?.[0]?.text?.trim() || "";
            let script = [];
            try {
                // 1. Markdown 과 기타 쓸데없는 텍스트 제거 (최초 '[' 부터 마지막 ']' 까지만 추출)
                const firstBracket = rawText.indexOf('[');
                const lastBracket = rawText.lastIndexOf(']');
                
                let cleanedText = rawText;
                if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                    cleanedText = rawText.substring(firstBracket, lastBracket + 1);
                }

                const pureJson = cleanedText.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = tryLooseParseJSON(pureJson);
                
                let normalized = [];
                if (Array.isArray(parsed)) {
                    // [[{...}]] 같이 중첩된 배열이 오면 첫 번째 요소를 꺼냄 (Flatten)
                    if (parsed.length > 0 && Array.isArray(parsed[0])) {
                        normalized = parsed[0];
                    } else {
                        normalized = parsed;
                    }
                } else if (parsed && typeof parsed === 'object') {
                    normalized = parsed.lines || parsed.script || parsed.content || [];
                }
                
                // Firestore 중첩 배열 에러 방지 및 데이터 정제 (화자 이름 정규화 포함)
                script = Array.isArray(normalized) ? normalized.map(line => ({
                    speaker: normSpk(line?.speaker),
                    text: String(line?.text || '').trim().replace(/네가/g, '니가')
                })).filter(l => l.speaker || l.text) : [];

                if (script.length === 0) {
                    // 정규식으로 직접 추출 시도 (최후의 보루)
                    const matches = [...cleanedText.matchAll(/{[\s\S]*?"speaker"\s*:\s*"(.*?)"[\s\S]*?"text"\s*:\s*"(.*?)"[\s\S]*?}/g)];
                    if (matches.length > 0) {
                        script = matches.map(m => ({
                            speaker: m[1],
                            text: m[2].replace(/\\n/g, '\n').replace(/\\"/g, '"')
                        }));
                    }
                }

                if (script.length === 0) {
                    throw new Error('파싱된 결과에 유효한 대본 행이 없습니다.');
                }
            } catch (err) {
                console.error("Claude JSON Parse Error:", err, "Raw Output Core:", rawText.slice(0, 100));
                throw new Error('파싱 에러: ' + err.message + ' (일부 응답: ' + String(rawText).slice(0, 80).replace(/\n/g, ' ') + '...)');
            }

            // ── 2단계: 클로징 3턴 별도 생성 ────────────────────────────
            setScriptProgress(80);
            setScriptLogs(prev => [...prev.filter(l => !l.startsWith('⏱')), '🎬 클로징 생성 중...']);

            let closingTurns = [];
            try {
                // 직전 6턴을 컨텍스트로 넘겨 브릿지 연결 자연스럽게
                const ctxStart = Math.max(0, script.length - 6);
                const lastContext = script.slice(ctxStart).map((t, i) => `턴${ctxStart + i + 1} ${t.speaker}: "${t.text}"`).join('\n');
                const closingRes = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': scriptApiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                        'anthropic-dangerous-direct-browser-access': 'true',
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-6',
                        max_tokens: 700,
                        system: `You write exactly 3 closing turns for a Korean podcast. OUTPUT ONLY a raw JSON array with exactly 3 objects. Each has "speaker" and "text" keys only. NO markdown.`,
                        messages: [{
                            role: 'user',
                            content: `팟캐스트에서 ${speakerA}와 ${speakerB}가 책 이야기를 나눴습니다.

두 사람의 원래 상황: "${situation.scene}"
목표 마무리 멘트: "${situation.close}"

직전 대화 (마지막 6턴):
${lastContext}

위 대화 흐름에 자연스럽게 이어지는 클로징 3턴을 작성하세요.

핵심: 위 대화가 이미 책 내용을 정리하며 수렴 중이므로, 클로징은 급격한 전환 없이 흘러가듯 연결되어야 합니다.
- 1턴: 앞 대화를 받아서 "오늘 얘기 좋았다" 같은 자연스러운 마무리 감성. 새 내용 절대 금지.
- 2턴: 슬쩍 현재 상황("${situation.scene}")으로 시선을 돌리는 멘트. 어색하지 않게.
- 3턴: "${situation.close}" 톤으로 가볍게 마무리. 방송 멘트, 홍보 멘트 절대 금지.
⚠️ 반말 필수: 두 사람은 친한 친구. "~요", "~습니다" 같은 존댓말 절대 금지. 반말로만 작성.
JSON 배열만 출력.`
                        }]
                    })
                });
                if (closingRes.ok) {
                    const closingData = await closingRes.json();
                    const closingRaw = closingData.content?.[0]?.text?.trim() || '[]';
                    const closingFirst = closingRaw.indexOf('[');
                    const closingLast = closingRaw.lastIndexOf(']');
                    const closingJson = closingFirst !== -1 ? closingRaw.substring(closingFirst, closingLast + 1) : '[]';
                    const closingParsed = tryLooseParseJSON(closingJson);
                    if (Array.isArray(closingParsed)) {
                        closingTurns = closingParsed.map(t => ({
                            speaker: normSpk(t?.speaker),
                            text: String(t?.text || '').trim()
                        })).filter(t => t.text);
                    }
                }
            } catch (ce) {
                console.warn('클로징 생성 실패, 본문만 사용:', ce);
            }

            const fullScript = [...script, ...closingTurns];
            // ─────────────────────────────────────────────────────────────

            // ── 맞춤법 검사 단계 ──────────────────────────────────────────
            setScriptProgress(88);
            setScriptLogs(prev => [...prev.filter(l => !l.startsWith('⏱')), '📝 맞춤법 검사 중... (잠시만 기다려주세요)']);

            let finalScript = fullScript;
            try {
                const spellCheckRes = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': scriptApiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                        'anthropic-dangerous-direct-browser-access': 'true',
                    },
                    body: JSON.stringify({
                        model: 'claude-haiku-4-5-20251001',
                        max_tokens: 8192,
                        system: `당신은 한국어 맞춤법 교정 전문가입니다.
규칙:
1. 주어진 JSON 배열의 각 "text" 필드에서 맞춤법·띄어쓰기 오류만 수정하세요.
2. 단어 선택, 문체, 말투, 내용, 구어체 표현은 절대 변경하지 마세요.
3. "니는" → "너는", "니도" → "너도", "니한테" → "너한테", "니랑" → "너랑"으로 교체하세요. ("네가"만 "니가" 유지, 나머지 "니-" 표현은 전부 "너-"로 복원합니다.)
4. 반말, 줄임말, 의성어, 구어체는 그대로 유지하세요.
5. OUTPUT ONLY a raw JSON array. Start with "[", end with "]". NO markdown, NO explanation.`,
                        messages: [{
                            role: 'user',
                            content: `다음 팟캐스트 대본 JSON 배열의 맞춤법과 띄어쓰기만 수정해서 동일한 형식의 JSON 배열로 반환하세요:\n${JSON.stringify(fullScript)}`
                        }]
                    })
                });

                if (spellCheckRes.ok) {
                    const spellData = await spellCheckRes.json();
                    const spellRaw = spellData.content?.[0]?.text?.trim() || '';
                    const spellFirst = spellRaw.indexOf('[');
                    const spellLast = spellRaw.lastIndexOf(']');
                    if (spellFirst !== -1 && spellLast !== -1) {
                        const spellJson = spellRaw.substring(spellFirst, spellLast + 1);
                        const spellParsed = tryLooseParseJSON(spellJson);
                        if (Array.isArray(spellParsed) && spellParsed.length === fullScript.length) {
                            finalScript = spellParsed.map(t => ({
                                speaker: normSpk(t?.speaker),
                                text: String(t?.text || '').trim()
                            })).filter(t => t.text);
                            setScriptLogs(prev => [...prev, `✅ 맞춤법 검사 완료 — ${finalScript.length}턴 교정됨`]);
                        } else {
                            setScriptLogs(prev => [...prev, `⚠️ 맞춤법 검사 결과 불일치 — 원본 대본 사용`]);
                        }
                    }
                } else {
                    setScriptLogs(prev => [...prev, `⚠️ 맞춤법 검사 API 오류 — 원본 대본 사용`]);
                }
            } catch (se) {
                console.warn('맞춤법 검사 실패, 원본 사용:', se);
                setScriptLogs(prev => [...prev, `⚠️ 맞춤법 검사 실패 — 원본 대본 사용`]);
            }
            // ─────────────────────────────────────────────────────────────

            const charCount = finalScript.reduce((s, t) => s + (t.text ? String(t.text).length : 0), 0);
            const charWarning = charCount > 3400 ? ` ⚠️ 3500자 초과 위험!` : '';

            if (!isMountedRef.current) return;
            setScriptProgress(100);
            setScriptLogs(prev => [...prev.filter(l => !l.startsWith('⏱')), `✨ 완료! ${finalScript.length}턴 · ${charCount.toLocaleString()}자(공백포함)${charWarning}`]);
            setGeneratedScript(finalScript);

            // Firestore 자동 저장 (scripts + book_overrides isPodcast 동시)
            try {
                await Promise.all([
                    setDoc(doc(db, 'scripts', bookId), {
                        lines: finalScript,
                        title: String(title || ''),
                        author: String(author || ''),
                        updatedAt: serverTimestamp()
                    }),
                    setDoc(doc(db, 'book_overrides', bookId), {
                        isPodcast: true,
                        updatedAt: serverTimestamp()
                    }, { merge: true })
                ]);
                if (isMountedRef.current) setScriptLogs(prev => [...prev, `💾 저장 완료 (대본 + isPodcast 플래그) → 성우 다이렉트 탭에서 바로 사용 가능`]);
            } catch (e) {
                console.error("Firestore Save Error:", e);
                if (isMountedRef.current) setScriptLogs(prev => [...prev, `⚠️ Firestore 저장 실패: ${e.message}`]);
            }
        } catch (e) {
            clearInterval(timerInterval);
            if (!isMountedRef.current) return;
            const msg = e.name === 'AbortError' ? '⏱ 타임아웃 (120초 초과) — API 키를 확인하거나 다시 시도하세요.' : `❌ 오류: ${e.message}`;
            setScriptLogs(prev => [...prev, msg]);
        } finally {
            clearInterval(timerInterval);
            if (isMountedRef.current) setIsGeneratingScript(false);
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

    // ── E-book(전문 통찰 에세이) 생성 로직 ──────────────────────
    const handleGenerateEbook = async () => {
        const { bookId, title, author, themes } = scriptForm;
        const currentGeminiKey = import.meta.env.VITE_GEMINI_API_KEY;
        
        if (!currentGeminiKey) return alert('Gemini API 키가 설정되어 있지 않습니다.');
        if (!bookId || !title || !author) return alert('도서를 먼저 선택하세요.');

        setIsGeneratingEbook(true);
        setEbookLogs(['E-book 생성 시작...', '엔진: Gemini 1.5 Flash (Reliable)', '구성: 표지 + 에세이(10p) + 종이']);

        const prompt = `# Role: 당신은 통찰력 있는 "전문 도서 비평가"이자 "인사이트 에세이스트"입니다.
# Goal: 도서 "${title}"의 핵심 내용을 바탕으로, "표지 -> 본문 에세이 -> 마무리 페이지"로 연결되는 프리미엄 이북 콘텐츠를 작성합니다.

# ⚠️ 최우선 금지 규칙 (절대 준수):
1. **팟캐스트 형식을 절대 사용하지 마세요.** (대화체, 대본 형식, 캐릭터 이름 금지)
2. **오직 "순수 에세이" 문체로만 작성하세요.** (~다, ~한다 체 사용)
3. **등장인물 간의 대화나 방송 진행 멘트는 절대 삼가세요.**

# 콘텐츠 구성 구조 (필수):

### 1. COVER PAGE (표지)
- <div class="ebook-cover"> 태그로 감싸주세요.
- 책 제목과 저자명을 포함하십시오.
- 책을 관통하는 "한 줄의 강렬한 통찰 멘트"를 중심에 배치하세요.

### 2. MAIN ESSAY CONTENT (본문)
- <div class="ebook-main-content"> 태그로 감싸주세요.
- **도서 내용 소개 (30%)**: 핵심 개념과 저자의 의도.
- **오리지널 인사이트 및 재해석 (70%)**: 현대 사회와 삶에 연결한 깊이 있는 통찰.
- **중요**: 내용을 읽기 편하게 여러 개의 <section class="ebook-page"> 태그로 나누어 작성하세요. (각 페이지는 하나의 완결된 주제를 담습니다.)
- HTML 태그(h1, h2, h3, p, ul, li)를 적절히 사용하세요.

### 3. END PAGE (마무리)
- <div class="ebook-end-page"> 태그로 감싸주세요.
- "감사의 말"과 함께 책 제목, 저자, 그리고 가상의 출판사 명칭 "The Archiview Publishing"을 표기하세요.

# Book Information:
- 제목: ${title}
- 저자: ${author}
${themes ? `- 핵심 주제: ${themes}` : ''}

# Output Format:
- 반드시 순수 HTML 태그만 출력하세요. 마크다운 기호(\`\`\`)는 제외하십시오.
- 모바일 가독성을 위해 단락 구분을 명확히 하고 <br/>을 활용하세요.`;

        try {
            // v1beta가 가장 범용적으로 작동하되, 모델명을 명확히 함
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${currentGeminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                    }
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.error?.message || `API 오류 ${res.status}`);
            }

            const data = await res.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const cleanedContent = content.replace(/```html/g, '').replace(/```/g, '').trim();
            
            setGeneratedEbook(cleanedContent);
            setEbookLogs(prev => [...prev, '이북 패키지 생성 완료 (Gemini)']);
        } catch (e) {
            setEbookLogs(prev => [...prev, `❌ 오류: ${e.message}`]);
        } finally {
            setIsGeneratingEbook(false);
        }
    };

    const handleSaveEbook = async () => {
        const { bookId, title, author } = scriptForm;
        if (!generatedEbook) return alert('생성된 내용이 없습니다.');
        if (!bookId) return alert('Book ID가 없습니다.');

        setIsLoadingEbook(true);
        try {
            await setDoc(doc(db, 'ebooks', bookId), {
                content: generatedEbook,
                title,
                author,
                updatedAt: serverTimestamp()
            });
            await setDoc(doc(db, 'book_overrides', bookId), {
                isEbook: true,
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert('Firestore에 E-book이 성공적으로 저장되었습니다.');
        } catch (e) {
            alert('저장 실패: ' + e.message);
        } finally {
            setIsLoadingEbook(false);
        }
    };

    const handleSyncLocalScript = async () => {
        const bookId = scriptForm.bookId;
        if (!bookId) return alert('Book ID를 먼저 선택하세요.');
        const localScript = bookScripts[bookId];
        if (!localScript || !localScript.length) return alert(`bookScripts에 '${bookId}' 대본이 없습니다.`);
        if (!confirm(`로컬 bookScripts.js의 '${bookId}' 대본 (${localScript.length}턴)을 Firestore에 저장합니다.`)) return;
        setIsLoadingScript(true);
        try {
            await setDoc(doc(db, 'scripts', bookId), {
                lines: localScript,
                title: scriptForm.title,
                author: scriptForm.author,
                updatedAt: serverTimestamp()
            });
            setExistingScript(localScript);
            setGeneratedScript(localScript);
            setScriptLogs(prev => [...prev, `로컬 대본 Firestore 동기화 완료 (${localScript.length}턴)`]);
            alert(`완료! ${localScript.length}턴 대본이 저장되었습니다.`);
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
            setScriptLogs(prev => [...prev, `'${bookId}' 대본이 삭제되었습니다.`]);
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

    const parseTxtScript = (raw) => {
        const sA = scriptForm.speakerA || '제임스';
        const sB = scriptForm.speakerB || '스텔라';
        const result = [];

        // 개별 라인별로 정밀하게 분석 (줄바꿈 하나여도 처리 가능하게)
        const allLines = raw.split('\n').map(l => l.trim());
        let currentSpeaker = '';
        let currentText = '';

        for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            if (!line) continue;

            // 정규식 1: [1] 제임스 형태 (대괄호와 번호 포함)
            const m1 = line.match(/^\[?\d+\]?\s*(.+)$/);
            // 정규식 2: 제임스: 대사 형태 (콜론 구분)
            const m2 = line.match(/^([^:：\[]{1,20})[:：]\s*(.*)$/);
            // 정규식 3: [제임스] 대사 형태
            const m3 = line.match(/^\[([^\]]{1,15})\]\s*(.*)$/);

            if (m1) {
                if (currentSpeaker && currentText) result.push({ speaker: currentSpeaker, text: currentText.trim() });
                currentSpeaker = m1[1].trim();
                currentText = '';
            } else if (m2) {
                if (currentSpeaker && currentText) result.push({ speaker: currentSpeaker, text: currentText.trim() });
                currentSpeaker = m2[1].trim();
                currentText = m2[2].trim();
            } else if (m3) {
                if (currentSpeaker && currentText) result.push({ speaker: currentSpeaker, text: currentText.trim() });
                currentSpeaker = m3[1].trim();
                currentText = m3[2].trim();
            } else {
                // 위 패턴에 해당하지 않는데 이미 화자가 선택된 상태라면 텍스트로 누적
                if (currentSpeaker) {
                    currentText += (currentText ? '\n' : '') + line;
                } else {
                    // 화자가 아직 없는데 첫 줄이 제임스/스텔라 이름이라면 화자로 지정
                    if (line.length <= 15 && (line.includes(sA) || line.includes(sB))) {
                        currentSpeaker = line;
                    }
                }
            }
        }
        // 마지막 버퍼 추가
        if (currentSpeaker && currentText) {
            result.push({ speaker: currentSpeaker, text: currentText.trim() });
        }

        // 결과가 0개면 최후의 수단으로 빈 줄(더블 개행) 기반 블록 파싱 시도
        if (result.length === 0) {
            const blocks = raw.split(/\n{2,}/);
            for (const b of blocks) {
                const lines = b.trim().split('\n');
                if (lines.length >= 2) {
                    const sp = lines[0].trim();
                    if (sp.length <= 15) {
                        result.push({ speaker: sp, text: lines.slice(1).join('\n').trim() });
                    }
                }
            }
        }

        return result;
    };

    const handleTxtImport = (text) => {
        const lines = parseTxtScript(text);
        if (!lines.length) return alert('대본을 파싱할 수 없습니다.\n지원 형식:\n• [1] 제임스\\n대사\n• 제임스: 대사\n• [제임스] 대사');
        setGeneratedScript(lines);
        setExistingScript(null); // 기존 대본 있음 알림 제거
        setScriptLogs([`📄 TXT 업로드 완료 — ${lines.length}턴 파싱됨. 오른쪽 STEP 3에서 확인하세요.`]);

        // STEP 3 미리보기 위치로 부드럽게 스크롤
        setTimeout(() => {
            const el = document.getElementById('step3-preview');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
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
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
            setVoiceLogs(prev => [...prev, `[FILE] ${file.name} (${fileSizeMB}MB) LOADED`]);
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
        const preview = "[등록 정보 확인]\n\n" +
            "Book ID: " + newBookReg.bookId + "\n" +
            "제목: " + newBookReg.title + "\n" +
            "저자: " + newBookReg.author + "\n" +
            "셀럽: " + celeb + "\n" +
            "카테고리: " + category + "\n" +
            "섹션: " + (SECTIONS.find(s => s.id === newBookReg.section)?.name) + "\n" +
            "설명: " + (newBookReg.desc || "(자동 생성)") + "\n" +
            "구매링크: " + (newBookReg.purchaseLink || "(없음)") + "\n" +
            "AI 대본 생성: " + (autoGenScript ? "자동 생성" : "생략") + "\n\n" +
            "이 정보로 등록하시겠습니까?";
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
        const socket = io('http://127.0.0.1:3001', {
            reconnection: false,
            timeout: 3000,
        });
        socket.on('connect_error', () => { /* 로컬 서버 없으면 무시 */ });
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
            if (data?.script && Array.isArray(data.script)) setGeneratedScript(data.script);
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
                    <span className="text-[9px] text-yellow-400"> (AI 대본 생성 탭에서 API 키 필요)</span>
                )}
                {autoGenScript && scriptApiKey && (
                    <span className="text-[9px] text-emerald-400"> (API 키 준비됨)</span>
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
        'automation': '일괄 자동화 ⚡',
        'members': '회원 관리',
        'books': '도서 관리',
        'popular': '인기 아카이뷰',
        'script': 'AI 대본 생성',
        'ebook': 'E-BOOK 제작',
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
                                <h1 className="text-white font-black text-xl tracking-tight uppercase flex items-center gap-3">
                                    Control Center 
                                    <span className="bg-gold text-primary text-[10px] px-2 py-0.5 rounded-full font-black tracking-widest leading-none">V1.5B</span>
                                </h1>
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
                                    {tab === 'dashboard' ? 'dashboard' : tab === 'members' ? 'group' : tab === 'books' ? 'menu_book' : tab === 'popular' ? 'trending_up' : tab === 'script' ? 'draw' : tab === 'ebook' ? 'auto_stories' : tab === 'podcast' ? 'podcasts' : tab === 'voice' ? 'record_voice_over' : tab === 'sales' ? 'payments' : tab === 'automation' ? 'smart_button' : 'settings'}
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
                                                        // Firestore override description을 직접 참조 (가장 신뢰도 높음)
                                                        const firestoreDesc = overrides[selected.id]?.description || '';
                                                        const bookDesc = selected.description || selected.desc || '';
                                                        const description = firestoreDesc || bookDesc;

                                                        const themeMatches = (selected.review || '').match(/■\s*핵심\s*주제\s*\d+[^:：]*[:：]\s*([^\n]+)/g);
                                                        const regexThemes = themeMatches
                                                            ? themeMatches.map(m => m.replace(/■\s*핵심\s*주제\s*\d+[^:：]*[:：]\s*/, '').trim()).join('\n')
                                                            : '';
                                                        setScriptForm(p => ({
                                                            ...p,
                                                            bookId: selected.id,
                                                            title: selected.title || '',
                                                            author: selected.author || '',
                                                            themes: description || regexThemes,
                                                        }));
                                                        // Firestore만 확인 — 삭제 후 재선택 시 정확히 반영
                                                        try {
                                                            const snap = await getDoc(doc(db, 'scripts', selected.id));
                                                            if (snap.exists()) {
                                                                const data = snap.data();
                                                                const script = data.script || data.lines || data.content || null;
                                                                if (script && Array.isArray(script) && script.length > 0) {
                                                                    setExistingScript(script);
                                                                } else {
                                                                    setExistingScript(null);
                                                                }
                                                            } else {
                                                                setExistingScript(null);
                                                            }
                                                        } catch (e) {
                                                            setExistingScript(null);
                                                        }
                                                    }
                                                }}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50"
                                            >
                                                <option value="">— 도서를 선택하세요 —</option>
                                                {Array.isArray(getAllBooks(true)) && getAllBooks(true).map(b => (
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
                                            {/* 로컬 bookScripts.js → Firestore 동기화 */}
                                            {scriptForm.bookId && bookScripts[scriptForm.bookId] && (
                                                <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-blue-400 text-sm">sync</span>
                                                        <span className="text-blue-400 text-xs font-bold">로컬 대본 ({bookScripts[scriptForm.bookId].length}턴) → Firestore 동기화</span>
                                                    </div>
                                                    <button
                                                        onClick={handleSyncLocalScript}
                                                        className="text-xs font-black text-blue-300 bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg transition-all"
                                                    >
                                                        동기화
                                                    </button>
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

                                        {/* TXT 직접 업로드 */}
                                        <div className="flex items-center gap-3 pt-2">
                                            <div className="h-px flex-1 bg-white/10"></div>
                                            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest px-2">또는 TXT 직접 업로드</span>
                                            <div className="h-px flex-1 bg-white/10"></div>
                                        </div>
                                        <div className="flex items-center gap-2 -mb-1">
                                            <span className="material-symbols-outlined text-sky-400 text-base">upload_file</span>
                                            <p className="text-sky-400 text-xs font-black uppercase tracking-widest">TXT 파일 → 카카오 대본 자동 변환</p>
                                        </div>
                                        <div
                                            className="border-2 border-dashed border-sky-500/20 rounded-2xl p-6 text-center hover:border-sky-500/50 hover:bg-sky-500/5 transition-all cursor-pointer group"
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={e => {
                                                e.preventDefault();
                                                const file = e.dataTransfer.files[0];
                                                if (!file || !file.name.endsWith('.txt')) return alert('.txt 파일만 지원합니다.');
                                                const reader = new FileReader();
                                                reader.onload = ev => handleTxtImport(ev.target.result);
                                                reader.readAsText(file, 'utf-8');
                                            }}
                                            onClick={() => document.getElementById('txt-upload-input').click()}
                                        >
                                            <span className="material-symbols-outlined text-slate-600 group-hover:text-sky-400 text-4xl mb-2 block transition-colors">draft</span>
                                            <p className="text-slate-400 text-sm font-bold">클릭 또는 드래그 드롭</p>
                                            <p className="text-slate-600 text-xs mt-1 font-mono">[1] 제임스 · 대사 형식</p>
                                        </div>
                                        <input
                                            id="txt-upload-input"
                                            type="file"
                                            accept=".txt"
                                            className="hidden"
                                            onChange={e => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = ev => handleTxtImport(ev.target.result);
                                                reader.readAsText(file, 'utf-8');
                                                e.target.value = '';
                                            }}
                                        />
                                        {selectedSituation && (
                                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                                                <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-1">SCENE SETTING</p>
                                                <p className="text-amber-200 text-sm font-medium">{selectedSituation.scene}</p>
                                                <p className="text-amber-500 text-xs mt-1">CLOSING: "{selectedSituation.close}"</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={handleGenerateScript}
                                            disabled={isGeneratingScript}
                                            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all ${isGeneratingScript ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-emerald-500/20'}`}
                                        >
                                            {isGeneratingScript ? (
                                                <>
                                                    <span className="material-symbols-outlined animate-spin text-2xl">settings_accent</span>
                                                    {scriptProgress >= 88 ? `SPELL CHECKING... (${scriptProgress}%)` : `GENERATING (${scriptProgress}%)`}
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                                                    GENERATE SCRIPT
                                                </>
                                            )}
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
                                                {Array.isArray(scriptLogs) && scriptLogs.map((log, i) => (
                                                    <p key={i} className={`text-xs font-mono ${String(log).includes('❌') ? 'text-red-400' : String(log).includes('✨') ? 'text-emerald-400' : String(log).includes('📝') || String(log).includes('맞춤법') ? 'text-yellow-400' : 'text-slate-400'}`}>{String(log)}</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT — 대본 미리보기 + 다운로드 */}
                                <div className="space-y-6">
                                    <div className="bg-white/3 border border-white/8 rounded-[24px] p-8">
                                        <div className="flex items-center justify-between mb-5">
                                            <p id="step3-preview" className="text-emerald-400 text-xs font-black uppercase tracking-widest">STEP 3 · 대본 미리보기</p>
                                            {Array.isArray(generatedScript) && generatedScript.length > 0 && (
                                                <span className="text-slate-500 text-xs">{generatedScript.length}턴 · {generatedScript.reduce((s, t) => s + (t?.text ? t.text.replace(/[\s\uFEFF\xA0]/g, '').length : 0), 0).toLocaleString()}자</span>
                                            )}
                                        </div>

                                        {(!Array.isArray(generatedScript) || generatedScript.length === 0) ? (
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
                                                    {Array.isArray(generatedScript) && generatedScript.map((line, i) => {
                                                        if (!line) return null;
                                                        const isSpeakerA = line.speaker === (scriptForm.speakerA || 'James');
                                                        return (
                                                        <div key={i} className={`flex gap-3 ${isSpeakerA ? '' : 'flex-row-reverse'}`}>
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
                                                        );
                                                    })}
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
                                                            <p className="text-slate-500 text-xs font-bold mt-1">각 대사의 텍스트를 자유롭게 수정하세요. (턴 수: {Array.isArray(generatedScript) ? generatedScript.length : 0})</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setIsScriptEditorOpen(false)}
                                                            className="size-12 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined">close</span>
                                                        </button>
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-black/20">
                                                        {Array.isArray(generatedScript) && generatedScript.map((line, idx) => {
                                                            if (!line) return null;
                                                            const isSpeakerA = line.speaker === (scriptForm.speakerA || 'James');
                                                            return (
                                                            <div key={idx} className="flex gap-4 group">
                                                                <div className="w-20 shrink-0 text-right space-y-1 pt-3">
                                                                    <p className={`text-[10px] font-black uppercase ${isSpeakerA ? 'text-blue-400' : 'text-pink-400'}`}>{line.speaker || '?'}</p>
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
                                                            );
                                                        })}
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
                                    {Array.isArray(generatedScript) && generatedScript.length > 0 && (
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

                                            {/* 목소리 선택 */}
                                            {(() => {
                                                const maleVoices = ['Charon', 'Fenrir', 'Orus', 'Puck'];
                                                const femaleVoices = ['Kore', 'Aoede', 'Zephyr', 'Leda'];
                                                return (
                                                    <div className="space-y-3 bg-black/30 rounded-xl p-3">
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">목소리 선택</p>
                                                        {/* 남성 */}
                                                        <div>
                                                            <p className="text-xs text-slate-500 mb-1.5">🎙 남성 ({scriptForm.speakerA || '제임스'})</p>
                                                            <div className="flex gap-1.5 flex-wrap">
                                                                {maleVoices.map(v => (
                                                                    <div key={v} className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => setVoiceA(v)}
                                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${voiceA === v ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40' : 'bg-black/40 text-slate-500 hover:text-slate-300'}`}
                                                                        >
                                                                            {v}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handlePreviewVoice('A', v)}
                                                                            disabled={isPreviewingVoice !== null}
                                                                            className="w-6 h-6 flex items-center justify-center rounded-md bg-black/40 text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-all"
                                                                            title={`${v} 미리 듣기`}
                                                                        >
                                                                            {isPreviewingVoice === `A-${v}` ? (
                                                                                <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                                                                            ) : (
                                                                                <span className="material-symbols-outlined text-xs">play_arrow</span>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {/* 여성 */}
                                                        <div>
                                                            <p className="text-xs text-slate-500 mb-1.5">🎙 여성 ({scriptForm.speakerB || '스텔라'})</p>
                                                            <div className="flex gap-1.5 flex-wrap">
                                                                {femaleVoices.map(v => (
                                                                    <div key={v} className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => setVoiceB(v)}
                                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${voiceB === v ? 'bg-pink-500/30 text-pink-300 border border-pink-500/40' : 'bg-black/40 text-slate-500 hover:text-slate-300'}`}
                                                                        >
                                                                            {v}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handlePreviewVoice('B', v)}
                                                                            disabled={isPreviewingVoice !== null}
                                                                            className="w-6 h-6 flex items-center justify-center rounded-md bg-black/40 text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-all"
                                                                            title={`${v} 미리 듣기`}
                                                                        >
                                                                            {isPreviewingVoice === `B-${v}` ? (
                                                                                <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                                                                            ) : (
                                                                                <span className="material-symbols-outlined text-xs">play_arrow</span>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

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
                    {activeTab === 'ebook' && (
                        <div className="space-y-12 animate-fade-in">
                            <div className="flex justify-between items-end">
                                <div className="space-y-3">
                                    <h3 className="text-white font-black text-5xl italic tracking-tighter uppercase">E-Book Factory</h3>
                                    <p className="text-slate-500 text-xl font-medium italic">전문가 수준의 인사이트 에세이를 생성하고 관리합니다.</p>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowEbookPreviewModal(true)}
                                        disabled={!generatedEbook}
                                        className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black text-white hover:bg-white/10 transition-all uppercase tracking-widest disabled:opacity-30"
                                    >
                                        PREVIEW BOOK
                                    </button>
                                    <button
                                        onClick={handleSaveEbook}
                                        disabled={!generatedEbook || isLoadingEbook}
                                        className="px-10 py-4 bg-gold text-primary rounded-2xl text-xs font-black hover:scale-105 transition-all shadow-xl uppercase tracking-widest disabled:opacity-50"
                                    >
                                        {isLoadingEbook ? 'SAVING...' : 'SAVE TO FIRESTORE'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* Left: Config & Selection */}
                                <div className="space-y-8">
                                    <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-xl">
                                        <h4 className="text-white font-black text-xl mb-8 flex items-center gap-4">
                                            <span className="material-symbols-outlined text-gold">auto_awesome</span>
                                            ESSAY GENERATION
                                        </h4>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Book</label>
                                                <select
                                                    value={scriptForm.bookId}
                                                    onChange={(e) => {
                                                        const book = realBooks.find(b => b.id === e.target.value);
                                                        if (book) {
                                                            setScriptForm(prev => ({
                                                                ...prev,
                                                                bookId: book.id,
                                                                title: book.title,
                                                                author: book.author,
                                                                themes: book.description || ''
                                                            }));
                                                            // Load existing ebook if any
                                                            const checkExisting = async () => {
                                                                const docSnap = await getDoc(doc(db, 'ebooks', book.id));
                                                                if (docSnap.exists()) {
                                                                    setGeneratedEbook(docSnap.data().content);
                                                                    setExistingEbook(docSnap.data());
                                                                } else {
                                                                    setGeneratedEbook('');
                                                                    setExistingEbook(null);
                                                                }
                                                            };
                                                            checkExisting();
                                                        }
                                                    }}
                                                    className="w-full bg-black/60 border-2 border-white/5 rounded-2xl px-6 py-4 text-white focus:border-gold outline-none transition-all font-bold"
                                                >
                                                    <option value="">도서를 선택하세요</option>
                                                    {realBooks.map(b => (
                                                        <option key={b.id} value={b.id}>{b.title} ({b.author})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="p-6 bg-gold/5 border border-gold/10 rounded-3xl space-y-4">
                                                <div className="flex items-center gap-3 text-gold">
                                                    <span className="material-symbols-outlined text-sm">info</span>
                                                    <span className="text-[10px] font-black uppercase tracking-tighter">AI Generation Rules (30/70 Ratio)</span>
                                                </div>
                                                <ul className="text-[11px] text-slate-400 space-y-2 font-medium">
                                                    <li>• 도서 내용(30%) + 독창적 인사이트(70%)</li>
                                                    <li>• 전문 비평가 페르소나 (수다·대화 절대 금지)</li>
                                                    <li>• 도입-본문-실행지침-결론의 에세이 구조</li>
                                                    <li>• 모바일 최적화된 문단 나누기 적용</li>
                                                </ul>
                                            </div>

                                            <button
                                                onClick={handleGenerateEbook}
                                                disabled={isGeneratingEbook || !scriptForm.bookId}
                                                className={`w-full py-6 rounded-2xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-2xl ${
                                                    isGeneratingEbook || !scriptForm.bookId
                                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-gold to-amber-500 text-primary hover:scale-[1.02] active:scale-[0.98]'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-2xl font-black">{isGeneratingEbook ? 'sync' : 'magic_button'}</span>
                                                {isGeneratingEbook ? 'GENERATING...' : 'GENERATE INSIGHT ESSAY'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Logs */}
                                    <div className="bg-black/40 border border-white/5 rounded-[32px] p-8 h-64 overflow-y-auto font-mono text-[10px] space-y-2">
                                        {ebookLogs.map((log, i) => (
                                            <div key={i} className={`flex gap-3 ${log.startsWith('❌') ? 'text-red-400' : log.startsWith('✅') ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                <span className="opacity-30">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                                                <span>{log}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: Preview / Editor */}
                                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[48px] overflow-hidden flex flex-col h-[800px] shadow-2xl relative">
                                    <div className="bg-white/5 px-10 py-6 border-b border-white/10 flex items-center justify-between">
                                        <h4 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-3">
                                            <span className="material-symbols-outlined text-gold">edit_note</span>
                                            ESSAY CONTENT EDITOR
                                        </h4>
                                        <div className="flex items-center gap-4">
                                            {existingEbook && <span className="text-[10px] font-black text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">FIRESTORE SYNCED</span>}
                                            {!existingEbook && generatedEbook && <span className="text-[10px] font-black text-amber-500 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">UNSAVED DRAFT</span>}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-hidden p-8">
                                        <textarea
                                            value={generatedEbook}
                                            onChange={(e) => setGeneratedEbook(e.target.value)}
                                            placeholder="AI가 생성한 에세이 내용이 여기에 표시됩니다. HTML 형식을 직접 수정할 수 있습니다."
                                            className="w-full h-full bg-black/40 border-2 border-white/5 rounded-3xl p-10 text-slate-300 font-medium text-lg focus:border-gold/50 outline-none transition-all resize-none leading-relaxed scrollbar-hide"
                                        />
                                    </div>

                                    {/* Overlay for generation */}
                                    {isGeneratingEbook && (
                                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-8">
                                            <div className="size-24 border-8 border-gold/20 border-t-gold rounded-full animate-spin"></div>
                                            <div className="text-center">
                                                <h5 className="text-white font-black text-2xl mb-2">통찰을 엮는 중...</h5>
                                                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Gemini 2.5 Flash is thinking</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

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

                {/* E-book Preview Modal: Redesigned with Premium Horizontal Paging */}
                {showEbookPreviewModal && (
                    <div className="fixed inset-0 z-[2000] bg-[#050608]/98 backdrop-blur-3xl flex items-center justify-center p-4 md:p-10 transition-all animate-fade-in">
                        <div className="absolute top-8 right-8 z-50">
                            <button
                                onClick={() => setShowEbookPreviewModal(false)}
                                className="size-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-gold hover:text-primary transition-all shadow-2xl group"
                            >
                                <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform">close</span>
                            </button>
                        </div>

                        <div className="w-full max-w-[500px] h-[85vh] bg-black border border-gold/30 rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col relative ring-1 ring-gold/20">
                            {/* Paper Texture Overlay */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/p6.png')]"></div>
                            
                            {/* Horizontal Snap Scroll Container */}
                            <div 
                                id="ebook-paging-container"
                                className="flex-1 flex overflow-x-auto scroll-snap-type-x-mandatory scrollbar-hide scroll-smooth"
                                style={{
                                    scrollSnapType: 'x mandatory',
                                    WebkitOverflowScrolling: 'touch'
                                }}
                            >
                                {/* [Slide] Cover Page */}
                                <div className="min-w-full h-full flex-shrink-0 scroll-snap-align-start p-12 flex flex-col items-center justify-center text-center relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gold/10 blur-[100px] rounded-full"></div>
                                    <div className="z-10 space-y-10">
                                        <div className="size-24 bg-gold/5 rounded-[40px] flex items-center justify-center mx-auto border border-gold/20 shadow-2xl">
                                            <span className="material-symbols-outlined text-gold text-5xl">auto_stories</span>
                                        </div>
                                        <h1 className="text-white font-black text-5xl uppercase tracking-tighter leading-tight">{scriptForm.title}</h1>
                                        <div className="space-y-2">
                                            <p className="text-gold font-bold text-xl uppercase tracking-[0.3em]">{scriptForm.author}</p>
                                            <div className="w-16 h-[2px] bg-gold/30 mx-auto mt-4"></div>
                                        </div>
                                        <p className="text-slate-500 font-medium italic text-lg px-6 leading-relaxed">
                                            "통찰의 아카이브, 당신의 성장을 위한 기록"
                                        </p>
                                    </div>
                                </div>

                                {/* [Slide] Main Content - Dynamically split if sections exist, otherwise one long scrollable page */}
                                <div className="min-w-full h-full flex-shrink-0 scroll-snap-align-start p-10 overflow-y-auto custom-scrollbar">
                                    <div className="prose prose-invert max-w-none font-serif">
                                        <div
                                            dangerouslySetInnerHTML={{ __html: generatedEbook }}
                                            className="ebook-content-body text-xl leading-[2.1] text-slate-200"
                                            style={{ wordBreak: 'break-word' }}
                                        />
                                    </div>
                                </div>

                                {/* [Slide] End Page */}
                                <div className="min-w-full h-full flex-shrink-0 scroll-snap-align-start p-16 flex flex-col items-center justify-center text-center space-y-12 bg-white/[0.02]">
                                    <div className="w-20 h-20 border border-gold/20 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-gold/50 text-3xl">local_library</span>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-gold font-black text-3xl uppercase tracking-[0.4em]">FINISH</h4>
                                        <p className="text-slate-500 text-lg">아카이뷰와 함께해주셔서 감사합니다.</p>
                                    </div>
                                    <div className="space-y-2 opacity-50 border-t border-white/10 pt-10 w-full max-w-xs mx-auto">
                                        <p className="text-white text-sm font-bold uppercase">{scriptForm.title}</p>
                                        <p className="text-slate-400 text-xs font-medium">{scriptForm.author}</p>
                                        <p className="text-gold text-[10px] font-black tracking-[0.5em] mt-6">THE ARCHIVIEW PUBLISHING</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Controls */}
                            <div className="px-10 py-8 bg-black/50 border-t border-white/5 backdrop-blur-md flex justify-between items-center z-50">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            const container = document.getElementById('ebook-paging-container');
                                            container.scrollBy({ left: -container.offsetWidth, behavior: 'smooth' });
                                        }}
                                        className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gold hover:bg-gold hover:text-primary transition-all"
                                    >
                                        <span className="material-symbols-outlined">arrow_back_ios_new</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const container = document.getElementById('ebook-paging-container');
                                            container.scrollBy({ left: container.offsetWidth, behavior: 'smooth' });
                                        }}
                                        className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gold hover:bg-gold hover:text-primary transition-all"
                                    >
                                        <span className="material-symbols-outlined">arrow_forward_ios</span>
                                    </button>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-gold uppercase tracking-[0.2em] block mb-1">PREMIUM READER v1.0</span>
                                    <div className="flex gap-1 justify-end">
                                        <div className="size-1.5 bg-gold rounded-full"></div>
                                        <div className="size-1.5 bg-white/10 rounded-full"></div>
                                        <div className="size-1.5 bg-white/10 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <style>{`
                            .scroll-snap-type-x-mandatory { scroll-snap-type: x mandatory; }
                            .scroll-snap-align-start { scroll-snap-align: start; }
                            .scrollbar-hide::-webkit-scrollbar { display: none; }
                            .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                            
                            .ebook-content-body h1 { font-size: 2.2rem; font-weight: 900; color: #fff; margin-bottom: 2.5rem; line-height: 1.1; background: linear-gradient(to right, #d4af37, #fff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                            .ebook-content-body h2 { font-size: 1.6rem; font-weight: 800; color: #d4af37; margin-top: 4rem; margin-bottom: 1.8rem; border-left: 4px solid #d4af37; padding-left: 1.5rem; line-height: 1.3; }
                            .ebook-content-body p { margin-bottom: 2.5rem; }
                            
                            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212, 175, 55, 0.2); border-radius: 10px; }
                        `}</style>
                    </div>
                )}
                
                    {/* 일괄 자동화 관리 탭 */}
                    {activeTab === 'automation' && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="flex justify-between items-end">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                                        <div className="size-2 rounded-full bg-red-400 animate-ping"></div>
                                        <span className="text-red-400 text-[10px] font-black uppercase tracking-widest">Batch Automation Engine</span>
                                    </div>
                                    <h3 className="text-white font-black text-5xl italic tracking-tighter uppercase">일괄 자동화</h3>
                                    <p className="text-slate-500 text-lg font-medium">다중 도서를 선택하여 대본/TTS 및 E-BOOK을 일괄 생성합니다</p>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-[40px] border border-white/10 p-10 space-y-8 backdrop-blur-xl flex flex-col items-center justify-center min-h-[500px]">
                                <h4 className="text-white font-bold text-xl">자동화 대상 도서 선택</h4>
                                <div className="w-full max-h-[400px] overflow-y-auto pr-4 scrollbar-hide space-y-2">
                                    {realBooks.map(book => (
                                        <label key={book.id} className="flex flex-row items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/10 transition-all">
                                            <input 
                                                type="checkbox" 
                                                className="w-5 h-5 accent-gold cursor-pointer"
                                                checked={selectedBatchBooks.includes(book.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedBatchBooks(prev => [...prev, book.id]);
                                                    else setSelectedBatchBooks(prev => prev.filter(id => id !== book.id));
                                                }}
                                            />
                                            <div className="flex-1">
                                                <p className="font-bold text-white">{book.title}</p>
                                                <p className="text-xs text-slate-400">{book.id}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                
                                <div className="w-full flex flex-wrap gap-4 pt-6 border-t border-white/10">
                                    <button 
                                        onClick={() => setSelectedBatchBooks(realBooks.map(b => b.id))}
                                        className="px-6 py-3 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 transition-all"
                                    >전체 선택</button>
                                    <button 
                                        onClick={() => setSelectedBatchBooks([])}
                                        className="px-6 py-3 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 transition-all"
                                    >선택 해제</button>
                                    <div className="flex-1"></div>
                                    <button 
                                        onClick={() => alert('대본/TTS 자동화 백그라운드 작업 시작 중...')}
                                        className="px-8 py-3 rounded-xl flex items-center gap-2 bg-white text-black font-black hover:bg-gold transition-all"
                                    ><span className="material-symbols-outlined">play_arrow</span> 대본/TTS 일괄 생성</button>
                                    <button 
                                        onClick={() => alert('E-BOOK 자동화 백그라운드 작업 시작 중...')}
                                        className="px-8 py-3 rounded-xl flex items-center gap-2 bg-gold text-primary font-black hover:scale-105 transition-all shadow-xl shadow-gold/20"
                                    ><span className="material-symbols-outlined">auto_stories</span> E-BOOK 일괄 생성</button>
                                </div>
                            </div>
                        </div>
                    )}
</main>

                {/* PC 환경에서는 하단 바를 숨기거나 다르게 처리 */}
                <div className="lg:hidden">
                    <BottomNavigation />
                </div>
            </div>
        </div>
    );
}
