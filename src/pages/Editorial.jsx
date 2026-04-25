import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSavedBooks } from '../hooks/useSavedBooks';
import { useSiteDesign } from '../hooks/useSiteDesign';
import { motion, AnimatePresence } from 'framer-motion';
import MainHeader from '../components/MainHeader';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import { useBookData } from '../hooks/useBookData';
import LoadingScreen from '../components/LoadingScreen';
import { useAudio } from '../contexts/AudioContext';
import InsightBanner from '../components/InsightBanner';
import BookCardActions from '../components/BookCardActions';
import { availableAudio } from '../data/availableAudio';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const categoriesInfo = [
    {
        label: "자기계발",
        id: 'SELF_DEV',
        title: "Growth & Success",
        sub: "내 성장을 가속화하고 싶을 때. 삶의 질을 높이는 강력한 도구들.",
        img: '/images/photo_selfdev.jpg',
        readTime: "12 MIN READ",
        author: "TEAM ARCHIVIEW"
    },
    {
        label: "경제",
        id: 'ECONOMY',
        title: "Wealth & Finance",
        sub: "부의 본질과 경제 흐름을 알고 싶을 때. 시장의 맥락을 짚는 통찰.",
        img: '/images/photo_economy.jpg',
        readTime: "15 MIN READ",
        author: "TEAM ARCHIVIEW"
    },
    {
        label: "경영",
        id: 'MANAGEMENT',
        title: "Business & Leader",
        sub: "압도적인 성과와 경영의 지혜. 조직과 개인을 이끄는 힘.",
        img: '/images/photo_management.jpg',
        readTime: "10 MIN READ",
        author: "TEAM ARCHIVIEW"
    },
    {
        label: "인문",
        id: 'HUMANITIES',
        title: "Insight & History",
        sub: "시대를 관통하는 통찰과 지혜. 오래된 것에서 발견하는 미래.",
        img: '/images/photo_humanities.jpg',
        readTime: "14 MIN READ",
        author: "TEAM ARCHIVIEW"
    },
    {
        label: "심리",
        id: 'PSYCHOLOGY',
        title: "Mind & Healing",
        sub: "내 마음을 돌보고 위로가 필요할 때. 멈춰 서서 나를 들여다보는 시간.",
        img: '/images/photo_psychology.jpg',
        readTime: "9 MIN READ",
        author: "TEAM ARCHIVIEW"
    }
];

const sliderItems = [
    { label: "일이 손에 안 잡히고 지칠 때", sub: "번아웃 솔루션", id: 'BURNOUT', img: '/images/cat_burnout_new.jpg' },
    { label: "내 가치를 증명하고 부를 쌓고 싶을 때", sub: "경제/자유", id: 'ECONOMY', img: '/images/cat_wealth_new.jpg' },
    { label: "마음이 답답하고 위로가 필요한 때", sub: "치유/명상", id: 'PSYCHOLOGY', img: '/images/cat_healing_new.jpg' },
    { label: "어떻게 살아야 할지 막막할 때", sub: "철학/인생", id: 'HUMANITIES', img: '/images/cat_philosophy_new.jpg' }
];

