import React from 'react';
import { Link } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';

export default function Editorial() {
    const handlePurchase = (item, price) => {
        alert(`[PG_LINK] Processing purchase for ${item} - ${price}`);
    };

    const weeklyPicks = [
        {
            id: 1,
            title: "침묵의 건축",
            subtitle: "고요함에 대한 깊은 명상",
            author: "엘레나 손",
            price: "24,000",
            image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop",
            tag: "ESSAY"
        },
        {
            id: 2,
            title: "네온 노스탤지어",
            subtitle: "도시의 밤과 기억",
            author: "J. Marcis",
            price: "18,000",
            image: "https://images.unsplash.com/photo-1516414447565-b14be0afa13e?q=80&w=800&auto=format&fit=crop",
            tag: "PHOTO"
        },
        {
            id: 3,
            title: "벨벳 어스",
            subtitle: "질감으로 읽는 자연",
            author: "R. K. Singh",
            price: "22,000",
            image: "https://images.unsplash.com/photo-1510172951991-856166f70bf7?q=80&w=800&auto=format&fit=crop",
            tag: "ART"
        },
        {
            id: 4,
            title: "아카이브 레지스터",
            subtitle: "기록의 예술을 위한 노트",
            author: "Archide Studio",
            price: "15,000",
            image: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=800&auto=format&fit=crop",
            tag: "STATIONERY"
        },
        {
            id: 5,
            title: "미드나잇 브루어",
            subtitle: "독서를 위한 심야의 차",
            author: "Tea Master",
            price: "32,000",
            image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop",
            tag: "LIFESTYLE"
        }
    ];

    const bestReviews = [
        { title: "사피엔스", author: "유발 하라리", cover: "/images/covers/sapiens.jpg", celebId: "bill-gates", rating: "5.0" },
        { title: "1984", author: "조지 오웰", cover: "/images/covers/1984.jpg", celebId: "rm-bts", rating: "4.9" },
        { title: "채식주의자", author: "한강", cover: "/images/covers/vegetarian.jpg", celebId: "han-kang", rating: "5.0" },
        { title: "위대한 개츠비", author: "F. 스콧 피츠제럴드", cover: "/images/covers/m_01.jpg", celebId: "haruki-murakami", rating: "4.8" },
        { title: "팩트풀니스", author: "한스 로슬링", cover: "/images/covers/factfulness.jpg", celebId: "bill-gates", rating: "4.9" }
    ];

    return (
        <div className="bg-white text-slate-900 dark:text-white min-h-screen pb-24 font-display flex justify-center">
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5">
                <TopNavigation title="에디토리얼" type="sub" />

                <main className="px-6 pt-16 pb-24 space-y-12">
                    {/* Header Section */}
                    <header className="space-y-2">
                        <span className="text-gold text-[9px] font-black uppercase tracking-[0.2em] block">Editorial Picks</span>
                        <h2 className="serif-title text-3xl text-white font-light leading-snug">
                            지적인 한 주를 위한 <br />
                            <span className="italic text-slate-400">Archide Curation</span>
                        </h2>
                    </header>

                    {/* Weekly Focus Review - Redesigned for Premium Minimalist Aesthetic */}
                    <div className="relative w-full rounded-[32px] overflow-hidden bg-[#0f1115] border border-white/5 shadow-2xl group">
                        {/* Abstract Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 blur-[80px] rounded-full -ml-10 -mb-10"></div>

                        <div className="relative p-8 flex flex-col items-center">
                            {/* Focus Tag */}
                            <div className="flex items-center gap-2 mb-8">
                                <span className="h-[1px] w-4 bg-gold/50"></span>
                                <span className="text-gold text-[10px] font-black uppercase tracking-[0.4em]">Weekly Focus</span>
                                <span className="h-[1px] w-4 bg-gold/50"></span>
                            </div>

                            {/* Main Content Layout */}
                            <div className="w-full flex flex-col md:flex-row gap-8 items-center mb-10">
                                {/* Floating Book Cover with depth */}
                                <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-700">
                                    <div className="absolute -inset-4 bg-black/40 blur-2xl rounded-full opacity-60"></div>
                                    <div className="relative w-40 aspect-[2/3] rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
                                        <img src="/images/covers/sapiens.jpg" alt="Sapiens" className="w-full h-full object-cover" />
                                    </div>
                                    {/* Decorative badge */}
                                    <div className="absolute -bottom-2 -right-2 size-12 bg-gold flex items-center justify-center rounded-full shadow-lg border-4 border-[#0f1115]">
                                        <span className="material-symbols-outlined text-primary text-xl font-bold">star_rate</span>
                                    </div>
                                </div>

                                {/* Typography Section */}
                                <div className="flex-1 text-center md:text-left space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="serif-title text-3xl text-white font-medium leading-tight">사피엔스</h3>
                                        <p className="text-slate-500 text-sm font-light uppercase tracking-widest italic">Yuval Noah Harari</p>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-slate-400 text-xs font-light leading-relaxed">
                                            "변화하는 인류의 운명을 결정짓는 <br />거대한 질문들을 던지다"
                                        </p>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                            <span className="text-[9px] text-white/40 border border-white/10 px-2 py-0.5 rounded-md uppercase tracking-tighter">History</span>
                                            <span className="text-[9px] text-white/40 border border-white/10 px-2 py-0.5 rounded-md uppercase tracking-tighter">Philosophy</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Refined CTA Button */}
                            <Link
                                to="/review/sapiens"
                                className="w-full group/btn relative py-5 bg-transparent overflow-hidden rounded-2xl border border-white/10 flex items-center justify-center gap-3 transition-all duration-300 hover:border-gold/50"
                            >
                                <div className="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-[0.03] transition-opacity"></div>
                                <span className="text-white text-xs font-bold uppercase tracking-[0.2em] relative z-10 transition-colors group-hover/btn:text-gold">Review Detail</span>
                                <span className="material-symbols-outlined text-white/30 text-sm relative z-10 group-hover/btn:text-gold group-hover/btn:translate-x-1 transition-all">arrow_forward</span>
                            </Link>
                        </div>
                    </div>

                    {/* Section 1: Weekly Picks (5 Items - Reviews Only) */}
                    <section className="space-y-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <span className="text-white text-xl font-bold serif-title italic">Editors' Picks</span>
                            <span className="text-gold text-[10px] font-bold uppercase tracking-widest">Review Collection</span>
                        </div>

                        <div className="space-y-6">
                            {[
                                { id: "1984", title: "1984", subtitle: "감시 사회에 대한 소름 끼치는 예언", author: "조지 오웰", image: "/images/covers/1984.jpg", tag: "CLASSIC" },
                                { id: "demian", title: "데미안", subtitle: "내면의 성장을 향한 투쟁", author: "헤르만 헤세", image: "/images/covers/demian.jpg", tag: "PHILOSOPHY" },
                                { id: "vegetarian", title: "채식주의자", subtitle: "인간 본성에 대한 고통스러운 질문", author: "한강", image: "/images/covers/vegetarian.jpg", tag: "NOBEL" },
                                { id: "factfulness", title: "팩트풀니스", subtitle: "막연한 두려움을 이기는 데이터의 힘", author: "한스 로슬링", image: "/images/covers/factfulness.jpg", tag: "SOCIETY" },
                                { id: "almond", title: "아몬드", subtitle: "감정을 느끼지 못하는 소년의 성장기", author: "손원평", image: "/images/covers/almond.jpg", tag: "K-NOVEL" }
                            ].map((item) => (
                                <div key={item.id} className="flex gap-5 group">
                                    <div className="w-24 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 border border-white/10 relative shadow-xl">
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110" />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <span className="text-[8px] text-gold font-black uppercase tracking-widest bg-gold/10 px-2 py-0.5 rounded-full mb-2 inline-block border border-gold/20">{item.tag}</span>
                                            <h4 className="text-white font-bold text-lg leading-tight mb-1">{item.title}</h4>
                                            <p className="text-slate-500 text-xs font-light">{item.subtitle}</p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Link
                                                to={`/review/${item.id}`}
                                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-gold hover:text-primary hover:border-gold transition-all active:scale-95">
                                                리뷰 보기
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Section 2: Best Reviews (5 Items) */}
                    <section className="space-y-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <span className="text-white text-xl font-bold serif-title italic">Best Reviews</span>
                            <span className="text-gold text-[10px] font-bold uppercase tracking-widest">Top Rated</span>
                        </div>

                        <div className="space-y-4">
                            {bestReviews.map((book, idx) => (
                                <Link
                                    key={idx}
                                    to={`/review/${book.title === "사피엔스" ? "sapiens" : book.title === "1984" ? "1984" : "sapiens"}`}
                                    className="flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                                >
                                    <div className="size-16 rounded-xl overflow-hidden shrink-0 shadow-lg border border-white/10">
                                        <img src={book.cover} alt={book.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex text-gold">
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i} className="material-symbols-outlined text-[10px] fill-gold">star</span>
                                                ))}
                                            </div>
                                            <span className="text-gold text-[10px] font-bold">{book.rating}</span>
                                        </div>
                                        <h4 className="text-white font-bold text-sm truncate">{book.title}</h4>
                                        <p className="text-slate-500 text-[10px] uppercase tracking-wider truncate uppercase">{book.author}</p>
                                    </div>
                                    <div className="size-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-gold transition-colors">
                                        <span className="material-symbols-outlined text-white group-hover:text-primary text-sm transition-colors">arrow_forward</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* Brand Footer Info */}
                    <div className="py-12 border-t border-white/5 text-center px-4">
                        <p className="text-slate-500 text-[10px] font-light leading-relaxed">
                            아카이드 에디토리얼은 단순한 유행을 넘어 <br />
                            삶의 본질을 탐구하는 지적인 큐레이션을 지향합니다.
                        </p>
                    </div>
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
