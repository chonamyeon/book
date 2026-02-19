import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';

export default function Editorial() {
    const handlePurchase = (item, price) => {
        alert(`[PG_LINK] Processing purchase for ${item} - ${price}`);
    };

    return (
        <div className="bg-white text-slate-900 dark:text-white min-h-screen pb-24 font-display flex justify-center">
            {/* Main Layout Container: Everything constrained to max-w-lg */}
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen rounded-t-[40px] overflow-hidden border-t border-white/5">
                <TopNavigation title="에디토리얼 숍" type="sub" />

                <main className="space-y-12">
                    {/* Hero Collection Section */}
                    <section className="px-4">
                        <div className="relative group overflow-hidden rounded-xl h-[500px] flex flex-col justify-end">
                            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: "linear-gradient(to top, #002147 15%, transparent 60%), url('https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1200&auto=format&fit=crop')" }}></div>
                            <div className="relative p-8 space-y-4">
                                <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.2em] text-white border border-white/20">여름 시리즈</span>
                                <h2 className="text-4xl font-extrabold leading-none tracking-tight text-white">골든 아워 리딩</h2>
                                <p className="text-white/80 text-sm max-w-[280px] leading-relaxed">지는 해의 온기 속에 담긴 문학 큐레이션. 조용한 명상을 위한 반추적이고 향수 어린 이야기들.</p>
                                <button className="mt-4 px-6 py-3 bg-white text-primary font-bold rounded-lg text-sm uppercase tracking-wider flex items-center gap-2">컬렉션 둘러보기 <span className="material-symbols-outlined text-sm">arrow_forward</span></button>
                            </div>
                        </div>
                    </section>

                    {/* Editor's Pick Sponsored Section */}
                    <section className="px-4">
                        <div className="editor-pick-frame bg-primary dark:bg-primary/40 rounded-xl p-1 overflow-hidden">
                            <div className="p-6 space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-500/80">에디터의 선택</span>
                                    <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest italic">출판사 스포트라이트</span>
                                </div>
                                <div className="flex gap-6 items-start">
                                    <div className="shrink-0 w-32 aspect-[2/3] rounded shadow-2xl overflow-hidden border border-white/10">
                                        <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop" alt="Book Cover" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h3 className="text-2xl font-bold leading-tight text-white">침묵의 건축</h3>
                                        <p className="text-white/60 text-xs italic">저자: 엘레나 손</p>
                                        <div className="flex gap-2 pt-2">
                                            <span className="px-2 py-0.5 rounded-full border border-white/20 text-[9px] text-white/70 uppercase">성찰적인</span>
                                            <span className="px-2 py-0.5 rounded-full border border-white/20 text-[9px] text-white/70 uppercase">에세이</span>
                                        </div>
                                        <p className="text-sm text-white/80 leading-snug pt-2">"우리가 거주하는 공간과 우리가 종종 간과하는 고요함에 대한 깊은 명상."</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handlePurchase('침묵의 건축', '24,000원')}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-lg text-xs uppercase tracking-widest transition-colors">
                                    컬렉션에 추가 — 24,000원
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Thematic Horizontal Scroller */}
                    <section className="space-y-6">
                        <div className="px-6 flex justify-between items-end">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary/40 dark:text-white/40">무드별 도서</h2>
                                <h3 className="text-2xl font-extrabold text-primary dark:text-white">분위기별로 찾아보기</h3>
                            </div>
                            <a className="text-xs font-bold text-primary dark:text-white/60 underline decoration-primary/20 underline-offset-4" href="#">전체 보기</a>
                        </div>
                        <div className="flex overflow-x-auto hide-scrollbar gap-4 px-6 pb-4">
                            {/* Theme Card 1 */}
                            <div className="shrink-0 w-64 group">
                                <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.6), transparent), url('https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop')" }}></div>
                                    <div className="absolute bottom-4 left-4">
                                        <h4 class="text-white font-bold text-lg">비 오는 날의 고전</h4>
                                    </div>
                                </div>
                                <p className="text-xs text-primary/60 dark:text-white/50 leading-relaxed px-1">회색빛 하늘과 부드러운 빛을 위한 우울한 서사.</p>
                            </div>
                            {/* Theme Card 2 */}
                            <div className="shrink-0 w-64 group">
                                <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.6), transparent), url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800&auto=format&fit=crop')" }}></div>
                                    <div className="absolute bottom-4 left-4">
                                        <h4 class="text-white font-bold text-lg">Mid-Century Essays</h4>
                                    </div>
                                </div>
                                <p className="text-xs text-primary/60 dark:text-white/50 leading-relaxed px-1">Sharp, intellectual critiques from the height of modernism.</p>
                            </div>
                        </div>
                    </section>

                    {/* New Arrivals Editorial Grid */}
                    <section className="px-6 space-y-8 pb-12">
                        <h3 className="text-2xl font-extrabold text-primary dark:text-white">선별된 컬렉션</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="aspect-[3/4] bg-primary/5 dark:bg-white/5 rounded-lg overflow-hidden shadow-sm group">
                                    <img className="w-full h-full object-cover transition-opacity group-hover:opacity-80" src="https://images.unsplash.com/photo-1516414447565-b14be0afa13e?q=80&w=800&auto=format&fit=crop" alt="Book" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-primary dark:text-white">네온 노스탤지어</h4>
                                    <p className="text-[10px] text-primary/50 dark:text-white/40 uppercase tracking-widest">J. Marcis — $18</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="aspect-[3/4] bg-primary/5 dark:bg-white/5 rounded-lg overflow-hidden shadow-sm group">
                                    <img className="w-full h-full object-cover transition-opacity group-hover:opacity-80" src="https://images.unsplash.com/photo-1510172951991-856166f70bf7?q=80&w=800&auto=format&fit=crop" alt="Book" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-primary dark:text-white">벨벳 어스</h4>
                                    <p className="text-[10px] text-primary/50 dark:text-white/40 uppercase tracking-widest">R. K. Singh — $22</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
