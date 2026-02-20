import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';

export default function Editorial() {
    const handlePurchase = (item, price) => {
        alert(`[PG_LINK] Processing purchase for ${item} - ${price}`);
    };

    const shopItems = [
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
        }
    ];

    return (
        <div className="bg-white text-slate-900 dark:text-white min-h-screen pb-24 font-display flex justify-center">
            {/* Main Layout Container */}
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5">
                <TopNavigation title="에디토리얼 숍" type="sub" />

                <main className="px-6 pt-8 pb-24 space-y-10">
                    {/* Header Text */}
                    <div className="text-center space-y-2">
                        <span className="text-gold text-xs font-bold uppercase tracking-[0.2em]">Curated Shop</span>
                        <h2 className="serif-title text-3xl text-white font-medium leading-tight">
                            기록을 위한<br />특별한 도구들
                        </h2>
                        <p className="text-slate-400 text-xs font-light leading-relaxed max-w-[200px] mx-auto pt-2">
                            당신의 지적 여정을 더 풍요롭게 만들어줄 엄선된 컬렉션입니다.
                        </p>
                    </div>

                    {/* Featured / Hero Item */}
                    <div className="group relative aspect-[4/5] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1200&auto=format&fit=crop')" }}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                        <div className="absolute bottom-0 left-0 p-8 w-full z-10">
                            <div className="inline-block px-3 py-1 mb-3 rounded-full border border-gold/30 bg-black/30 backdrop-blur-md">
                                <span className="text-gold text-[10px] font-bold uppercase tracking-widest">Limited Edition</span>
                            </div>
                            <h3 className="serif-title text-2xl text-white mb-2">골든 아워 리딩 세트</h3>
                            <p className="text-slate-300 text-xs font-light line-clamp-2 mb-4">
                                늦은 오후의 햇살과 함께하기 좋은 문학 큐레이션과 굿즈 패키지입니다.
                            </p>
                            <button className="w-full py-4 bg-white text-primary font-bold rounded-xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-gold hover:text-primary transition-colors">
                                구매하기 — ₩45,000
                            </button>
                        </div>
                    </div>

                    {/* Product List */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <span className="text-white text-lg font-bold serif-title italic">Weekly Picks</span>
                            <span className="text-slate-500 text-xs">3 items</span>
                        </div>

                        <div className="space-y-4">
                            {shopItems.map((item) => (
                                <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                    <div className="w-20 aspect-[3/4] rounded-lg overflow-hidden shrink-0 border border-white/10 relative">
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] text-gold font-bold uppercase tracking-wider border border-gold/20 px-1.5 py-0.5 rounded">{item.tag}</span>
                                            </div>
                                            <h4 className="text-white font-medium text-lg leading-tight">{item.title}</h4>
                                            <p className="text-slate-400 text-xs mt-1">{item.subtitle}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-3">
                                            <span className="text-white font-bold text-sm">₩{item.price}</span>
                                            <button
                                                onClick={() => handlePurchase(item.title, item.price)}
                                                className="size-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined text-sm">shopping_bag</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
