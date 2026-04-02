import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { onSnapshot, collection } from 'firebase/firestore';
import { availableAudio } from '../data/availableAudio';
import { adsenseBooks as staticAdsenseBooksArr } from '../data/adsense/books';

// 정적 adsense 데이터를 ID 맵으로 변환 (모듈 레벨, 한 번만 실행)
const STATIC_ADSENSE_MAP = Object.fromEntries(staticAdsenseBooksArr.map(b => [b.id, b]));

const CACHE_KEY = 'archiview_book_overrides_cache';

const loadCache = () => {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const saveCache = (data) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
        // localStorage 용량 초과 등 무시
    }
};

export const useBookData = () => {
    // celebrities.js (436KB)를 동적 임포트로 지연 로딩 → 초기 번들에서 제외
    const [celebrities, setCelebrities] = useState([]);
    const [overrides, setOverrides] = useState(() => loadCache());
    const [ebooks, setEbooks] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        import('../data/celebrities').then(m => {
            setCelebrities(m.celebrities || []);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        let isMounted = true;
        const unsubscribeOverrides = onSnapshot(collection(db, "book_overrides"), (snapshot) => {
            if (!isMounted) return;
            try {
                const data = {};
                snapshot.forEach(doc => { data[doc.id] = doc.data(); });
                setOverrides(data);
                saveCache(data);
            } catch (e) {
                console.error("Firestore parse error:", e);
            }
        }, (err) => {
            console.warn("Firestore offline (overrides):", err.code);
            if (isMounted) setLoading(false);
        });

        const unsubscribeEbooks = onSnapshot(collection(db, "ebooks"), (snapshot) => {
            if (!isMounted) return;
            try {
                const data = {};
                snapshot.forEach(doc => { data[doc.id] = doc.data(); });
                setEbooks(data);
            } catch (e) {
                console.error("Firestore parse error:", e);
            }
        }, (err) => {
            console.warn("Firestore offline (ebooks):", err.code);
        });

        return () => {
            isMounted = false;
            unsubscribeOverrides();
            unsubscribeEbooks();
        };
    }, []);

    const getBook = useCallback((bookId) => {
        const localBook = celebrities.flatMap(c => c.books || []).find(b => (b.id || b.title.toLowerCase().replace(/\s+/g, '-')) === bookId);
        const normStr = s => s.normalize('NFC');
        const adsense = STATIC_ADSENSE_MAP[bookId];
        const override = overrides[bookId] ||
            Object.entries(overrides).find(([k]) => {
                const nk = normStr(k);
                const ni = normStr(bookId);
                return nk === ni || nk.endsWith('-' + ni) || nk.replace(/^[a-z]+\d+-/, '') === ni;
            })?.[1];

        if (!localBook && !override && !adsense) return null;

        const fileName = `${bookId}.mp3`;
        const koreanFileName = `${(localBook?.title || '').replace(/\s+/g, '-')}.mp3`;
        const hasAudioFile = !!(availableAudio[fileName] || availableAudio[koreanFileName]);

        const ebook = ebooks[bookId];

        return {
            ...(localBook || {}),
            ...(override || {}),
            ...(adsense || {}),
            id: bookId,
            isAdsense: !!adsense,
            isPodcast: override?.isPodcast || localBook?.isPodcast || adsense?.isPodcast || hasAudioFile,
            cover: override?.cover || localBook?.cover || adsense?.cover,
            audioPath: override?.audioPath || localBook?.audioPath || adsense?.audioUrl || `/audio/${bookId}.mp3`,
            podcastScript: override?.podcastScript || adsense?.script || '',
            ebookText: ebook ? (ebook.pages ? ebook.pages.join('\n\n') : ebook.content) || null : null
        };
    }, [overrides, celebrities, ebooks]);

    const getAllBooks = useCallback((adminMode = false) => {
        const adsenseBooks = STATIC_ADSENSE_MAP;
        const allLocalBooks = celebrities.flatMap(celeb =>
            (celeb.books || []).map(book => ({
                ...book,
                celebName: celeb.name
            }))
        );

        // override 키가 "top70-X" 형태일 때 "X"로도 찾을 수 있도록 (NFC 정규화 포함)
        const normStr = s => s.normalize('NFC');
        const findOverride = (id) =>
            overrides[id] ||
            Object.entries(overrides).find(([k]) => {
                const nk = normStr(k);
                const ni = normStr(id);
                return nk === ni || nk.endsWith('-' + ni) || nk.replace(/^[a-z]+\d+-/, '') === ni;
            })?.[1];

        const bookMap = new Map();
        allLocalBooks.forEach(book => {
            const id = book.id || book.title.toLowerCase().replace(/\s+/g, '-');
            const override = findOverride(id);

            if (override?.isDeleted) return;
            if (!adminMode && override?.isPublic === false) return;

            const fileName = `${id}.mp3`;
            const koreanFileName = `${(book.title || '').replace(/\s+/g, '-')}.mp3`;
            const hasAudioFile = !!(availableAudio[fileName] || availableAudio[koreanFileName]);

            const ebook = ebooks[id];

            bookMap.set(id, {
                ...book,
                id: id,
                ...(override || {}),
                isPodcast: override?.isPodcast || book.isPodcast || hasAudioFile,
                cover: override?.cover || book.cover,
                purchaseLink: override?.purchaseLink || book.purchaseLink || '',
                coupangLink: override?.coupangLink || book.coupangLink || '',
                amazonLink: override?.amazonLink || book.amazonLink || '',
                isPublic: override?.isPublic !== undefined ? override.isPublic : true,
                ebookText: ebook ? (ebook.pages ? ebook.pages.join('\n\n') : ebook.content) || null : null
            });
        });

        Object.entries(overrides).forEach(([id, data]) => {
            if (data.isDeleted) return;

            if (!bookMap.has(id) && data.title && (adminMode || data.isPublic === true)) {
                const ebook = ebooks[id];
                bookMap.set(id, {
                    id,
                    title: data.title,
                    author: data.author || '',
                    cover: data.cover || '',
                    category: data.category || 'NOVEL',
                    section: data.section || 'EDITORS_PICK',
                    isPodcast: data.isPodcast || false,
                    description: data.description || '',
                    purchaseLink: data.purchaseLink || '',
                    celebName: data.celebritySlug || '',
                    audioUrl: data.audioUrl || '',
                    voiceAudioUrl: data.voiceAudioUrl || '',
                    ...data,
                    ebookText: ebook ? (ebook.pages ? ebook.pages.join('\n\n') : ebook.content) || null : null
                });
            }
        });

        // adsenseBooks 추가 (정적 데이터 사용 — Firestore 중복 구독 제거)
        Object.entries(STATIC_ADSENSE_MAP).forEach(([id, data]) => {
            if (!bookMap.has(id)) {
                bookMap.set(id, {
                    id,
                    isAdsense: true,
                    title: data.title,
                    author: data.author || '',
                    cover: data.cover || '',
                    category: data.category || 'SELF_DEV',
                    description: data.desc || data.description || '',
                    isPodcast: !!(data.script || data.audioUrl),
                    ...data
                });
            } else {
                // 기존 데이터에 정보가 부족하면 보강
                const existing = bookMap.get(id);
                bookMap.set(id, {
                    ...existing,
                    ...data,
                    isAdsense: true // override가 있더라도 우선은 story 페이지로 보낼 수 있게
                });
            }
        });

        return Array.from(bookMap.values());
    }, [overrides, celebrities, ebooks]);

    return { getBook, getAllBooks, loading, overrides, ebooks };
};
