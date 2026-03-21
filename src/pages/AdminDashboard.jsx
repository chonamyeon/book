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

// 컴포넌트 외부 상수 — 매 렌더마다 재생성 방지
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
const CATEGORIES = ['자기계발', '경제', '경영', '인문', '심리'];
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
    // ── 배치 전용 상태 ─────────────────────────────────────────
    const [batchLogs, setBatchLogs] = useState([]);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const [batchMode, setBatchMode] = useState('full'); // 'full' | 'tts-only'
    const [batchBookStatuses, setBatchBookStatuses] = useState({});
    // { [bookId]: 'pending'|'generating'|'tts'|'done'|'error'|'skipped' }
    const [batchScriptStatuses, setBatchScriptStatuses] = useState({});
    // { [bookId]: true(있음) | false(없음) } — 탭 진입 시 Firestore 일괄 조회
    const [batchOptimizedStatuses, setBatchOptimizedStatuses] = useState({});
    // { [bookId]: boolean } — optimizedAt 필드 있으면 true
    const [batchScriptPreview, setBatchScriptPreview] = useState(null);
    // { bookId, title, script: [{speaker, text}] } | null
    const { getAllBooks, loading: booksLoading, overrides } = useBookData();
    // bookScripts — 대본 관련 탭 진입 시 동적 로드 (221KB 초기 번들 제외)
    const [bookScripts, setBookScripts] = useState({});

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
    const [popularSubTab, setPopularSubTab] = useState('popular');
    const [sectionData, setSectionData] = useState({ weekly_focus: [], weekly_viewed: [], growth: [], economy: [], business: [], humanities: [], psychology: [] });
    const [sectionSearch, setSectionSearch] = useState({ weekly_focus: '', weekly_viewed: '', growth: '', economy: '', business: '', humanities: '', psychology: '' });
    const [sectionSaving, setSectionSaving] = useState({ weekly_focus: false, weekly_viewed: false, growth: false, economy: false, business: false, humanities: false, psychology: false });


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

    // 5. Listen for Section Rankings
    useEffect(() => {
        const SECTION_DB_MAP = { weekly_focus: 'weekly_focus', weekly_viewed: 'weekly_most_viewed', growth: 'category_growth', economy: 'category_economy', business: 'category_business', humanities: 'category_humanities', psychology: 'category_psychology' };
        const unsubs = Object.entries(SECTION_DB_MAP).map(([key, dbKey]) =>
            onSnapshot(doc(db, 'site_config', dbKey), (snap) => {
                if (snap.exists() && snap.data().books?.length) setSectionData(prev => ({ ...prev, [key]: snap.data().books }));
            })
        );
        return () => unsubs.forEach(u => u());
    }, []);

    // 6. Listen for YouTube Videos
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'youtube_videos'), (snap) => {
            const videos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            videos.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setYoutubeVideos(videos);
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
    const [booksPage, setBooksPage] = useState(0);
    const BOOKS_PER_PAGE = 20;

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
    const ffmpegRef = React.useRef(null);

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
            const { FFmpeg } = await import('@ffmpeg/ffmpeg');
            const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
            if (!ffmpegRef.current) ffmpegRef.current = new FFmpeg();
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

    // automation 탭 진입 시 Firestore 대본 존재 여부 일괄 조회
    useEffect(() => {
        if (activeTab !== 'automation' || !realBooks.length) return;
        const checkAll = async () => {
            const results = {};
            const optimized = {};
            await Promise.all(realBooks.map(async (book) => {
                try {
                    const snap = await getDoc(doc(db, 'scripts', book.id));
                    if (snap.exists()) {
                        const data = snap.data();
                        const script = data.script || data.lines || data.content || null;
                        results[book.id] = !!(script && Array.isArray(script) && script.length > 0);
                        optimized[book.id] = !!(data.optimizedAt);
                    } else {
                        results[book.id] = false;
                        optimized[book.id] = false;
                    }
                } catch {
                    results[book.id] = false;
                    optimized[book.id] = false;
                }
            }));
            setBatchScriptStatuses(results);
            setBatchOptimizedStatuses(optimized);
        };
        checkAll();
    }, [activeTab, realBooks.length]);

    // bookScripts 동적 로드 — 대본/자동화/성우 탭 진입 시 204KB 청크 로드
    useEffect(() => {
        if (['script', 'automation', 'voice'].includes(activeTab) && Object.keys(bookScripts).length === 0) {
            import('../data/bookScripts').then(m => setBookScripts(m.bookScripts || {}));
        }
    }, [activeTab]);

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

    // ── TTS 텍스트 최적화 (Gemini Flash) — 단일·배치 공용 ────────
    const optimizeScriptForTts = async (script, logFn) => {
        const key = import.meta.env.VITE_GEMINI_API_KEY;
        if (!key) { logFn?.('⚠️ Gemini 키 없음 — 최적화 건너뜀'); return script; }
        const prompt = `너는 한국어 팟캐스트 대본을 TTS 음성 합성에 최적화하는 전문가야.
아래 JSON 대본을 받아서, TTS가 자연스럽고 명확하게 읽을 수 있도록 text 필드만 수정해.

━━━ 절대 규칙 ━━━
① speaker 필드 절대 변경 금지
② 턴 수 절대 변경 금지 (추가·삭제·병합 불가)
③ 내용·유머·핵심 메시지 100% 유지
④ 괄호 지시문 추가 절대 금지 — (웃음), (한숨), (행동묘사) 등 일절 넣지 마
⑤ 원본에 없는 새 내용 추가 금지
⑥ ⚠️ 존댓말 어미 완전 제거 (최우선): ~요, ~습니다, ~세요, ~군요, ~네요, ~거든요, ~잖아요, ~하죠, ~죠 → 전부 반말로 교체
   예) "맞아요" → "맞아" / "그렇죠" → "그렇지" / "재밌거든요" → "재밌거든" / "힘들잖아요" → "힘들잖아"

━━━ text 수정 규칙 ━━━

[문장 길이]
- 한 호흡에 읽기 어려운 긴 문장은 짧게 끊어라
- 기준: 쉼표 없이 30자 이상 이어지면 끊어야 함
- 끊을 때는 의미 단위로 끊고, 자연스러운 구어체 흐름 유지
  나쁜 예: "셀던이 계산해보니까 이대로 가면 3만 년짜리 암흑기가 오고 문명이 통째로 리셋된다는 거야."
  좋은 예: "셀던이 계산해봤더니, 이대로 가면 삼만 년 암흑기가 온대. 문명이 통째로 리셋되는 거지."

[숫자·영어 한글 변환]
- 모든 숫자를 한글 발음으로 변환: 3만→삼만 / 1천→천 / 80년→팔십 년 / 2024→이천이십사
- 영어 약어를 발음 표기로 변환: CEO→씨이오 / SNS→에스엔에스 / SF→에스에프 / USB→유에스비

[TTS가 이상하게 읽는 표기 제거]
- ㅋㅋㅋ, ㅎㅎ → 완전히 삭제 (웃음의 맥락은 문장 톤으로 유지)
- ... → 마침표(.) 또는 쉼표(,)로 교체
- ~ → 삭제 또는 문장 끝에 "." 처리
- !! 연속 → ! 하나로 통일

[구어체 유지]
- "~잖아요" "~거든요" "~거야" 같은 구어체 말투 절대 격식체로 바꾸지 마
- 직장인 유머·비유·위트 100% 살릴 것
- "어", "근데", "아" 같은 자연스러운 추임새 유지

━━━ 화자 역할 교정 규칙 ━━━
이 규칙들은 내용 변경이 허용되는 예외 구간이야.

[스텔라 정체성 교정 — 최우선]
스텔라는 이 책을 읽은 적 없고, 대화를 통해 처음 내용을 듣는 사람이야. 이 정체성이 처음부터 끝까지 유지되어야 해.
- 스텔라 위반 표현 (즉시 교체 필수): "내가 이 책 읽었을 때", "이 부분이 좋았어", "나도 이거 읽어봤는데", "그 챕터에서", "읽으면서 느꼈는데" 등 책 내용을 직접 아는 것처럼 말하는 모든 표현
  교체 방향: "그래? 그 부분 어떤 내용이야?", "처음 듣는 개념인데 신기하다", "진짜? 책에 그렇게 나와?" 식으로 처음 듣는 사람의 반응으로 교체
- 제임스(책을 읽은 사람): "말로는 다 못 전달해", "직접 봐야 느낌이 달라" → 자연스러우므로 그대로 유지
- 스텔라(책 처음 접하는 사람): "내가 설명해도 반도 안 와닿을 것 같아" → 스텔라가 설명하는 입장으로 둔갑하는 이 표현도 교정
  교체: "그 느낌이 이제 좀 알 것 같아", "듣고 나니까 나도 보고 싶어졌어" 식으로 수정

━━━ 구조 교정 규칙 (기존 대본 일관성) ━━━

[오프닝·클로징 상황극 일치]
- 첫 3~6턴을 분석해 어떤 장소·상황에서 시작하는지 파악해 (예: 카페, 한강, 등산 중 등)
- 마지막 3턴이 오프닝과 다른 장소·상황으로 끝나면 오프닝과 동일한 장소·상황으로 자연스럽게 수정
- 마지막 1턴은 반드시 그 장소·상황에 맞는 행동으로 마무리되어야 함 (예: 카페면 "음료 다 마셨다, 가자", 등산이면 "이제 올라가자")

[책 → 상황극 급전환 교정]
- 책 얘기가 끝나고 갑자기 상황극 복귀 멘트가 나오면 어색함
- 클로징 직전 2~3턴에서 "야 얘기가 너무 길어졌다", "정신차려보니 시간이", "어 벌써" 같은 자연스러운 전환 브릿지가 없으면 기존 턴 중 가장 자연스러운 위치의 text를 수정해 브릿지 역할을 하도록 조정
- 단, 턴을 추가·삭제하지 말고 기존 턴의 text만 수정할 것

반환 형식: 입력과 동일한 JSON 배열 [{speaker, text}, ...]
JSON 외 다른 텍스트 절대 출력하지 마.

[대본]
${JSON.stringify(script)}`;
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
                {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 16384,
                            thinkingConfig: { thinkingBudget: 0 },
                        }
                    })
                }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(`API 오류: ${data.error.message}`);
            const finishReason = data.candidates?.[0]?.finishReason;
            if (finishReason && finishReason !== 'STOP') throw new Error(`생성 중단: ${finishReason}`);
            const parts = data.candidates?.[0]?.content?.parts || [];
            const raw = parts.filter(p => !p.thought).map(p => p.text || '').join('');
            logFn?.(`🔍 최적화 응답 길이: ${raw.length}자`);
            const match = raw.match(/\[[\s\S]*\]/);
            if (!match) throw new Error('JSON 파싱 실패');
            const optimized = JSON.parse(match[0]);
            if (optimized.length !== script.length) throw new Error(`턴 수 불일치: ${optimized.length} vs ${script.length}`);
            logFn?.(`✅ TTS 최적화 완료 (${script.length}턴)`);
            return optimized;
        } catch (e) {
            logFn?.(`⚠️ TTS 최적화 실패 (원본 사용): ${e.message}`);
            return script;
        }
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

        // TTS 최적화 (Gemini Flash) — 문장 분리·숫자 한글화·불필요 표기 제거
        setIsTtsRunning(true);
        setTtsLogs(['✏️ TTS 최적화 중 (Gemini Flash)...']);
        const ttsReadyScript = await optimizeScriptForTts(
            generatedScript,
            (msg) => setTtsLogs(prev => [...prev, msg])
        );

        // 상황극 구간 감정 태그 삽입 + 화자 이름 정규화
        const situationScene = selectedSituation?.scene || '';
        const preprocessScript = ttsReadyScript.map((line, idx) => {
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
        setTtsLogs(prev => [...prev, `🔍 이전 진행 상황 확인 중...`]);
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

⚠️ 속도 & 발음 절대 규칙 (최우선):
- 전체 발화 속도를 평소보다 20~25% 느리게 유지할 것. 절대 빠르게 읽지 말 것.
- 모든 단어를 또렷하고 정확하게 발음할 것. 받침과 연음을 흐리지 말 것.
- 쉼표(,)에서 0.5초, 마침표(.)에서 1초 이상 반드시 쉬어 읽을 것.
- 한 문장이 끝나면 다음 문장 전에 충분히 숨을 고를 것.
- 청취자가 이해할 수 있도록 여유 있는 페이스를 끝까지 유지할 것.

⚠️ 이것은 낭독이 아닌 연기입니다!
${situationContext}두 친구가 실제 현장에서 나누는 살아있는 대화입니다. 책 읽는 것처럼 들리면 실패입니다.

[전체 분위기 — 가장 중요]
- 전반적으로 즐겁고 유쾌하고 발랄한 분위기. 에너지가 느껴져야 함.
- 무기력하거나 단조롭게 읽으면 절대 안 됨. 감정 기복이 살아있어야 함.
- 유머 대사는 실제로 웃기게. 억양과 타이밍으로 웃음 포인트를 살릴 것.
- 두 사람이 진짜 즐겁게 수다 떠는 느낌. 시청자도 같이 신나야 함.

[연기 핵심 규칙]
- 유머·자폭·뼈 때리는 대사: 타이밍 살려서 생동감 있게. 밋밋하게 읽으면 실패.
- 공감 폭발 대사("맞아!", "진짜?", "대박"): 올려서 에너지 넘치게.
- 자기 고백·자폭 대사: 약간 부끄러워하면서 웃으며. 솔직하고 가볍게.
- 진지한 통찰 대사: 톤 살짝 낮추되 여전히 생기 있게. 낭독체 절대 금지.
- 괄호 안 지시문은 발음하지 말고 감정으로만 표현할 것.

[발음 규칙]
- 단어 끝까지 또렷하게. 받침 연음 자연스럽게(있어→이써).
- 쉼표(,)에서 0.5초, 마침표(.)에서 1초 이상 충분히 쉬어 읽을 것.
- 숫자: 3가지→세 가지, CEO→씨이오, SNS→에스엔에스.

[${speakerA} — 남성 MALE 전용]
- 낮고 위트 있는 목소리. 여유롭지만 에너지가 있고 재미있는 사람.
- 유머 칠 때는 가볍게 웃음기 넣고, 인사이트 전달할 때는 확신 있게.
- 단조롭거나 무기력하게 읽지 말 것. 발랄한 에너지 유지.
- ※ 이 화자는 절대 여성 목소리 사용 금지.

[${speakerB} — 여성 FEMALE 전용]
- 발랄하고 톡톡 튀는 친구. 리액션 크게, 질문은 끝 올려서 호기심 넘치게.
- 뼈 때리는 멘트는 쿨하고 재치 있게. 웃음기 섞어서.
- 감정 표현이 풍부해야 함. 무뚝뚝하거나 밋밋하게 읽으면 절대 안 됨.
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

    // ── 배치 전용 TTS 헬퍼 — 단일 모드 상태 일절 건드리지 않음 ──────
    const runTtsForBook = async (script, bookId, addBatchLog, skipOptimize = false) => {
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

        if (!geminiKeys.length) throw new Error('Gemini API 키가 없습니다.');

        const BATCH = 100;
        const speakerA = '제임스';
        const speakerB = '스텔라';
        const modelId = ttsModel === 'pro' ? 'gemini-2.5-pro-preview-tts' : 'gemini-2.5-flash-preview-tts';
        const modelLabel = ttsModel === 'pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash';

        // TTS 최적화 (Gemini Flash) — 이미 최적화된 경우 스킵
        let ttsReadyScript = script;
        if (!skipOptimize) {
            addBatchLog(`✏️ [${bookId}] TTS 최적화 중 (Gemini Flash)...`);
            ttsReadyScript = await optimizeScriptForTts(script, addBatchLog);
        }

        const batches = [];
        for (let i = 0; i < ttsReadyScript.length; i += BATCH) batches.push(ttsReadyScript.slice(i, i + BATCH));
        addBatchLog(`🎙️ [${bookId}] TTS 시작 — ${ttsReadyScript.length}턴 · ${modelLabel}`);

        const pcmBuffers = new Array(batches.length).fill(null);

        for (let b = 0; b < batches.length; b++) {
            const batch = batches[b];
            const ttsInstruction = `⚠️ CRITICAL — 목소리 배정 절대 규칙:
- 화자 "${speakerA}" → 반드시 남성(MALE) 목소리만 사용.
- 화자 "${speakerB}" → 반드시 여성(FEMALE) 목소리만 사용.

⚠️ 속도 & 발음 절대 규칙:
- 전체 발화 속도를 평소보다 20~25% 느리게 유지할 것. 절대 빠르게 읽지 말 것.
- 모든 단어를 또렷하고 정확하게 발음할 것. 받침과 연음을 흐리지 말 것.
- 쉼표(,)에서 0.5초, 마침표(.)에서 1초 이상 반드시 쉬어 읽을 것.
- 한 문장이 끝나면 다음 문장 전에 충분히 숨을 고를 것.

⚠️ 이것은 낭독이 아닌 연기입니다!
두 친구가 실제 현장에서 나누는 살아있는 대화입니다. 책 읽는 것처럼 들리면 실패입니다.

[전체 분위기 — 가장 중요]
- 전반적으로 즐겁고 유쾌하고 발랄한 분위기. 에너지가 느껴져야 함.
- 유머 대사는 타이밍과 억양으로 웃음 포인트를 살릴 것. 밋밋하게 읽으면 실패.
- 공감·리액션 대사: 올려서 에너지 넘치게. 무뚝뚝하거나 단조롭게 읽지 말 것.
- 두 사람이 진짜 즐겁게 수다 떠는 느낌이어야 함.

[${speakerA} — 남성 MALE 전용]
- 낮고 위트 있는 목소리. 여유롭지만 에너지 있고 재미있는 사람.
- 유머 칠 때는 웃음기 넣고, 인사이트 전달할 때는 확신 있게.
- 단조롭거나 무기력하게 읽지 말 것.

[${speakerB} — 여성 FEMALE 전용]
- 발랄하고 톡톡 튀는 친구. 리액션 크게, 질문은 끝 올려서 호기심 넘치게.
- 뼈 때리는 멘트는 쿨하고 재치 있게. 감정 표현 풍부하게.
- 무뚝뚝하거나 밋밋하게 읽으면 절대 안 됨.

[대본]
`;
            const multiText = ttsInstruction + batch.map(line => `${line.speaker}: ${line.text}`).join('\n');
            const fetchTimeout = ttsModel === 'pro' ? 900000 : 600000;
            // 일괄 자동화 전용 목소리: 제임스=Charon, 스텔라=Kore (고정)
            const batchVoiceA = 'Charon';
            const batchVoiceB = 'Kore';

            let success = false;
            let attempts = 0;
            while (!success && attempts < geminiKeys.length) {
                const key = geminiKeys[(b + attempts) % geminiKeys.length];
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);
                    // 경과 시간 타이머
                    let elapsed = 0;
                    const timerInterval = setInterval(() => {
                        elapsed++;
                        setBatchLogs(prev => {
                            const filtered = prev.filter(l => !l.includes(`⏳ [${bookId}]`));
                            return [...filtered, `[${new Date().toLocaleTimeString()}] ⏳ [${bookId}] 배치 ${b + 1}/${batches.length} 생성 중... ${elapsed}초 경과`];
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
                                                { speaker: speakerA, voiceConfig: { prebuiltVoiceConfig: { voiceName: batchVoiceA } } },
                                                { speaker: speakerB, voiceConfig: { prebuiltVoiceConfig: { voiceName: batchVoiceB } } },
                                            ]
                                        }
                                    }
                                }
                            })
                        }
                    );
                    clearTimeout(timeoutId);
                    if (!res.ok) {
                        const errJson = await res.json().catch(() => null);
                        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
                    }
                    const data = await res.json();
                    const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                    if (!part) throw new Error('오디오 데이터 없음');
                    pcmBuffers[b] = Uint8Array.from(atob(part), c => c.charCodeAt(0)).buffer;
                    clearInterval(timerInterval);
                    success = true;
                    addBatchLog(`✅ [${bookId}] 배치 ${b + 1}/${batches.length} 완료`);
                } catch (e) {
                    clearInterval(timerInterval);
                    attempts++;
                    const is429 = e.message.includes('429') || e.message.includes('RESOURCE_EXHAUSTED');
                    if (attempts < geminiKeys.length) {
                        addBatchLog(`⚠️ [${bookId}] 배치 ${b + 1} 재시도 (${attempts}/${geminiKeys.length}) — ${is429 ? '할당량 소진' : e.message}`);
                        if (!is429) await new Promise(r => setTimeout(r, 10000));
                    } else {
                        throw new Error(`배치 ${b + 1} 실패: ${e.message}`);
                    }
                }
            }

            if (b < batches.length - 1) {
                const delay = ttsModel === 'pro' ? 35000 : 30000;
                addBatchLog(`⏱ [${bookId}] 다음 배치까지 ${delay / 1000}초 대기...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }

        const successBuffers = pcmBuffers.filter(Boolean);
        if (!successBuffers.length) throw new Error('생성된 오디오 없음');
        const wavBuffer = createWavFromPcm(successBuffers);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${bookId}_tts.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addBatchLog(`🎉 [${bookId}] WAV 다운로드 완료!`);
    };

    // ── 배치 메인 함수 ────────────────────────────────────────────
    const handleBatchRun = async (mode) => {
        if (!selectedBatchBooks.length) return alert('도서를 1개 이상 선택하세요.');
        const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || scriptApiKey;
        if (mode === 'full' && !apiKey) return alert('Claude API 키가 필요합니다. AI 대본 생성 탭에서 먼저 입력해 주세요.');

        setIsBatchRunning(true);
        setBatchLogs([]);
        setBatchProgress({ current: 0, total: selectedBatchBooks.length });
        const initialStatuses = {};
        selectedBatchBooks.forEach(id => { initialStatuses[id] = 'pending'; });
        setBatchBookStatuses(initialStatuses);

        const addLog = (msg) => setBatchLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        const modeLabel = mode === 'full' ? '풀 배치' : mode === 'tts-only' ? 'TTS 전용' : '대본 최적화';
        addLog(`🚀 배치 시작 — ${selectedBatchBooks.length}권 · 모드: ${modeLabel}`);

        for (let i = 0; i < selectedBatchBooks.length; i++) {
            const bookId = selectedBatchBooks[i];
            const book = realBooks.find(b => b.id === bookId);
            if (!book) { addLog(`⚠️ [${bookId}] 도서 정보 없음, 스킵`); continue; }

            setBatchProgress({ current: i + 1, total: selectedBatchBooks.length });
            addLog(`\n📚 [${i + 1}/${selectedBatchBooks.length}] ${book.title} 처리 시작`);

            try {
                let script = null;

                if (mode === 'full') {
                    // 풀 배치: 항상 새로 대본 생성 (기존 대본 덮어쓰기)
                    setBatchBookStatuses(prev => ({ ...prev, [bookId]: 'generating' }));
                    const hadScript = batchScriptStatuses[bookId] === true;
                    addLog(`✏️ [${bookId}] 대본 ${hadScript ? '재생성 (덮어쓰기)' : '생성'} 중...`);
                    const firestoreDesc = overrides[bookId]?.description || '';
                    const themes = firestoreDesc || book.description || book.desc || '';
                    script = await handleGenerateScript({
                        bookId,
                        title: book.title,
                        author: book.author,
                        themes,
                        isBatch: true,
                    });
                    if (!script) throw new Error('대본 생성 실패');
                    addLog(`✅ [${bookId}] 대본 생성 완료 (${script.length}턴)`);
                    setBatchScriptStatuses(prev => ({ ...prev, [bookId]: true }));
                } else if (mode === 'optimize-only') {
                    // 최적화 전용: Firestore에서 불러와서 Gemini Flash로 교정 후 다시 저장
                    const snap = await getDoc(doc(db, 'scripts', bookId));
                    if (!snap.exists()) {
                        addLog(`⏭️ [${bookId}] 대본 없음 — 스킵`);
                        setBatchBookStatuses(prev => ({ ...prev, [bookId]: 'skipped' }));
                        continue;
                    }
                    const data = snap.data();
                    const stored = data.script || data.lines || data.content || null;
                    if (!stored || !Array.isArray(stored) || stored.length === 0) {
                        addLog(`⏭️ [${bookId}] 대본 비어있음 — 스킵`);
                        setBatchBookStatuses(prev => ({ ...prev, [bookId]: 'skipped' }));
                        continue;
                    }
                    addLog(`📂 [${bookId}] 기존 대본 불러옴 (${stored.length}턴)`);
                    setBatchBookStatuses(prev => ({ ...prev, [bookId]: 'generating' }));
                    const optimized = await optimizeScriptForTts(stored, addLog);
                    const now = new Date().toISOString();
                    await setDoc(doc(db, 'scripts', bookId), { script: optimized, updatedAt: now, optimizedAt: now }, { merge: true });
                    addLog(`💾 [${bookId}] 최적화 완료 → Firestore 저장됨 (${optimized.length}턴)`);
                    setBatchOptimizedStatuses(prev => ({ ...prev, [bookId]: true }));
                    script = optimized; // TTS로 이어짐
                } else {
                    // TTS 전용: Firestore 대본 불러오기
                    const snap = await getDoc(doc(db, 'scripts', bookId));
                    if (snap.exists()) {
                        const data = snap.data();
                        const stored = data.script || data.lines || data.content || null;
                        if (stored && Array.isArray(stored) && stored.length > 0) {
                            script = stored;
                            addLog(`📂 [${bookId}] 기존 대본 불러옴 (${script.length}턴)`);
                        }
                    }
                    if (!script) {
                        addLog(`⏭️ [${bookId}] 대본 없음 — TTS 전용 모드라 스킵`);
                        setBatchBookStatuses(prev => ({ ...prev, [bookId]: 'skipped' }));
                        continue;
                    }
                }

                // TTS (optimize-only는 이미 최적화 완료 → 중복 호출 방지)
                setBatchBookStatuses(prev => ({ ...prev, [bookId]: 'tts' }));
                await runTtsForBook(script, bookId, addLog, mode === 'optimize-only');
                setBatchBookStatuses(prev => ({ ...prev, [bookId]: 'done' }));

            } catch (e) {
                addLog(`❌ [${bookId}] 오류: ${e.message}`);
                setBatchBookStatuses(prev => ({ ...prev, [bookId]: 'error' }));
            }
        }

        addLog(`\n🏁 배치 완료! ${selectedBatchBooks.length}권 처리됨`);
        setIsBatchRunning(false);
    };

    const handleGenerateScript = async (overrides = {}) => {
        const bookId = overrides.bookId || scriptForm.bookId;
        const title = overrides.title || scriptForm.title;
        const author = overrides.author || scriptForm.author;
        const themes = overrides.themes || scriptForm.themes;
        const speakerA = (overrides.speakerA || scriptForm.speakerA).trim() || '제임스';
        const speakerB = (overrides.speakerB || scriptForm.speakerB).trim() || '스텔라';
        let apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
        
        if (!apiKey && scriptApiKey) {
            apiKey = scriptApiKey;
        }

        if (!apiKey) {
            alert('Anthropic API 키 (VITE_ANTHROPIC_API_KEY) 가 설정되지 않았습니다.');
            return;
        }

        if (!bookId || !title || !author) {
            alert('도서 ID, 제목, 저자는 필수 입력입니다.');
            return;
        }

        const addLog = (msg) => {
            setScriptLogs(prev => [...prev, "[" + new Date().toLocaleTimeString() + "] " + msg]);
        };

        if (!overrides.isBatch) {
            setIsGeneratingScript(true);
            setScriptProgress(0);
            setScriptLogs([]);
            setGeneratedScript([]);
        }

        try {
            const { Anthropic } = await import('@anthropic-ai/sdk');
            const anthropic = new Anthropic({
                apiKey: apiKey,
                dangerouslyAllowBrowser: true,
            });

            const callClaude = async (systemPrompt, userPrompt, temperature = 0.7) => {
                const response = await anthropic.messages.create({
                    model: 'claude-sonnet-4-5',
                    max_tokens: 8192,
                    temperature: temperature,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userPrompt }]
                });
                return response.content[0].text;
            };

            const _activeSituation = selectedSituation || SCRIPT_SITUATIONS[Math.floor(Math.random() * SCRIPT_SITUATIONS.length)];
            const situation = `선택된 상황: ${_activeSituation.scene}\n클로징 복귀 멘트(턴 58 마지막 대사로 반드시 그대로 사용): "${_activeSituation.close}"`;

            addLog('✅ [1단계] Claude 4.5 Sonnet 초기 대본 생성 요청 중...');
            setScriptProgress(20);

            const systemPrompt1 = `[시스템 페르소나 및 핵심 제약사항]
당신은 대한민국 직장인들이 퇴근길에 가장 사랑하는 팟캐스트 대본 작가입니다.
두 명의 친한 친구(${speakerA}, ${speakerB})가 수다 떨듯이 쓰되, 절대 책 강의처럼 들리지 않게 하세요.

[콘텐츠 비율 — 전체 대본의 절대 기준]
📌 책 내용 30% : 직장인 인사이트 70%

▶ 책 내용 30% (반드시 아래 규칙 준수)
- 유저 메시지에 제공된 "책 소개"를 완전히 숙지 후, 그 내용만을 기반으로 작성
- 책 소개에 명시된 핵심 주제·개념·메시지만 ${speakerA} 대사에 녹여낼 것
- ⚠️ 책 소개에 없는 내용, 다른 책 개념을 임의로 지어내거나 섞는 것 절대 금지
- ⚠️ 저작권 보호: 책 내용은 요약·발췌 수준(겉핥기)으로만 언급. 책 전체를 풀어주는 강의 방식 금지
- ⚠️ 외부 인물 혼동 절대 금지: 이 책을 추천하거나 인용한 유튜버·작가·독자 등 외부 인물을 마치 책 안에 등장하는 것처럼 표현하는 것 절대 금지.
  나쁜 예: "책에서 OOO이라는 사람 얘기가 나오는데..." → 그 인물이 책 저자·공동저자가 아니면 금지.
  책 소개에 명시된 인물·사례·실험만 언급 가능. 학습 데이터 기반 추측 사용 금지.

▶ 직장인 인사이트 70% (아래 4가지 요소를 균형 있게 포함)
① 상황극: 오프닝 장소·상황 안에서 두 사람의 현실감 넘치는 대화
② 직장생활 사례: 팀장, 동료, 야근, 회의, 보고서, 월급, 회식 등 생생한 직장 현실 소재
③ 일상생활 공감: 다이어트 실패, 주말 순삭, 월요병, 탕비실 눈치 등 생활 밀착형 유머
④ 직장 지침 3가지: 내일 당장 출근해서 써볼 수 있는 구체적·실천적 행동 지침 정확히 3개

[실제 사례·수치 사용 규칙 — 저작권·명예훼손 방지 최우선]
⚠️ 이 규칙을 어기면 저작권 침해·명예훼손 법적 리스크 발생. 반드시 준수.

사례·수치를 쓸 수 있는 경우는 딱 2가지뿐:
  1️⃣ 책 소개에 명시된 실험·연구·사례 → 그 내용 범위 안에서만 언급
  2️⃣ "우리 팀장", "우리 회사", "내 동료", "한 직장인" 같은 완전 익명·가상 사례

절대 금지 (위 2가지에 해당하지 않으면 모두 금지):
- 실제 기업명 사용 (긍정이든 부정이든). 예: "삼성이", "카카오가", "OO기업이" → "한 대기업이", "어떤 IT회사가" 로 교체
- 구체적 수치·통계 날조. 예: "XX%가 효과 봤대", "OO연구 결과 평균 3배" → 책 소개에 없으면 삭제
- 실존 인물(CEO, 정치인, 연예인, 유튜버 등) 발언·행동 묘사. → 삭제 또는 익명 처리
- 책 소개에 없는 연구·실험을 사실처럼 인용 → 삭제

[절대 출력 형식]
오직 아래 JSON 배열 형태만 최종 출력하세요. 그 외 어떤 글자도 쓰지 마세요.
[
  {"speaker": "${speakerA}", "text": "..."},
  {"speaker": "${speakerB}", "text": "..."}
]
총 턴 수는 정확히 58턴으로 고정 (7분 30초~8분 분량 목표)

[턴 구조 - 반드시 이 흐름으로만 작성]
턴 1~6 : 주어진 상황 안에서 자연스러운 수다. 책 언급 절대 금지.
  - 두 사람이 지금 있는 장소·상황을 충분히 묘사하며 시작할 것. (예: 등산 중이면 숨차는 묘사, 치킨집이면 메뉴 고르는 장면 등)
  - 턴 3~6에서 자연스럽게 직장 고민·스트레스·인간관계 소재를 흘릴 것. 이게 나중에 책 주제로 연결되는 씨앗이 됨.
  - ⚠️ 고민 소재가 억지로 꺼내진 느낌이면 안 됨. 상황 대화를 하다가 자연스럽게 나오는 것처럼.

턴 7~10 : 책으로 넘어가는 전환 — 공식처럼 딱딱하게 하지 말고 대화가 자연스럽게 흘러가듯 할 것.
  핵심 원칙: 앞에서 나온 고민·소재에서 ${speakerA}의 뇌에 책이 떠오른 것처럼. 책을 꺼내려고 억지로 화제를 꺾는 게 아님.

  좋은 흐름 예시:
  - 치킨집 상황: "치킨 먹다가 → 야근 얘기 → 팀장 얘기 → '그러고 보니 그거 읽으면서 딱 그 생각 했는데' → '뭐?' → 책 제목"
  - 등산 상황: "정상 보이는데 → 요즘 지친다는 얘기 → '근데 이상하게 그 얘기 들으니까 생각나는 게 있어' → '뭔데' → 책 제목"

  [7~8턴] ${speakerA}가 앞 대화 흐름을 받아서 자연스럽게 생각이 연결된 것처럼 운을 뗌. 책 제목은 아직 안 나옴.
    - "그러고 보니 나 요즘 그런 거 많이 생각하다가 뭔가 읽었는데", "아 갑자기 생각났는데 딱 그 얘기더라" 등
    - 대화 흐름을 끊지 말고 앞 소재에서 자연스럽게 이어질 것
  [9턴] ${speakerB}가 궁금해하며 물어봄 → ${speakerA}가 책 제목 꺼냄
  [10턴] ${speakerB}가 처음 듣는 반응 ("그게 뭐야?", "처음 들어보는데") → ${speakerA}가 한 줄 설명

  ⚠️ 절대 금지: "오늘은 이 책 얘기를 해볼게", "이 책이 딱 맞는 것 같아서", "이 책 알아?" 식으로 갑자기 방송 진행자처럼 책을 꺼내는 것.
  ⚠️ 절대 금지: ${speakerB}가 책을 먼저 꺼내거나 소개하는 것.

턴 10~35 : 책 핵심 개념 소개 — ${speakerA}가 책 내용을 설명하되, 매 2~3턴마다 반드시 직장인 현실 사례로 연결할 것.
  ⚠️ 책 내용만 계속 나열하는 것 절대 금지. 개념 1개 설명 → 직장 사례 연결 → ${speakerB} 반박/공감 → 다음 개념 순서로 진행.
  직장 사례 예시: "그게 딱 우리 회사 얘기야. 우리 팀장도...", "OO기업이 그래서 망했잖아", "야근하면서 느끼는 그 공허함이 딱 그거야"

턴 36~45 : 직장인 현실 밀착 구간 — 책 개념을 직장 사례에 완전히 녹여낼 것.
  ⚠️ 이 구간에서 책 내용 설명보다 직장 사례·현실 얘기가 더 많아야 함. 구체적인 회사 상황, 팀장, 동료, 야근, 월급, 회식 등 생생한 소재 최소 3개 이상.
  ${speakerB}가 이 구간에서 반드시 본인 직장 경험을 꺼내며 반박 또는 자폭 고백할 것. (예: "근데 솔직히 나는 그게 잘 안 돼. 우리 팀은...")

턴 46~52 : 직장 지침 3가지 구간 — 이 책 소개의 핵심 개념에서만 뽑아낸 고유한 직장인 실천 지침 정확히 3가지.

  ⚠️ 지침 고유성 — 가장 중요한 규칙:
  - 지침 3가지는 반드시 이 책 소개에 등장하는 개념·주제·사례에서 직접 도출할 것.
  - 어느 책에나 쓸 수 있는 범용 조언 절대 금지. 이 책 소개를 보지 않고도 만들 수 있는 조언은 전부 금지.
  - ❌ 범용 조언 예시 (책 종류 불문 반복되는 것들 — 절대 금지):
      "메모하는 습관 들여봐" / "목록 작성해봐" / "상대방에게 주도권 줘봐" / "감사 일기 써봐" /
      "아침 루틴 만들어봐" / "명상해봐" / "산책해봐" / "긍정적으로 생각해" / "작게 시작해봐"
  - ✅ 이 책 고유 지침의 기준: 지침을 들었을 때 "아, 이게 [책 제목]에서 나온 거구나" 하고 바로 연결되어야 함.

  ⚠️ 추상적인 조언 절대 금지. 반드시 내일 출근해서 바로 실천 가능한 구체적 행동으로.
  나쁜 예: "자신을 더 이해해야 해" / "긍정적으로 생각해" / "마음을 열어봐"
  좋은 예 (책 내용 기반): 책에서 '앵커링 효과'를 다룬다면 → "내일 회의에서 팀장이 숫자 먼저 던지면, 그게 내 판단 기준이 되기 전에 일단 3초 멈추고 내 의견 먼저 정리해봐."

  ${speakerB}가 이 지침들에 대해 "그건 나는 좀 다르게 생각하는데" 식으로 본인 의견을 보태거나 현실적인 반박을 최소 1회 할 것.

턴 53~끝 : 텐션 낮추며 여운. ${speakerB}가 "나도 한번 사봐야겠다" 식으로 읽고 싶다는 의사 표현 (추천 유도 1회).

[화자 정체성 — 위반 시 전체 실패]
⚠️ ${speakerA}: 책을 읽은 사람. 설명 + 직장 사례 연결하는 역할. 대사 충분히 길게(2~4문장).
  - "이 책을 듣고 나서", "들어보니까" 등 청취 표현 절대 금지. 반드시 "읽고 나서", "읽어보니까", "책에서 봤는데" 등 독서 표현만 사용.
⚠️ ${speakerB}: 책은 모르지만 **본인 직장 경험과 생각은 풍부하게 가진 사람**.
  - 책 내용 설명 절대 금지 (읽은 적 없으니까)
  - ⚠️ 단순 동의·질문만 하는 것도 금지. ${speakerB}는 매 3~4턴에 한 번씩 반드시 본인 생각·경험·반박을 꺼낼 것.
    예: "근데 나는 그 부분은 좀 다르게 생각해. 우리 팀 경우엔..." / "그거 맞는 말인데, 근데 현실에서 그게 가능해? 우리 팀장은..." / "솔직히 나 그거 해봤는데 안 되더라고."
  - 마지막 구간에서 "나도 한번 읽어봐야겠다" / "이거 사봐야겠는데" 식으로 마무리.

[말투 철칙 — 위반 시 전체 실패]
- 전 구간 100% 반말. 단 1턴도 예외 없음.
- 존댓말 어미 절대 금지: ~요, ~습니다, ~세요, ~군요, ~네요, ~거든요, ~잖아요, ~하죠, ~죠 → 전부 반말로 교체
  (예: "그렇죠" → "그렇지" / "맞아요" → "맞아" / "재밌거든요" → "재밌거든" / "힘들잖아요" → "힘들잖아")
- "네가" → "니가"로만 바꾸고, "너는/너도/너한테"는 그대로 유지
- 문장 끝은 반드시 완결형 ("~거야.", "~진짜.", "~건데.")
- 대화 끊기 최소 3회, 스스로 정정 최소 2회, 딴소리 새기 최소 3회
- 연속 동의·칭찬 금지. 누군가는 반드시 반박.
- ⚠️ 이름 호칭: 턴 1~6(오프닝 상황극 구간)에서만 "야 ${speakerB}", "${speakerA}야" 식으로 이름 부르는 것 허용. 턴 7 이후부터는 이름 호칭 절대 금지, 이름 없이 자연스럽게 말할 것.
- ⚠️ "진짜" 사용 제한: 대본 전체에서 "진짜"라는 단어가 2회를 초과하면 안 됨. 대체 표현: "정말", "완전", "너무", "대박", "어이없어", "말도 안 돼" 등 다양하게 활용.
- ${speakerA}: 감정 공감 → 건조 개그
- ${speakerB}: 날카로운 현실 반박 최소 5회 + 결국 본인 자폭 고백

[대화 리듬 — 필수]
실제 친구 대화처럼 대사 길이에 변화를 줘야 함. 매 턴이 비슷한 길이면 단조롭고 지루해져.

- 글자수 기준 (띄어쓰기 포함):
  · ${speakerA} 설명 대사: 최소 50자 ~ 최대 80자 (책 내용·직장 사례 설명 구간)
  · ${speakerB} 반응 대사: 최소 30자 ~ 최대 60자
  · 클로징(턴 54~58): 최소 20자 ~ 최대 50자
  · 한 문장짜리 단답 절대 금지: "맞아." / "그렇네." / "어?" 등 20자 미만 대사 금지
- ⚠️ 추임새 남용 금지: "응.", "맞아.", "오.", "완전 공감.", "완전 신기하다.", "오 그렇구나.", "그러네." 같은 단순 동의·감탄만으로 이루어진 대사는 전체 대본에서 최대 3회 이하로 제한. 반드시 뒤에 구체적인 내용·질문·반박이 이어져야 함.
  나쁜 예: "완전 공감." / "오, 그렇구나." / "맞아." (단독으로 끝나는 것)
  좋은 예: "완전 공감. 나도 요즘 노트북 들고 집에서도 일하거든." / "오 그렇구나, 그럼 그다음엔 어떻게 됐어?"
- 긴 대사(설명·인사이트)와 반응 대사(공감·질문)를 번갈아 배치해 리듬 형성
  나쁜 패턴 (금지): 짧은대사 → 짧은대사 → 짧은대사 (내용 없이 핑퐁만 하는 것)
  좋은 패턴 (필수): ${speakerA} 설명(50~80자) → ${speakerB} 반응(30~50자) → ${speakerA} 설명(50~80자)
- 연속 3턴 이상 비슷한 길이 금지

[유머 규칙]
- 유머는 반드시 직전 대화 내용에서 자연스럽게 이어져야 함. 맥락 없이 갑자기 끼워넣는 유머 절대 금지.
- 책 개념이나 직장 사례 얘기하다가 "어, 이거 우리 팀장 얘기잖아?" 같이 방금 한 말에서 자연스럽게 터지는 식으로.
- 사용 가능한 패턴 (맥락에 맞을 때만): 자폭 고백 / 팀장 저격 / 현실 비틀기 / 공감 폭발
- 억지 비유, 뜬금없는 농담, 대화 흐름을 끊는 개그 절대 금지.
- 유머가 자연스럽게 안 나오는 구간은 그냥 진지하게 가도 됨. 억지로 웃기려 하지 말 것.

[대화 논리 일관성 — 위반 시 전체 실패]
- ⚠️ 각 대사는 직전 대사 내용과 반드시 논리적으로 연결되어야 함.
- 직전에 언급한 소재(사물, 상황, 사건)를 갑자기 모순되게 사용하는 것 절대 금지.
  나쁜 예: A가 "우리 회사 커피머신 너무 느리다"고 불평하다가 B가 "어 벌써 다 됐네" 라고 말하는 것 — 앞뒤가 안 맞음.
  좋은 예: 커피머신이 느리다는 맥락을 이어가거나, 화제를 전환할 경우 자연스러운 브릿지("야 근데 그거 기다리는 동안에 말이야")를 쓸 것.
- 시간적 흐름, 장소, 등장 소재가 연속성을 유지해야 함. 이전 턴과 충돌하면 반드시 수정.

[저작권 & 추천 유도]
책 내용은 전체 대본의 30% 이하로 제한 — 소개 기반 겉핥기 수준만 허용. 후반부(턴 48~52 사이)에 추천 유도 정확히 1회 삽입.

핵심 원칙: 추천 유도는 반드시 직전 대화 내용에서 자연스럽게 이어져야 함.
방금 나온 인사이트나 직장 사례 얘기를 하다가 감탄하거나 공감하면서 슬쩍 흘리는 것.
뜬금없이 "이 책 읽어봐" 식으로 끊어서 삽입하는 것 절대 금지.

예시 (직전 맥락과 연결된 경우만):
- 방금 인사이트에 공감 후: "이 부분 진짜 소름이었어. 책에 이런 게 더 있거든."
- 직장 사례 나온 후: "나 이거 읽고 나서 진짜 달라졌는데, 니가 읽으면 더 공감할 것 같아."
- 대화 흐름 중 자연스럽게: "이거 나중에 한번 봐봐. 강요는 아닌데 진짜 이 부분이 좋았어."

직접 "구매해라", "사라", "책값", "꼭 읽어라" 같은 판매성 표현 절대 사용 금지.

[TTS 최적화 규칙 - 마지막 글자·음절 뭉개짐/끊김 특화 최종 버전]
1. 모든 text 글자수 기준 (띄어쓰기 포함): 최소 30자 ~ 최대 80자. 30자 미만이면 내용을 보완해 늘릴 것. 81자 이상이면 나누거나 줄여라. 클로징(마지막 4턴)은 최소 20자.
2. 한 턴에 문장 2개 이상이면 쉼표(,) 또는 마침표(.)로 반드시 구분
3. 매 턴 text는 반드시 마침표(.) 또는 물음표(?) 또는 느낌표(!)로 끝
4. 숫자는 무조건 한글로 (1+1 → 원 플러스 원, 20대 → 스무 살 대)
5. 외래어·약어 처음 등장 시 풀네임 + (약어) 후 약어만 ok (TTS → 티티에스)
6. 연속 자음/받침 많은 단어는 쉼표나 띄어쓰기로 끊기 (빡세게 → 빡 세게)
7. 과도 줄임말 피하기 ("진짜루", "개웃김", "존나" 등은 발음 깨짐 위험 → "진짜", "너무 웃겨", "정말" 추천)
8. 쉼표(,) = 짧은 호흡, 마침표(.) = 0.8~1초 정지 유도
9. 문장 끝 글자·마지막 음절 뭉개짐 방지 최우선 규칙:
   - 매 턴 마지막 문장은 받침 없는 짧은 글자("야", "데", "거", "까", "네", "지" 등)로 끝나지 않게
   - 마지막에 반드시 여유 주는 요소 추가: "진짜." "맞아." "그러니까." ".. " (점 두 개 이상) "진짜로." "그러네." 중 하나 강제 선택
   - 좋은 끝맺음 예시: "그게 제일 웃기더라. 진짜." / "우리 팀장도 그랬어.. " / "생각만 해도 빡세. 진짜로."
   - 나쁜 끝맺음 피하기: "그럴 거야" "맞아" "그러니까" (단독으로 끝날 때 특히 위험)
10. 마지막 10자 구간에 쉼표(,)나 마침표(.) 최소 1개 이상 강제 배치
11. 턴 55~58은 문장 더 짧게 (평균 30~40자 권장)

[2단계 클로징 통합]
58턴까지 작성 후 마지막 6턴은 자연 마무리:
턴 54~55: 책 얘기 텐션 낮추기 — 갑자기 끊지 말고 "야 우리 얘기가 너무 길어졌다", "정신차려보니 시간이" 같은 브릿지 1~2턴 삽입. 책 → 상황 급전환 금지.
턴 56: "오늘 얘기 진짜 좋았다" 뉘앙스
턴 57: 오프닝에서 설정한 장소·상황 속 주변 묘사로 자연 복귀 (오프닝과 동일한 장소·상황이어야 함. 전혀 다른 장소나 상황으로 바뀌는 것 절대 금지)
턴 58: 반드시 주어진 [클로징 복귀 멘트]를 그대로 사용할 것. 임의로 바꾸거나 다른 멘트로 대체 금지.
⚠️ 절대 금지 마무리 표현: "오늘 녹음 여기까지", "편안한 저녁 보내", "다음 시간에 또 만나", "오늘 방송 여기서 마칠게", "청취해주셔서 감사" 등 팟캐스트 방송 아웃로 형식의 표현. 마지막은 반드시 두 사람이 그 상황(장소·활동) 안에 있는 것처럼 자연스럽게 끝나야 함.
⚠️ 클로징 시간 점프 절대 금지: 직전 턴에서 어떤 행동이 막 시작됐는데(예: "치킨 왔다", "탑승 시작한다", "출발하자") 바로 다음 턴에서 그 행동이 이미 끝난 것처럼 쓰는 것 금지.
  나쁜 예: 턴 74 "치킨 왔다" → 턴 75 "치킨 다 먹었다"
  좋은 예: 턴 74 "치킨 왔다" → 턴 75 "완전 배고팠는데, 얼른 먹자" → 턴 76(클로징멘트) "치킨 다 먹었다, 한 잔만 더 하고 가자"
  클로징 복귀 멘트가 완료형(먹었다, 됐다, 끝났다)이면 그 이전 1~2턴에서 진행 중인 상황을 자연스럽게 묘사할 것.`;

            const prompt1 = `도서 정보:
제목: ${title}
저자: ${author}
${themes ? `책 소개 (반드시 숙지 후 대본 작성):
"""
${themes}
"""
⚠️ 위 책 소개를 반드시 읽고, 실제 책 내용·주제·핵심 메시지를 기반으로 대본을 작성할 것. 책 소개에 없는 내용을 임의로 지어내거나 다른 책 내용을 섞는 것 절대 금지.` : ''}
상황극: ${situation}`;

            const rawScript = await callClaude(systemPrompt1, prompt1, 0.7);
            
            addLog('✅ [2단계] 맞춤법 및 띄어쓰기 교정 요청 중...');
            setScriptProgress(50);

            const systemPrompt2 = `[3단계 맞춤법 교정]
당신은 팟캐스트 대본 맞춤법 교정 전문가입니다.
아래 대본 배열에서 최종 출력 전 반드시 다음 규칙만 적용하여 반환하세요:
- 오직 맞춤법·띄어쓰기만 수정
- 단, "니는"→"너는", "니도"→"너도", "니한테"→"너한테"만 명시적으로 바꿀 것.
- 이외의 말투·구어체·내용은 절대 변경 금지.
오직 유효한 JSON 배열만 출력하세요.`;
            
            const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
            const callGemini = async (systemPrompt, userContent, temperature = 0.2, thinking = false) => {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
                    {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }],
                            generationConfig: {
                                temperature,
                                maxOutputTokens: 65536,
                                ...(thinking ? { thinkingConfig: { thinkingBudget: 8000 } } : { thinkingConfig: { thinkingBudget: 0 } }),
                            }
                        })
                    }
                );
                if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
                const data = await res.json();
                if (data.error) throw new Error(`Gemini API 오류: ${data.error.message}`);
                const parts = data.candidates?.[0]?.content?.parts || [];
                return parts.filter(p => !p.thought).map(p => p.text || '').join('');
            };

            const rawCorrected = await callGemini(systemPrompt2, rawScript, 0.2, true);

            addLog('✅ [3단계] 최종 품질 검수 요청 중...');
            setScriptProgress(80);

            const systemPrompt3 = `[4단계 최종 검토 에이전트 - 발음 & 자연스러움 특화]
당신은 Perfect TTS Script Review Agent입니다.
아래 JSON 배열 대본 전체를 재검토합니다.
검토 항목 (모두 체크 후 미비 시 최소 수정만):
0-A. ⚠️ 최우선 — 존댓말 어미 완전 제거: ~요, ~습니다, ~세요, ~군요, ~네요, ~거든요, ~잖아요, ~하죠, ~죠 가 단 1개라도 있으면 즉시 반말로 교체.
0-B. ⚠️ 최우선 — 이름 호칭: 턴 7 이후에 이름 호칭이 있으면 즉시 제거 (턴 1~6은 허용).
0-B2. ⚠️ 최우선 — ${speakerA} 화자 역할: 턴 7 이후 책/콘텐츠를 소개하고 설명하는 것은 반드시 ${speakerA}. 만약 ${speakerB}가 책 내용을 먼저 꺼내거나 설명하는 구조라면 speaker를 ${speakerA}↔${speakerB} 전환 교체할 것.
0-C. ⚠️ 최우선 — 대화 논리 일관성: 대본 전체를 순서대로 읽으면서 각 턴이 직전 턴과 논리적으로 연결되는지 확인. 직전에 언급한 소재(사물, 상황, 사건)를 모순되게 쓰는 경우 즉시 수정.
  - 나쁜 예: 한 턴에서 "커피머신이 너무 느리다" → 다음 턴에서 "어 벌써 다 됐네"
  - 나쁜 예: 한 턴에서 "밥 먹으러 가야지" → 다음 턴에서 갑자기 전혀 다른 장소 언급
  - 수정 방법: 모순된 대사는 맥락에 맞게 교체하거나, 화제 전환이 필요하면 "야 근데 그거 기다리는 동안에 말인데" 같은 브릿지를 앞에 추가.
0-D. ⚠️ 최우선 — ${speakerB} 화자 정체성: ${speakerB}는 이 책을 읽은 적 없는 사람. 아래 위반 표현이 하나라도 있으면 즉시 수정.
  - 위반 표현: "내가 이 책 읽었을 때", "이 부분이 좋았어", "나도 이거 읽어봤는데", "그 챕터에서", 책 내용을 직접 아는 것처럼 말하는 모든 표현.
  - 수정 방법: "그래? 그 부분 어떤 내용이야?", "처음 들어보는 개념인데", "진짜? 책에 그렇게 나와?" 식으로 처음 듣는 사람의 반응으로 교체.
  - 턴 53~58 구간에서 ${speakerB}가 "나도 한번 읽어봐야겠다" / "이거 사봐야겠는데" 식으로 읽고 싶다는 의사를 표현했는가? 없으면 추가.
  위 0-A, 0-B, 0-C, 0-D 항목이 모두 통과되지 않으면 나머지 검토 의미 없음.
1. 턴 수 정확히 58개인가?
2. 턴 1~6에서 책 언급이 없는가?
3. 전환(턴 7~9)이 3단계 브릿지로 자연스럽게 이어지는가? 갑자기 책 제목이 등장하거나 "책 읽는다며?" 식의 뜬금 전환이면 수정. 턴 4~6의 대화 소재와 연결되어야 함.
4. 유머와 리액션이 대화 맥락에서 자연스럽게 나오는가? 뜬금없이 끼워넣은 유머가 있으면 제거 또는 앞 대화와 연결되도록 수정.
5. ${speakerB}의 현실 반박 5회 이상 + 자폭 고백이 있는가?
6. 추천 유도 정확히 1회 (턴 48~52 사이)? + 판매성 표현 없음? + 매번 다른 표현?
7. 매 턴 text 길이: 30자 이상 80자 이하인가? 30자 미만 턴이 있으면 내용 보완해 늘릴 것 (클로징 마지막 4턴은 20자 이상).
8. 모든 문장 끝에 마침표/물음표/느낌표가 있는가?
9. 숫자·약어는 한글화되었나?
10. 연속 자음/받침 구간 쉼표 처리되었나?
11. 대화 끊기·정정·딴소리가 충분히 있는가?
12. 마지막 3턴 마무리가 부드럽고 여운 있는가?
13. 반복적인 패턴(같은 리액션이 여러 번 반복)이 없는가?
13-B. ⚠️ "듣고 나서", "들어보니까", "들었는데" 등 청취 표현이 있으면 즉시 "읽고 나서", "읽어보니까", "읽었는데"로 교체. 이 팟캐스트는 책을 들은 게 아니라 읽은 것.
14. 문장 끝 글자 뭉개짐 위험 체크: 받침 없는 짧은 글자로 끝나는 경우, "진짜." ".. " 등으로 교정.
15. 마지막 10자 구간에 쉼표/마침표 1개 이상 있는가?
16. 턴 58 마지막 대사가 주어진 [클로징 복귀 멘트]와 일치하는가? 일치하지 않으면 클로징 복귀 멘트로 교체.
    ⚠️ 절대 금지: "오늘 녹음 여기까지", "편안한 저녁 보내", "다음 시간에 또 만나", "오늘 방송 여기서 마칠게", "청취해주셔서 감사" 등 팟캐스트 방송 아웃로 형식의 표현. 있으면 즉시 상황에 맞는 클로징 복귀 멘트로 교체.
17. 턴 56~58이 오프닝(턴 1~6)과 동일한 장소·상황인가? (전혀 다른 배경으로 바뀌었으면 수정)
18. 책 얘기에서 클로징으로 전환이 급작스럽지 않은가? (브릿지 없이 뚝 끊기면 수정)
18-B. ⚠️ 클로징 시간 점프 금지: 클로징 복귀 멘트(마지막 턴) 직전 1~2턴을 확인. 직전 턴에서 어떤 행동이 막 시작됐는데(예: "치킨 왔다", "자리 잡았다") 클로징 멘트에서 갑자기 그 행동이 끝난 것처럼("치킨 다 먹었다") 쓰여 있으면, 직전 턴을 그 행동이 진행 중인 자연스러운 대사로 수정할 것.
19. 한 문장짜리 단답("맞아.", "진짜?", "그렇네." 등)이 있는가? 있으면 최소 2문장으로 늘릴 것.
20. 이름 호칭: 턴 7 이후에 "${speakerA}" 또는 "${speakerB}" 이름을 부르는 표현이 있으면 즉시 제거.
21. "진짜" 단어 횟수: 전체 대본에서 "진짜"가 3회 이상 등장하면 3번째부터 "정말", "완전", "너무", "대박" 등으로 교체.

위 항목 중 하나라도 위반이면 가장 최소한의 단어/구두점/끝맺음만 수정하고, 특유의 말투·캐릭터성·내용은 절대 변경하지 마세요.
모든 검토 완료 후 오직 완성된 58턴 JSON 배열만 출력하세요. 설명·코멘트는 절대 붙이지 마세요.`;

            let afterPrompt3 = await callGemini(systemPrompt3, rawCorrected, 0.2, true);

            addLog('✅ [4단계] 오류 탐지 중 (Gemini Thinking)...');
            setScriptProgress(85);

            const systemPrompt4 = `[4단계 — 오류 탐지 전용 에이전트]
당신은 팟캐스트 대본에서 오류를 찾아내는 전문 검수자입니다.
아래 대본 JSON을 처음부터 끝까지 꼼꼼히 읽고, 발견한 모든 오류를 목록으로 출력하세요.
⚠️ 이 단계에서는 수정하지 마세요. 오직 오류 목록만 출력합니다.

[탐지 항목 — 빠짐없이 모두 확인]

A. 시간 점프: 행동이 막 시작됐는데 다음 턴에서 이미 완료된 경우.
   예: 턴N "치킨 왔다" → 턴N+1 "치킨 다 먹었다"

B. 사실 모순: 한 턴 내용이 앞·뒤 턴과 논리적으로 충돌하는 경우.
   예: 턴N "커피머신 너무 느리다" → 턴N+1 "어 벌써 다 됐네"

C. ${speakerB} 책 지식 오류: ${speakerB}가 이 책을 읽은 것처럼 아는 척하는 대사.
   예: "내가 이 책 읽었을 때", "이 챕터에서", 책 내용을 직접 설명하는 대사.

D. 외부 인물 혼동: 책 저자·공동저자가 아닌 인물(유튜버, 다른 작가, 독자 등)이 책 내용에 등장하는 것처럼 쓰인 경우.
   예: "책에서 자청이라는 작가 얘기가 나오는데..."

E. 저작권·명예훼손 위험:
   - 실제 기업명을 부정적 맥락으로 언급 ("OO기업이 망했잖아" 등)
   - 책 소개에 없는 수치·통계를 사실처럼 인용 ("실험에서 XX%가..." 등)
   - 실존 인물 부정적 묘사 또는 발언 날조

F. 화자 역할 역전: 턴 7 이후 ${speakerB}가 책 내용을 설명하거나 ${speakerA}가 모르는 척 묻는 구조.

G. 존댓말 잔존: ~요, ~습니다, ~세요, ~군요, ~네요, ~거든요, ~잖아요, ~하죠, ~죠 가 있는 턴.

H. 이름 호칭: 턴 7 이후에 "${speakerA}" 또는 "${speakerB}" 이름을 부르는 대사.

I. "진짜" 단어가 대본 전체에서 3회 이상 등장하는 경우 — 3번째부터 해당 턴 번호 모두 나열.

J. 30자 미만 단답 대사 (클로징 마지막 4턴 제외).

K. 단순 추임새 단독 대사 ("응.", "맞아.", "오.", "완전 공감.", "그러네." 등 내용 없이 끝나는 대사) 가 4개 이상인 경우.

L. 청취 표현 오류: "듣고 나서", "들어보니까", "들었는데", "들어보면" 등 책을 듣는 것처럼 표현한 대사. (이 팟캐스트는 책을 읽은 것. "읽고 나서", "읽어보니까" 로 바꿔야 함.)

M. 범용 행동 지침 오류: 직장 지침 3가지 구간(턴 46~52)에서 아래 범용 조언이 하나라도 등장하면 오류.
   금지 표현: "메모하는 습관", "목록 작성", "상대방에게 주도권", "감사 일기", "아침 루틴", "명상", "산책", "긍정적으로", "작게 시작"
   기준: 이 책 소개를 보지 않고도 만들 수 있는 조언이면 범용 조언으로 판단.

[출력 형식 — 반드시 아래 형식으로만]
오류가 있으면:
- [A] 턴 N→N+1: (오류 내용 한 줄 설명)
- [C] 턴 N: (오류 내용 한 줄 설명)
...

오류가 없으면: "오류 없음"

설명·마크다운·JSON 절대 출력 금지. 오류 목록만 출력.`;

            const errorList = await callGemini(systemPrompt4, afterPrompt3, 0.1, true); // Thinking으로 탐지
            addLog(`🔍 탐지된 오류:\n${errorList}`);

            addLog('✅ [5단계] 오류 수정 중...');
            setScriptProgress(93);

            const systemPrompt5 = `[5단계 — 오류 수정 전용 에이전트]
당신은 팟캐스트 대본 수정 전문가입니다.
아래에 원본 대본 JSON과 검수자가 찾아낸 오류 목록이 주어집니다.
오류 목록에 있는 항목만 최소한으로 수정하세요. 오류 목록에 없는 부분은 절대 건드리지 마세요.

[수정 기준]
- [A] 시간 점프: 완료형 직전 턴을 진행 중인 자연스러운 대사로 교체.
- [B] 사실 모순: 충돌하는 턴 text를 맥락에 맞게 교체.
- [C] ${speakerB} 책 지식 오류: "그래서 어떻게 돼?", "그 내용 좀 더 얘기해봐" 식 처음 듣는 반응으로 교체.
- [D] 외부 인물 혼동: 해당 대사 삭제 또는 책 소개 기반 사례로 대체.
- [E] 저작권·명예훼손: 기업명→"한 회사가", 수치→삭제 또는 모호하게, 실존 인물→익명 처리.
- [F] 화자 역할 역전: speaker 값을 ${speakerA}↔${speakerB} 교체.
- [G] 존댓말: 반말 어미로 교체.
- [H] 이름 호칭: 해당 이름 호칭 부분만 삭제.
- [I] "진짜" 초과: 3번째 이후 등장분을 "정말", "완전", "너무", "대박" 등으로 교체.
- [J] 단답 30자 미만: 내용 보완해 30자 이상으로 늘릴 것.
- [K] 추임새 단독 대사 초과: 4번째 이후 추임새 대사에 구체적 내용·질문을 이어 붙일 것.
- [L] 청취 표현: "듣고 나서"→"읽고 나서", "들어보니까"→"읽어보니까", "들었는데"→"읽었는데" 로 교체.
- [M] 범용 행동 지침: 해당 지침을 이 책 소개의 핵심 개념과 직접 연결된 구체적 행동으로 교체. 책 소개에서 관련 개념을 찾아 "이 책에서 OO 개념을 다루는데, 내일 직장에서 OO하게 해봐" 식으로 재작성.

[입력 형식]
=== 오류 목록 ===
{오류목록}

=== 원본 대본 JSON ===
{대본JSON}

[출력]
수정 완료된 JSON 배열만 출력. 설명·코멘트·마크다운 절대 금지.
speaker 필드와 턴 수(배열 길이)는 변경 금지.`;

            const fixInput = `=== 오류 목록 ===\n${errorList}\n\n=== 원본 대본 JSON ===\n${afterPrompt3}`;
            let finalOutputRaw = await callGemini(systemPrompt5, fixInput, 0.1, true);

            addLog('✅ 대본 파싱 및 검증 완료');
            setScriptProgress(97);

            let cleanJson = finalOutputRaw.replace(/\`\`\`(json)?/gi, '').trim();
            const finalScript = tryLooseParseJSON(cleanJson);

            const spkAAliases = [speakerA.toLowerCase(), 'james', '제임스'];
            const spkBAliases = [speakerB.toLowerCase(), 'stella', '스텔라'];
            const normSpk = (s) => {
                const v = String(s || '').trim().toLowerCase();
                if (spkAAliases.includes(v)) return speakerA;
                if (spkBAliases.includes(v)) return speakerB;
                return speakerA;
            };

            const cleanedScript = finalScript.map((turn, i) => {
                let actualSpeaker = normSpk(turn.speaker);
                if (i > 0) {
                    const prevSpeaker = finalScript[i - 1].speaker;
                    if (prevSpeaker === actualSpeaker) {
                        actualSpeaker = actualSpeaker === speakerA ? speakerB : speakerA;
                    }
                }
                return { speaker: actualSpeaker, text: turn.text };
            });

            if (!overrides.isBatch) {
                setGeneratedScript(cleanedScript);
            }

            await setDoc(doc(db, 'scripts', bookId), {
                bookId, title, author, themes,
                script: cleanedScript,
                createdAt: serverTimestamp(),
            }, { merge: true });

            addLog('✅ Firestore에 대본이 저장되었습니다.');
            setScriptProgress(100);

            if (!overrides.isBatch) {
                setIsGeneratingScript(false);
            }
            return cleanedScript; // 배치용 반환값

        } catch (error) {
            console.error(error);
            if (error.name === 'AbortError') {
                addLog('⚠️ 요청이 취소되었습니다.');
            } else {
                addLog("❌ 대본 생성 실패: " + error.message);
            }
            if (!overrides.isBatch) setIsGeneratingScript(false);
            return null;
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

    // ── YouTube 팟캐스트 상태 ─────────────────────────────────
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [youtubeTitle, setYoutubeTitle] = useState('');
    const [youtubeChannel, setYoutubeChannel] = useState('');
    const [youtubeAnalyzing, setYoutubeAnalyzing] = useState(false);
    const [youtubeContent, setYoutubeContent] = useState('');
    const [youtubeSaving, setYoutubeSaving] = useState(false);
    const [youtubeVideos, setYoutubeVideos] = useState([]);
    const [selectedYoutubeId, setSelectedYoutubeId] = useState('');
    const [podcastSourceType, setPodcastSourceType] = useState('book'); // 'book' | 'youtube'
    const [youtubeLogs, setYoutubeLogs] = useState([]);
    const [youtubeScriptGenerating, setYoutubeScriptGenerating] = useState(false);

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

    // Socket.io - dynamic import (초기 번들에서 제외)
    useEffect(() => {
        let socket;
        import('socket.io-client').then(({ io }) => {
            socket = io('http://127.0.0.1:3001', { reconnection: false, timeout: 3000 });
            socket.on('connect_error', () => { });
            socket.on('log', (data) => {
                const msg = typeof data === 'string' ? data : data.message;
                setLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
                if (msg?.includes('원스톱 등록 완료') || msg?.includes('등록 실패')) {
                    setIsRegistering(false);
                    setIsGenerating(false);
                }
            });
            socket.on('progress', (data) => {
                if (data.percent !== undefined) setPodcastProgress(data.percent);
            });
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
            socket.on('voice-log', (data) => {
                const msg = typeof data === 'string' ? data : data.message;
                setVoiceLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
                if (msg?.includes('병합 완료') || msg?.includes('병합 실패')) setVoiceMerging(false);
            });
            socket.on('voice-progress', (data) => {
                if (data.percent !== undefined) setVoiceProgress(data.percent);
            });
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
        });
        return () => socket?.disconnect();
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

    // ── YouTube 팟캐스트 함수 ─────────────────────────────────

    const handleAnalyzeYoutube = async () => {
        if (!youtubeUrl.trim()) return alert('YouTube URL을 입력해주세요.');
        const ytPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
        if (!ytPattern.test(youtubeUrl)) return alert('올바른 YouTube URL 형식이 아닙니다.\n(예: https://www.youtube.com/watch?v=...)');

        setYoutubeAnalyzing(true);
        setYoutubeContent('');
        setYoutubeLogs(['[START] YouTube 영상 분석 시작...']);

        const geminiKey = [
            import.meta.env.VITE_GEMINI_API_KEY,
            import.meta.env.VITE_GEMINI_API_KEY2,
            import.meta.env.VITE_GEMINI_API_KEY3,
        ].filter(Boolean)[0];

        try {
            if (!geminiKey) throw new Error('Gemini API 키가 없습니다. 환경변수를 확인하세요.');
            setYoutubeLogs(prev => [...prev, '[GEMINI] 영상 내용 분석 중... (최대 2~3분 소요)']);

            const analysisPrompt = `이 유튜브 영상을 분석해서 다음 형식으로 한국어로 상세하게 정리해주세요:

[제목]
영상 제목 (한국어 번역 포함)

[발표자/채널]
발표자 이름, 채널명, 배경 정보

[핵심 주제]
3~5개의 핵심 주제를 bullet point로

[주요 메시지]
영상의 가장 중요한 메시지와 인사이트 (구체적 발언 포함)

[내용 상세 요약]
영상 전체 내용을 섹션별로 자세히 요약 (전체 내용의 80% 이상 커버)

[실용적 교훈]
직장인들이 바로 활용할 수 있는 실용적 교훈 3~5개

[인상적인 발언 & 명언]
영상에서 가장 인상적인 발언이나 명언 3~5개 (원문 + 한국어)`;

            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [
                            { text: analysisPrompt },
                            { fileData: { mimeType: 'video/*', fileUri: youtubeUrl.trim() } }
                        ]}],
                        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
                    })
                }
            );

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error?.message || `Gemini API 오류 (${res.status})`);
            }

            const data = await res.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content) throw new Error('응답 내용이 비어있습니다.');

            // 제목 자동 추출
            const titleMatch = content.match(/\[제목\]\s*\n(.*?)(?:\n|$)/);
            if (titleMatch && !youtubeTitle) setYoutubeTitle(titleMatch[1].trim());
            const channelMatch = content.match(/\[발표자\/채널\]\s*\n(.*?)(?:\n|$)/);
            if (channelMatch && !youtubeChannel) setYoutubeChannel(channelMatch[1].trim());

            setYoutubeContent(content);
            setYoutubeLogs(prev => [...prev, `[DONE] 분석 완료! ${content.length}자 추출됨`]);
        } catch (e) {
            setYoutubeLogs(prev => [...prev, `[ERROR] ${e.message}`]);
            alert('영상 분석 실패: ' + e.message);
        } finally {
            setYoutubeAnalyzing(false);
        }
    };

    const handleSaveYoutubeVideo = async () => {
        if (!youtubeContent) return alert('먼저 영상을 분석해주세요.');
        if (!youtubeTitle.trim()) return alert('영상 제목을 입력해주세요.');

        setYoutubeSaving(true);
        try {
            const videoIdMatch = youtubeUrl.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
            const videoId = videoIdMatch ? videoIdMatch[1] : `yt-${Date.now()}`;
            await setDoc(doc(db, 'youtube_videos', videoId), {
                url: youtubeUrl.trim(),
                title: youtubeTitle.trim(),
                channel: youtubeChannel.trim(),
                content: youtubeContent,
                createdAt: serverTimestamp()
            });
            setYoutubeLogs(prev => [...prev, `[SAVED] "${youtubeTitle}" Firestore 저장 완료`]);
            setYoutubeUrl('');
            setYoutubeTitle('');
            setYoutubeChannel('');
            setYoutubeContent('');
            alert('유튜브 영상이 등록되었습니다!');
        } catch (e) {
            alert('저장 실패: ' + e.message);
        } finally {
            setYoutubeSaving(false);
        }
    };

    const handleDeleteYoutubeVideo = async (videoId) => {
        if (!confirm('이 영상을 목록에서 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, 'youtube_videos', videoId));
        } catch (e) {
            alert('삭제 실패: ' + e.message);
        }
    };

    const handleGenerateYoutubeScript = async () => {
        if (!selectedYoutubeId) return alert('YouTube 영상을 선택해주세요.');
        const video = youtubeVideos.find(v => v.id === selectedYoutubeId);
        if (!video) return alert('선택한 영상 정보를 찾을 수 없습니다.');

        const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || scriptApiKey;
        if (!apiKey) return alert('Claude API 키가 필요합니다. AI 대본 생성 탭에서 먼저 입력하세요.');

        setYoutubeScriptGenerating(true);
        setLogs([`[YOUTUBE] "${video.title}" 팟캐스트 대본 생성 시작...`]);

        try {
            const { Anthropic } = await import('@anthropic-ai/sdk');
            const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

            const _ytActiveSituation = selectedSituation || SCRIPT_SITUATIONS[Math.floor(Math.random() * SCRIPT_SITUATIONS.length)];
            const situation = `선택된 상황: ${_ytActiveSituation.scene}\n클로징 복귀 멘트(턴 58 마지막 대사로 반드시 그대로 사용): "${_ytActiveSituation.close}"`;

            const speakerA = '제임스';
            const speakerB = '스텔라';

            setLogs(prev => [...prev, '[CLAUDE] 1단계: 대본 생성 중...']);

            const systemPrompt = `[시스템 페르소나 및 핵심 제약사항]
당신은 대한민국 직장인들이 퇴근길에 가장 사랑하는 팟캐스트 대본 작가입니다.
두 명의 친한 친구(${speakerA}, ${speakerB})가 수다 떨듯이 쓰되, 절대 강의처럼 들리지 않게 하세요.

[절대 출력 형식]
오직 아래 JSON 배열 형태만 최종 출력하세요. 그 외 어떤 글자도 쓰지 마세요.
[
  {"speaker": "${speakerA}", "text": "..."},
  {"speaker": "${speakerB}", "text": "..."}
]
총 턴 수는 정확히 58턴으로 고정 (7분 30초~8분 분량 목표)

[턴 구조 - 반드시 이 흐름으로만 작성]
턴 1~6 : 주어진 상황만 수다. 영상/강연/유튜브 언급 절대 금지. 현실적인 직장인 수다만.
          단, 턴 4~6에서 나중에 영상 주제와 연결될 수 있는 소재를 자연스럽게 흘려둘 것.
턴 7~9 : 영상 전환 브릿지 — ⚠️ 7~9턴 모두 ${speakerA}가 먼저 말을 꺼내고 ${speakerB}가 반응하는 구조.
          [7턴] ${speakerA}가 앞 대화 고민/공감대 받아서 "그러고 보니…", "근데 그거 관련해서 생각난 게 있는데" 식으로 연결
          [8턴] ${speakerA}가 직접 언급 없이 "나 요즘 그런 생각 하다가 뭔가 봤는데" 궁금증 유발 → ${speakerB}가 "뭔데?" 반응
          [9턴] ${speakerA}가 자연스럽게 영상/강연 제목 꺼냄 → ${speakerB}가 처음 듣는 반응
          (나쁜 예: ${speakerB}가 영상/콘텐츠를 먼저 꺼내는 것 → 절대 금지)
턴 10~52 : ${speakerA}가 영상 내용 설명, ${speakerB}가 듣고 질문·공감·반박하는 구조.
  - ${speakerA}: 영상 내용 설명 + 직장 사례 연결 (대사 충분히 길게, 2~4문장)
  - ${speakerB}: 처음 듣는 사람처럼 반응 (영상 내용 설명 절대 금지)
  - 턴 36~45: 직장 사례 최소 2개
  - 턴 46~52: 행동 인사이트 정확히 2개
턴 53~58 : 텐션 낮추며 여운. ${speakerB}가 "나도 한번 봐야겠다" 식으로 처음으로 보고 싶다는 의사 표현 (추천 유도 1회)

[말투 철칙]
- 전 구간 100% 반말. 단 1턴도 예외 없음.
- 존댓말 어미 절대 금지: ~요, ~습니다, ~세요, ~군요, ~네요, ~거든요, ~잖아요 등 전부 반말로
- ⚠️ 이름 호칭: 턴 1~6(오프닝 상황극 구간)에서만 이름 부르는 것 허용. 턴 7 이후부터는 이름 호칭 절대 금지.
- ⚠️ "진짜" 사용 제한: 대본 전체에서 "진짜"라는 단어가 2회를 초과하면 안 됨. 대체 표현: "정말", "완전", "너무", "대박", "어이없어", "말도 안 돼" 등 다양하게 활용.
- ⚠️ 대화 논리 일관성: 각 대사는 직전 대사와 반드시 논리적으로 연결되어야 함. 직전에 언급한 소재를 갑자기 모순되게 쓰는 것 절대 금지. 화제 전환 시 자연스러운 브릿지 사용.
- 모든 대사는 최소 2문장 이상 (한 문장짜리 단답 금지)
- 매 턴 text 길이 최대 80자 (초과 시 나누기)
- 매 턴 마침표/물음표/느낌표로 끝
- 숫자는 한글로 (1+1 → 원 플러스 원)

[화자 역할 구분 — 반드시 준수]
- ${speakerA}(제임스): 콘텐츠를 먼저 보고 설명하는 입장 → "말로는 다 못 전달해", "직접 봐야 느낌이 달라" 같은 표현 자연스럽게 허용
- ${speakerB}(스텔라): 듣고 반응하는 입장 → 스텔라 본인이 "이건 설명해도 안 와닿을 것 같아" 식으로 설명 포기하는 대사 절대 금지
  이유: 스텔라는 콘텐츠를 직접 본 사람이 아니므로 "내가 설명을 못 하겠다"는 발언이 앞뒤 안 맞음
  대신: "그 느낌이 이제 알 것 같아", "제임스 말 듣고 나니까 나도 보고 싶어졌어" 식으로 반응`;

            const prompt = `유튜브 영상/강연 정보:
제목: ${video.title}
채널: ${video.channel || ''}
URL: ${video.url}

영상 내용 요약:
${video.content}

상황극: ${situation}

위 유튜브 영상 내용을 바탕으로 직장인들이 공감할 수 있는 팟캐스트 대본을 58턴으로 작성해주세요.
영상의 핵심 인사이트를 자연스럽게 녹여내되, 마치 두 친구가 이 강연/영상을 보고 나서 수다를 떠는 느낌으로 작성하세요.`;

            const res1 = await anthropic.messages.create({
                model: 'claude-sonnet-4-5',
                max_tokens: 8192,
                temperature: 0.7,
                system: systemPrompt,
                messages: [{ role: 'user', content: prompt }]
            });
            const raw = res1.content[0].text;

            setLogs(prev => [...prev, '[CLAUDE] 2단계: 맞춤법 교정 중...']);
            const sys2 = `아래 대본 JSON 배열에서 맞춤법·띄어쓰기만 수정하고, 말투·내용은 절대 변경하지 마세요. 오직 유효한 JSON 배열만 출력하세요.`;
            const res2 = await anthropic.messages.create({
                model: 'claude-sonnet-4-5',
                max_tokens: 8192,
                temperature: 0.2,
                system: sys2,
                messages: [{ role: 'user', content: raw }]
            });
            const corrected = res2.content[0].text;

            setLogs(prev => [...prev, '[CLAUDE] 3단계: TTS 최적화 검토 중...']);
            const sys3 = `아래 JSON 배열 대본을 검토하세요. 존댓말 어미 제거, 30자 초과 턴 분리, 턴수 58개 확인, 문장 끝 마침표 확인. 추가로: 스텔라(Stella) 화자의 대사 중 "설명해도 안 와닿아", "이건 말로 표현이 안 돼" 처럼 스텔라 본인이 설명을 포기하는 표현은 "제임스 말 듣고 나니 나도 보고 싶어졌어" 식으로 교체. 단, 제임스(James) 화자의 "말로는 다 못 전달해", "직접 봐야 느낌이 달라" 는 그대로 유지. ⚠️ 대사 중 상대방 이름 직접 호칭 제거: "야 스텔라", "스텔라야", "야 제임스", "제임스야" 등 이름을 부르는 표현이 있으면 이름 없이 자연스럽게 수정. ⚠️ 대화 논리 일관성: 직전 대사와 모순되는 내용(예: 느리다고 불평한 것을 바로 다음 턴에서 "벌써 됐네"라고 하는 것)이 있으면 즉시 수정. 오직 완성된 58턴 JSON 배열만 출력하세요.`;
            const res3 = await anthropic.messages.create({
                model: 'claude-sonnet-4-5',
                max_tokens: 8192,
                temperature: 0.2,
                system: sys3,
                messages: [{ role: 'user', content: corrected }]
            });
            let finalRaw = res3.content[0].text;

            let cleanJson = finalRaw.replace(/```(json)?/gi, '').trim();
            const finalScript = tryLooseParseJSON(cleanJson);
            if (!Array.isArray(finalScript) || finalScript.length === 0) throw new Error('대본 파싱 실패');

            // Firestore 저장
            const scriptId = `yt-${selectedYoutubeId}`;
            await setDoc(doc(db, 'scripts', scriptId), {
                script: finalScript,
                sourceType: 'youtube',
                youtubeId: selectedYoutubeId,
                youtubeTitle: video.title,
                updatedAt: new Date().toISOString()
            });

            setGeneratedScript(finalScript);
            setManualContent(JSON.stringify(finalScript, null, 2));
            setInputMode('text');
            setLogs(prev => [...prev, `[DONE] ✅ 대본 ${finalScript.length}턴 생성 완료! Firestore(scripts/${scriptId}) 저장됨`]);
            alert(`대본 생성 완료! ${finalScript.length}턴\n이제 AI 팟캐스트 탭 → EXECUTE PRODUCTION으로 TTS를 생성하세요.`);
        } catch (e) {
            setLogs(prev => [...prev, `[ERROR] ${e.message}`]);
            alert('대본 생성 실패: ' + e.message);
        } finally {
            setYoutubeScriptGenerating(false);
        }
    };

    const tabNames = {
        'members': '회원 관리',
        'books': '도서 관리',
        'popular': '인기 아카이뷰',
        'script': 'AI 대본 생성',
        'automation': '일괄 자동화 ⚡',
        'ebook': 'E-BOOK 제작',
        'podcast': 'YouTube 팟캐스트',
        'voice': 'YouTube 등록',
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
                                className={`flex-1 py-4 px-3 rounded-xl text-sm font-black tracking-widest whitespace-nowrap transition-all ${activeTab === tab
                                    ? 'bg-gold text-primary shadow-[0_10px_25px_rgba(212,175,55,0.3)] scale-[1.02] z-10'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
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
                                        onChange={(e) => { setBookSearchQuery(e.target.value); setBooksPage(0); }}
                                        className="flex-1 bg-transparent border-none text-white text-lg font-bold placeholder:text-slate-600 outline-none px-4"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <select
                                        value={filterCategory}
                                        onChange={(e) => { setFilterCategory(e.target.value); setBooksPage(0); }}
                                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold outline-none"
                                    >
                                        <option value="">모든 카테고리</option>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <select
                                        value={filterSection}
                                        onChange={(e) => { setFilterSection(e.target.value); setBooksPage(0); }}
                                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold outline-none"
                                    >
                                        <option value="">모든 노출 섹션</option>
                                        {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <select
                                        value={filterCeleb}
                                        onChange={(e) => { setFilterCeleb(e.target.value); setBooksPage(0); }}
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

                            {(() => {
                                const filteredBooks = [...realBooks]
                                    .filter(book => {
                                        const matchSearch = book.title.toLowerCase().includes(bookSearchQuery.toLowerCase());
                                        const matchCategory = filterCategory === '' || (book.category || '').replace(/\s+/g, '') === filterCategory.replace(/\s+/g, '');
                                        const matchSection = filterSection === '' || book.section === filterSection;
                                        const matchCeleb = filterCeleb === '' || (book.celebName === filterCeleb || book.celebrity === filterCeleb);
                                        return matchSearch && matchCategory && matchSection && matchCeleb;
                                    })
                                    .reverse();
                                const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);
                                const pagedBooks = filteredBooks.slice(booksPage * BOOKS_PER_PAGE, (booksPage + 1) * BOOKS_PER_PAGE);
                                return (<>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-slate-500 text-sm font-bold">
                                    {filteredBooks.length}권 중 {booksPage * BOOKS_PER_PAGE + 1}–{Math.min((booksPage + 1) * BOOKS_PER_PAGE, filteredBooks.length)}권 표시
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setBooksPage(p => Math.max(0, p - 1))} disabled={booksPage === 0} className="px-4 py-2 bg-white/10 text-white text-xs font-black rounded-xl disabled:opacity-30 hover:bg-white/20 transition-all">← 이전</button>
                                    <span className="px-4 py-2 text-gold text-xs font-black">{booksPage + 1} / {totalPages || 1}</span>
                                    <button onClick={() => setBooksPage(p => Math.min(totalPages - 1, p + 1))} disabled={booksPage >= totalPages - 1} className="px-4 py-2 bg-white/10 text-white text-xs font-black rounded-xl disabled:opacity-30 hover:bg-white/20 transition-all">다음 →</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-10">
                                {pagedBooks.map((book) => {
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
                            </>);
                            })()}
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
                            {/* LEFT: 대본 생성 */}
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                                        <span className="material-symbols-outlined text-red-400 text-sm">smart_display</span>
                                        <span className="text-red-400 text-[10px] font-black uppercase tracking-widest">YouTube → Podcast Pipeline</span>
                                    </div>
                                    <h3 className="text-white font-black text-5xl italic tracking-tighter">AI 팟캐스트<br/>팩토리</h3>
                                    <p className="text-slate-500 text-base font-medium">유튜브 영상을 제임스 & 스텔라의 팟캐스트로 자동 변환합니다.</p>
                                </div>

                                {/* STEP 1: 영상 선택 */}
                                <div className="bg-white/5 rounded-[32px] border border-white/10 p-8 space-y-5">
                                    <h4 className="text-white font-black text-lg flex items-center gap-3">
                                        <span className="size-7 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-xs font-black text-red-400">1</span>
                                        YouTube 영상 선택
                                    </h4>
                                    {youtubeVideos.length === 0 ? (
                                        <div className="text-center py-8 space-y-3">
                                            <span className="material-symbols-outlined text-4xl text-slate-700">smart_display</span>
                                            <p className="text-slate-600 text-sm font-bold">등록된 YouTube 영상이 없습니다.</p>
                                            <p className="text-slate-700 text-xs">「성우 다이렉트」 탭에서 먼저 영상을 등록하세요.</p>
                                        </div>
                                    ) : (
                                        <select value={selectedYoutubeId} onChange={e => setSelectedYoutubeId(e.target.value)} className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-6 py-5 text-base text-white focus:border-red-400/60 outline-none transition-all font-bold appearance-none cursor-pointer">
                                            <option value="">영상을 선택하세요</option>
                                            {youtubeVideos.map(v => (<option key={v.id} value={v.id}>{v.title}</option>))}
                                        </select>
                                    )}
                                    {selectedYoutubeId && (() => {
                                        const video = youtubeVideos.find(v => v.id === selectedYoutubeId);
                                        return video ? (
                                            <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10 space-y-1">
                                                <p className="text-red-300 text-xs font-black">{video.channel}</p>
                                                <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-slate-600 text-[10px] hover:text-red-400 transition-colors truncate block">{video.url}</a>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>

                                {/* STEP 2: 상황극 선택 */}
                                <div className="bg-white/5 rounded-[32px] border border-white/10 p-8 space-y-4">
                                    <h4 className="text-white font-black text-lg flex items-center gap-3">
                                        <span className="size-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-400">2</span>
                                        상황극 선택 <span className="text-slate-600 text-sm font-normal ml-1">(선택 사항)</span>
                                    </h4>
                                    <select
                                        value={selectedSituation ? SCRIPT_SITUATIONS.indexOf(selectedSituation) : ''}
                                        onChange={e => setSelectedSituation(e.target.value === '' ? null : SCRIPT_SITUATIONS[parseInt(e.target.value)])}
                                        className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-6 py-5 text-sm text-white focus:border-amber-400/60 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">랜덤 / 스튜디오 기본 설정</option>
                                        {SCRIPT_SITUATIONS.map((s, i) => (<option key={i} value={i}>{s.scene}</option>))}
                                    </select>
                                </div>

                                {/* STEP 3: 대본 생성 버튼 */}
                                <button
                                    onClick={handleGenerateYoutubeScript}
                                    disabled={youtubeScriptGenerating || !selectedYoutubeId}
                                    className={`w-full py-7 rounded-[32px] font-black text-xl flex items-center justify-center gap-5 transition-all ${youtubeScriptGenerating || !selectedYoutubeId ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_50px_rgba(239,68,68,0.3)]'}`}
                                >
                                    {youtubeScriptGenerating ? (<><span className="material-symbols-outlined animate-spin text-3xl">sync</span>Claude 대본 생성 중...</>) : (<><span className="material-symbols-outlined text-3xl">auto_awesome</span>Claude 대본 생성 (3단계)</>)}
                                </button>

                                {/* 생성된 대본 미리보기 */}
                                {generatedScript.length > 0 && (
                                    <div className="bg-black rounded-[32px] border border-white/10 overflow-hidden">
                                        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                                            <p className="text-white font-black text-sm">대본 생성 완료 ({generatedScript.length}턴)</p>
                                        </div>
                                        <div className="p-5 space-y-2 max-h-56 overflow-y-auto scrollbar-hide">
                                            {generatedScript.slice(0, 8).map((line, i) => (
                                                <div key={i} className={`flex gap-2 ${line.speaker === '스텔라' ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`shrink-0 size-5 rounded-full flex items-center justify-center text-[8px] font-black ${line.speaker === '제임스' ? 'bg-gold/20 text-gold' : 'bg-violet-500/20 text-violet-400'}`}>{line.speaker === '제임스' ? 'J' : 'S'}</div>
                                                    <p className="text-xs text-slate-400 leading-relaxed max-w-[85%]">{line.text}</p>
                                                </div>
                                            ))}
                                            {generatedScript.length > 8 && <p className="text-center text-slate-700 text-[10px] pt-2">+{generatedScript.length - 8}개 더...</p>}
                                        </div>
                                    </div>
                                )}

                                {/* 로그 터미널 */}
                                <div className="bg-black rounded-[32px] border-4 border-white/5 overflow-hidden flex flex-col h-56 shadow-2xl">
                                    <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex items-center gap-3">
                                        <div className="size-2.5 rounded-full bg-red-500"></div>
                                        <div className="size-2.5 rounded-full bg-amber-500"></div>
                                        <div className="size-2.5 rounded-full bg-emerald-500"></div>
                                        <span className="text-[10px] font-mono text-slate-600 ml-2 uppercase tracking-widest">YouTube Podcast Log</span>
                                    </div>
                                    <div className="p-5 font-mono text-xs text-emerald-400 overflow-y-auto space-y-2 flex-1 scrollbar-hide bg-[#050505]">
                                        {logs.length === 0 ? (
                                            <div className="flex items-center justify-center h-full text-slate-800"><p className="text-xs font-black uppercase tracking-widest">Waiting for pipeline...</p></div>
                                        ) : logs.map((log, i) => (
                                            <div key={i} className="border-l-2 border-emerald-500/30 pl-3 animate-fade-in">
                                                <span className="text-emerald-900 mr-2">[{i+1}]</span>{log}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: TTS 생성 패널 */}
                            <div className="bg-white/5 border border-white/10 p-10 rounded-[48px] space-y-8 h-fit sticky top-32 shadow-3xl backdrop-blur-3xl">
                                <div className="space-y-3">
                                    <div className="inline-block px-4 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-[10px] font-black uppercase tracking-widest">Gemini TTS Engine</div>
                                    <h3 className="text-white font-black text-4xl italic tracking-tighter leading-none">TTS<br/>PRODUCTION</h3>
                                    <p className="text-slate-500 text-sm font-medium">대본 생성 후 TTS를 실행하여 팟캐스트 음성을 생성합니다.</p>
                                </div>

                                {/* TTS 모델 선택 */}
                                <div className="space-y-3">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">TTS 모델</label>
                                    <div className="flex bg-black/60 p-2 rounded-2xl gap-2">
                                        {[['pro', 'Gemini 2.5 Pro'], ['flash', 'Gemini 2.5 Flash']].map(([val, label]) => (
                                            <button key={val} onClick={() => setTtsModel(val)} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${ttsModel === val ? 'bg-white/10 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>{label}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* 진행률 */}
                                {isTtsRunning && (
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                                            <span>TTS 진행률</span><span>{ttsProgress}%</span>
                                        </div>
                                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-gold to-amber-400 rounded-full transition-all duration-500" style={{ width: `${ttsProgress}%` }}></div>
                                        </div>
                                    </div>
                                )}

                                {/* TTS 실행 버튼 */}
                                <button
                                    onClick={handleRunTts}
                                    disabled={isTtsRunning || generatedScript.length === 0}
                                    className={`w-full py-7 rounded-[28px] font-black text-xl flex items-center justify-center gap-5 transition-all ${isTtsRunning || generatedScript.length === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-gold text-primary hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_50px_rgba(212,175,55,0.3)]'}`}
                                >
                                    {isTtsRunning ? (<><span className="material-symbols-outlined animate-spin text-3xl">settings_accent</span>TTS 생성 중... ({ttsProgress}%)</>) : (<><span className="material-symbols-outlined text-3xl">rocket_launch</span>TTS 음성 생성</>)}
                                </button>

                                {/* TTS 로그 */}
                                {ttsLogs.length > 0 && (
                                    <div className="bg-black rounded-2xl border border-white/5 overflow-hidden">
                                        <div className="px-5 py-3 border-b border-white/10">
                                            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">TTS Engine Log</span>
                                        </div>
                                        <div ref={ttsLogContainerRef} className="p-4 font-mono text-[10px] text-emerald-400 overflow-y-auto space-y-1.5 max-h-52 bg-[#050505] scrollbar-hide">
                                            {ttsLogs.map((log, i) => <div key={i} className="border-l border-emerald-500/20 pl-2">{log}</div>)}
                                            <div ref={ttsLogEndRef} />
                                        </div>
                                    </div>
                                )}

                                {!isTtsRunning && generatedScript.length > 0 && (
                                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-center space-y-1">
                                        <p className="text-emerald-400 text-xs font-black">TTS 완료 후 WAV 파일이 자동 다운로드됩니다</p>
                                        <p className="text-slate-600 text-[10px]">public/audio/ 폴더에 복사 후 관리자에서 경로 등록하세요</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── 성우 다이렉트 탭 (YouTube 소스 등록) ─────────────── */}
                    {activeTab === 'voice' && (
                        <>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 animate-fade-in items-start">
                            {/* LEFT: 새 영상 등록 폼 */}
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                                        <div className="size-2 rounded-full bg-red-400 animate-ping"></div>
                                        <span className="text-red-400 text-[10px] font-black uppercase tracking-widest">YouTube Source Studio</span>
                                    </div>
                                    <h3 className="text-white font-black text-5xl italic tracking-tighter uppercase">유튜브<br/>소스 등록</h3>
                                    <p className="text-slate-500 text-lg font-medium">TED · 강연 · 유명인 연설 → Gemini 분석 → 팟캐스트 소스로 등록</p>
                                </div>

                                <div className="bg-white/5 rounded-[40px] border border-white/10 p-8 space-y-6">
                                    <h4 className="text-white font-black text-xl flex items-center gap-3">
                                        <span className="material-symbols-outlined text-red-400">add_link</span>
                                        새 영상 등록
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1 block mb-2">YouTube URL *</label>
                                            <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-red-400/60 outline-none transition-all font-mono" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1 block mb-2">영상 제목 *</label>
                                                <input type="text" value={youtubeTitle} onChange={e => setYoutubeTitle(e.target.value)} placeholder="자동 추출 또는 직접 입력" className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:border-red-400/60 outline-none transition-all" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1 block mb-2">채널 / 발표자</label>
                                                <input type="text" value={youtubeChannel} onChange={e => setYoutubeChannel(e.target.value)} placeholder="TED, 발표자명 등" className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-4 py-4 text-sm text-white focus:border-red-400/60 outline-none transition-all" />
                                            </div>
                                        </div>
                                    </div>

                                    {youtubeContent && (
                                        <div className="bg-black/60 rounded-2xl border border-emerald-500/20 p-5 max-h-52 overflow-y-auto scrollbar-hide">
                                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">check_circle</span>Gemini 분석 완료
                                            </p>
                                            <pre className="text-slate-400 text-[11px] font-mono whitespace-pre-wrap leading-relaxed">{youtubeContent.slice(0, 1000)}{youtubeContent.length > 1000 ? '\n...(생략)' : ''}</pre>
                                        </div>
                                    )}

                                    {youtubeLogs.length > 0 && (
                                        <div className="bg-black/80 rounded-2xl p-4 space-y-1.5 max-h-32 overflow-y-auto scrollbar-hide">
                                            {youtubeLogs.map((log, i) => (
                                                <p key={i} className={`text-[10px] font-mono ${log.includes('ERROR') ? 'text-red-400' : log.includes('DONE') ? 'text-emerald-400' : 'text-slate-400'}`}>{log}</p>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={handleAnalyzeYoutube} disabled={youtubeAnalyzing || !youtubeUrl.trim()} className={`py-6 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-3 border-2 ${youtubeAnalyzing || !youtubeUrl.trim() ? 'bg-slate-800 text-slate-600 border-white/5 cursor-not-allowed' : 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25 active:scale-95'}`}>
                                            <span className="material-symbols-outlined text-xl">{youtubeAnalyzing ? 'sync' : 'psychology'}</span>
                                            {youtubeAnalyzing ? '분석 중...' : 'Gemini 분석'}
                                        </button>
                                        <button onClick={handleSaveYoutubeVideo} disabled={youtubeSaving || !youtubeContent || !youtubeTitle.trim()} className={`py-6 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-3 border-2 ${youtubeSaving || !youtubeContent || !youtubeTitle.trim() ? 'bg-slate-800 text-slate-600 border-white/5 cursor-not-allowed' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 active:scale-95'}`}>
                                            <span className="material-symbols-outlined text-xl">{youtubeSaving ? 'sync' : 'save'}</span>
                                            {youtubeSaving ? '저장 중...' : '등록하기'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: 등록된 영상 목록 */}
                            <div className="sticky top-32">
                                <div className="bg-white/5 rounded-[40px] border border-white/10 p-8 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-white font-black text-xl flex items-center gap-3">
                                            <span className="material-symbols-outlined text-red-400">playlist_play</span>
                                            등록된 YouTube 영상
                                        </h4>
                                        <span className="text-red-400 font-black text-2xl">{youtubeVideos.length}</span>
                                    </div>
                                    {youtubeVideos.length === 0 ? (
                                        <div className="text-center py-16 space-y-4">
                                            <span className="material-symbols-outlined text-6xl text-slate-800 animate-pulse">smart_display</span>
                                            <p className="text-slate-600 text-sm font-bold">등록된 영상이 없습니다</p>
                                            <p className="text-slate-700 text-xs">왼쪽에서 YouTube URL을 입력하고 등록하세요</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-[640px] overflow-y-auto scrollbar-hide pr-1">
                                            {youtubeVideos.map(v => (
                                                <div key={v.id} className="group bg-black/40 rounded-3xl border border-white/5 p-5 hover:border-red-500/20 transition-all space-y-3">
                                                    <div className="flex items-start gap-4">
                                                        <div className="size-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                                            <span className="material-symbols-outlined text-red-400 text-lg">smart_display</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white font-black text-sm leading-tight mb-1">{v.title}</p>
                                                            {v.channel && <p className="text-red-400/70 text-[10px] font-bold mb-1">{v.channel}</p>}
                                                            <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-slate-700 text-[10px] hover:text-red-400 transition-colors truncate block">{v.url}</a>
                                                        </div>
                                                        <button onClick={() => handleDeleteYoutubeVideo(v.id)} className="shrink-0 size-8 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <span className="material-symbols-outlined text-base">delete</span>
                                                        </button>
                                                    </div>
                                                    {v.content && (
                                                        <p className="text-slate-600 text-[10px] leading-relaxed line-clamp-2 pl-14">{v.content.slice(0, 150)}...</p>
                                                    )}
                                                    <div className="pl-14">
                                                        <button onClick={() => { setSelectedYoutubeId(v.id); setActiveTab('podcast'); }} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black hover:bg-red-500/20 transition-all">
                                                            이 영상으로 팟캐스트 제작 →
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 추천 채널 레퍼런스 */}
                        <div className="mt-12 bg-white/5 rounded-[40px] border border-white/10 p-8 space-y-8">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-red-400">bookmarks</span>
                                <h4 className="text-white font-black text-xl">추천 채널 레퍼런스</h4>
                                <span className="text-slate-600 text-xs font-mono ml-auto">클릭 → 새 탭 열림</span>
                            </div>
                            {[
                                {
                                    category: '자기계발 / 비즈니스',
                                    color: 'blue',
                                    channels: [
                                        { name: '세바시', desc: '한국판 TED, 15분 강연', url: 'https://www.youtube.com/@sebasi15' },
                                        { name: '체인지그라운드', desc: '동기부여, 자기계발', url: 'https://www.youtube.com/@changeground' },
                                        { name: 'TED', desc: '영어 강연, 18분 이내', url: 'https://www.youtube.com/@TED' },
                                        { name: 'Lex Fridman', desc: '명사 장시간 인터뷰', url: 'https://www.youtube.com/@lexfridman' },
                                        { name: 'Simon Sinek', desc: '리더십, 동기부여 명강연', url: 'https://www.youtube.com/@simonsinek' },
                                        { name: 'Andrew Huberman', desc: '뇌과학 기반 생산성', url: 'https://www.youtube.com/@hubermanlab' },
                                    ]
                                },
                                {
                                    category: '경제 / 재테크',
                                    color: 'emerald',
                                    channels: [
                                        { name: '슈카월드', desc: '한국 최대 경제 채널', url: 'https://www.youtube.com/@ShukaWorld' },
                                        { name: '삼프로TV', desc: '주식/경제 전문', url: 'https://www.youtube.com/@3pro_tv' },
                                        { name: 'Graham Stephan', desc: '영어 재테크', url: 'https://www.youtube.com/@GrahamStephan' },
                                        { name: 'Big Think', desc: '학자/작가/CEO 심층 인터뷰', url: 'https://www.youtube.com/@bigthink' },
                                    ]
                                },
                                {
                                    category: '심리학 / 철학',
                                    color: 'purple',
                                    channels: [
                                        { name: '이연', desc: '심리/철학 에세이, 한국어', url: 'https://www.youtube.com/@yiyeon' },
                                        { name: 'The School of Life', desc: '철학 기반 심리', url: 'https://www.youtube.com/@theschooloflifetv' },
                                        { name: '사피엔스 스튜디오', desc: '철학/인문학 한국어', url: 'https://www.youtube.com/@SapiensStudio' },
                                        { name: 'Einzelgänger', desc: '스토아 철학, 마음챙김', url: 'https://www.youtube.com/@Einzelganger' },
                                    ]
                                },
                                {
                                    category: '과학 / 지식',
                                    color: 'amber',
                                    channels: [
                                        { name: 'Kurzgesagt', desc: '과학 애니메이션, 최고 퀄리티', url: 'https://www.youtube.com/@kurzgesagt' },
                                        { name: 'Veritasium', desc: '물리/심리 실험', url: 'https://www.youtube.com/@veritasium' },
                                        { name: '김창옥 포럼', desc: '소통/인간관계, 공감 1위', url: 'https://www.youtube.com/@kimchangokforum' },
                                        { name: 'EBS 다큐', desc: '권위 있는 한국어 콘텐츠', url: 'https://www.youtube.com/@ebsdocumentary' },
                                    ]
                                },
                                {
                                    category: '명사 인터뷰 / 북토크',
                                    color: 'rose',
                                    channels: [
                                        { name: '김작가 TV', desc: '작가/명사 인터뷰', url: 'https://www.youtube.com/@kimjagga' },
                                        { name: 'Talks at Google', desc: '베스트셀러 저자 강연', url: 'https://www.youtube.com/@talksatgoogle' },
                                        { name: 'Stanford GSB', desc: '스탠퍼드 경영 강연', url: 'https://www.youtube.com/@stanfordgsb' },
                                        { name: 'Big Think', desc: '지식인 심층 인터뷰', url: 'https://www.youtube.com/@bigthink' },
                                    ]
                                },
                            ].map(({ category, color, channels }) => (
                                <div key={category}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 text-${color}-400`}>{category}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                        {channels.map(ch => (
                                            <a key={ch.name} href={ch.url} target="_blank" rel="noopener noreferrer"
                                                className={`group flex flex-col gap-1 p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-${color}-500/30 hover:bg-${color}-500/5 transition-all`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-white font-black text-sm group-hover:text-white transition-colors">{ch.name}</span>
                                                    <span className={`material-symbols-outlined text-slate-700 group-hover:text-${color}-400 text-sm transition-colors`}>open_in_new</span>
                                                </div>
                                                <span className="text-slate-600 text-[10px] leading-snug">{ch.desc}</span>
                                                <span className={`text-[9px] font-mono text-slate-700 group-hover:text-${color}-500 transition-colors truncate mt-1`}>{ch.url.replace('https://www.youtube.com/', '')}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>
                    )}
                    {/* ─────────────────────────────────────────────────────── */}

                    {/* 인기 아카이뷰 관리 */}
                    {/* ─────────────────────────────────────────────────────── */}

                    {/* 인기 아카이뷰 관리 */}
                    {activeTab === 'popular' && (() => {
                        const SECTIONS = [
                            { id: 'popular',       label: '인기아카이뷰',  dbKey: 'popular_archives',      max: 5 },
                            { id: 'weekly_focus',  label: '위클리포커스',  dbKey: 'weekly_focus',          max: 5 },
                            { id: 'weekly_viewed', label: '주간 최다조회', dbKey: 'weekly_most_viewed',     max: 8 },
                            { id: 'growth',        label: '자기계발',      dbKey: 'category_growth',       max: 8 },
                            { id: 'economy',       label: '경제',          dbKey: 'category_economy',      max: 8 },
                            { id: 'business',      label: '경영',          dbKey: 'category_business',     max: 8 },
                            { id: 'humanities',    label: '인문',          dbKey: 'category_humanities',   max: 8 },
                            { id: 'psychology',    label: '심리',          dbKey: 'category_psychology',   max: 8 },
                        ];
                        const curSection = SECTIONS.find(s => s.id === popularSubTab);
                        const curList    = popularSubTab === 'popular' ? popularList : (sectionData[popularSubTab] || []);
                        const setCurList = popularSubTab === 'popular'
                            ? setPopularList
                            : (fn) => setSectionData(prev => ({ ...prev, [popularSubTab]: typeof fn === 'function' ? fn(prev[popularSubTab] || []) : fn }));
                        const curSearch    = popularSubTab === 'popular' ? popularSearch : (sectionSearch[popularSubTab] || '');
                        const setCurSearch = popularSubTab === 'popular'
                            ? setPopularSearch
                            : (val) => setSectionSearch(prev => ({ ...prev, [popularSubTab]: val }));
                        const curSaving = popularSubTab === 'popular' ? popularSaving : (sectionSaving[popularSubTab] || false);
                        const filteredBooks = curSearch.trim()
                            ? realBooks.filter(b => b.title?.includes(curSearch) || b.author?.includes(curSearch))
                            : [];
                        const saveSection = async () => {
                            if (curList.length === 0) { alert('등록된 도서가 없습니다.'); return; }
                            if (popularSubTab === 'popular') {
                                setPopularSaving(true);
                                try { await setDoc(doc(db, 'site_config', 'popular_archives'), { books: curList.slice(0, curSection.max) }); alert('저장 완료! ✅'); }
                                catch (e) { alert('저장 실패: ' + e.message); }
                                setPopularSaving(false);
                            } else {
                                setSectionSaving(prev => ({ ...prev, [popularSubTab]: true }));
                                try { await setDoc(doc(db, 'site_config', curSection.dbKey), { books: curList.slice(0, curSection.max) }); alert('저장 완료! ✅'); }
                                catch (e) { alert('저장 실패: ' + e.message); }
                                setSectionSaving(prev => ({ ...prev, [popularSubTab]: false }));
                            }
                        };
                        const addToList     = (book) => {
                            if (curList.length >= curSection.max) { alert(`최대 ${curSection.max}개까지 등록 가능합니다.`); return; }
                            if (curList.some(b => b.id === book.id)) { alert('이미 등록된 도서입니다.'); return; }
                            setCurList(prev => [...prev, { id: book.id, title: book.title, cover: book.cover || '', author: book.author || '', purchaseLink: book.purchaseLink || '', listens: book.listens || '' }]);
                            setCurSearch('');
                        };
                        const removeFromList = (id) => setCurList(prev => prev.filter(b => b.id !== id));
                        const moveUp         = (i) => { if (i === 0) return; setCurList(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; }); };
                        const moveDown       = (i) => { if (i === curList.length - 1) return; setCurList(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; }); };
                        return (
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-3">
                                        <h3 className="text-white font-black text-5xl italic tracking-tighter uppercase">Popular Archives</h3>
                                        <p className="text-slate-500 text-xl font-medium italic">메인 화면 각 섹션의 도서 순위를 관리합니다.</p>
                                    </div>
                                    <button onClick={saveSection} disabled={curSaving} className="px-10 py-5 rounded-[24px] bg-gold text-primary font-black text-base flex items-center gap-4 hover:bg-white hover:scale-105 transition-all shadow-[0_20px_50px_rgba(212,175,55,0.3)] disabled:opacity-50">
                                        <span className="material-symbols-outlined text-2xl">{curSaving ? 'sync' : 'save'}</span>
                                        {curSaving ? '저장 중...' : '메인에 저장'}
                                    </button>
                                </div>

                                {/* 8개 섹션 서브탭 */}
                                <div className="flex gap-2 flex-wrap">
                                    {SECTIONS.map(s => (
                                        <button key={s.id} onClick={() => setPopularSubTab(s.id)}
                                            className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all whitespace-nowrap ${popularSubTab === s.id ? 'bg-gold text-primary shadow-lg' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'}`}>
                                            {s.label.toUpperCase()}
                                            <span className="ml-2 opacity-50 text-[10px]">{(popularSubTab === s.id ? curList : (s.id === 'popular' ? popularList : (sectionData[s.id] || []))).length}/{s.max}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* 현재 등록된 목록 */}
                                <div className="bg-white/5 p-8 rounded-[40px] border border-white/10 space-y-4">
                                    <h4 className="text-white font-black text-xl flex items-center gap-3">
                                        <span className="material-symbols-outlined text-gold">format_list_numbered</span>
                                        {curSection.label} 등록 목록 ({curList.length}/{curSection.max})
                                    </h4>
                                    {curList.length === 0 && (
                                        <p className="text-slate-500 text-sm text-center py-8">아직 등록된 도서가 없습니다. 아래에서 도서를 검색해 추가하세요.</p>
                                    )}
                                    <div className="space-y-3">
                                        {curList.map((book, i) => (
                                            <div key={book.id} className="flex items-center gap-4 bg-black/40 rounded-2xl p-4 border border-white/5">
                                                <span className="text-2xl font-black text-gold/50 w-8 text-center">{i + 1}</span>
                                                <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800 border border-white/10">
                                                    {book.cover ? <img src={book.cover} alt={book.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-white/20">menu_book</span></div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-black text-sm truncate">{book.title}</p>
                                                    <p className="text-slate-500 text-[11px] font-bold mt-0.5">{book.author}</p>
                                                    <span className="text-slate-700 text-[10px] font-mono">{book.id}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => moveUp(i)} disabled={i === 0} className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-20">
                                                        <span className="material-symbols-outlined text-sm text-white">arrow_upward</span>
                                                    </button>
                                                    <button onClick={() => moveDown(i)} disabled={i === curList.length - 1} className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-20">
                                                        <span className="material-symbols-outlined text-sm text-white">arrow_downward</span>
                                                    </button>
                                                    <button onClick={() => removeFromList(book.id)} className="size-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-all ml-1">
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
                                    <div className="flex-1 bg-black/60 border-2 border-white/10 rounded-2xl overflow-hidden focus-within:border-gold transition-colors flex items-center px-4">
                                        <span className="material-symbols-outlined text-slate-500 mr-2">search</span>
                                        <input type="text" placeholder="도서 제목 또는 저자 검색..."
                                            value={curSearch} onChange={(e) => setCurSearch(e.target.value)}
                                            className="flex-1 bg-transparent text-white text-base py-4 outline-none font-bold" />
                                    </div>
                                    {curSearch.trim() && (
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
                                                    <button onClick={() => addToList(book)}
                                                        disabled={curList.some(b => b.id === book.id) || curList.length >= curSection.max}
                                                        className="px-5 py-2.5 rounded-xl bg-gold/20 text-gold text-[11px] font-black border border-gold/30 hover:bg-gold hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap">
                                                        {curList.some(b => b.id === book.id) ? '등록됨' : '+ 추가'}
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
                
                    {/* 일괄 자동화 탭 */}
                    {activeTab === 'automation' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* 헤더 */}
                            <div className="bg-gradient-to-r from-violet-950/60 to-indigo-950/60 border border-violet-500/20 rounded-[28px] p-10">
                                <div className="flex items-center gap-5 mb-2">
                                    <div className="size-14 bg-violet-500/20 border border-violet-500/30 rounded-2xl flex items-center justify-center">
                                        <span className="material-symbols-outlined text-violet-400 text-3xl">bolt</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-white font-black text-4xl italic tracking-tighter uppercase">일괄 자동화</h3>
                                            <span className="bg-violet-500 text-white text-[10px] px-3 py-1 rounded-full not-italic animate-pulse">BATCH ENGINE</span>
                                        </div>
                                        <p className="text-slate-500 text-lg font-medium italic mt-1">다수의 도서를 선택하여 대본 생성 + TTS를 순차 처리합니다.</p>
                                    </div>
                                </div>
                            </div>

                            {/* 작업 현황 요약 */}
                            {(() => {
                                const total = realBooks.length;
                                const done = realBooks.filter(b => batchScriptStatuses[b.id] === true && (overrides[b.id]?.isPodcast || overrides[b.id]?.audioUrl)).length;
                                const scriptOnly = realBooks.filter(b => batchScriptStatuses[b.id] === true && !overrides[b.id]?.isPodcast && !overrides[b.id]?.audioUrl).length;
                                const none = realBooks.filter(b => batchScriptStatuses[b.id] === false && !overrides[b.id]?.isPodcast && !overrides[b.id]?.audioUrl).length;
                                const optimizedCount = realBooks.filter(b => batchOptimizedStatuses[b.id] === true).length;
                                return (
                                    <div className="grid grid-cols-5 gap-4">
                                        {[
                                            { label: '전체 도서', value: total, color: 'text-white', bg: 'bg-white/5 border-white/10' },
                                            { label: '✅ 완료', value: done, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', desc: '대본 + 오디오' },
                                            { label: '🔧 최적화', value: optimizedCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', desc: 'TTS 최적화 완료' },
                                            { label: '📝 대본만', value: scriptOnly, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', desc: 'TTS 필요' },
                                            { label: '⬜ 미시작', value: none, color: 'text-slate-500', bg: 'bg-white/3 border-white/8', desc: '대본+TTS 필요' },
                                        ].map(item => (
                                            <div key={item.label} className={`${item.bg} border rounded-2xl p-5 text-center`}>
                                                <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
                                                <p className="text-white text-xs font-bold mt-1">{item.label}</p>
                                                {item.desc && <p className="text-slate-600 text-[10px] mt-0.5">{item.desc}</p>}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* LEFT — 도서 선택 */}
                                <div className="space-y-5">
                                    {/* 모드 선택 */}
                                    <div className="bg-white/3 border border-white/8 rounded-[20px] p-5">
                                        <p className="text-violet-400 text-xs font-black uppercase tracking-widest mb-4">실행 모드 선택</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <button
                                                onClick={() => setBatchMode('full')}
                                                disabled={isBatchRunning}
                                                className={`p-4 rounded-2xl border-2 text-left transition-all ${batchMode === 'full' ? 'bg-violet-500/20 border-violet-500/50 text-white' : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'}`}
                                            >
                                                <span className="material-symbols-outlined text-2xl block mb-2">auto_awesome</span>
                                                <p className="font-black text-sm">풀 배치</p>
                                                <p className="text-xs mt-1 opacity-70">대본 생성 → TTS<br/>→ WAV</p>
                                            </button>
                                            <button
                                                onClick={() => setBatchMode('tts-only')}
                                                disabled={isBatchRunning}
                                                className={`p-4 rounded-2xl border-2 text-left transition-all ${batchMode === 'tts-only' ? 'bg-emerald-500/20 border-emerald-500/50 text-white' : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'}`}
                                            >
                                                <span className="material-symbols-outlined text-2xl block mb-2">record_voice_over</span>
                                                <p className="font-black text-sm">TTS 전용</p>
                                                <p className="text-xs mt-1 opacity-70">대본 있는 도서만<br/>TTS → WAV</p>
                                            </button>
                                            <button
                                                onClick={() => setBatchMode('optimize-only')}
                                                disabled={isBatchRunning}
                                                className={`p-4 rounded-2xl border-2 text-left transition-all ${batchMode === 'optimize-only' ? 'bg-amber-500/20 border-amber-500/50 text-white' : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'}`}
                                            >
                                                <span className="material-symbols-outlined text-2xl block mb-2">spellcheck</span>
                                                <p className="font-black text-sm">대본 최적화</p>
                                                <p className="text-xs mt-1 opacity-70">교정 → 저장<br/>→ TTS → WAV</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 도서 목록 */}
                                    <div className="bg-white/3 border border-white/8 rounded-[20px] p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-violet-400 text-xs font-black uppercase tracking-widest">도서 선택</p>
                                            <span className="text-slate-500 text-xs">{selectedBatchBooks.length}개 선택됨</span>
                                        </div>

                                        <div className="flex gap-2 mb-2">
                                            <button
                                                onClick={() => {
                                                    if (batchMode === 'tts-only' || batchMode === 'optimize-only') {
                                                        setSelectedBatchBooks(realBooks.filter(b => batchScriptStatuses[b.id] === true).map(b => b.id));
                                                    } else {
                                                        setSelectedBatchBooks(realBooks.map(b => b.id));
                                                    }
                                                }}
                                                disabled={isBatchRunning}
                                                className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all"
                                            >전체 선택</button>
                                            <button
                                                onClick={() => setSelectedBatchBooks([])}
                                                disabled={isBatchRunning}
                                                className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all"
                                            >선택 해제</button>
                                        </div>

                                        <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
                                            {realBooks.map(book => {
                                                const hasScript = batchScriptStatuses[book.id] === true;
                                                const status = batchBookStatuses[book.id];
                                                const isDisabled = isBatchRunning || ((batchMode === 'tts-only' || batchMode === 'optimize-only') && !hasScript);
                                                const statusColors = {
                                                    pending: 'text-slate-500',
                                                    generating: 'text-yellow-400 animate-pulse',
                                                    tts: 'text-blue-400 animate-pulse',
                                                    done: 'text-emerald-400',
                                                    error: 'text-red-400',
                                                    skipped: 'text-slate-600',
                                                };
                                                const statusLabels = {
                                                    pending: '대기',
                                                    generating: '대본 생성 중...',
                                                    tts: 'TTS 변환 중...',
                                                    done: '완료',
                                                    error: '오류',
                                                    skipped: '스킵',
                                                };
                                                return (
                                                    <label
                                                        key={book.id}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                                            isDisabled ? 'opacity-40 cursor-not-allowed border-transparent' :
                                                            selectedBatchBooks.includes(book.id) ? 'bg-violet-500/10 border-violet-500/30 cursor-pointer' :
                                                            'bg-white/3 border-white/5 hover:bg-white/5 cursor-pointer'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 accent-violet-500 cursor-pointer shrink-0"
                                                            checked={selectedBatchBooks.includes(book.id)}
                                                            disabled={isDisabled}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedBatchBooks(prev => [...prev, book.id]);
                                                                else setSelectedBatchBooks(prev => prev.filter(id => id !== book.id));
                                                            }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-white truncate">{book.title}</p>
                                                            <p className="text-[10px] text-slate-500 font-mono">{book.id}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {/* 작업 완료 뱃지 */}
                                                            {(() => {
                                                                const hasAudio = overrides[book.id]?.isPodcast || overrides[book.id]?.audioUrl;
                                                                const handlePreviewScript = async (e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    const snap = await getDoc(doc(db, 'scripts', book.id));
                                                                    if (!snap.exists()) return alert('대본을 불러올 수 없습니다.');
                                                                    const data = snap.data();
                                                                    const script = data.script || data.lines || data.content || [];
                                                                    setBatchScriptPreview({ bookId: book.id, title: book.title, script });
                                                                };
                                                                const isOptimized = batchOptimizedStatuses[book.id] === true;
                                                                if (hasScript && hasAudio && isOptimized) return (
                                                                    <button onClick={handlePreviewScript} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 transition-all cursor-pointer">✅ 최적화완료</button>
                                                                );
                                                                if (hasScript && hasAudio) return (
                                                                    <button onClick={handlePreviewScript} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 transition-all cursor-pointer">✅ 완료</button>
                                                                );
                                                                if (hasScript && isOptimized) return (
                                                                    <button onClick={handlePreviewScript} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all cursor-pointer">🔧 최적화</button>
                                                                );
                                                                if (hasScript && !hasAudio) return (
                                                                    <button onClick={handlePreviewScript} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/30 transition-all cursor-pointer">📝 대본만</button>
                                                                );
                                                                return (
                                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/5 text-slate-600">⬜ 미시작</span>
                                                                );
                                                            })()}
                                                            {status && (
                                                                <span className={`text-[10px] font-black ${statusColors[status] || 'text-slate-500'}`}>
                                                                    {statusLabels[status] || status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 실행 버튼 */}
                                    <button
                                        onClick={() => handleBatchRun(batchMode)}
                                        disabled={isBatchRunning || !selectedBatchBooks.length}
                                        className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all ${
                                            isBatchRunning || !selectedBatchBooks.length
                                                ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                                                : batchMode === 'full'
                                                    ? 'bg-violet-500 text-white hover:bg-violet-400 hover:scale-[1.02] shadow-xl shadow-violet-500/20'
                                                    : batchMode === 'tts-only'
                                                        ? 'bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-[1.02] shadow-xl shadow-emerald-500/20'
                                                        : 'bg-amber-500 text-black hover:bg-amber-400 hover:scale-[1.02] shadow-xl shadow-amber-500/20'
                                        }`}
                                    >
                                        {isBatchRunning ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin text-2xl">settings_accent</span>
                                                처리 중... ({batchProgress.current}/{batchProgress.total})
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-2xl">
                                                    {batchMode === 'full' ? 'auto_awesome' : batchMode === 'tts-only' ? 'record_voice_over' : 'spellcheck'}
                                                </span>
                                                {batchMode === 'full' ? `풀 배치 실행 (${selectedBatchBooks.length}권)` : batchMode === 'tts-only' ? `TTS 전용 배치 (${selectedBatchBooks.length}권)` : `대본 최적화 실행 (${selectedBatchBooks.length}권)`}
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* RIGHT — 진행 상황 */}
                                <div className="space-y-5">
                                    {/* 전체 진행 */}
                                    {(isBatchRunning || batchProgress.total > 0) && (
                                        <div className="bg-white/3 border border-white/8 rounded-[20px] p-5 space-y-3">
                                            <p className="text-violet-400 text-xs font-black uppercase tracking-widest">전체 진행</p>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 bg-white/5 rounded-full h-2">
                                                    <div
                                                        className="h-2 bg-violet-500 rounded-full transition-all duration-500"
                                                        style={{ width: batchProgress.total ? `${(batchProgress.current / batchProgress.total) * 100}%` : '0%' }}
                                                    />
                                                </div>
                                                <span className="text-white text-sm font-black shrink-0">
                                                    {batchProgress.current} / {batchProgress.total}
                                                </span>
                                            </div>
                                            {/* 도서별 상태 요약 */}
                                            <div className="flex gap-3 flex-wrap">
                                                {['done', 'generating', 'tts', 'error', 'skipped'].map(s => {
                                                    const count = Object.values(batchBookStatuses).filter(v => v === s).length;
                                                    if (!count) return null;
                                                    const colors = { done: 'text-emerald-400', generating: 'text-yellow-400', tts: 'text-blue-400', error: 'text-red-400', skipped: 'text-slate-500' };
                                                    const labels = { done: '완료', generating: '대본생성', tts: 'TTS', error: '오류', skipped: '스킵' };
                                                    return (
                                                        <span key={s} className={`text-xs font-black ${colors[s]}`}>
                                                            {labels[s]} {count}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* 실행 로그 */}
                                    <div className="bg-black/60 border border-white/8 rounded-[20px] p-5 min-h-[400px] flex flex-col">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-violet-400 text-xs font-black uppercase tracking-widest">실행 로그</p>
                                            {batchLogs.length > 0 && (
                                                <button
                                                    onClick={() => setBatchLogs([])}
                                                    className="text-slate-600 hover:text-slate-400 text-xs transition-all"
                                                >지우기</button>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-0.5 max-h-[500px]">
                                            {batchLogs.length === 0 ? (
                                                <p className="text-slate-600 text-sm text-center mt-16">배치를 실행하면 여기에 로그가 표시됩니다.</p>
                                            ) : (
                                                batchLogs.map((log, i) => (
                                                    <p key={i} className={`text-xs font-mono leading-relaxed ${
                                                        log.includes('❌') ? 'text-red-400' :
                                                        log.includes('🎉') || log.includes('✅') || log.includes('🏁') ? 'text-emerald-400' :
                                                        log.includes('⏳') || log.includes('✏️') || log.includes('🎙️') ? 'text-yellow-400' :
                                                        log.includes('📂') || log.includes('🚀') || log.includes('📚') ? 'text-violet-400' :
                                                        log.includes('⚠️') || log.includes('⏭️') ? 'text-orange-400' :
                                                        'text-slate-400'
                                                    }`}>{log}</p>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 대본 미리보기 + 수정 모달 */}
                            {batchScriptPreview && (() => {
                                const isSaving = isLoadingScript;
                                const handleSavePreviewScript = async () => {
                                    setIsLoadingScript(true);
                                    try {
                                        await setDoc(doc(db, 'scripts', batchScriptPreview.bookId), {
                                            script: batchScriptPreview.script,
                                            lines: batchScriptPreview.script,
                                            title: batchScriptPreview.title,
                                            updatedAt: serverTimestamp(),
                                        }, { merge: true });
                                        alert('저장 완료! TTS 실행 시 수정된 대본이 적용됩니다.');
                                    } catch (e) {
                                        alert('저장 실패: ' + e.message);
                                    } finally {
                                        setIsLoadingScript(false);
                                    }
                                };
                                return (
                                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fade-in">
                                    <div className="bg-[#1a1d23] border border-white/10 w-full max-w-3xl h-[85vh] rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                                        {/* 모달 헤더 */}
                                        <div className="p-7 border-b border-white/5 flex items-center justify-between shrink-0">
                                            <div>
                                                <h4 className="text-white font-black text-xl uppercase tracking-tight">대본 확인 · 수정</h4>
                                                <p className="text-slate-500 text-xs font-bold mt-0.5">
                                                    {batchScriptPreview.title} · {batchScriptPreview.script.length}턴 · {batchScriptPreview.script.reduce((s, t) => s + (t?.text?.replace(/\s/g, '').length || 0), 0).toLocaleString()}자
                                                    <span className="text-emerald-500 ml-2">· 대사를 클릭하면 바로 수정됩니다</span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setBatchScriptPreview(null)}
                                                className="size-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-lg">close</span>
                                            </button>
                                        </div>
                                        {/* 대본 내용 — 수정 가능 */}
                                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                            {batchScriptPreview.script.map((line, i) => {
                                                const isA = line.speaker === '제임스' || line.speaker === 'James' || line.speaker === (scriptForm.speakerA || '제임스');
                                                return (
                                                    <div key={i} className={`flex gap-3 ${isA ? '' : 'flex-row-reverse'}`}>
                                                        <div className={`size-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 mt-1 ${isA ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'bg-pink-600/20 text-pink-400 border border-pink-500/20'}`}>
                                                            {line.speaker?.[0] ?? '?'}
                                                        </div>
                                                        <div className={`flex-1 max-w-[80%] rounded-2xl px-4 py-2.5 border border-transparent hover:border-white/10 transition-all ${isA ? 'bg-blue-500/10 rounded-tl-none' : 'bg-pink-500/10 rounded-tr-none'}`}>
                                                            <p className={`text-[9px] font-black uppercase mb-1.5 ${isA ? 'text-blue-400' : 'text-pink-400'}`}>{line.speaker} · {i + 1}</p>
                                                            <textarea
                                                                className="w-full bg-transparent text-slate-200 text-sm leading-relaxed outline-none resize-none focus:bg-white/5 rounded-lg px-1 py-0.5 transition-all min-h-[2.5em]"
                                                                value={line.text}
                                                                rows={1}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                                    setBatchScriptPreview(prev => {
                                                                        const next = [...prev.script];
                                                                        next[i] = { ...next[i], text: val };
                                                                        return { ...prev, script: next };
                                                                    });
                                                                }}
                                                                onFocus={(e) => {
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* 모달 푸터 */}
                                        <div className="p-6 border-t border-white/5 flex justify-between items-center shrink-0">
                                            <button
                                                onClick={() => setBatchScriptPreview(null)}
                                                className="px-6 py-3 rounded-xl text-slate-400 font-black text-sm hover:text-white transition-all"
                                            >닫기</button>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={handleSavePreviewScript}
                                                    disabled={isSaving}
                                                    className="px-8 py-3 bg-white/10 border border-white/20 text-white font-black text-sm rounded-xl hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <span className="material-symbols-outlined text-base">{isSaving ? 'sync' : 'save'}</span>
                                                    {isSaving ? '저장 중...' : '수정 저장'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setBatchScriptPreview(null);
                                                        if (!selectedBatchBooks.includes(batchScriptPreview.bookId)) {
                                                            setSelectedBatchBooks(prev => [...prev, batchScriptPreview.bookId]);
                                                        }
                                                        setBatchMode('tts-only');
                                                    }}
                                                    className="px-8 py-3 bg-emerald-500 text-white font-black text-sm rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-base">record_voice_over</span>
                                                    이 도서 TTS 실행
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })()}
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
