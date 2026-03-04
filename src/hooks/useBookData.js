import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { onSnapshot, collection } from 'firebase/firestore';
import { celebrities } from '../data/celebrities';

export const useBookData = () => {
    const [overrides, setOverrides] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const unsubscribe = onSnapshot(collection(db, "book_overrides"), (snapshot) => {
            if (!isMounted) return;
            const data = {};
            snapshot.forEach(doc => {
                data[doc.id] = doc.data();
            });
            setOverrides(data);
            setLoading(false);
        }, (err) => {
            console.error("Firestore error:", err);
            if (isMounted) setLoading(false);
        });

        return () => { isMounted = false; unsubscribe(); };
    }, []);

    // 특정 도서 데이터 안전하게 가져오기
    const getBook = useCallback((bookId) => {
        const localBook = (celebrities || []).flatMap(c => c.books || []).find(b => b.id === bookId);
        const override = overrides[bookId];
        
        if (!localBook && !override) return null;

        return {
            ...(localBook || {}),
            ...(override || {}),
            // 강제 오버라이드 제거: Firestore 데이터(override)가 있으면 그것을 사용하고, 없으면 로컬 사용
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
            // 관리자 페이지와 동일한 ID 생성 규칙 적용
            const id = book.id || book.title.toLowerCase().replace(/\s+/g, '-');
            const override = overrides[id];

            bookMap.set(id, {
                ...book,
                id: id, // ID 보장
                ...(override || {}),
                // 강제 오버라이드 제거: 관리자 수정 내역이 최우선입니다.
                cover: override?.cover || book.cover,
                purchaseLink: override?.purchaseLink || book.purchaseLink || '',
                // 기존 celebrities.js 도서는 isPublic 미설정 시 공개 처리
                isPublic: override?.isPublic !== undefined ? override.isPublic : true,
            });
        });

        // Firestore에만 존재하는 신규 도서 추가 — adminMode면 전체, 아니면 isPublic:true 만 노출
        Object.entries(overrides).forEach(([id, data]) => {
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

    return { getBook, getAllBooks, loading };
};
