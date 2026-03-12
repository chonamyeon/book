import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { onSnapshot, collection } from 'firebase/firestore';
import { celebrities } from '../data/celebrities';
import { availableAudio } from '../data/availableAudio';

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
    // 캐시에서 즉시 초기값 로드 → Weekly Focus 등이 첫 렌더에서 바로 표시됨
    const [overrides, setOverrides] = useState(() => loadCache());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const unsubscribe = onSnapshot(collection(db, "book_overrides"), (snapshot) => {
            if (!isMounted) return;
            try {
                const data = {};
                snapshot.forEach(doc => { data[doc.id] = doc.data(); });
                setOverrides(data);
                saveCache(data);
            } catch (e) {
                console.error("Firestore parse error:", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        }, (err) => {
            console.warn("Firestore offline — using cached data:", err.code);
            // 캐시된 데이터로 계속 동작 (네트워크 없어도 흰화면 방지)
            if (isMounted) setLoading(false);
        });

        return () => { isMounted = false; unsubscribe(); };
    }, []);

    // 특정 도서 데이터 안전하게 가져오기
    const getBook = useCallback((bookId) => {
        const localBook = (celebrities || []).flatMap(c => c.books || []).find(b => b.id === bookId);
        const override = overrides[bookId];

        if (!localBook && !override) return null;

        const fileName = `${bookId}.mp3`;
        const hasAudioFile = !!availableAudio[fileName];

        return {
            ...(localBook || {}),
            ...(override || {}),
            isPodcast: override?.isPodcast || localBook?.isPodcast || hasAudioFile,
            cover: override?.cover || localBook?.cover,
            audioPath: override?.audioPath || localBook?.audioPath || `/audio/${bookId}.mp3`,
            podcastScript: override?.podcastScript || ''
        };
    }, [overrides]);

    // 모든 도서 목록 안전하게 가져오기 (adminMode=true 시 비공개 도서도 포함)
    const getAllBooks = useCallback((adminMode = false) => {
        const allLocalBooks = (celebrities || []).flatMap(celeb =>
            (celeb.books || []).map(book => ({
                ...book,
                celebName: celeb.name
            }))
        );

        const bookMap = new Map();
        allLocalBooks.forEach(book => {
            const id = book.id || book.title.toLowerCase().replace(/\s+/g, '-');
            const override = overrides[id];

            // 삭제된 도서 필터링 (오버라이드에 isDeleted가 있으면 제외)
            if (override?.isDeleted) return;

            const fileName = `${id}.mp3`;
            const hasAudioFile = !!availableAudio[fileName];

            bookMap.set(id, {
                ...book,
                id: id,
                ...(override || {}),
                isPodcast: override?.isPodcast || book.isPodcast || hasAudioFile,
                cover: override?.cover || book.cover,
                purchaseLink: override?.purchaseLink || book.purchaseLink || '',
                isPublic: override?.isPublic !== undefined ? override.isPublic : true,
            });
        });

        // Firestore에만 존재하는 신규 도서 추가
        Object.entries(overrides).forEach(([id, data]) => {
            if (data.isDeleted) return; // 삭제된 도서 제외

            if (!bookMap.has(id) && data.title && (adminMode || data.isPublic === true)) {
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
                });
            }
        });

        return Array.from(bookMap.values());
    }, [overrides]);

    return { getBook, getAllBooks, loading, overrides };
};
