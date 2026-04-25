import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const LOCAL_KEY = 'savedBooks';

const getLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; } };
const setLocal = (books) => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(books)); } catch {} };

// Firestore에서 savedBooks 읽기
const loadFromFirestore = async (uid) => {
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        return snap.exists() ? (snap.data().savedBooks || []) : [];
    } catch { return []; }
};

// Firestore에 savedBooks 저장
const saveToFirestore = async (uid, books) => {
    try {
        await setDoc(doc(db, 'users', uid), { savedBooks: books }, { merge: true });
    } catch {}
};

export const useSavedBooks = (user) => {
    const [savedBooks, setSavedBooks] = useState(getLocal);

    // 로그인 시 Firestore에서 로드 (localStorage와 머지)
    useEffect(() => {
        if (!user) {
            setSavedBooks(getLocal());
            return;
        }
        loadFromFirestore(user.uid).then(remote => {
            const local = getLocal();
            // 중복 제거 후 머지 (Firestore 우선)
            const merged = [...remote];
            for (const b of local) {
                if (!merged.some(r => r.id === b.id || r.title === b.title)) {
                    merged.push(b);
                }
            }
            setSavedBooks(merged);
            setLocal(merged);
            if (merged.length !== remote.length) {
                saveToFirestore(user.uid, merged);
            }
        });
    }, [user?.uid]);

    // 다른 탭/컴포넌트에서 savedBooksUpdated 이벤트 발생 시 동기화
    useEffect(() => {
        const handler = () => setSavedBooks(getLocal());
        window.addEventListener('savedBooksUpdated', handler);
        return () => window.removeEventListener('savedBooksUpdated', handler);
    }, []);

    const addBook = useCallback(async (book) => {
        setSavedBooks(prev => {
            if (prev.some(b => b.id === book.id || b.title === book.title)) return prev;
            const next = [...prev, book];
            setLocal(next);
            if (user) saveToFirestore(user.uid, next);
            window.dispatchEvent(new Event('savedBooksUpdated'));
            return next;
        });
    }, [user]);

    const removeBook = useCallback(async (identifier) => {
        setSavedBooks(prev => {
            const next = prev.filter(b => b.title !== identifier && b.id !== identifier);
            setLocal(next);
            if (user) saveToFirestore(user.uid, next);
            window.dispatchEvent(new Event('savedBooksUpdated'));
            return next;
        });
    }, [user]);

    return { savedBooks, addBook, removeBook };
};
