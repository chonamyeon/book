import { useState, useEffect, useMemo } from 'react';
import { celebrities } from '../data/celebrities';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { useBookData } from '../hooks/useBookData';
import { useAudio } from '../contexts/AudioContext';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { getAllBooks, loading: booksLoading } = useBookData();
    const { playPodcastMP3, podcastPlaying, podcastInfo, openScriptModal } = useAudio();
    const [isScrolled, setIsScrolled] = useState(false);
    const [showAllCelebs, setShowAllCelebs] = useState(false);
    const [reviewIndex, setReviewIndex] = useState(0);

    const cleanText = (t) => {
        if (!t) return "";
        return t.replace(/\[GEMINI [\d.]+ ANALYSIS\]/gi, '')
            .replace(/팟캐스트 대본 제작을 위한/g, '')
            .replace(/[#*]/g, '')
            .replace(/---/g, '')
            .trim();
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const userReviews = [
        { name: "3년차 마케터", text: "출퇴근 시간이 낭비되지 않아 너무 좋아요. 15분 만에 핵심만 듣고 출근합니다." },
        { name: "스타트업 CEO", text: "매주 선별된 책이 카톡으로 오니까 무슨 책을 읽을지 고민할 필요가 없습니다." },
        { name: "프로덕트 매니저", text: "팟캐스트를 듣고 나니 원작 내용이 너무 궁금해져서 바로 책을 주문했어요." },
        { name: "프리랜서 디자이너", text: "오디오와 요약 텍스트를 함께 볼 수 있어서 이해가 훨씬 빠르고 남는 게 많아요." },
        { name: "5년차 기획자", text: "요즘 번아웃이 와서 우울하고 무기력했는데, 퇴근길에 들으면서 큰 위로가 되었습니다." },
        { name: "영업 팀장", text: "바빠서 책 읽을 엄두를 못 냈는데, 짧은 시간 안에 제 성장에 진짜 큰 도움이 되고 있어요." },
        { name: "7년차 인사담당자", text: "라디오 듣는 것처럼 편안하게 넘어가는데 머릿속에 남는 인사이트는 묵직합니다." },
        { name: "신입 사원", text: "단순히 책을 요약하는 게 아니라, 실제 내 상황에 어떻게 적용할지 알려줘서 최고예요." },
        { name: "웹 개발자", text: "매주 알람이 울리면 오늘은 어떤 책이 왔을까 기대됩니다. 요즘 제 최애 앱이에요." },
        { name: "은행원", text: "인문학, 심리학까지 평소 내가 잘 안 읽던 분야도 부담 없이 넓게 접할 수 있어서 좋습니다." }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setReviewIndex((prev) => (prev + 1) % userReviews.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [userReviews.length]);

    const categories = [
        { label: "일이 손에 안 잡히고 지칠 때", subLabel: "(번아웃 & 커리어 슬럼프)", img: '/images/cat_burnout_v10.png', id: 'BURNOUT' },
        { label: "내 가치를 증명하고 부를 쌓고 싶을 때", subLabel: "(연봉협상 & 경제적 자유)", img: '/images/cat_wealth_v11.png', id: 'WEALTH' },
        { label: "마음이 답답하고 위로가 필요할 때", subLabel: "(우울 & 고독 & 치유)", img: '/images/cat_healing_v8.png', id: 'HEALING' },
        { label: "어떻게 살아야 할지 막막할 때", subLabel: "(자아성찰 & 인생철학)", img: '/images/cat_philosophy_v8.png', id: 'PHILOSOPHY' }
    ];

    // Memoized all books for efficiency
    const allBooks = useMemo(() => {
        const merged = getAllBooks();
        // Remove duplicates by title
        return merged.filter((book, i, arr) => arr.findIndex(b => b.title === book.title) === i);
    }, [getAllBooks]);

    const originalContents = useMemo(() => {
        return allBooks.filter(b => (b.id?.includes('framework') || b.id?.includes('original')));
    }, [allBooks]);

    // Mapping for Category Chips to Category Page IDs
    const chipToIdMap = {
        '자기계발': 'SELF_DEV',
        '경제': 'ECONOMY',
        '경영': 'MANAGEMENT',
        '인문': 'HUMANITIES',
        '심리학': 'PSYCHOLOGY',
        '커리어': 'BURNOUT'
    };

    // Weekly FocusBooks - Sort by updatedAt desc (from Firestore)
    const weeklyFocusBooks = allBooks
        .filter(b => b.section === 'WEEKLY_FOCUS')
        .sort((a, b) => {
            const timeA = a.updatedAt?.seconds || 0;
            const timeB = b.updatedAt?.seconds || 0;
            return timeB - timeA;
        })
        .slice(0, 2);

    const [popularArchives, setPopularArchives] = useState([
        { id: "wealth-way", title: "부자들이 돈을 보는 방식", listens: "12.4k" },
        { id: "decision-making", title: "억만장자의 의사결정", listens: "10.1k" },
        { id: "warren-buffett", title: "워런 버핏 사고법", listens: "8.9k" },
        { id: "leverage", title: "레버리지: 부의 추월차선", listens: "7.5k" },
        { id: "story-power", title: "스토리의 힘", listens: "6.8k" },
    ]);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'site_config', 'popular_archives'), (snap) => {
            if (snap.exists() && snap.data().books?.length) {
                setPopularArchives(snap.data().books);
            }
        });
        return () => unsub();
    }, []);

    const enrichedPopularArchives = useMemo(() => {
        return popularArchives.map(item => {
            const bookData = allBooks.find(b => b.id === item.id) || {};
            return {
                ...item,
                cover: item.cover || bookData.cover || '',
                purchaseLink: item.purchaseLink || bookData.purchaseLink || '',
                author: item.author || bookData.author || '',
            };
        });
    }, [popularArchives, allBooks]);

    const addToLibrary = (book) => {
        const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
        if (saved.some(b => b.title === book.title)) {
            alert('이미 서재에 보관된 도서입니다.');
            return;
        }
        const updated = [...saved, { title: book.title, author: book.author, cover: book.cover }];
        localStorage.setItem('savedBooks', JSON.stringify(updated));
        window.dispatchEvent(new Event('savedBooksUpdated'));
        alert('서재에 보관되었습니다. ✅');
    };

    const experts = [
        { name: "James Clear", role: "Habit Expert", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" },
        { name: "Naval", role: "Philosophy & Wealth", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop" },
        { name: "Morgan Housel", role: "Psychology of Money", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop" }
    ];

    const sectionVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <div className="bg-black text-white font-sans antialiased min-h-screen flex flex-col relative overflow-x-hidden selection:bg-orange-500/30">
            {/* Styles Injection for Glassmorphism */}
            <style>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .cursive-font {
                    font-family: 'Alex Brush', cursive;
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="max-w-md mx-auto w-full flex-grow relative flex flex-col">
                {/* 🏠 Header Navigation */}
                <main className="flex-grow pb-32">
                    {/* Independent Header Area - Positioned above the image */}
                    <div className="bg-[#101218] px-3 pt-[5px] pb-3">
                        <header className="flex items-center justify-between">
                            <Link to="/" className="flex-1 transition-opacity active:opacity-70 group flex justify-start">
                                <div className="flex items-center gap-[7px]">
                                    {/* 🔊 Gray Waveform Graphic Logo */}
                                    <div className="flex items-end h-[18px] gap-[2px] mr-1 pb-[2px]">
                                        <motion.div animate={{ height: [8, 12, 8] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }} className="w-[3px] bg-zinc-400 rounded-sm" />
                                        <motion.div animate={{ height: [12, 16, 12] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.1 }} className="w-[3px] bg-zinc-400 rounded-sm" />
                                        <motion.div animate={{ height: [16, 20, 16] }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.2 }} className="w-[3px] bg-zinc-400 rounded-sm" />
                                        <motion.div animate={{ height: [10, 14, 10] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut", delay: 0.3 }} className="w-[3px] bg-zinc-400 rounded-sm" />
                                        <motion.div animate={{ height: [14, 18, 14] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.4 }} className="w-[3px] bg-zinc-400 rounded-sm" />
                                    </div>
                                    <span className="text-[19px] font-black tracking-[-0.03em] uppercase mt-0.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>ARCHIVIEW</span>
                                </div>
                            </Link>
                            <div className="flex items-center gap-[25px]">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path></svg>
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path></svg>
                            </div>
                        </header>
                    </div>
                    <section className="relative pt-0 pb-0 overflow-hidden" style={{ minHeight: '376px' }}>
                        {/* Full background image - face focused */}
                        <div className="absolute inset-0 z-0 overflow-hidden">
                            <img
                                src="/images/hero_expert_v5.png"
                                alt="Expert Listening"
                                width={450}
                                height={376}
                                fetchpriority="high"
                                decoding="async"
                                className="object-cover"
                                style={{
                                    width: '450px',
                                    height: '376px',
                                    objectPosition: 'right top'
                                }}
                            />
                            {/* Left solid → transparent: 텍스트 왼쪽, 얼굴 오른쪽 */}
                            <div className="absolute inset-0" style={{
                                background: 'linear-gradient(to right, #101218 35%, rgba(16,18,24,0.6) 60%, transparent 100%)'
                            }}></div>
                            {/* Bottom fade */}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent"></div>
                        </div>

                        {/* Hero Text Only */}
                        <div className="relative z-10 px-6 pt-5">

                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={sectionVariants}
                                className="mt-10 mb-6"
                                style={{ maxWidth: '60%' }}
                            >
                                <h1 className="font-black leading-[1.3] mb-5 tracking-tight">
                                    <span className="text-[26px]">출퇴근 15분,</span><br />
                                    <span className="text-[20px]">성공한 사람들의<br />생각을 듣다 🎧</span>
                                </h1>
                                <p className="text-gray-300 text-[11px] font-medium leading-relaxed">
                                    책 한 권 읽을 시간 없는 직장인을 위한<br />오디오 인사이트 플랫폼
                                </p>
                            </motion.div>
                        </div>

                        {/* 🏷️ Category Chips */}
                        <div className="relative z-10 px-6 pb-2">
                            <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-2">
                                {Object.keys(chipToIdMap).map((chip) => (
                                    <button
                                        key={chip}
                                        onClick={() => navigate(`/category/${chipToIdMap[chip]}`)}
                                        className="px-5 py-2 rounded-full border bg-white/5 border-white/10 text-white/40 text-[12px] font-black whitespace-nowrap transition-all active:scale-95 shadow-lg hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-500"
                                    >
                                        #{chip}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ⭐ Social Proof Section */}
                        <div className="relative z-10 px-6 pb-6 pt-0">
                            <div className="glass-card bg-zinc-900/40 border border-white/5 rounded-sm p-4 text-center">
                                <div className="flex items-center justify-center gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className="material-symbols-outlined text-orange-500 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    ))}
                                </div>
                                <h3 className="text-[12px] font-black tracking-tight text-white mb-2.5">이미 <span className="text-orange-500">15,400명</span>의 직장인들이 매일 아침 성장하고 있습니다.</h3>
                                <div className="relative h-[36px] overflow-hidden">
                                    {userReviews.map((review, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: idx === reviewIndex ? 1 : 0, y: idx === reviewIndex ? 0 : 10 }}
                                            transition={{ duration: 0.5 }}
                                            className="absolute inset-0 flex items-center justify-center px-2"
                                            style={{ pointerEvents: idx === reviewIndex ? 'auto' : 'none' }}
                                        >
                                            <p className="text-white/40 text-[12px] font-bold leading-snug break-keep text-center">
                                                "{review.text}" <span className="text-orange-500/70 text-[11px] font-black whitespace-nowrap shrink-0 ml-1">- {review.name}</span>
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2️⃣ Weekly Focus */}
                        <div className="relative z-[20] space-y-4 w-full bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-sm pt-7 pb-7 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                            <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">Weekly Focus</h2>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-[2px] bg-orange-500 rounded-sm"></div>
                                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">매주 무료로 청취하는 위클리 포커스</p>
                                    </div>
                                </div>
                            </div>
                            {weeklyFocusBooks.length === 0 && booksLoading ? (
                                // 첫 방문자용 스켈레톤 (Firestore 로딩 중)
                                [0, 1].map(i => (
                                    <div key={i} className="glass-card rounded-sm p-4 flex gap-5 items-center border border-white/5 animate-pulse">
                                        <div className="w-[70px] h-[98px] rounded-sm bg-white/10 flex-shrink-0" />
                                        <div className="flex-grow space-y-2">
                                            <div className="h-4 bg-white/10 rounded w-3/4" />
                                            <div className="h-3 bg-white/5 rounded w-full" />
                                            <div className="flex gap-1 mt-3">
                                                {[0, 1, 2, 3].map(j => <div key={j} className="flex-1 h-6 bg-white/5 rounded-sm" />)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : weeklyFocusBooks.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-white/30 text-xs font-bold">도서 정보가 없습니다.</p>
                                </div>
                            ) : weeklyFocusBooks.map((book, idx) => {
                                const isThisPlaying = podcastPlaying && podcastInfo?.id === book.id;
                                return (
                                    <div key={idx} className="relative group">
                                        <div onClick={() => navigate(`/review/${book.id}`)} className="cursor-pointer glass-card rounded-sm p-4 flex gap-5 items-start hover:bg-white/5 transition-all w-full border border-white/5">
                                            <div className="w-[70px] h-[98px] rounded-sm overflow-hidden flex-shrink-0 shadow-2xl border border-white/10 ring-1 ring-white/20">
                                                <img alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={book.cover} />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <h3 className="font-black text-[16px] mb-1.5 leading-snug truncate text-white">{book.title}</h3>
                                                <p className="text-[11px] text-gray-400 mb-2 line-clamp-1 italic font-medium">{cleanText(book.desc) || '성공적인 인생을 위한 핵심 근력을 키워주는 방법론...'}</p>

                                                <div className="flex gap-2 mb-3">
                                                    <div className="flex items-center gap-1 text-[9px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-xs">
                                                        <span>🎧</span>
                                                        <span>15분</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[9px] font-black text-white/40 bg-white/5 px-1.5 py-0.5 rounded-xs">
                                                        <span>📖</span>
                                                        <span>5분</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-1">
                                                    <Link
                                                        to={`/review/${book.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex-1 flex items-center justify-center py-1.5 rounded-sm bg-white/5 border border-white/10 text-[9.5px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
                                                    >
                                                        리뷰
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const audioUrl = book.podcastFile || book.voiceAudioUrl || book.audioUrl || `/audio/${book.id}.mp3`;
                                                            openScriptModal(book.id, audioUrl, book.title, book.cover);
                                                        }}
                                                        className={`flex-1 flex items-center justify-center py-1.5 rounded-sm border text-[9.5px] font-black transition-all whitespace-nowrap ${isThisPlaying
                                                            ? 'bg-orange-500 text-white border-orange-500 animate-pulse'
                                                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
                                                            }`}
                                                    >
                                                        <span className="leading-[1.1]">{isThisPlaying ? '재생중' : '▶ 재생하기'}</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            addToLibrary(book);
                                                        }}
                                                        className="flex-1 flex items-center justify-center py-1.5 rounded-sm bg-white/5 border border-white/10 text-[9.5px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
                                                    >
                                                        서재추가
                                                    </button>
                                                    <a
                                                        href={book.purchaseLink || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex-1 flex items-center justify-center py-1.5 rounded-sm bg-white/5 border border-white/10 text-[9.5px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
                                                    >
                                                        구매하기
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>


                    {/* 3️⃣ 직장인이 많이 듣는 컨텐츠 */}
                    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-6 pt-7 pb-7">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5">직장인이 가장 많이 듣는 인사이트</h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-[2px] bg-orange-500 rounded-sm"></div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">지금 직장인의 고민으로 가장 많이 듣는 인사이트</p>
                                </div>
                            </div>
                            <Link to="/archive" className="size-10 rounded-xl border border-white/10 flex items-center justify-center bg-white/[0.03] active:scale-95 transition-transform">
                                <span className="material-symbols-outlined text-white/30 text-[20px]">chevron_right</span>
                            </Link>
                        </div>

                        <div className="space-y-5">
                            {categories.map((cat, i) => {
                                const targetLink = `/category/${cat.id}`;

                                return (
                                    <Link
                                        key={i}
                                        to={targetLink}
                                        className="relative group block w-full min-h-[160px] rounded-sm overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 bg-zinc-900 transition-all hover:scale-[1.01] active:scale-[0.98]"
                                    >
                                        {/* Background Image & Advanced Overlays */}
                                        <div className="absolute inset-0 pointer-events-none">
                                            <img
                                                src={cat.img}
                                                alt={cat.label}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-[1500ms] group-hover:scale-110"
                                            />
                                            {/* Multi-layered Vignette Header & Footer */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent"></div>
                                            {/* Edge Shine Effect */}
                                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                        </div>

                                        {/* Content Wrapper */}
                                        <div className="relative h-full min-h-[160px] p-7 flex flex-col justify-end z-10 w-full">
                                            {/* Category Pill (Glassmorphism) */}
                                            <div className="mb-3">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-xl border border-white/10 text-[12.5px] font-black text-white uppercase tracking-widest drop-shadow-md">
                                                    <span className="text-orange-500 mr-1.5">🎧</span>
                                                    {cat.subLabel.replace(/[()]/g, '')}
                                                </span>
                                            </div>

                                            <h3 className="text-white text-[19px] font-extrabold leading-[1.4] tracking-tight break-keep max-w-[90%] transition-transform group-hover:translate-x-1 duration-500">
                                                {cat.label.split(' ').map((word, idx) => (
                                                    <span key={idx} className="inline-block mr-1.5 opacity-90 group-hover:opacity-100">{word}</span>
                                                ))}
                                            </h3>

                                            {/* Hover Detail (Optional hint) */}
                                            <div className="absolute right-6 bottom-6 size-10 rounded-xl bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                                <span className="material-symbols-outlined text-white text-xl">arrow_outward</span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.section>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 4️⃣ 인기 아카이뷰 */}
                    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-6 pt-7 pb-7">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">주간 최다 조회 아카이뷰</h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-[2px] bg-orange-500 rounded-sm"></div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">이번주 가장 많이 들은 아카이뷰</p>
                                </div>
                            </div>
                            <Link to="/archive" className="size-10 rounded-xl border border-white/10 flex items-center justify-center bg-white/[0.03] active:scale-95 transition-transform">
                                <span className="material-symbols-outlined text-white/30 text-[20px]">chevron_right</span>
                            </Link>
                        </div>
                        <div className="space-y-5">
                            {enrichedPopularArchives.map((item, i) => (
                                <div key={i} className={`flex items-start gap-3 pb-5 ${i !== enrichedPopularArchives.length - 1 ? 'border-b border-white/5' : ''}`}>
                                    <span className="text-3xl font-black text-white/10 italic w-5 text-left flex-shrink-0 pt-1 -ml-[3px]">{i + 1}</span>
                                    <Link to={`/review/${item.id}`} className="flex-shrink-0">
                                        <div className="w-[60px] h-[82px] rounded-lg overflow-hidden shadow-lg border border-white/10 bg-zinc-800">
                                            {item.cover
                                                ? <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-white/20 text-xl">menu_book</span></div>
                                            }
                                        </div>
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <Link to={`/review/${item.id}`}>
                                            <h4 className="text-white font-black text-[14px] tracking-tight truncate">{item.title}</h4>
                                        </Link>
                                        {item.author && <p className="text-gray-500 text-[10px] font-medium mt-0.5 truncate">{item.author}</p>}
                                        {item.listens && <p className="text-gray-600 text-[9px] font-black mt-0.5 uppercase tracking-[0.1em]">{item.listens} LISTENS</p>}
                                        <div className="flex gap-2 my-1.5">
                                            <span className="text-[9px] font-black text-orange-500">🎧 15분</span>
                                            <span className="text-[9px] font-black text-white/30">📖 5분</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <Link to={`/review/${item.id}`} className="flex-1 flex items-center justify-center py-1.5 rounded-sm bg-white/5 border border-white/10 text-[9.5px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap">
                                                리뷰
                                            </Link>
                                            <button onClick={(e) => { e.stopPropagation(); const audioUrl = item.podcastFile || item.voiceAudioUrl || item.audioUrl || `/audio/${item.id}.mp3`; openScriptModal(item.id, audioUrl, item.title, item.cover); }} className="flex-1 flex items-center justify-center py-1.5 rounded-sm bg-orange-500/10 border border-orange-500/20 text-[9.5px] font-black text-orange-400 hover:bg-orange-500/20 transition-all whitespace-nowrap">
                                                ▶ 재생하기
                                            </button>
                                            <button onClick={() => addToLibrary(item)} className="flex-1 flex items-center justify-center py-1.5 rounded-sm bg-white/5 border border-white/10 text-[9.5px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap">
                                                서재추가
                                            </button>
                                            <a href={item.purchaseLink || '#'} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center py-1.5 rounded-sm bg-white/5 border border-white/10 text-[9.5px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap">
                                                구매하기
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.section>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 🎬 2.5 아카이뷰 Originals Section */}
                    {originalContents.length > 0 && (
                        <motion.section
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={sectionVariants}
                            className="space-y-4 px-6 pt-7 pb-7"
                        >
                            <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">아카이뷰 Originals</h2>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-[2px] bg-orange-500 rounded-sm"></div>
                                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">아카이뷰 만에 특별한 오리지널 컨텐츠</p>
                                    </div>
                                </div>
                                <Link to="/archive" className="size-10 rounded-sm border border-white/10 flex items-center justify-center bg-white/[0.03] active:scale-95 transition-transform">
                                    <span className="material-symbols-outlined text-white/30 text-[20px]">chevron_right</span>
                                </Link>
                            </div>

                            <div className="space-y-4">
                                {originalContents.map((content) => (
                                    <div
                                        key={content.id}
                                        className="glass-card rounded-sm p-4 flex gap-5 border border-white/5 shadow-2xl overflow-hidden relative"
                                    >
                                        {/* Left: Image (Reduced size) */}
                                        <div
                                            onClick={() => navigate(`/review/${content.id}`)}
                                            className="w-[110px] shrink-0 aspect-[3.5/5] rounded-lg overflow-hidden border border-white/10 shadow-lg cursor-pointer group"
                                        >
                                            <img
                                                src={content.cover}
                                                alt={content.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>

                                        {/* Right: Info and 4 Buttons */}
                                        <div className="flex-1 flex flex-col justify-between py-0.5">
                                            <div className="space-y-1">
                                                <h3 className="text-white font-black text-[15px] leading-tight break-keep line-clamp-2">{content.title}</h3>
                                                <p className="text-gold text-[10px] font-black uppercase tracking-[0.15em] mb-1">아카이뷰 오리지널</p>
                                                <div className="flex gap-2 mb-1">
                                                    <span className="text-[9px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-xs">🎧 18분</span>
                                                    <span className="text-[9px] font-black text-white/30 bg-white/5 px-1.5 py-0.5 rounded-xs">📖 7분</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                <Link to={`/review/${content.id}`} className="flex items-center justify-center py-2.5 rounded-sm bg-white/10 border border-white/20 text-[9.5px] font-black text-white hover:bg-white/20 transition-all whitespace-nowrap">
                                                    리뷰
                                                </Link>
                                                <button onClick={(e) => { e.stopPropagation(); const audioUrl = content.podcastFile || content.voiceAudioUrl || content.audioUrl || `/audio/${content.id}.mp3`; openScriptModal(content.id, audioUrl, content.title, content.cover); }} className="flex items-center justify-center py-2.5 rounded-sm bg-orange-500/10 border border-orange-500/20 text-[9.5px] font-black text-orange-400 hover:bg-orange-500/20 transition-all whitespace-nowrap">
                                                    ▶ 재생하기
                                                </button>
                                                <button onClick={() => addToLibrary(content)} className="flex items-center justify-center py-2.5 rounded-sm bg-white/5 border border-white/10 text-[9.5px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap">
                                                    서재추가
                                                </button>
                                                <a href={content.purchaseLink || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center py-2.5 rounded-sm bg-white/5 border border-white/10 text-[9.5px] font-black text-white/70 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap">
                                                    구매하기
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* ✨ 2.8 Celeb Picks Section */}
                    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariants} className="px-6 pt-7 pb-7">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">유명인들의 추천 아카이뷰</h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-[2px] bg-orange-500 rounded-sm"></div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">유명 셀럽들이 추천했던 도서 컬렉션</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {(showAllCelebs ? celebrities.filter(c => !c.id.includes('editor') && !c.id.includes('original') && !c.id.includes('guru')) : celebrities.filter(c => !c.id.includes('editor') && !c.id.includes('original') && !c.id.includes('guru')).slice(0, 6)).map((celeb) => (
                                <Link key={celeb.id} to={`/celebrity/${celeb.id}`} className="flex flex-col items-center bg-white/5 border border-white/10 rounded-xl p-4 group transition-all duration-300 hover:bg-white/10 hover:border-white/30 shadow-lg">
                                    <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 shadow-inner">
                                        <img src={celeb.image} alt={celeb.name} loading="lazy" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110" />
                                    </div>
                                    <h4 className="text-[14px] font-black tracking-tight text-white mb-1 truncate w-full text-center drop-shadow-md">{celeb.name === '김남준 (RM)' ? 'RM (BTS)' : celeb.name}</h4>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter truncate w-full text-center">{celeb.role}</p>
                                </Link>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowAllCelebs(!showAllCelebs)}
                            className="w-full mt-6 py-3.5 rounded-xl border border-white/10 text-white/50 text-[11px] font-black tracking-widest uppercase hover:bg-white/5 hover:text-white transition-colors"
                        >
                            {showAllCelebs ? '접기 (SHOW LESS)' : '더보기 (SEE MORE)'}
                        </button>
                    </motion.section>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 5️⃣ 멤버십 안내 */}
                    <motion.section
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={sectionVariants}
                        className="px-6 pt-7 pb-7"
                    >
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">아카이뷰 유료 멤버십 안내</h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-[2px] bg-orange-500 rounded-sm"></div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Membership Guide</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card rounded-sm p-6 bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                            {/* Subtle background glow */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-orange-500/20 transition-all duration-700"></div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Free Column */}
                                <div className="bg-black/40 border border-white/5 rounded-sm p-4 relative z-10">
                                    <h3 className="text-[12px] font-black text-white/50 text-center mb-4 uppercase tracking-widest border-b border-white/5 pb-2">일반 회원</h3>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-white/30 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/30">주간 무료 콘텐츠</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through">모든 에피소드 감상</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through">핵심 요약 PDF 제공</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through">핵심 실천 가이드 제공</span>
                                        </li>
                                        <li className="flex items-center gap-2 pt-2">
                                            <span className="material-symbols-outlined text-red-500/50 text-[14px]">close</span>
                                            <span className="text-[11px] font-bold text-white/30 line-through">기록노트 연동 성취 트래커</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Premium Column */}
                                <div className="bg-orange-500/5 border border-orange-500/30 rounded-sm p-4 relative z-10 shadow-[0_0_20px_rgba(234,88,12,0.1)]">
                                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-sm shadow-lg">PRO</div>
                                    <h3 className="text-[12px] font-black text-orange-500 text-center mb-4 uppercase tracking-widest border-b border-orange-500/20 pb-2">프리미엄</h3>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/90">모든 팟캐스트 무제한</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/90">매주 2권 카톡 발송</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/90">전용 가이드북 다운로드</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-500 text-[14px]">check</span>
                                            <span className="text-[11px] font-bold text-white/90">핵심 실천 가이드 제공</span>
                                        </li>
                                        <li className="flex items-start gap-2 bg-orange-500/10 p-2.5 rounded-sm border border-orange-500/20 mt-3 shadow-inner">
                                            <span className="material-symbols-outlined text-orange-500 text-[16px]">fact_check</span>
                                            <div className="flex-1 mt-0.5">
                                                <span className="text-[11px] font-black text-orange-400 block mb-0.5 tracking-tight">기록노트 연동 성취 트래커</span>
                                                <span className="text-[9px] font-bold text-white/60 leading-tight block break-keep">제공된 가이드를 실천하고, 기록노트에서 달성률을 체크하며 성장하세요.</span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* ✨ 새로 추가된 3단계 온보딩 (How it Works) */}
                    <motion.section
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={sectionVariants}
                        className="px-6 pb-16 pt-7"
                    >
                        <div className="mb-10 text-center">
                            <h2 className="text-[20px] font-black tracking-tight leading-none mb-2 text-white">어떻게 이용하나요?</h2>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">How to use Archiview</p>
                        </div>

                        <div className="space-y-6 relative">
                            {/* Connecting Line */}
                            <div className="absolute left-[24px] top-6 bottom-10 w-[1px] bg-white/5"></div>

                            {/* Step 1 */}
                            <div className="flex gap-4 items-start relative z-10">
                                <div className="w-12 h-12 rounded-sm bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                                    <span className="material-symbols-outlined text-white/60">menu_book</span>
                                </div>
                                <div className="pt-2">
                                    <h3 className="text-[14px] font-black text-white mb-1 tracking-tight">상황에 맞는 책 선택</h3>
                                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">번아웃, 연봉협상 등 지금 내게 필요한<br />카테고리에서 책을 고릅니다.</p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-4 items-start relative z-10">
                                <div className="w-12 h-12 rounded-sm bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                                    <span className="material-symbols-outlined text-orange-500">headphones</span>
                                </div>
                                <div className="pt-2">
                                    <h3 className="text-[14px] font-black text-orange-500 mb-1 tracking-tight">출퇴근 15분 오디오</h3>
                                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">성공한 사람들의 생각과 핵심 레슨을<br />이동하며 스마트하게 듣습니다.</p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-4 items-start relative z-10">
                                <div className="w-12 h-12 rounded-sm bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                                    <span className="material-symbols-outlined text-white/60">auto_awesome</span>
                                </div>
                                <div className="pt-2">
                                    <h3 className="text-[14px] font-black text-white mb-1 tracking-tight">핵심 요약본으로 복습</h3>
                                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">스크립트와 인사이트 요약본을 통해<br />내 삶에 즉각적으로 적용합니다.</p>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-0"></div>

                    {/* 7️⃣ CTA */}
                    <motion.section
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={sectionVariants}
                        className="px-6 pb-16"
                    >
                        <div className="relative group">
                            {/* Card Background Bloom */}
                            <div className="absolute inset-0 bg-orange-600/5 blur-[50px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                            <div className="relative glass-card bg-zinc-900/40 rounded-sm p-10 border border-white/5 text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                                <h2 className="text-[26px] font-black mb-1.5 tracking-tight text-white">커피 한 잔 가격으로</h2>
                                <p className="text-[14px] font-bold text-white/40 mb-10 tracking-widest uppercase">성공한 사람들의 생각을 듣다</p>

                                <button
                                    onClick={() => navigate('/membership')}
                                    className="w-full h-[64px] bg-orange-600 hover:bg-orange-500 text-white rounded-sm font-black text-[16px] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_15px_30px_-5px_rgba(234,88,12,0.4)] mb-6"
                                >
                                    <span className="material-symbols-outlined text-[20px] font-black">rocket_launch</span>
                                    지금 시작하기
                                </button>

                                <div onClick={() => navigate('/membership')} className="inline-flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors cursor-pointer py-1 px-3 rounded-full hover:bg-white/5">
                                    <span className="text-[12px] font-black tracking-widest uppercase">월 4,900원</span>
                                    <span className="material-symbols-outlined text-[14px] font-black">arrow_forward_ios</span>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                    {/* 8️⃣ Footer */}
                    <Footer />
                </main >

                {/* 🧭 Bottom Navigation Dock (Editorial Premium Style) */}
                <BottomNavigation />
            </div >
        </div >
    );
}
