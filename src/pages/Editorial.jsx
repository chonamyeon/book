import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import { celebrities } from '../data/celebrities';
import { useAudio } from '../contexts/AudioContext';

import { bookScripts } from '../data/bookScripts';

export default function Editorial() {
    const { isSpeaking, activeAudioId, playPodcast, speakReview, stopAll } = useAudio();

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
        alert('서재에 보관되었습니다.');
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

    const bestReviews = [
        { title: "사피엔스", author: "유발 하라리", cover: "/images/covers/sapiens.jpg", celebId: "bill-gates", rating: "5.0" },
        { title: "1984", author: "조지 오웰", cover: "/images/covers/1984.jpg", celebId: "rm-bts", rating: "4.9" },
        { title: "채식주의자", author: "한강", cover: "/images/covers/vegetarian.jpg", celebId: "han-kang", rating: "5.0" },
        { title: "위대한 개츠비", author: "F. 스콧 피츠제럴드", cover: "/images/covers/m_01.jpg", celebId: "haruki-murakami", rating: "4.8" },
        { title: "팩트풀니스", author: "한스 로슬링", cover: "/images/covers/factfulness.jpg", celebId: "bill-gates", rating: "4.9" }
    ];

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
                            <span className="text-[8px] text-white/20 ml-2">v9.0-UltimateNatural</span>
                        </h2>
                    </header>

                    {/* Weekly Focus - Sapiens */}
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
                                        <img src="/images/covers/sapiens.jpg" alt="Sapiens" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 size-12 bg-gold flex items-center justify-center rounded-full shadow-lg border-4 border-[#0f1115]">
                                        <span className="material-symbols-outlined text-primary text-xl font-bold">star_rate</span>
                                    </div>
                                </div>
                                <div className="flex-1 text-center md:text-left space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="serif-title text-2xl md:text-3xl text-white font-medium leading-tight">사피엔스</h3>
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
                            <div className="w-full flex gap-3">
                                <Link to="/review/sapiens" className="flex-1 group/btn relative h-14 bg-white/5 backdrop-blur-xl overflow-hidden rounded-2xl border border-white/10 flex items-center justify-center transition-all duration-500 hover:border-white/30 hover:bg-white/10 hover:-translate-y-1 shadow-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                                    <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] relative z-10 transition-colors group-hover/btn:text-white whitespace-nowrap">Review Detail</span>
                                </Link>
                                <button
                                    onClick={() => activeAudioId === 'weekly-sapiens' ? stopAll() : playPodcast(bookScripts.sapiens, 'weekly-sapiens')}
                                    className={`flex-none px-6 h-14 rounded-2xl border backdrop-blur-xl flex items-center justify-center gap-2 transition-all duration-500 hover:-translate-y-1 ${(isSpeaking && activeAudioId === 'weekly-sapiens')
                                        ? 'bg-gold border-gold text-primary shadow-[0_10px_30px_rgba(212,175,55,0.4)] anim-pulse'
                                        : 'bg-white/5 border-white/10 text-white hover:border-gold/50 hover:bg-gold/5'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{(isSpeaking && activeAudioId === 'weekly-sapiens') ? 'stop' : 'play_circle'}</span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">{(isSpeaking && activeAudioId === 'weekly-sapiens') ? '정지' : '팟캐스트'}</span>
                                </button>
                                <button
                                    onClick={() => addToLibrary({ title: "사피엔스", author: "유발 하라리", cover: "/images/covers/sapiens.jpg" })}
                                    className="flex-none px-4 h-14 rounded-2xl border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center shadow-2xl"
                                >
                                    <span className="material-symbols-outlined text-[20px]">bookmark</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Focus - Übermensch */}
                    <div className="relative w-full rounded-[32px] overflow-hidden bg-[#0a0c10] border border-white/5 shadow-2xl group">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -ml-20 -mt-20"></div>
                        <div className="absolute bottom-0 right-0 w-48 h-48 bg-gold/5 blur-[80px] rounded-full -mr-10 -mb-10"></div>
                        <div className="relative p-6 md:p-8 flex flex-col items-center">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="h-[1px] w-4 bg-gold/50"></span>
                                <span className="text-gold text-[10px] font-black uppercase tracking-[0.4em]">Weekly Focus</span>
                                <span className="h-[1px] w-4 bg-gold/50"></span>
                            </div>
                            <div className="mb-6 flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30">
                                <span className="material-symbols-outlined text-[12px] text-primary-light">psychology</span>
                                <span className="text-[8px] text-primary-light font-bold uppercase tracking-widest">Masterpiece Collection</span>
                            </div>
                            <div className="w-full flex flex-col md:flex-row gap-8 items-center mb-10">
                                <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-700">
                                    <div className="absolute -inset-4 bg-black/40 blur-2xl rounded-full opacity-60"></div>
                                    <div className="relative w-40 aspect-[2/3] rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
                                        <img src="/images/covers/wm_01.jpg" alt="Übermensch" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 size-12 bg-primary flex items-center justify-center rounded-full shadow-lg border-4 border-[#0a0c10]">
                                        <span className="material-symbols-outlined text-gold text-xl font-bold">bolt</span>
                                    </div>
                                </div>
                                <div className="flex-1 text-center md:text-left space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="serif-title text-2xl md:text-3xl text-white font-medium leading-tight">위버멘쉬</h3>
                                        <p className="text-slate-500 text-sm font-light uppercase tracking-widest italic">Friedrich Nietzsche</p>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-slate-400 text-xs font-light leading-relaxed">
                                            "누구의 시선도 아닌, <br />내 의지대로 살겠다는 고귀한 선언"
                                        </p>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                            <span className="text-[9px] text-white/40 border border-white/10 px-2 py-0.5 rounded-md uppercase tracking-tighter">Philosophy</span>
                                            <span className="text-[9px] text-white/40 border border-white/10 px-2 py-0.5 rounded-md uppercase tracking-tighter">Existentialism</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full flex gap-3">
                                <Link to="/review/ubermensch" className="flex-1 group/btn relative h-14 bg-white/5 backdrop-blur-xl overflow-hidden rounded-2xl border border-white/10 flex items-center justify-center transition-all duration-500 hover:border-white/30 hover:bg-white/10 hover:-translate-y-1 shadow-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                                    <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] relative z-10 transition-colors group-hover/btn:text-white whitespace-nowrap">Review Detail</span>
                                </Link>
                                <button
                                    onClick={() => activeAudioId === 'weekly-ubermensch' ? stopAll() : playPodcast(bookScripts.ubermensch, 'weekly-ubermensch')}
                                    className={`flex-none px-6 h-14 rounded-2xl border backdrop-blur-xl flex items-center justify-center gap-2 transition-all duration-500 hover:-translate-y-1 ${(isSpeaking && activeAudioId === 'weekly-ubermensch')
                                        ? 'bg-gold border-gold text-primary shadow-[0_10px_30px_rgba(212,175,55,0.4)] anim-pulse'
                                        : 'bg-white/5 border-white/10 text-white hover:border-gold/50 hover:bg-gold/5'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{(isSpeaking && activeAudioId === 'weekly-ubermensch') ? 'stop' : 'podcasts'}</span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">{(isSpeaking && activeAudioId === 'weekly-ubermensch') ? '정지' : '팟캐스트'}</span>
                                </button>
                                <button
                                    onClick={() => addToLibrary({ title: "위버멘쉬", author: "프리드리히 니체", cover: "/images/covers/wm_01.jpg" })}
                                    className="flex-none px-4 h-14 rounded-2xl border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center shadow-2xl"
                                >
                                    <span className="material-symbols-outlined text-[20px]">bookmark</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Editors' Picks */}
                    <section className="space-y-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <span className="text-white text-xl font-bold serif-title italic">Editors' Picks</span>
                        </div>
                        <div className="space-y-6">
                            {[
                                { id: "sayno", title: "세이노의 가르침", subtitle: "수만 명의 인생을 바꾼 자본주의의 정석", author: "세이노", cover: "/images/covers/say_01.jpg", tag: "BESTSELLER", isPodcast: true, script: bookScripts.sayno },
                                { id: "psychology", title: "돈의 심리학", subtitle: "부의 축적을 결정하는 20가지 투자 철학", author: "모건 하우절", cover: "/images/covers/don_01.jpg", tag: "ECONOMY", isPodcast: true, script: bookScripts.psychology },
                                { id: "ubermensch", title: "위버멘쉬", subtitle: "누구의 시선도 아닌 내 의지대로의 삶", author: "프리드리히 니체", cover: "/images/covers/wm_01.jpg", tag: "PHILOSOPHY", isPodcast: true, script: bookScripts.ubermensch },
                                { id: "1984", title: "1984", subtitle: "감시 사회에 대한 소름 끼치는 예언", author: "조지 오웰", cover: "/images/covers/1984.jpg", tag: "CLASSIC", isPodcast: true, script: bookScripts["1984"] },
                                { id: "demian", title: "데미안", subtitle: "내면의 성장을 향한 투쟁", author: "헤르만 헤세", cover: "/images/covers/demian.jpg", tag: "PHILOSOPHY", isPodcast: true, script: bookScripts.demian },
                                { id: "vegetarian", title: "채식주의자", subtitle: "인간 본성에 대한 고통스러운 질문", author: "한강", cover: "/images/covers/vegetarian.jpg", tag: "NOBEL", isPodcast: true, script: bookScripts.vegetarian },
                                { id: "factfulness", title: "팩트풀니스", subtitle: "막연한 두려움을 이기는 데이터의 힘", author: "한스 로슬링", cover: "/images/covers/factfulness.jpg", tag: "SOCIETY", isPodcast: true, script: bookScripts.factfulness },
                                { id: "almond", title: "아몬드", subtitle: "감정을 느끼지 못하는 소년의 성장기", author: "손원평", cover: "/images/covers/almond.jpg", tag: "K-NOVEL", isPodcast: true, script: bookScripts.almond },
                                { id: "leverage", title: "레버리지", subtitle: "최소의 노력으로 최대의 결과를 얻는 법", author: "롭 무어", cover: "/images/covers/rm_01.jpg", tag: "BUSINESS", isPodcast: true, script: bookScripts.leverage },
                                { id: "one-thing", title: "원씽", subtitle: "복잡한 세상을 이기는 단 하나의 원칙", author: "게리 켈러", cover: "/images/covers/one_01.jpg", tag: "GROWTH", isPodcast: true, script: bookScripts["one-thing"] }
                            ].map((item) => (
                                <div key={item.id} className="flex gap-5 group">
                                    <div className="w-24 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 border border-white/10 relative shadow-xl">
                                        <img src={item.cover} alt={item.title} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <span className="text-[8px] text-gold font-black uppercase tracking-widest bg-gold/10 px-2 py-0.5 rounded-full mb-2 inline-block border border-gold/20">{item.tag}</span>
                                            <h4 className="text-white font-bold text-lg leading-tight mb-1">{item.title}</h4>
                                            <p className="text-slate-500 text-xs font-light">{item.subtitle}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-auto">
                                            <Link
                                                to={`/review/${item.id}`}
                                                className="h-10 rounded-xl bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                                                <span>리뷰 디테일</span>
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (activeAudioId === `pick-${item.id}`) {
                                                        stopAll();
                                                    } else {
                                                        if (item.isPodcast && item.script) {
                                                            playPodcast(item.script, `pick-${item.id}`);
                                                        } else {
                                                            speakReview(getReviewText(item.id), `pick-${item.id}`);
                                                        }
                                                    }
                                                }}
                                                className={`h-10 rounded-xl border flex items-center justify-center gap-2 transition-all ${(isSpeaking && activeAudioId === `pick-${item.id}`)
                                                    ? 'bg-gold border-gold text-primary shadow-lg shadow-gold/20'
                                                    : 'bg-white/5 border-white/10 text-white hover:border-gold/50 hover:text-gold'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">{(isSpeaking && activeAudioId === `pick-${item.id}`) ? 'stop' : (item.isPodcast ? 'podcasts' : 'play_circle')}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest">{(isSpeaking && activeAudioId === `pick-${item.id}`) ? '정지' : (item.isPodcast ? '팟캐스트' : '보이스리뷰')}</span>
                                            </button>
                                            <a
                                                href={`https://www.coupang.com/np/search?q=${encodeURIComponent(item.title)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="h-10 rounded-xl bg-gold/5 border border-gold/20 text-gold text-[9px] font-black uppercase tracking-[0.1em] flex items-center justify-center gap-2 hover:bg-gold hover:text-primary transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                                                <span>구매하기</span>
                                            </a>
                                            <button
                                                className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/50 text-[9px] font-black uppercase tracking-widest hover:bg-white/8 hover:text-white transition-all flex items-center justify-center gap-2"
                                                onClick={() => addToLibrary(item)}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">bookmark</span>
                                                <span>서재 추가</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
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
