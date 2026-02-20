import { useState, useEffect, useRef } from 'react';
import { celebrities } from '../data/celebrities';
import { Link } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';

export default function Home() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const touchStart = useRef(0);
    const touchEnd = useRef(0);
    const autoPlayRef = useRef(null);

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

                <main className="pb-24 space-y-16">
                    {/* Hero Slider Section - Immersive */}
                    <section className="relative overflow-visible pt-4">
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

                    {/* Celebrity List - Minimal */}
                    <section className="px-6">
                        <div className="flex items-end justify-between mb-8 border-b border-white/10 pb-4">
                            <div>
                                <h2 className="serif-title text-2xl text-white">Curated Minds</h2>
                                <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">Intellectual Archives</p>
                            </div>
                            <Link to="/celebrity/bill-gates" className="text-[10px] font-bold text-gold uppercase tracking-widest hover:text-white transition-colors">View All</Link>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                            {celebrities.slice(0, 4).map((celeb) => (
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
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 group">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000"></div>
                            <div className="absolute inset-0 bg-background-dark/80"></div>

                            <div className="relative p-8 text-center flex flex-col items-center">
                                <span className="material-symbols-outlined text-gold text-4xl mb-4">psychology_alt</span>
                                <h3 className="serif-title text-white text-2xl mb-2">Find Your Persona</h3>
                                <p className="text-slate-400 text-sm font-light mb-6 max-w-xs leading-relaxed">
                                    Take our literary personality test to discover the books that resonate with your soul.
                                </p>
                                <Link to="/quiz" className="px-8 py-3 bg-gold text-primary font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-white transition-colors">
                                    Start Diagnostics
                                </Link>
                            </div>
                        </div>
                    </section>

                    {/* Bestsellers / Recommended */}
                    <section className="px-6">
                        <div className="flex items-end justify-between mb-6">
                            <h2 className="serif-title text-xl text-white italic">Essential Reading</h2>
                        </div>

                        <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x">
                            {[
                                { title: "Sapiens", author: "Yuval Noah Harari", cover: "/images/covers/sapiens.jpg" },
                                { title: "1984", author: "George Orwell", cover: "/images/covers/1984.jpg" },
                                { title: "Demian", author: "Hermann Hesse", cover: "/images/covers/demian.jpg" },
                                { title: "Cosmos", author: "Carl Sagan", cover: "/images/covers/c_01.jpg" },
                                { title: "The Great Gatsby", author: "F. Scott Fitzgerald", cover: "/images/covers/gatsby.jpg" }
                            ].map((book, idx) => (
                                <Link key={idx} to="#" className="snap-start shrink-0 w-32 group block">
                                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-white/5 mb-3 border border-white/10 shadow-lg relative">
                                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150x225?text=No+Cover'; }}
                                        />
                                    </div>
                                    <h4 className="text-white text-sm font-bold truncate">{book.title}</h4>
                                    <p className="text-slate-500 text-[10px] uppercase tracking-wide truncate">{book.author}</p>
                                </Link>
                            ))}
                        </div>
                    </section>
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
