import { useState, useEffect, useRef } from 'react';
import { celebrities } from '../data/celebrities';
import { Link, useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';
import { resultData } from '../data/resultData';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
    const { user } = useAuth();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [unlocked, setUnlocked] = useState(false);
    const [myResultType, setMyResultType] = useState(null);
    const [quizResult, setQuizResult] = useState(null);
    const navigate = useNavigate();
    const touchStart = useRef(0);
    const touchEnd = useRef(0);
    const autoPlayRef = useRef(null);

    useEffect(() => {
        const isUnlocked = localStorage.getItem('premiumUnlocked') === 'true';
        const type = localStorage.getItem('myResultType');
        const qResult = localStorage.getItem('quizResult');
        setUnlocked(isUnlocked);
        setMyResultType(type);
        setQuizResult(qResult);
    }, []);

    const result = myResultType ? resultData[myResultType] : null;
    const isTeaserVisible = user && unlocked && result;

    // Auto-play functionality
    useEffect(() => {
        startAutoPlay();
        return () => stopAutoPlay();
    }, [currentSlide]);

    const startAutoPlay = () => {
        stopAutoPlay(); // Clear existing timer
        autoPlayRef.current = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % 3);
        }, 5000); // 5 seconds interval
    };

    const stopAutoPlay = () => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
        }
    };

    // Touch handlers for swipe
    const handleTouchStart = (e) => {
        stopAutoPlay();
        touchStart.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;

        const distance = touchStart.current - touchEnd.current;
        const minSwipeDistance = 50;

        if (distance > minSwipeDistance) {
            // Swipe Left (Next)
            setCurrentSlide((prev) => (prev + 1) % 3);
        } else if (distance < -minSwipeDistance) {
            // Swipe Right (Prev)
            setCurrentSlide((prev) => (prev === 0 ? 2 : prev - 1));
        }

        // Reset
        touchStart.current = 0;
        touchEnd.current = 0;
        startAutoPlay();
    };
    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden min-h-screen pb-24 flex justify-center">
            {/* Main Layout Container: Everything constrained to max-w-lg */}
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5">
                <TopNavigation type="main" />

                <main className="pb-24 space-y-12">
                    {/* Hero Slider Section - Immersive */}
                    <section className="relative overflow-visible pt-0">
                        <div
                            className="flex transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1)"
                            style={{ transform: `translateX(calc(-${currentSlide * 100}%))` }}
                        >
                            {/* Slide 1: Bill Gates */}
                            <div className="flex-none w-full px-4"
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden group shadow-2xl border border-white/10">
                                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105" style={{ backgroundImage: 'url("/images/celebrities/bill-gates.jpg")' }}></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                                    <div className="absolute bottom-0 left-0 p-8 w-full">
                                        <span className="inline-block px-3 py-1 rounded-full border border-gold/30 bg-black/40 backdrop-blur-md text-gold text-[10px] font-bold uppercase tracking-widest mb-4">
                                            Archive Exclusive
                                        </span>
                                        <h2 className="serif-title text-white text-4xl leading-none mb-3">Bill Gates' <br /><span className="italic text-slate-400">Summer List</span></h2>
                                        <Link to="/celebrity/bill-gates" className="text-white text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-1 inline-flex items-center gap-2 hover:text-gold hover:border-gold transition-colors">
                                            Read Collection <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            {/* Slide 2: Elon Musk */}
                            <div className="flex-none w-full px-4"
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden group shadow-2xl border border-white/10">
                                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105" style={{ backgroundImage: 'url("/images/celebrities/elon-musk.jpg")' }}></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                                    <div className="absolute bottom-0 left-0 p-8 w-full">
                                        <span className="inline-block px-3 py-1 rounded-full border border-blue-400/30 bg-black/40 backdrop-blur-md text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                                            Visionary
                                        </span>
                                        <h2 className="serif-title text-white text-4xl leading-none mb-3">Elon Musk's <br /><span className="italic text-slate-400">Foundation</span></h2>
                                        <Link to="/celebrity/elon-musk" className="text-white text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-1 inline-flex items-center gap-2 hover:text-gold hover:border-gold transition-colors">
                                            Explore Books <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            {/* Slide 3: Barack Obama */}
                            <div className="flex-none w-full px-4"
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden group shadow-2xl border border-white/10">
                                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105" style={{ backgroundImage: 'url("/images/celebrities/barack-obama.jpg")' }}></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                                    <div className="absolute bottom-0 left-0 p-8 w-full">
                                        <span className="inline-block px-3 py-1 rounded-full border border-white/30 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest mb-4">
                                            Presidential Note
                                        </span>
                                        <h2 className="serif-title text-white text-4xl leading-none mb-3">Barack Obama's <br /><span className="italic text-slate-400">Perspectives</span></h2>
                                        <Link to="/celebrity/barack-obama" className="text-white text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-1 inline-flex items-center gap-2 hover:text-gold hover:border-gold transition-colors">
                                            View Reading List <span className="material-symbols-outlined text-sm">menu_book</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Indicators */}
                        <div className="flex justify-center gap-3 mt-6">
                            {[0, 1, 2].map((index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-1 transition-all duration-500 rounded-full ${currentSlide === index ? 'w-8 bg-gold' : 'w-2 bg-white/20'}`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Celebrity List - Expanded to 8 */}
                    <section className="px-6">
                        <div className="flex items-end justify-between mb-8 border-b border-white/10 pb-4">
                            <div>
                                <h2 className="serif-title text-2xl text-white">Curated Minds</h2>
                                <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">Intellectual Archives</p>
                            </div>
                            <Link to="/celebrity/bill-gates" className="text-[10px] font-bold text-gold uppercase tracking-widest hover:text-white transition-colors">View All</Link>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                            {celebrities.slice(0, 8).map((celeb) => (
                                <Link key={celeb.id} to={`/celebrity/${celeb.id}`} className="group relative block">
                                    <div className="aspect-[3/4] rounded-xl overflow-hidden mb-3 relative shadow-lg">
                                        <img src={celeb.image} alt={celeb.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                                        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors"></div>
                                    </div>
                                    <h3 className="text-white font-medium text-lg leading-none group-hover:text-gold transition-colors">{celeb.name}</h3>
                                    <p className="text-slate-500 text-xs mt-1 truncate italic">{celeb.readingNow}</p>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Quiz Banner - Refined */}
                    <section className="px-4">
                        {isTeaserVisible ? (
                            <div
                                onClick={() => navigate('/result', { state: { resultType: myResultType } })}
                                className="relative rounded-3xl overflow-hidden border border-gold/30 bg-gradient-to-br from-slate-900 via-slate-800 to-black p-1 group cursor-pointer shadow-2xl"
                            >
                                <div className="relative bg-background-dark/40 backdrop-blur-xl rounded-[22px] p-6 flex items-center gap-6">
                                    <div className="relative size-24 shrink-0">
                                        <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full"></div>
                                        <img src={result.image} alt={result.persona} className="relative w-full h-full object-cover rounded-2xl shadow-xl border border-gold/30" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <span className="text-gold text-[10px] font-bold uppercase tracking-widest block mb-1">My Persona</span>
                                        <h3 className="serif-title text-white text-2xl font-bold leading-none mb-2 tracking-tight">{result.persona}</h3>
                                        <p className="text-slate-400 text-[11px] font-medium truncate mb-4">{result.subtitle}</p>
                                        <div className="flex gap-2">
                                            {Object.entries(result.metrics).slice(0, 2).map(([key, m]) => (
                                                <div key={key} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 flex flex-col items-center min-w-[64px]">
                                                    <span className="text-slate-500 text-[7px] uppercase block leading-none mb-1">{m.label}</span>
                                                    <span className="text-gold text-[10px] font-extrabold">{m.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-gold opacity-30 group-hover:opacity-100 transition-opacity">chevron_right</span>
                                </div>
                            </div>
                        ) : (
                            <div className="relative rounded-2xl overflow-hidden border border-white/10 group">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000"></div>
                                <div className="absolute inset-0 bg-background-dark/80"></div>

                                <div className="relative p-8 text-center flex flex-col items-center">
                                    <span className="material-symbols-outlined text-gold text-4xl mb-4">psychology_alt</span>
                                    <h3 className="serif-title text-white text-2xl mb-2">Find Your Persona</h3>
                                    <p className="text-slate-400 text-sm font-light mb-6 max-w-xs leading-relaxed">
                                        Take our literary personality test to discover the books that resonate with your soul.
                                    </p>
                                    {quizResult ? (
                                        <button
                                            onClick={() => navigate('/result', { state: { resultType: quizResult } })}
                                            className="px-8 py-3 bg-white text-primary font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-gold transition-colors flex items-center gap-2"
                                        >
                                            View Analysis Result <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </button>
                                    ) : (
                                        <Link to="/quiz" className="px-8 py-3 bg-gold text-primary font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-white transition-colors">
                                            Start Diagnostics
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Bestsellers / Recommended - 3x3 Grid */}
                    <section className="px-6">
                        <div className="flex items-end justify-between mb-6">
                            <h2 className="serif-title text-xl text-white italic">Essential Reading</h2>
                        </div>

                        <div className="grid grid-cols-3 gap-x-3 gap-y-6">
                            {[
                                { title: "사피엔스", author: "유발 하라리", cover: "/images/covers/sapiens.jpg", celebId: "bill-gates" },
                                { title: "데미안", author: "헤르만 헤세", cover: "/images/covers/demian.jpg", celebId: "rm-bts" },
                                { title: "채식주의자", author: "한강", cover: "/images/covers/vegetarian.jpg", celebId: "han-kang" },
                                { title: "1984", author: "조지 오웰", cover: "/images/covers/1984.jpg", celebId: "rm-bts" },
                                { title: "팩트풀니스", author: "한스 로슬링", cover: "/images/covers/factfulness.jpg", celebId: "bill-gates" },
                                { title: "아몬드", author: "손원평", cover: "/images/covers/almond.jpg", celebId: "rm-bts" },
                                { title: "소년이 온다", author: "한강", cover: "/images/covers/human_acts.jpg", celebId: "han-kang" },
                                { title: "슈독", author: "필 나이트", cover: "/images/covers/c_02.jpg", celebId: "tim-cook" },
                                { title: "위대한 개츠비", author: "F. 스콧 피츠제럴드", cover: "/images/covers/m_01.jpg", celebId: "haruki-murakami" }
                            ].map((book, idx) => (
                                <Link key={idx} to={`/celebrity/${book.celebId}`} className="group block cursor-pointer">
                                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 mb-3 border border-white/10 shadow-2xl relative">
                                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150x225?text=No+Cover'; }}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                                            <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                                <span className="bg-gold text-primary text-[9px] font-black px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1 uppercase tracking-tighter">
                                                    Read Review <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className="text-white text-[11px] font-bold truncate leading-tight mb-0.5">{book.title}</h4>
                                    <p className="text-slate-500 text-[9px] uppercase tracking-wider truncate font-medium">{book.author}</p>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Brand Message Section */}
                    <section className="px-8 pt-16 pb-12 text-center border-t border-white/5">
                        <h2 className="serif-title text-2xl text-white mb-4 tracking-tight">아카이드: 생각의 시간</h2>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto font-light mb-10">
                            "책을 기록하는 '아카이드'의 공간에서,<br />
                            오롯이 나만의 '생각의 시간'을 갖는다"
                        </p>

                        {/* Information Links */}
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 pt-8 border-t border-white/5">
                            <Link to="/about" className="text-[10px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">About</Link>
                            <Link to="/contact" className="text-[10px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">Contact</Link>
                            <Link to="/privacy" className="text-[10px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">Privacy Policy</Link>
                        </div>
                        <p className="mt-8 text-[9px] text-slate-600 uppercase tracking-widest">&© 2026 ARCHIDE. ALL RIGHTS RESERVED.</p>
                    </section>
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
