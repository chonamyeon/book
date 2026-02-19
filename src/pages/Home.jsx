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
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen rounded-t-[40px] overflow-hidden border-t border-white/5">
                <TopNavigation type="main" />

                <main className="pb-24">
                    {/* Hero Slider Section */}
                    <section className="relative overflow-hidden">
                        <div
                            className="flex transition-transform duration-500 ease-out"
                            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            {/* Slide 1: Bill Gates */}
                            <div className="flex-none w-full px-4 pt-4">
                                <div className="relative h-[420px] w-full rounded-xl overflow-hidden group border border-white/10">
                                    <div className="absolute inset-0 bg-cover bg-center grayscale contrast-125" style={{ backgroundImage: 'url("/images/celebrities/bill-gates.jpg")' }}></div>
                                    <div className="absolute inset-0 navy-gradient opacity-80 group-hover:opacity-60 transition-opacity duration-700"></div>
                                    <div className="absolute bottom-0 left-0 p-6 w-full">
                                        <span className="text-gold text-xs font-bold uppercase tracking-[0.2em] mb-2 block">독점 공개</span>
                                        <h2 className="serif-title text-white text-3xl font-bold leading-tight mb-3">게이츠 컬렉션</h2>
                                        <p className="text-slate-300 text-sm font-light leading-relaxed mb-4 max-w-[280px]">거장의 서재 속으로 들어가 보세요. 시대를 바꾼 기록들을 만나보실 수 있습니다.</p>
                                        <Link to="/celebrity/bill-gates" className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-gold text-gold text-xs font-bold hover:bg-gold hover:text-primary transition-colors">
                                            <span>지금 둘러보기</span>
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            {/* Slide 2: Elon Musk */}
                            <div className="flex-none w-full px-4 pt-4">
                                <div className="relative h-[420px] w-full rounded-xl overflow-hidden group border border-white/10">
                                    <div className="absolute inset-0 bg-cover bg-center grayscale contrast-125" style={{ backgroundImage: 'url("/images/celebrities/elon-musk.jpg")' }}></div>
                                    <div className="absolute inset-0 navy-gradient opacity-80 group-hover:opacity-60 transition-opacity duration-700"></div>
                                    <div className="absolute bottom-0 left-0 p-6 w-full">
                                        <span className="text-gold text-xs font-bold uppercase tracking-[0.2em] mb-2 block">Visionary</span>
                                        <h2 className="serif-title text-white text-3xl font-bold leading-tight mb-3">미래를 설계하다</h2>
                                        <p className="text-slate-300 text-sm font-light leading-relaxed mb-4">SF적 상상력을 현실로 만든 일론 머스크의 영감의 원천.</p>
                                        <Link to="/celebrity/elon-musk" className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-gold text-gold text-xs font-bold hover:bg-gold hover:text-primary transition-colors">
                                            <span>서재 탐험하기</span>
                                            <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            {/* Slide 3: Barack Obama */}
                            <div className="flex-none w-full px-4 pt-4">
                                <div className="relative h-[420px] w-full rounded-xl overflow-hidden group border border-white/10">
                                    <div className="absolute inset-0 bg-cover bg-center grayscale contrast-125" style={{ backgroundImage: 'url("/images/celebrities/barack-obama.jpg")' }}></div>
                                    <div className="absolute inset-0 navy-gradient opacity-80 group-hover:opacity-60 transition-opacity duration-700"></div>
                                    <div className="absolute bottom-0 left-0 p-6 w-full">
                                        <span className="text-gold text-xs font-bold uppercase tracking-[0.2em] mb-2 block">Presidential Note</span>
                                        <h2 className="serif-title text-white text-3xl font-bold leading-tight mb-3">기록하는 리더십</h2>
                                        <p className="text-slate-300 text-sm font-light leading-relaxed mb-4">백악관의 독서가, 오바마가 추천하는 시대를 읽는 안목.</p>
                                        <Link to="/celebrity/barack-obama" className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-gold text-gold text-xs font-bold hover:bg-gold hover:text-primary transition-colors">
                                            <span>리스트 보기</span>
                                            <span className="material-symbols-outlined text-sm">menu_book</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Slider Dots */}
                        <div className="flex justify-center gap-2 mt-4 z-10 relative">
                            {[0, 1, 2].map((index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === index ? 'w-6 bg-gold' : 'w-1.5 bg-slate-700 hover:bg-slate-500'}`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Celebrity Grid Section */}
                    <section className="mt-10 px-4">
                        <div className="flex items-end justify-between mb-6">
                            <div>
                                <h2 className="serif-title text-white text-2xl font-bold italic">우리를 만든 생각들</h2>
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mt-1">명사들과 그들의 서재</p>
                            </div>
                            <Link to="/celebrity/bill-gates" className="text-gold text-xs font-bold flex items-center gap-1 border-b border-gold/30 pb-1">단독 인터뷰 <span className="material-symbols-outlined text-sm">arrow_forward</span></Link>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {celebrities.slice(0, 20).map((celeb) => (
                                <Link key={celeb.id} to={`/celebrity/${celeb.id}`} className="flex flex-col gap-3 group">
                                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/5">
                                        <img
                                            src={celeb.image}
                                            alt={celeb.name}
                                            className="absolute inset-0 w-full h-full object-cover object-top grayscale hover:grayscale-0 transition-all duration-500"
                                            onError={(e) => {
                                                e.target.onerror = null; // Prevent infinite loop
                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(celeb.name)}&background=random&color=fff&size=800`;
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-all"></div>
                                        <div className="absolute bottom-3 left-3 right-3">
                                            <div className="bg-primary/80 backdrop-blur-md p-3 rounded-lg border border-gold/20">
                                                <p className="text-white text-sm font-bold truncate">{celeb.name}</p>
                                                <p className="text-gold text-[10px] font-medium leading-tight mt-0.5">읽는 중: "{celeb.readingNow}"</p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Interactive Banner */}
                    <section className="mt-12 px-4">
                        <div className="rounded-2xl p-8 relative overflow-hidden flex flex-col items-center text-center shadow-2xl shadow-black/50 group">
                            {/* Background Image */}
                            <div className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-110" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1000&auto=format&fit=crop")' }}></div>
                            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors duration-500"></div>

                            {/* Content */}
                            <div className="relative z-10 w-full flex flex-col items-center">
                                <span className="material-symbols-outlined text-gold text-5xl mb-4">psychology</span>
                                <h3 className="serif-title text-white text-[26px] font-bold leading-tight mb-2">당신의 지적 취향을 발견하세요</h3>
                                <p className="text-slate-200 text-base font-medium mb-6 max-w-[260px]">나에게 맞는 책 찾기 테스트를 통해 당신만의 개인 아카이브를 완성하세요.</p>
                                <Link to="/quiz" className="bg-gold text-primary w-full py-4 rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-white hover:text-primary">
                                    테스트 시작하기 <span className="material-symbols-outlined text-base">auto_awesome</span>
                                </Link>
                            </div>
                        </div>
                    </section>

                    {/* Featured Shelf */}
                    <section className="mt-12 pl-4 overflow-hidden">
                        <h2 className="serif-title text-white text-xl font-bold italic mb-4">인사들의 공통 추천 도서</h2>
                        <div className="grid grid-cols-3 gap-4 pr-4 pb-4">
                            {[
                                { title: "사피엔스", author: "유발 하라리", cover: "/images/covers/sapiens.jpg" },
                                { title: "1984", author: "조지 오웰", cover: "/images/covers/1984.jpg" },
                                { title: "호밀밭의 파수꾼", author: "J.D. 샐린저", cover: "/images/covers/catcher_in_the_rye.jpg" },
                                { title: "연금술사", author: "파울로 코엘료", cover: "/images/covers/alchemist.jpg" },
                                { title: "앵무새 죽이기", author: "하퍼 리", cover: "/images/covers/c_01.jpg" }, // Tim Cook cover
                                { title: "우리 본성의 선한 천사", author: "스티븐 핑커", cover: "/images/covers/ju_02.jpg" },
                                { title: "데미안", author: "헤르만 헤세", cover: "/images/covers/demian.jpg" },
                                { title: "채식주의자", author: "한강", cover: "/images/covers/vegetarian.jpg" },
                                { title: "인간 실격", author: "다자이 오사무", cover: "/images/covers/i_01.jpg" }
                            ].map((book, idx) => (
                                <a key={idx} href={`https://www.coupang.com/np/search?component=&q=${encodeURIComponent(book.title)}`} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity group">
                                    <div className="relative aspect-[2/3] bg-primary rounded-lg shadow-xl overflow-hidden mb-2 border border-white/5">
                                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                                    </div>
                                    <p className="text-white text-xs font-bold truncate">{book.title}</p>
                                    <p className="text-slate-500 text-[10px]">{book.author}</p>
                                </a>
                            ))}
                        </div>
                    </section>
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