export default function Editorial() {
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);
    const { design } = useSiteDesign();
    const { user } = useAuth();
    const { addBook: addSavedBook, savedBooks } = useSavedBooks(user);
    const [selectedCategoryId, setSelectedCategoryId] = useState(categoriesInfo[0].id);
    const [showAllBooks, setShowAllBooks] = useState(false);
    const { getAllBooks, loading: booksLoading } = useBookData();
    const { openScriptModal } = useAudio();

    const allBooks = useMemo(() => {
        return getAllBooks();
    }, [getAllBooks]);

    // 관리자 popular 탭 순서 로드
    const [categoryOrders, setCategoryOrders] = useState({});
    useEffect(() => {
        const MAP = {
            SELF_DEV:    'category_growth',
            ECONOMY:     'category_economy',
            MANAGEMENT:  'category_business',
            HUMANITIES:  'category_humanities',
            PSYCHOLOGY:  'category_psychology',
        };
        const unsubs = Object.entries(MAP).map(([catId, dbKey]) =>
            onSnapshot(doc(db, 'site_config', dbKey), snap => {
                if (snap.exists()) {
                    setCategoryOrders(prev => ({ ...prev, [catId]: snap.data().books || [] }));
                }
            })
        );
        return () => unsubs.forEach(u => u());
    }, []);

    // design 설정에서 슬라이더/탭 이미지 가져오기 (없으면 파일 상단 상수 사용)
    const sliderItemsResolved = design.editorial_slider.length ? design.editorial_slider : sliderItems;
    const loopedSliderItems = useMemo(
        () => [...sliderItemsResolved, ...sliderItemsResolved],
        [sliderItemsResolved]
    );
    const categoriesInfoResolved = categoriesInfo.map(cat => {
        const tabDesign = design.editorial_tabs.find(t => t.id === cat.id);
        return tabDesign ? { ...cat, img: tabDesign.img } : cat;
    });

    // 카테고리 필터링 + 관리자 등록 순서 적용
    const filteredBooks = useMemo(() => {
        const order = categoryOrders[selectedCategoryId] || [];
        if (order.length > 0) {
            // 관리자 순서 기준으로 allBooks에서 매칭해서 정렬
            const bookMap = new Map(allBooks.map(b => [b.id, b]));
            const ordered = order.map(item => bookMap.get(item.id)).filter(Boolean);
            // 관리자 목록에 없는 책은 카테고리 필터로 뒤에 추가
            const orderedIds = new Set(ordered.map(b => b.id));
            const rest = allBooks.filter(book => {
                if (orderedIds.has(book.id)) return false;
                const bCat = (book.category || '').toLowerCase();
                if (selectedCategoryId === 'SELF_DEV') return bCat.includes('자기계발');
                if (selectedCategoryId === 'ECONOMY') return bCat.includes('경제');
                if (selectedCategoryId === 'MANAGEMENT') return bCat.includes('경영');
                if (selectedCategoryId === 'HUMANITIES') return bCat.includes('인문') || bCat.includes('역사');
                if (selectedCategoryId === 'PSYCHOLOGY') return bCat.includes('심리');
                return false;
            });
            return [...ordered, ...rest];
        }
        // Firestore 미설정 시 카테고리 필터만 적용
        return allBooks.filter(book => {
            const bCat = (book.category || '').toLowerCase();
            if (selectedCategoryId === 'SELF_DEV') return bCat.includes('자기계발');
            if (selectedCategoryId === 'ECONOMY') return bCat.includes('경제');
            if (selectedCategoryId === 'MANAGEMENT') return bCat.includes('경영');
            if (selectedCategoryId === 'HUMANITIES') return bCat.includes('인문') || bCat.includes('역사');
            if (selectedCategoryId === 'PSYCHOLOGY') return bCat.includes('심리');
            return false;
        });
    }, [allBooks, selectedCategoryId, categoryOrders]);

    const visibleBooks = useMemo(
        () => showAllBooks ? filteredBooks : filteredBooks.slice(0, 10),
        [filteredBooks, showAllBooks]
    );

    useEffect(() => {
        setShowAllBooks(false);
    }, [selectedCategoryId]);

    const normalizeLoopScroll = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const half = el.scrollWidth / 2;
        if (!half) return;
        if (el.scrollLeft >= half) {
            el.scrollLeft -= half;
        } else if (el.scrollLeft < 0) {
            el.scrollLeft += half;
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const el = scrollContainerRef.current;
            if (!el) return;
            normalizeLoopScroll();
            el.scrollBy({ left: 220, behavior: 'smooth' });
        }, 3500);
        return () => clearInterval(interval);
    }, [loopedSliderItems.length]);

    const addToLibrary = (book) => {
        if (savedBooks.some(b => b.title === book.title)) {
            alert('이미 서재에 보관된 도서입니다.'); return;
        }
        addSavedBook({ id: book.id, title: book.title, author: book.author, cover: book.cover });
        alert('서재에 보관되었습니다. ✅');
    };

    if (booksLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="bg-[#0e1015] text-white font-sans antialiased min-h-screen pb-32 flex justify-center selection:bg-orange-500/30">
            <div className="w-full max-w-md relative flex flex-col bg-[#0e1015] shadow-2xl overflow-x-hidden">
                <MainHeader showBack />

                <main className="flex-grow">
                    {/* 🚀 1. Weekly Insight Section */}
                    <section className="relative h-[480px] w-full overflow-hidden mb-12">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1015] via-[#0e1015]/40 to-transparent z-10"></div>
                        {design.editorial_hero.type === 'image' ? (
                            <img src={design.editorial_hero.src} alt="hero" className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scale(1.1) translateX(30px)' }} />
                        ) : (
                            <video
                                src={design.editorial_hero.src}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="auto"
                                poster={design.editorial_hero_poster || undefined}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ transform: 'scale(1.1) translateX(30px)' }}
                            />
                        )}
                        <div className="relative z-20 h-full flex flex-col justify-end px-6 pb-16">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-end gap-[2px] h-4">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <motion.div
                                            key={i}
                                            className="w-[3px] bg-orange-500"
                                            animate={{ height: ["30%", "100%", "30%"] }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 0.8 + (i % 3) * 0.2,
                                                ease: "easeInOut",
                                            }}
                                        />
                                    ))}
                                </div>
                                <motion.span
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-orange-500 font-bold text-xs tracking-[0.3em] uppercase"
                                >
                                    THE ART OF TIME
                                </motion.span>
                            </div>
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-[35px] font-light leading-tight tracking-tighter mb-4"
                            >
                                모두 흘려보낼 때<br />
                                <span className="font-bold">당신은 채워갑니다</span>
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-white/60 text-sm max-w-xs leading-relaxed"
                            >
                                누구에게나 시간은 공평하게 흐르지만<br />
                                그 시간을 무엇으로 채우느냐가<br />
                                내일의 당신을 결정합니다
                            </motion.p>
                        </div>
                    </section>


                    {/* 🚀 2. Trending Now Horizontal Scroll */}
                    <section className="relative">
                        <div className="px-6 mb-8">
                            <h3 className="text-[22px] font-black tracking-tight leading-none mb-1.5 text-white">직장인이 가장 많이 듣는 인사이트</h3>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-[2px] bg-orange-500 rounded-none"></div>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">지금 직장인의 고민으로 가장 많이 듣는 인사이트</p>
                            </div>
                        </div>
                        <div className="relative group/slider">
                            {/* Left Scroll Button */}
                            <button
                                onClick={() => {
                                    if (!scrollContainerRef.current) return;
                                    normalizeLoopScroll();
                                    scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
                                }}
                                className="absolute left-4 top-[133px] -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-zinc-800/80 rounded-none text-zinc-300 opacity-0 group-hover/slider:opacity-100 hover:bg-zinc-700 hover:scale-110 hover:text-white transition-all active:scale-90"
                            >
                                <span className="material-symbols-outlined text-[32px] font-light">chevron_left</span>
                            </button>

                            {/* Right Scroll Button */}
                            <button
                                onClick={() => {
                                    if (!scrollContainerRef.current) return;
                                    normalizeLoopScroll();
                                    scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
                                }}
                                className="absolute right-4 top-[133px] -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-zinc-800/80 rounded-none text-zinc-300 opacity-0 group-hover/slider:opacity-100 hover:bg-zinc-700 hover:scale-110 hover:text-white transition-all active:scale-90"
                            >
                                <span className="material-symbols-outlined text-[32px] font-light">chevron_right</span>
                            </button>

                            <div ref={scrollContainerRef} className="flex overflow-x-auto no-scrollbar gap-5 px-6 pr-10 pb-6 snap-x snap-mandatory">
                                {loopedSliderItems.map((item, idx) => (
                                    <motion.div
                                        key={`${item.id}-${idx}`}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate(`/category/${item.id}`)}
                                        className="flex-none w-[200px] group cursor-pointer snap-start"
                                    >
                                        <div className="relative aspect-[3/4] rounded-none overflow-hidden mb-3 border border-white/5 shadow-2xl">
                                            <div className="absolute top-3 left-3 z-10 bg-orange-600 text-white w-8 h-8 rounded-none flex items-center justify-center font-black text-xs">
                                                0{(idx % sliderItemsResolved.length) + 1}
                                            </div>
                                            <img src={item.img} alt={item.label} loading="lazy" decoding="async" className="w-full h-full object-cover object-right grayscale-[0.2] transition-transform duration-700 group-hover:scale-110 group-hover:grayscale-0" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <h4 className="font-black text-[15px] tracking-tighter truncate leading-snug">{item.label}</h4>
                                        <p className="text-white/40 text-[11px] font-medium tracking-tight mt-0.5">{item.sub}</p>
                                    </motion.div>
                                ))}
                                <div className="flex-none w-1" aria-hidden="true" />
                            </div>
                        </div>
                    </section>

                    {/* 🚀 3. Category Anchor Tabs */}
                    <div className="px-6 my-[28px]">
                        <div className="h-[1px] bg-white/5 w-full"></div>
                    </div>
                    <section className="px-4 mb-[19px] sticky top-20 z-40 bg-[#0e1015]/90 backdrop-blur-md pb-4">
                        <div className="flex gap-1.5 w-full">
                            {categoriesInfoResolved.map((cat) => (
                                <button
                                    key={`tab-${cat.id}`}
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                    className={`flex-1 min-w-0 py-2.5 rounded-none border text-[12px] font-black tracking-tight transition-all ${selectedCategoryId === cat.id ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-orange-600/50'}`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* 🚀 4. Active Category Section */}
                    <section className="px-6 space-y-20 mb-20 animate-fade-in">
                        {(() => {
                            const cat = categoriesInfoResolved.find(c => c.id === selectedCategoryId);
                            const books = visibleBooks;
                            return (
                                <article key={cat.id} id={`section-${cat.id}`} className="flex flex-col space-y-8 scroll-mt-36">
                                    {/* Category Header (Article Style) */}
                                    <div className="space-y-6">
                                        <div className="relative w-full aspect-[16/9] rounded-none overflow-hidden group shadow-2xl border border-white/5 cursor-pointer" onClick={() => navigate(`/category/${cat.id}`)}>
                                            <img src={cat.img} alt={cat.label} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                                            <div className="absolute top-4 right-4 bg-[#0e1015]/80 backdrop-blur-md px-4 py-1.5 rounded-none border border-white/10 shadow-lg">
                                                <span className="text-[10px] text-orange-500 font-black tracking-widest uppercase">{cat.label}</span>
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>

                                        <div className="w-full">
                                            <h3 className="text-2xl font-black leading-tight tracking-tight mb-3">『{cat.label}』 {cat.title}</h3>
                                            <p className="text-white/40 text-[13px] leading-relaxed mb-4">{cat.sub}</p>
                                            <div className="flex items-center gap-4 text-[10px] font-black text-white/20 uppercase tracking-[0.1em]">
                                                <span>{cat.readTime}</span>
                                                <span className="w-1 h-1 rounded-none bg-orange-500/40"></span>
                                                <span>BY {cat.author}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Embedded Book List (Vertical 5 books) */}
                                    <div className="bg-white/5 rounded-none p-6 space-y-10 border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-black text-orange-500 uppercase tracking-widest">Recommended Books</h4>
                                            <span className="text-[10px] text-white/30 font-bold uppercase">10 Picked</span>
                                        </div>
                                        {books.map((item, idx) => {
                                            const audioFileName = `${item.id}.mp3`;
                                            const durationSec = availableAudio[audioFileName] || 0;
                                            const durationMin = durationSec > 0 ? Math.ceil(durationSec / 60) : 15; // default 15
                                            const readTimeMin = Math.ceil(durationMin / 3); // Reading is usually faster

                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    className="space-y-6"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: idx * 0.05 }}
                                                >
                                                    <div className="flex gap-4 group items-start">
                                                        <div className="w-[100px] aspect-[3/4.2] rounded-none overflow-hidden shrink-0 border border-white/10 shadow-lg relative bg-[#1a1d24] cursor-pointer" onClick={() => navigate(`/review/${item.id || item.title.toLowerCase().replace(/\s+/g, '-')}`)}>
                                                            <img src={item.cover} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                            {item.isPodcast && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <span className="material-symbols-outlined text-white text-2xl">play_circle</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-start py-1 h-full max-w-[calc(100%-116px)]">
                                                            <div className="cursor-pointer mb-4" onClick={() => navigate(`/review/${item.id || item.title.toLowerCase().replace(/\s+/g, '-')}`)}>
                                                                <span className="text-[9px] text-orange-500 font-bold uppercase tracking-widest mb-1 opacity-60 block">INSIGHT 0{idx + 1}</span>
                                                                <h5 className="text-white font-black text-[15px] leading-tight mb-1.5 truncate">『{item.title}』</h5>
                                                                <p className="text-white/40 text-[11px] font-medium italic line-clamp-1 opacity-80">{item.desc || item.author}</p>
                                                            </div>



                                                            <BookCardActions book={item} className="mt-auto" />
                                                        </div>
                                                    </div>
                                                    {idx < books.length - 1 && <div className="h-[1px] w-full bg-white/5 mt-2"></div>}

                                                    {/* ── 광고 (4번째 책 다음) ── */}
                                                    {idx === 3 && (
                                                        <div className="relative overflow-hidden bg-[#0f1117] border border-white/5 p-5 my-4">
                                                            <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-600/10 blur-[50px] rounded-full pointer-events-none" />
                                                            <div className="relative z-10">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="bg-blue-600/90 text-white text-[9px] font-black px-1.5 py-0.5 uppercase tracking-tighter">SPECIAL OFFER</span>
                                                                    <span className="text-zinc-500 text-[11px] italic">아카이뷰 추천</span>
                                                                </div>
                                                                <h3 className="text-white text-[16px] font-black leading-tight break-keep mb-2">저렴한 유지비로 신차 타자! 🚗</h3>
                                                                <p className="text-zinc-400 text-[11px] leading-relaxed mb-4 break-keep">
                                                                    초기비용↓ · 세금절감 · 신용등급 변동無 · 보험할증無 · 재산세/건보료 상승NO
                                                                </p>
                                                                <a
                                                                    href="http://dbdbdeep.com/ma/link.php?lncd=S00274859QC05984655S"
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="w-full h-12 bg-white text-black font-black text-[13px] flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                                                                >
                                                                    카슐랭 장기렌트 알아보기
                                                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                                                </a>
                                                                <p className="mt-3 text-[9px] text-zinc-600 text-center">* 제휴 마케팅 활동의 일환으로 수수료를 제공받을 수 있습니다.</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}

                                        <div className="pt-4 flex justify-center">
                                            <button
                                                onClick={() => setShowAllBooks(!showAllBooks)}
                                                className="px-8 py-3 rounded-none border border-orange-500/30 bg-orange-500/5 text-orange-500 font-black text-xs tracking-[0.2em] hover:bg-orange-500/10 transition-all active:scale-95"
                                            >
                                                {showAllBooks ? 'SHOW LESS' : 'VIEW ALL'}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })()}
                    </section>

                    <Footer />
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
