import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { celebrities } from '../data/celebrities';
import BottomNavigation from '../components/BottomNavigation';
import MainHeader from '../components/MainHeader';
import Footer from '../components/Footer';
import { useAudio } from '../contexts/AudioContext';
import { useBookData } from '../hooks/useBookData';
import BookCardActions from '../components/BookCardActions';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Celebrity() {
    const { id } = useParams();
    const { isSpeaking, activeAudioId, playPodcast, speakReview, stopAll, openScriptModal } = useAudio();
    const celeb = celebrities.find(c => c.id === id) || celebrities[0]; // Default to first if not found
    const { getAllBooks, loading: booksLoading, overrides } = useBookData();
    const [staticOverrides, setStaticOverrides] = useState({});

    useEffect(() => {
        let cancelled = false;
        const loadStaticOverrides = async () => {
            try {
                const ids = (celeb.books || [])
                    .map((book) => book.id || book.title?.toLowerCase().replace(/\s+/g, '-'))
                    .filter(Boolean);
                const uniqueIds = Array.from(new Set(ids));
                const entries = await Promise.all(uniqueIds.map(async (bookId) => {
                    try {
                        const snap = await getDoc(doc(db, 'book_overrides', bookId));
                        return [bookId, snap.exists() ? snap.data() : null];
                    } catch {
                        return [bookId, null];
                    }
                }));
                if (!cancelled) {
                    const next = {};
                    entries.forEach(([bookId, value]) => {
                        if (value) next[bookId] = value;
                    });
                    setStaticOverrides(next);
                }
            } catch {
                if (!cancelled) setStaticOverrides({});
            }
        };
        loadStaticOverrides();
        return () => { cancelled = true; };
    }, [id, celeb.books]);

    const allCelebBooks = useMemo(() => {
        if (booksLoading) return celeb.books || [];
        const allRaw = getAllBooks(true);
        const allPublic = allRaw.filter((b) => b.isPublic !== false);
        const norm = (v) => String(v || '').normalize('NFC');
        const normLoose = (v) => norm(v).toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9가-힣]/g, '');
        const bookMetaKey = (book) => `${normLoose(book?.title)}::${normLoose(book?.author)}`;
        const bookTitleKey = (book) => normLoose(book?.title);
        const isSameBookId = (left, right) => {
            const a = norm(left);
            const b = norm(right);
            if (!a || !b) return false;
            return a === b || a.endsWith(`-${b}`) || b.endsWith(`-${a}`);
        };
        const isSameBookMeta = (left, right) => {
            const lKey = bookMetaKey(left);
            const rKey = bookMetaKey(right);
            if (!lKey || !rKey || lKey === '::' || rKey === '::') return false;
            return lKey === rKey;
        };
        const isSameBookTitle = (left, right) => {
            const lTitle = bookTitleKey(left);
            const rTitle = bookTitleKey(right);
            if (!lTitle || !rTitle) return false;
            return lTitle === rTitle;
        };
        const findOverrideForStaticBook = (staticBook) => {
            const staticId = staticBook.id || staticBook.title.toLowerCase().replace(/\s+/g, '-');
            const entries = Object.entries(overrides || {});
            const matched = entries.find(([ovKey, ovValue]) =>
                isSameBookId(ovKey, staticId) ||
                isSameBookMeta(ovValue || {}, staticBook) ||
                isSameBookTitle(ovValue || {}, staticBook)
            );
            return matched ? matched[1] : null;
        };

        // 1. 기존 celebrities.js 에 있던 도서들에 Firestore 덮어쓰기 적용
        const staticBooksWithOverrides = (celeb.books || [])
            .map(staticBook => {
                const staticId = staticBook.id || staticBook.title.toLowerCase().replace(/\s+/g, '-');
                const matchedOverride = staticOverrides[staticId] || findOverrideForStaticBook(staticBook);
                const overrideBook = allRaw.find(b =>
                    isSameBookId(b.id, staticId) ||
                    isSameBookMeta(b, staticBook) ||
                    isSameBookTitle(b, staticBook)
                );
                const explicitCelebBook = allRaw.find((b) => {
                    const sameBook =
                        isSameBookId(b.id, staticId) ||
                        isSameBookMeta(b, staticBook) ||
                        isSameBookTitle(b, staticBook);
                    if (!sameBook) return false;
                    return (
                        Object.prototype.hasOwnProperty.call(b, 'celebritySlug') ||
                        Object.prototype.hasOwnProperty.call(b, 'celebrity') ||
                        Object.prototype.hasOwnProperty.call(b, 'celebId')
                    );
                });
                const explicitLinkedCeleb = explicitCelebBook
                    ? (explicitCelebBook.celebritySlug || explicitCelebBook.celebrity || explicitCelebBook.celebId || '')
                    : '';
                const merged = overrideBook || { ...staticBook, id: staticId };
                return {
                    ...merged,
                    __matchedOverride: matchedOverride,
                    __explicitLinkedCeleb: explicitLinkedCeleb,
                    __hasExplicitCelebOverride: !!explicitCelebBook,
                };
            })
            .filter((book) => {
                const matchedOverride = book.__matchedOverride || null;
                if (book.isPublic === false || matchedOverride?.isPublic === false) return false;
                const overrideCeleb = matchedOverride
                    ? (matchedOverride.celebritySlug || matchedOverride.celebrity || matchedOverride.celebId || '')
                    : '';
                const hasCelebOverride = matchedOverride
                    ? (Object.prototype.hasOwnProperty.call(matchedOverride, 'celebritySlug')
                        || Object.prototype.hasOwnProperty.call(matchedOverride, 'celebrity')
                        || Object.prototype.hasOwnProperty.call(matchedOverride, 'celebId'))
                    : false;
                // Firestore override가 있으면 override 값을 우선, 없으면 allRaw merged 값 사용
                const linkedCeleb = hasCelebOverride
                    ? overrideCeleb
                    : (book.__explicitLinkedCeleb ||
                       book.celebritySlug ||
                       book.celebrity ||
                       book.celebId ||
                       '');
                // 관리자에서 셀럽 필드를 명시적으로 변경한 도서는 해당 slug에서만 노출
                if (hasCelebOverride) return linkedCeleb === id;
                // 기본 정적 도서는 기존 동작 유지
                if (!linkedCeleb) return true;
                return linkedCeleb === id;
            });

        // 2. 이 셀럽을 위해 새로 추가된 완전 신규 도서
        const staticIds = new Set(staticBooksWithOverrides.map(b => b.id));
        const staticMetaKeys = new Set(staticBooksWithOverrides.map(bookMetaKey));
        const firestoreBooks = allPublic.filter(b =>
            (b.celebName === id || b.celebritySlug === id || b.celebId === id || b.celebrity === id) &&
            b.isPublic === true &&
            !staticIds.has(b.id) &&
            !staticMetaKeys.has(bookMetaKey(b))
        );

        // 최종 안전망: overrides에서 다른 셀럽으로 재설정된 도서 제거
        const finalList = [...staticBooksWithOverrides, ...firestoreBooks].filter(book => {
            const bookId = book.id;
            if (!bookId) return true;
            // overrides에서 직접 확인
            const ov = overrides[bookId] || Object.entries(overrides).find(([k]) =>
                isSameBookId(k, bookId)
            )?.[1];
            if (!ov) return true;
            const ovCeleb = ov.celebritySlug || ov.celebrity || ov.celebId || '';
            if (!ovCeleb) return true;
            // override에 셀럽이 명시되어 있으면 그 셀럽에서만 노출
            return ovCeleb === id;
        });
        return finalList.map(({ __matchedOverride, __explicitLinkedCeleb, __hasExplicitCelebOverride, ...rest }) => rest);
    }, [getAllBooks, booksLoading, id, celeb.books, overrides, staticOverrides]);

    const cleanText = useCallback((t) => {
        if (!t) return "";
        return t.replace(/\[GEMINI [\d.]+ ANALYSIS\]/gi, '')
            .replace(/팟캐스트 대본 제작을 위한/g, '')
            .replace(/[#*]/g, '')
            .replace(/---/g, '')
            .replace(/([.?!,])([^\s\n0-9"'])/g, '$1 $2').trim();
    }, []);

    // 각 도서의 설명 텍스트를 미리 계산
    const cleanedBooks = useMemo(() =>
        allCelebBooks.map(book => ({
            ...book,
            _cleanDesc: cleanText(book.desc),
        })),
    [allCelebBooks, cleanText]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    return (
        <div className="bg-white text-slate-900 dark:text-slate-100 antialiased font-display min-h-screen pb-24 flex justify-center">
            {/* Main Layout Container: Everything constrained to max-w-lg */}
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-x-hidden border-t border-white/5" style={{ touchAction: 'pan-y' }}>
                <MainHeader showBack />

                <main className="pb-24">
                    {/* Hero Section: Block-style Portrait to match Header width */}
                    <section className="px-4 pt-2 overflow-hidden">
                        <div className="relative w-full h-[70vh] md:h-[80vh] flex flex-col justify-end overflow-hidden rounded-2xl shadow-xl">
                            {/* Background Portrait */}
                            <div className="absolute inset-0 z-0">
                                <img
                                    className="w-full h-full object-cover brightness-90 contrast-[1.15]"
                                    src={celeb.image}
                                    alt={celeb.name}
                                    fetchpriority="high"
                                    decoding="async"
                                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1544275039-35ed06764574?q=80&w=2000'; }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/30 to-transparent"></div>
                            </div>

                            {/* Hero Text Overlay Case */}
                            <div className="relative z-20 p-6 md:p-12 mb-4 max-w-full">
                                <span className="inline-block px-3 py-1.5 bg-gold text-primary text-[10px] font-black uppercase tracking-tighter mb-4 rounded-sm">이달의 인물</span>
                                <h1 className="text-[32px] md:text-[56px] font-light tracking-tighter text-white mb-4 leading-tight">
                                    {celeb.name}
                                </h1>
                                <p className="text-slate-300 text-lg md:text-xl leading-relaxed font-light italic opacity-90">
                                    "{celeb.quote}"
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Transition Content Section */}
                    <section className="bg-background-dark px-6 pt-4 pb-12 md:pt-6 md:pb-20 border-b border-primary/20">
                        <div className="max-w-3xl mx-auto">
                            <div className="mb-10">
                                <h3 className="text-gold text-2xl md:text-3xl uppercase tracking-[0.3em] mb-6 font-bold flex items-center gap-4">
                                    <div className="w-12 h-[2px] bg-gold-start"></div>
                                    소 개
                                </h3>
                                <p className="text-base md:text-lg font-light leading-relaxed text-slate-300 tracking-normal opacity-80">
                                    {celeb.intro}
                                </p>
                            </div>


                        </div>
                    </section>

                    {/* Curated Categories */}

                    <section className="px-4 py-12 space-y-16">
                        {/* Category: Pivot */}
                        <div>
                            <div className="flex items-center justify-between mb-8 border-b border-primary/30 pb-4">
                                <h4 className="text-2xl font-light tracking-tight"><span className="text-accent italic mr-1">{celeb.name}</span>의 인생 책들</h4>
                                <span className="text-[10px] uppercase tracking-widest text-slate-500">추천 도서</span>
                            </div>
                            <div className="flex flex-col gap-12">
                                {cleanedBooks.map((book, index) => (
                                    <div key={index} className="flex flex-col gap-6 group">
                                        <div className="flex gap-6">
                                            <a
                                                href={book.purchaseLink || `/review/${book.id || ''}`}
                                                target={book.purchaseLink ? "_blank" : "_self"}
                                                rel={book.purchaseLink ? "noopener noreferrer" : undefined}
                                                className="w-1/3 shrink-0 active:scale-95 transition-transform"
                                            >
                                                <div className="aspect-[2/3] bg-primary/20 rounded shadow-2xl overflow-hidden border border-white/5 relative group/cover">
                                                    <img
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-110"
                                                        src={book.cover}
                                                        alt={book.title}
                                                        loading="lazy"
                                                        decoding="async"
                                                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-white opacity-0 group-hover/cover:opacity-100 transition-opacity">{book.purchaseLink ? 'shopping_cart' : 'menu_book'}</span>
                                                    </div>
                                                </div>
                                            </a>
                                            <div className="flex flex-col justify-between py-1 w-full">
                                                <div>
                                                    <h5 className="text-xl font-bold leading-tight mb-1 text-white">{book.title}</h5>
                                                    <p className="text-xs text-slate-500 mb-3 italic">{book.author}</p>
                                                    <p className="text-sm text-slate-400 font-light leading-snug line-clamp-3">{book._cleanDesc}</p>
                                                    {book.source && (
                                                        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-gold/10 border border-gold/30 rounded-sm">
                                                            <span className="text-[9px] text-slate-400 font-bold">출처</span>
                                                            <span className="text-slate-500 text-[9px]">|</span>
                                                            <span className="material-symbols-outlined text-[11px] text-gold">campaign</span>
                                                            <span className="text-[9px] text-gold font-black uppercase tracking-wider">{book.source}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <BookCardActions book={book} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="bg-primary/20 py-16 border-t border-primary/30">
                        <div className="px-6 mb-10 text-center">
                            <h4 className="text-accent text-[10px] uppercase tracking-[0.4em] mb-3">유사한 성향의 인물</h4>
                            <p className="text-3xl font-extralight tracking-tight text-white">명사들의 <span className="text-accent italic">큐레이션 서재</span>를 탐험해 보세요.</p>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-y-10 px-4">
                            {celebrities.map((c) => (
                                <Link
                                    key={c.id}
                                    to={`/celebrity/${c.id}`}
                                    className={`flex flex-col items-center gap-3 transition-all duration-300 group ${c.id === celeb.id ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                                >
                                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-none border-2 p-1 transition-colors duration-500 ${c.id === celeb.id ? 'border-accent shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'border-primary/30 group-hover:border-accent'}`}>
                                        <img loading="lazy" className="w-full h-full object-cover rounded-none transition-all duration-700" src={c.image} alt={c.name} />
                                    </div>
                                    <div className="text-center">
                                        <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest block transition-colors duration-300 ${c.id === celeb.id ? 'text-accent' : 'text-slate-500 group-hover:text-slate-200'}`}>{c.name}</span>
                                        {c.id === celeb.id && <div className="w-4 h-[2px] bg-accent mx-auto mt-1 rounded-none"></div>}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                    <Footer />
                </main>
                <BottomNavigation />
            </div>
        </div>
    );
}
