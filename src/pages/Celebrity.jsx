import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { celebrities } from '../data/celebrities';
import BottomNavigation from '../components/BottomNavigation';
import TopNavigation from '../components/TopNavigation';
import Footer from '../components/Footer';

export default function Celebrity() {
    const { id } = useParams();
    const celeb = celebrities.find(c => c.id === id) || celebrities[0]; // Default to first if not found

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    return (
        <div className="bg-white text-slate-900 dark:text-slate-100 antialiased font-display min-h-screen pb-24 flex justify-center">
            {/* Main Layout Container: Everything constrained to max-w-lg */}
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5">
                <TopNavigation title="에디토리얼 시리즈" type="sub" />

                <main className="pb-24">
                    {/* Hero Section: Block-style Portrait to match Header width */}
                    <section className="px-4 pt-2 overflow-hidden">
                        <div className="relative w-full h-[70vh] md:h-[80vh] flex flex-col justify-end overflow-hidden rounded-2xl shadow-xl">
                            {/* Background Portrait */}
                            <div className="absolute inset-0 z-0">
                                <img
                                    className="w-full h-full object-cover grayscale brightness-90 contrast-[1.15]"
                                    src={celeb.image}
                                    alt={celeb.name}
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
                    <section className="bg-background-dark px-6 py-12 md:py-20 border-b border-primary/20">
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

                            {/* Bottom Stats Grid: Forced 3-column layout to prevent overflow */}
                            <div className="grid grid-cols-3 gap-4 md:gap-24 pb-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-gold text-2xl md:text-3xl font-bold tracking-tight">{celeb.stats.books}</span>
                                    <span className="text-[11px] md:text-base text-slate-400 font-medium whitespace-nowrap">보유 도서</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-gold text-2xl md:text-3xl font-bold tracking-tight">{celeb.stats.categories}</span>
                                    <span className="text-[11px] md:text-base text-slate-400 font-medium whitespace-nowrap">카테고리</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-gold text-2xl md:text-3xl font-bold tracking-tight">{celeb.stats.time}</span>
                                    <span className="text-[11px] md:text-base text-slate-400 font-medium whitespace-nowrap">평균독서시간</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Discover Your Taste Banner */}
                    <section className="px-4 py-8">
                        <Link to="/quiz" className="block group">
                            <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                                <img
                                    src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1000&auto=format&fit=crop"
                                    alt="Library Background"
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-6 text-center">
                                    <div className="size-12 rounded-full bg-gold/20 flex items-center justify-center border border-gold/40 mb-4">
                                        <span className="material-symbols-outlined text-gold">psychology</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 leading-tight">당신의 지적 취향을 발견하세요</h3>
                                    <p className="text-slate-300 text-[11px] leading-relaxed max-w-[200px] mb-6">
                                        나에게 맞는 책 찾기 테스트를 통해 당신만의 개인 아카이브를 완성하세요.
                                    </p>
                                    <div className="px-8 py-3 bg-gold text-primary font-black rounded-xl text-xs shadow-lg shadow-gold/20 active:scale-95 transition-transform flex items-center gap-2">
                                        <span>테스트 시작하기</span>
                                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </section>

                    {/* Curated Categories */}

                    <section className="px-4 py-12 space-y-16">
                        {/* Category: Pivot */}
                        <div>
                            <div className="flex items-center justify-between mb-8 border-b border-primary/30 pb-4">
                                <h4 className="text-2xl font-light tracking-tight"><span className="text-accent mr-2">01.</span>인생의 책들</h4>
                                <span className="text-[10px] uppercase tracking-widest text-slate-500">추천 도서</span>
                            </div>
                            <div className="flex flex-col gap-12">
                                {celeb.books.map((book, index) => (
                                    <div key={index} className="flex flex-col gap-6 group">
                                        <div className="flex gap-6">
                                            <a
                                                href={`https://www.coupang.com/np/search?component=&q=${encodeURIComponent(book.title)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-1/3 shrink-0 active:scale-95 transition-transform"
                                            >
                                                <div className="aspect-[2/3] bg-primary/20 rounded shadow-2xl overflow-hidden border border-white/5 relative group/cover">
                                                    <img
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-110"
                                                        src={book.cover}
                                                        alt={book.title}
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-white opacity-0 group-hover/cover:opacity-100 transition-opacity">shopping_cart</span>
                                                    </div>
                                                </div>
                                            </a>
                                            <div className="flex flex-col justify-between py-1 w-full">
                                                <div>
                                                    <h5 className="text-xl font-bold leading-tight mb-1 text-white">{book.title}</h5>
                                                    <p className="text-xs text-slate-500 mb-3 italic">{book.author}</p>
                                                    <p className="text-sm text-slate-400 font-light leading-snug line-clamp-3">{book.desc}</p>
                                                    {book.source && (
                                                        <p className="text-[10px] text-gold/80 mt-3 flex items-center gap-1 font-bold tracking-wider uppercase">
                                                            <span className="material-symbols-outlined text-[12px]">campaign</span>
                                                            {book.source}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="mt-4">
                                                    <span className="text-white font-black text-xl">{book.price}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Detailed Review Section for AdSense */}
                                        {book.review && (
                                            <div className="bg-white/5 rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-gold/50"></div>
                                                <h6 className="text-gold text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm">edit_note</span>
                                                    Insight & Review
                                                </h6>
                                                <p className="text-slate-300 text-sm leading-relaxed font-light whitespace-pre-wrap">
                                                    {book.review}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <a href={`https://www.coupang.com/np/search?component=&q=${encodeURIComponent(book.title)}`} target="_blank" rel="noopener noreferrer" className="bg-gold hover:bg-gold-light text-primary flex-1 text-center py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-gold/10 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                <span>쿠팡 최저가 구매</span>
                                                <span className="material-symbols-outlined text-sm">shopping_cart</span>
                                            </a>
                                            <button
                                                onClick={() => {
                                                    const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
                                                    const isSaved = saved.some(b => b.title === book.title);
                                                    if (isSaved) {
                                                        const filtered = saved.filter(b => b.title !== book.title);
                                                        localStorage.setItem('savedBooks', JSON.stringify(filtered));
                                                        alert('서재에서 삭제되었습니다.');
                                                    } else {
                                                        saved.push(book);
                                                        localStorage.setItem('savedBooks', JSON.stringify(saved));
                                                        alert('서재에 추가되었습니다.');
                                                    }
                                                    window.dispatchEvent(new Event('storage'));
                                                }}
                                                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 flex-1 text-center py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <span>서재에 담기</span>
                                                <span className="material-symbols-outlined text-sm">bookmark</span>
                                            </button>
                                        </div>
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
                                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 p-1 transition-colors duration-500 ${c.id === celeb.id ? 'border-accent shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'border-primary/30 group-hover:border-accent'}`}>
                                        <img className={`w-full h-full object-cover rounded-full transition-all duration-700 ${c.id === celeb.id ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`} src={c.image} alt={c.name} />
                                    </div>
                                    <div className="text-center">
                                        <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest block transition-colors duration-300 ${c.id === celeb.id ? 'text-accent' : 'text-slate-500 group-hover:text-slate-200'}`}>{c.name}</span>
                                        {c.id === celeb.id && <div className="w-4 h-[2px] bg-accent mx-auto mt-1 rounded-full"></div>}
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
