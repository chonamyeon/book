import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { onSnapshot, collection } from 'firebase/firestore';
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
        const override = overrides[bookId];

        if (!localBook && !override) return null;

        const fileName = `${bookId}.mp3`;
        const hasAudioFile = !!availableAudio[fileName];

        const ebook = ebooks[bookId];

        return {
            ...(localBook || {}),
            ...(override || {}),
            isPodcast: override?.isPodcast || localBook?.isPodcast || hasAudioFile,
            cover: override?.cover || localBook?.cover,
            audioPath: override?.audioPath || localBook?.audioPath || `/audio/${bookId}.mp3`,
            podcastScript: override?.podcastScript || '',
            ebookText: ebook ? (ebook.pages ? ebook.pages.join('\n\n') : ebook.content) || null : null
        };
    }, [overrides, celebrities, ebooks]);

    const getAllBooks = useCallback((adminMode = false) => {
        const allLocalBooks = celebrities.flatMap(celeb =>
            (celeb.books || []).map(book => ({
                ...book,
                celebName: celeb.name
            }))
        );

        const bookMap = new Map();
        allLocalBooks.forEach(book => {
            const id = book.id || book.title.toLowerCase().replace(/\s+/g, '-');
            const override = overrides[id];

            if (override?.isDeleted) return;

            const fileName = `${id}.mp3`;
            const hasAudioFile = !!availableAudio[fileName];

            const ebook = ebooks[id];

            bookMap.set(id, {
                ...book,
                id: id,
                ...(override || {}),
                isPodcast: override?.isPodcast || book.isPodcast || hasAudioFile,
                cover: override?.cover || book.cover,
                purchaseLink: override?.purchaseLink || book.purchaseLink || '',
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

        return Array.from(bookMap.values());
    }, [overrides, celebrities, ebooks]);

    return { getBook, getAllBooks, loading, overrides, ebooks };
};
