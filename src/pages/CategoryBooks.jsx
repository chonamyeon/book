import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBookData } from '../hooks/useBookData';
import TopNavigation from '../components/TopNavigation';
import { useAudio } from '../contexts/AudioContext';
import BookCardActions from '../components/BookCardActions';

const categoriesInfo = [
    { label: "내 성장을 가속화하고 싶을 때", subLabel: "자기계발 & 성공학", id: 'SELF_DEV', img: '/images/cat_success.png', seq: "01", accent: "orange-500", search: "자기계발" },
    { label: "실질적인 부와 경제를 알고 싶을 때", subLabel: "경제 & 재테크", id: 'ECONOMY', img: '/images/cat_wealth_mod.png', seq: "02", accent: "#34d399", search: "경제" },
    { label: "비즈니스의 본질과 성과를 내고 싶을 때", subLabel: "경영 & 리더십", id: 'MANAGEMENT', img: '/images/cat_career.png', seq: "03", accent: "#60a5fa", search: "경영" },
    { label: "삶의 지혜와 통찰이 필요할 때", subLabel: "인문 & 역사 & 철학", id: 'HUMANITIES', img: '/images/cat_philosophy_mod.png', seq: "04", accent: "#f87171", search: "인문" },
    { label: "나의 마음을 돌보고 싶을 때", subLabel: "심리학 & 치유", id: 'PSYCHOLOGY', img: '/images/cat_healing_mod.png', seq: "05", accent: "#818cf8", search: "심리" },
    { label: "일이 손에 안 잡히고 지칠 때", subLabel: "번아웃 & 커리어", id: 'BURNOUT', img: '/images/cat_burnout_mod.png', seq: "06", accent: "#34d399", search: "커리어" },

    // Legacy support for existing IDs if needed
    { label: "내 가치를 증명하고 부를 쌓고 싶을 때", subLabel: "연봉협상 & 경제적 자유", id: 'WEALTH', img: '/images/cat_money.png', seq: "07", accent: "orange-500", search: "WEALTH" },
    { label: "마음이 답답하고 위로가 필요할 때", subLabel: "우울 & 고독 & 치유", id: 'HEALING', img: '/images/cat_healing.png', seq: "08", accent: "#60a5fa", search: "HEALING" },
    { label: "어떻게 살아야 할지 막막할 때", subLabel: "자아성찰 & 인생철학", id: 'PHILOSOPHY', img: '/images/cat_philosophy.png', seq: "09", accent: "#f87171", search: "PHILOSOPHY" }
];

