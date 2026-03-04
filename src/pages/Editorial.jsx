import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import { celebrities } from '../data/celebrities';
import { useAudio } from '../contexts/AudioContext';
import { useBookData } from '../hooks/useBookData';

import { bookScripts } from '../data/bookScripts';

export default function Editorial() {
    const navigate = useNavigate();
    const { isSpeaking, activeAudioId, playPodcast, speakReview, stopAll, playPodcastMP3, podcastPlaying, podcastInfo } = useAudio();
    const scrollRef = useRef(null);

    const deepDiveBooks = [
        { id: "homo-deus", title: "호모 데우스", author: "유발 하라리", celeb: "Bill Gates", cover: "/images/covers/homo-deus.jpg" },
        { id: "lightness-of-being", title: "참을 수 없는 존재의 가벼움", author: "밀란 쿤데라", celeb: "RM", cover: "/images/covers/lightness-of-being.jpg" },
        { id: "we-do-not-part", title: "작별하지 않는다", author: "한강", celeb: "Han Kang", cover: "/images/covers/we-do-not-part.jpg" },
        { id: "21-lessons", title: "21세기를 위한 21가지 제언", author: "유발 하라리", celeb: "Bill Gates", cover: "/images/covers/21-lessons.jpg" },
        { id: "human-acts", title: "소년이 온다", author: "한강", celeb: "RM (Namjoon)", cover: "/images/covers/human-acts.jpg" }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollRef.current) {
                const container = scrollRef.current;
                const children = container.children;
                if (children.length > 0) {
                    const itemWidth = children[0].offsetWidth + 24; // w-64 (256px) + gap-6 (24px)
                    const currentScroll = container.scrollLeft;
                    const maxScroll = container.scrollWidth - container.clientWidth;

                    // If we're at the end, jump back to start, otherwise move to next
                    const nextScroll = (currentScroll + itemWidth) > maxScroll ? 0 : currentScroll + itemWidth;

                    container.scrollTo({
                        left: nextScroll,
                        behavior: 'smooth'
                    });
                }
            }
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const addToLibrary = (book) => {
        const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
        if (saved.some(b => b.title === book.title)) {
            alert('이미 서재에 보관된 도서입니다.');
            return;
        }
        const updated = [...saved, {
            title: book.title,
            author: book.author,
            cover: book.cover
        }];
        localStorage.setItem('savedBooks', JSON.stringify(updated));
        window.dispatchEvent(new Event('savedBooksUpdated'));
        alert('서재에 보관되었습니다. ✅');
    };

    const getReviewText = (id) => {
        const idMap = {
            "sapiens": "사피엔스",
            "1984": "1984",
            "demian": "데미안",
            "vegetarian": "채식주의자",
            "factfulness": "팩트풀니스",
            "almond": "아몬드",
            "leverage": "레버리지",
            "one-thing": "원씽",
            "ubermensch": "위버멘쉬",
            "sayno": "세이노의 가르침",
            "psychology": "돈의 심리학"
        };
        const title = idMap[id] || id;

        for (const celeb of celebrities) {
            const book = celeb.books.find(b => b.title === title);
            if (book?.review) return book.review;
            if (book?.desc) return book.desc;
        }
        return "";
    };

    const { getAllBooks, loading: booksLoading } = useBookData();

    // celebrities.js 데이터와 Firestore의 오버라이드 데이터를 결합
    const allBooks = useMemo(() => {
        if (booksLoading) return [];
        const mergedBooks = getAllBooks();
        return mergedBooks.map(book => ({
            id: book.id || '',
            title: book.title,
            subtitle: book.desc || '',
            author: book.author,
            cover: book.cover,
            tag: book.category || 'BOOK',
            section: book.section || 'EDITORS_PICK',
            isPodcast: book.isPodcast || false,
            hasReview: !!(book.review && book.review.trim().length > 200),
            purchaseLink: book.purchaseLink || '', // Firestore 연동 링크
            podcastUrl: book.audioUrl || book.voiceAudioUrl || null,
            script: book.id ? (bookScripts[book.id] || null) : null,
            celebName: book.celebName || ''
        }));
    }, [getAllBooks, booksLoading]);

    // 중복 제거 (같은 title)
    const uniqueBooks = useMemo(() => {
        return allBooks.filter((book, i, arr) => arr.findIndex(b => b.title === book.title) === i);
    }, [allBooks]);

    // 섹션별 필터링
    const weeklyFocusBook = useMemo(() => {
        const book = uniqueBooks.find(b => b.section === 'WEEKLY_FOCUS') || uniqueBooks[0];
        console.log("DEBUG: weeklyFocusBook", book);
        return book;
    }, [uniqueBooks]);
    const editorsPicks = useMemo(() => uniqueBooks.filter(b => b.section === 'EDITORS_PICK'), [uniqueBooks]);
    const guruChoice = useMemo(() => uniqueBooks.filter(b => b.section === 'GURU_CHOICE'), [uniqueBooks]);

    // 오리지널 콘텐츠 필터링 (id가 archiview-original이거나 특정 패턴인 경우)
    const originalContents = useMemo(() => {
        return uniqueBooks.filter(b => b.id.includes('framework') || b.id.includes('original'));
    }, [uniqueBooks]);

    if (booksLoading || !weeklyFocusBook) {
        return (
            <div className="bg-background-dark min-h-screen flex items-center justify-center">
                <div className="text-gold animate-pulse font-black tracking-widest text-xs">ARCHIVIEW LOADING...</div>
            </div>
        );
    }

    return (
        <div className="bg-white text-slate-900 dark:text-white min-h-[100dvh] pb-24 font-display flex justify-center">
            <div className="w-full max-w-[430px] relative bg-background-dark shadow-2xl min-h-[100dvh] overflow-x-hidden border-t border-white/5">
                <TopNavigation title="에디토리얼" type="sub" />

                <main className="px-4 md:px-6 pt-10 pb-24 space-y-10">
                    <header className="space-y-2">
                        <span className="text-gold text-[9px] font-black uppercase tracking-[0.2em] block">Editorial Picks</span>
                        <h2 className="serif-title text-2xl md:text-3xl text-white font-light leading-snug">
                            지적인 한 주를 위한 <br />
                            <span className="italic text-slate-400">Archiview Curation</span>
                            <span className="text-[8px] text-white/20 ml-2">v9.1-DynamicFocus</span>
                        </h2>
                    </header>

                    {/* Archiview Originals Premium Section */}
                    {originalContents.length > 0 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="size-8 bg-gold flex items-center justify-center rounded-lg shadow-lg shadow-gold/20">
                                    <span className="material-symbols-outlined text-primary text-xl font-bold">verified</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-gold text-[8px] font-black uppercase tracking-[0.2em]">Exclusively Produced</span>
                                    <h3 className="serif-title text-xl text-white font-bold italic">Archiview Originals</h3>
                                </div>
                            </div>

                            <div className="flex overflow-x-auto gap-5 pb-4 hide-scrollbar -mx-4 px-4 snap-x">
                                {originalContents.map((content) => (
                                    <Link 
                                        key={content.id} 
                                        to={`/review/${content.id}`} 
                                        className="shrink-0 w-[280px] snap-center group relative"
                                    >
                                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl group-hover:border-gold/50 transition-all duration-500">
                                            <img src={content.cover} alt={content.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                            
                                            {/* Original Badge */}
                                            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-gold/30">
                                                <div className="size-1.5 rounded-full bg-gold animate-pulse"></div>
                                                <span className="text-gold text-[8px] font-black uppercase tracking-widest">Original</span>
                                            </div>

                                            <div className="absolute bottom-4 left-4 right-4 space-y-1">
                                                <h4 className="text-white font-bold text-lg leading-tight group-hover:text-gold transition-colors">{content.title}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white/40 text-[9px] font-medium tracking-tight">Archiview Editors</span>
                                                    <span className="text-white/20 text-[9px]">•</span>
                                                    <span className="text-gold text-[9px] font-bold uppercase tracking-tighter">40+ Turns Tiki-Taka</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Quick Play Info */}
                                        <div className="mt-3 flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-gold text-sm">mic_external_on</span>
                                                <span className="text-white/60 text-[10px] font-medium tracking-tight truncate w-32">{content.subtitle}</span>
                                            </div>
                                            <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">Watch Now</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Dynamic Weekly Focus */}
                    <div className="relative w-full rounded-[32px] overflow-hidden bg-[#0f1115] border border-white/5 shadow-2xl group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 blur-[80px] rounded-full -ml-10 -mb-10"></div>
                        <div className="relative p-6 md:p-8 flex flex-col items-center">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="h-[1px] w-4 bg-gold/50"></span>
                                <span className="text-gold text-[10px] font-black uppercase tracking-[0.4em]">Weekly Focus</span>
                                <span className="h-[1px] w-4 bg-gold/50"></span>
                            </div>
                            <div className="mb-6 flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20">
                                <span className="material-symbols-outlined text-[12px] text-gold">neurology</span>
                                <span className="text-[8px] text-gold font-bold uppercase tracking-widest">NotebookLM Audio Experience</span>
                            </div>
                            <div className="w-full flex flex-col md:flex-row gap-8 items-center mb-10">
                                <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-700">
                                    <div className="absolute -inset-4 bg-black/40 blur-2xl rounded-full opacity-60"></div>
                                    <div className="relative w-40 aspect-[2/3] rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
                                        <img src={weeklyFocusBook.cover} alt={weeklyFocusBook.title} loading="lazy" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 size-12 bg-gold flex items-center justify-center rounded-full shadow-lg border-4 border-[#0f1115]">
                                        <span className="material-symbols-outlined text-primary text-xl font-bold">star_rate</span>
                                    </div>
                                </div>
                                <div className="flex-1 text-center md:text-left space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="serif-title text-2xl md:text-3xl text-white font-medium leading-tight">{weeklyFocusBook.title}</h3>
                                        <p className="text-slate-500 text-sm font-light uppercase tracking-widest italic">{weeklyFocusBook.author}</p>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-slate-400 text-xs font-light leading-relaxed">
                                            "{weeklyFocusBook.subtitle || '변화하는 인류의 운명을 결정짓는 거대한 질문들을 던지다'}"
                                        </p>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                            <span className="text-[9px] text-white/40 border border-white/10 px-2 py-0.5 rounded-md uppercase tracking-tighter">{weeklyFocusBook.tag}</span>
                                            <span className="text-[9px] text-white/40 border border-white/10 px-2 py-0.5 rounded-md uppercase tracking-tighter">{weeklyFocusBook.celebName}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full flex gap-3">
                                <Link to={`/review/${weeklyFocusBook.id}`} className="flex-1 group/btn relative h-14 bg-white/5 backdrop-blur-xl overflow-hidden rounded-2xl border border-white/10 flex items-center justify-center transition-all duration-500 hover:border-white/30 hover:bg-white/10 hover:-translate-y-1 shadow-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                                    <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] relative z-10 transition-colors group-hover/btn:text-white leading-tight text-center">REVIEW<br />DETAIL</span>
                                </Link>
                                {weeklyFocusBook.isPodcast && (
                                    <button
                                        onClick={() => playPodcastMP3(weeklyFocusBook.podcastUrl, weeklyFocusBook.title, weeklyFocusBook.cover, weeklyFocusBook.id)}
                                        className={`flex-none px-6 h-14 rounded-2xl border backdrop-blur-xl flex items-center justify-center gap-2 transition-all duration-500 hover:-translate-y-1 ${(podcastPlaying && podcastInfo?.id === weeklyFocusBook.id)
                                            ? 'bg-gold border-gold text-primary shadow-[0_10px_30px_rgba(212,175,55,0.4)] anim-pulse'
                                            : 'bg-white/5 border-white/10 text-white hover:border-gold/50 hover:bg-gold/5'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{(podcastPlaying && podcastInfo?.id === weeklyFocusBook.id) ? 'stop' : 'podcasts'}</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">{(podcastPlaying && podcastInfo?.id === weeklyFocusBook.id) ? '정지' : '팟캐스트'}</span>
                                    </button>
                                )}
                                {weeklyFocusBook.purchaseLink && (
                                    <a href={weeklyFocusBook.purchaseLink} target="_blank" rel="noopener noreferrer" className="flex-1 h-14 rounded-2xl border border-gold/30 bg-gold/10 text-gold hover:bg-gold hover:text-primary transition-all flex items-center justify-center gap-2 shadow-2xl uppercase text-[10px] font-black tracking-widest">
                                        <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                                        <span>BUY</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Deep Dive Archives - New Section for 5000+ Character Reviews */}
                    <section className="space-y-8 bg-gold/5 -mx-4 px-4 py-10 border-y border-gold/10">
                        <div className="flex flex-col items-center text-center space-y-2 mb-8">
                            <span className="text-gold text-[9px] font-black uppercase tracking-[0.4em]">Archiview Special</span>
                            <h2 className="serif-title text-2xl text-white font-bold italic">Characters Deep Dive</h2>
                            <p className="text-slate-400 text-[10px] font-light max-w-xs mx-auto">
                                단순한 요약을 넘어 선구자들의 깊은 사유와 <br />철학적 통찰을 담은 프리미엄 E-Book 컬렉션
                            </p>
                        </div>

                        <div
                            ref={scrollRef}
                            className="flex overflow-x-auto gap-6 pb-6 hide-scrollbar snap-x scroll-px-6"
                        >
                            {deepDiveBooks.map((book) => (
                                <Link key={book.id} to={`/review/${book.id}`} className="shrink-0 w-64 snap-center group">
                                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-4 border border-gold/20 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                                        <img src={book.cover} alt={book.title} loading="lazy" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity"></div>
                                        <div className="absolute top-4 right-4 bg-gold/90 text-primary text-[8px] font-black px-2 py-1 rounded-md shadow-lg shadow-gold/20 uppercase tracking-widest">Premium</div>
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <p className="text-gold text-[8px] font-bold uppercase tracking-widest mb-1 opacity-70">{book.celeb}</p>
                                            <h4 className="text-white font-bold text-lg leading-tight truncate">{book.title}</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-gold text-sm">auto_stories</span>
                                            <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">80+ Pages</span>
                                        </div>
                                        <div className="text-gold text-[9px] font-black uppercase tracking-widest border-b border-gold/40 pb-0.5 group-hover:text-white group-hover:border-white transition-all leading-tight text-right">REVIEW<br />DETAIL</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Editors' Picks */}
                    <section className="space-y-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <span className="text-white text-xl font-bold serif-title italic">Editors' Picks</span>
                        </div>
                        <div className="space-y-6">
                            {editorsPicks.map((item) => (
                                <div key={item.id} className="flex gap-5 group">
                                    <div className="w-24 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 border border-white/10 relative shadow-xl">
                                        <img src={item.cover} alt={item.title} loading="lazy" className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <span className="text-[8px] text-gold font-black uppercase tracking-widest bg-gold/10 px-2 py-0.5 rounded-full mb-2 inline-block border border-gold/20">{item.tag}</span>
                                            <h4 className="text-white font-bold text-lg leading-tight mb-1">{item.title}</h4>
                                            <p className="text-slate-500 text-xs font-light">{item.subtitle}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-auto">
                                            {/* 1. 리뷰 상세 */}
                                            {item.hasReview ? (
                                                <Link
                                                    to={`/review/${item.id}`}
                                                    className="h-10 rounded-xl bg-gold/10 border border-gold/30 text-gold text-[9px] font-black uppercase tracking-widest hover:bg-gold hover:text-primary transition-all flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">auto_stories</span>
                                                    <span className="leading-tight text-center">REVIEW<br />DETAIL</span>
                                                </Link>
                                            ) : (
                                                <div className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/20 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
                                                    <span className="material-symbols-outlined text-[16px]">auto_stories</span>
                                                    <span className="leading-tight text-center">REVIEW<br />DETAIL</span>
                                                </div>
                                            )}

                                            {/* 2. 팟캐스트 */}
                                            <button
                                                disabled={!item.isPodcast}
                                                onClick={() => item.isPodcast && playPodcastMP3(item.podcastUrl, item.title, item.cover, item.id)}
                                                className={`h-10 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                                                    !item.isPodcast
                                                        ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                                                        : (podcastPlaying && podcastInfo?.id === item.id)
                                                            ? 'bg-gold border-gold text-primary shadow-lg shadow-gold/20'
                                                            : 'bg-white/5 border-white/10 text-white hover:border-gold/50 hover:text-gold'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">{(podcastPlaying && podcastInfo?.id === item.id) ? 'stop' : 'podcasts'}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest">{(podcastPlaying && podcastInfo?.id === item.id) ? '정지' : '팟캐스트'}</span>
                                            </button>

                                            {/* 3. 서재 추가 */}
                                            <button
                                                className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/50 text-[9px] font-black uppercase tracking-widest hover:bg-white/8 hover:text-white transition-all flex items-center justify-center gap-2"
                                                onClick={() => addToLibrary(item)}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">bookmark</span>
                                                <span>서재 추가</span>
                                            </button>

                                            {/* 4. 구매하기 */}
                                            {item.purchaseLink ? (
                                                <a
                                                    href={item.purchaseLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                                                    <span className="leading-tight text-center">BUY<br />BOOK</span>
                                                </a>
                                            ) : (
                                                <div className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/10 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
                                                    <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                                                    <span className="leading-tight text-center">BUY<br />BOOK</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Guru's Choice */}
                    <section className="space-y-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-gold text-xl">workspace_premium</span>
                                <span className="text-white text-xl font-bold serif-title italic">Guru's Choice</span>
                            </div>
                            <span className="text-[8px] text-gold font-black uppercase tracking-widest bg-gold/10 px-2 py-1 rounded-full border border-gold/20">Expert Curation</span>
                        </div>
                        <div className="space-y-6">
                            {guruChoice.length > 0 ? guruChoice.map((item) => (
                                <div key={item.id} className="flex gap-5 group">
                                    <div className="w-24 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 border border-gold/20 relative shadow-xl">
                                        <img src={item.cover} alt={item.title} loading="lazy" className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" />
                                        <div className="absolute top-2 left-2 bg-gold text-primary text-[7px] font-black px-1.5 py-0.5 rounded uppercase">Expert</div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <span className="text-[8px] text-gold font-black uppercase tracking-widest bg-gold/10 px-2 py-0.5 rounded-full mb-2 inline-block border border-gold/20">{item.tag}</span>
                                            <h4 className="text-white font-bold text-lg leading-tight mb-1">{item.title}</h4>
                                            <p className="text-slate-400 text-xs font-light italic mb-1">{item.author}</p>
                                            <p className="text-slate-500 text-xs font-light">{item.subtitle}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-auto">
                                            <Link
                                                to={`/review/${item.id}`}
                                                className="h-10 rounded-xl bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                                                <span className="leading-tight text-center">REVIEW<br />DETAIL</span>
                                            </Link>
                                            <button
                                                disabled={!item.isPodcast}
                                                onClick={() => item.isPodcast && playPodcastMP3(item.podcastUrl, item.title, item.cover, item.id)}
                                                className={`h-10 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                                                    !item.isPodcast
                                                        ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                                                        : (podcastPlaying && podcastInfo?.id === item.id)
                                                            ? 'bg-gold border-gold text-primary shadow-lg shadow-gold/20'
                                                            : 'bg-white/5 border-white/10 text-white hover:border-gold/50 hover:text-gold'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">{(podcastPlaying && podcastInfo?.id === item.id) ? 'stop' : 'podcasts'}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest">{(podcastPlaying && podcastInfo?.id === item.id) ? '정지' : '팟캐스트'}</span>
                                            </button>
                                            <button
                                                className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/50 text-[9px] font-black uppercase tracking-widest hover:bg-white/8 hover:text-white transition-all flex items-center justify-center gap-2"
                                                onClick={() => addToLibrary(item)}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">bookmark</span>
                                                <span>서재 추가</span>
                                            </button>
                                            {item.purchaseLink ? (
                                                <a
                                                    href={item.purchaseLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                                                    <span className="leading-tight text-center">BUY<br />BOOK</span>
                                                </a>
                                            ) : (
                                                <div className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/10 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
                                                    <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                                                    <span className="leading-tight text-center">BUY<br />BOOK</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )) : null}
                        </div>
                    </section>

                    <Footer />
                </main >
                <BottomNavigation />
            </div >
        </div >
    );
}