export default function CategoryBooks() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getAllBooks } = useBookData();
    const { openScriptModal } = useAudio();

    const allBooks = getAllBooks();
    const categoryInfo = categoriesInfo.find(c => c.id === id) || categoriesInfo[0];

    const categoryBooks = useMemo(() => {
        return allBooks
            .filter(book => {
                const sec = (book.section || '').toUpperCase();
                const cat = (book.category || '').toLowerCase();

                if (categoryInfo.id === 'SELF_DEV') return cat.includes('자기계발');
                if (categoryInfo.id === 'ECONOMY') return cat.includes('경제') || cat.includes('부자');
                if (categoryInfo.id === 'MANAGEMENT') return cat.includes('경영');
                if (categoryInfo.id === 'HUMANITIES') return cat.includes('인문');
                if (categoryInfo.id === 'PSYCHOLOGY') return cat.includes('심리');
                
                // BURNOUT is both a legacy section and a category
                if (categoryInfo.id === 'BURNOUT') return cat.includes('커리어') || sec === 'BURNOUT';

                // Legacy IDs support
                if (categoryInfo.id === 'WEALTH') return cat.includes('부자') || sec === 'WEALTH';
                if (categoryInfo.id === 'HEALING') return cat.includes('심리') || sec === 'HEALING';
                if (categoryInfo.id === 'PHILOSOPHY') return cat.includes('인문') || sec === 'PHILOSOPHY';

                return false;
            })
            .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
    }, [allBooks, categoryInfo]);

    const otherCategories = categoriesInfo.filter(c => c.id !== categoryInfo.id);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
    };

    const cleanDescription = (desc) => {
        if (!desc) return "";
        return desc
            .replace(/\[GEMINI [\d.]+ ANALYSIS\]/gi, '')
            .replace(/팟캐스트 대본 제작을 위한/g, '')
            .replace(/[#*]/g, '')
            .trim();
    };

    return (
        <div className="bg-black text-white font-sans antialiased min-h-screen flex flex-col relative overflow-x-hidden selection:bg-orange-500/30 pb-32">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap');
                .cursive-font { font-family: 'Alex Brush', cursive; }
                .glass-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
                .text-gradient { background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            `}</style>

            {/* 🏠 Header Navigation */}
            <TopNavigation type="sub" />

            <main className="flex-grow">
                {/* 🌟 Dynamic Hero Section */}
                <section className="relative h-[65vh] w-full flex flex-col justify-end overflow-hidden mb-12">
                    <motion.div initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.5 }} className="absolute inset-0">
                        <img src={categoryInfo.img} alt={categoryInfo.label} className="w-full h-full object-cover grayscale-[30%]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent"></div>
                    </motion.div>

                    <div className="relative z-10 p-8 pb-12 max-w-md mx-auto w-full">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="mb-4">
                            <span className="cursive-font text-orange-500 text-6xl opacity-80 block mb-[-20px] ml-[-10px]">Collection</span>
                            <span className="text-zinc-500 text-[11px] font-black tracking-[0.3em] uppercase ml-1">Series {categoryInfo.seq}</span>
                        </motion.div>

                        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-[32px] font-black leading-[1.2] mb-6 tracking-tight text-white">
                            {categoryInfo.label.split(' ').map((word, i) => (
                                <span key={i} className="inline-block mr-2 opacity-95">{word}</span>
                            ))}
                        </motion.h2>

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex items-center gap-3">
                            <div className="h-[1px] w-12 bg-white/20"></div>
                            <p className="text-zinc-400 text-[13px] font-bold tracking-tight">
                                <span className="text-orange-500 mr-1.5">🎧</span>
                                {categoryInfo?.subLabel || 'Collection'}
                            </p>
                        </motion.div>
                    </div>

                    {/* Decorative Scroll Hint or Element */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
                        <div className="w-[1px] h-10 bg-gradient-to-b from-white to-transparent"></div>
                    </div>
                </section>

                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-6 space-y-16">
                    {/* 📚 Books List Section */}
                    <section className="space-y-10">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black tracking-tight">추천 아카이뷰 <span className="text-orange-500 ml-1">{categoryBooks.length}</span></h3>
                        </div>

                        <div className="grid grid-cols-1 gap-10">
                            {categoryBooks.length === 0 ? (
                                <div className="text-center py-20 bg-zinc-900/40 rounded-2xl border border-white/5">
                                    <span className="material-symbols-outlined text-4xl text-zinc-700 mb-4">inventory_2</span>
                                    <p className="text-zinc-500 text-sm font-bold">아직 등록된 도서가 없습니다.</p>
                                </div>
                            ) : (
                                categoryBooks.map((book) => (
                                    <motion.article key={book.id} variants={itemVariants} className="glass-card rounded-xl p-6 flex flex-col gap-6">
                                        <div className="flex gap-6">
                                            {/* Smaller, refined book cover */}
                                            <div className="w-28 h-40 shrink-0 rounded-lg overflow-hidden shadow-2xl relative bg-zinc-800 border border-white/5">
                                                <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                                                {book.celebritySlug === 'archiview_original' && (
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500 text-[8px] font-black text-white shadow-lg">
                                                        ORIGINAL
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info Area */}
                                            <div className="flex flex-col justify-center flex-1 min-w-0">
                                                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1.5 opacity-80">{book.author || book.celebName}</span>
                                                <h4 className="text-[20px] font-black leading-tight text-white tracking-tight mb-3">『{book.title}』</h4>
                                                <p className="text-zinc-400 text-[13px] leading-relaxed font-medium line-clamp-3 opacity-90">
                                                    {cleanDescription(book.description || book.desc) || `${book.title}에 담긴 핵심 인사이트를 통해 일상의 문제를 해결하는 지혜를 얻어보세요.`}
                                                </p>
                                            </div>
                                        </div>

                                                                                <BookCardActions book={book} />
                                    </motion.article>
                                ))
                            )}
                        </div>
                    </section>

                    {/* 🔗 Related Collections */}
                    <section className="pb-10 border-t border-white/5 pt-16">
                        <div className="mb-10">
                            <h3 className="text-xl font-black mb-1">관련 컬렉션</h3>
                            <p className="text-zinc-500 text-[11px] font-bold tracking-widest uppercase">Other Discovery</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {otherCategories.map((other) => (
                                <Link
                                    key={other.id}
                                    to={`/category/${other.id}`}
                                    className="group relative flex items-center gap-5 p-5 rounded-2xl glass-card hover:bg-white/5 active:scale-[0.98] transition-all"
                                >
                                    <div className="size-16 rounded-xl overflow-hidden shrink-0">
                                        <img src={other.img} alt={other.label} className="w-full h-full object-cover grayscale-[40%] group-hover:grayscale-0 transition-all" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[9px] font-black text-orange-500/70 tracking-tighter uppercase opacity-80">{other.seq}</span>
                                            <span className="text-[14px] font-black text-white/90 truncate">{other.label}</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-500 font-bold truncate">{other.subLabel}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-white/20 group-hover:text-white/80 transition-colors">arrow_forward</span>
                                </Link>
                            ))}
                        </div>
                    </section>
                </motion.div>
            </main>

            {/* 📍 Bottom Navigation Fixed */}
            <nav className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center pb-8 pointer-events-none">
                <div className="flex items-center gap-8 px-8 py-4 glass-card rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-black/20 pointer-events-auto">
                    <Link to="/" className="text-zinc-600 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[24px]">home</span>
                    </Link>
                    <Link to="/editorial" className="text-orange-500">
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
                    </Link>
                    <Link to="/library" className="text-zinc-600 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[24px]">auto_stories</span>
                    </Link>
                    <Link to="/profile" className="text-zinc-600 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[24px]">person</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}

