import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useBookData } from '../hooks/useBookData';
import TopNavigation from '../components/TopNavigation';
import { useAudio } from '../contexts/AudioContext';
import BookCardActions from '../components/BookCardActions';
import Footer from '../components/Footer';
import BottomNavigation from '../components/BottomNavigation';
import { adsenseBooks } from '../data/adsense/books';

const CATEGORY_EDITORIAL = {
    SELF_DEV: {
        title: "자기계발 — 아카이뷰의 관점",
        body: `우리는 왜 자기계발서를 읽는가? 더 나은 내일을 원하기 때문이다. 그러나 서점의 자기계발 코너를 채운 수천 권의 책 가운데 실제로 삶을 바꾸는 책은 손에 꼽는다. 아카이뷰가 자기계발 카테고리에서 도서를 선정하는 기준은 단 하나다. "읽고 나서 오늘 당장 행동이 달라지는가?"

성공을 약속하는 자극적인 제목, 근거 없는 성공 신화, 반복되는 공식들 — 아카이뷰 에디터들은 이런 책들을 철저히 배제한다. 대신 우리가 주목하는 것은 심리학과 행동과학에 기반한 검증된 원칙, 저자 자신의 실패와 성공을 솔직하게 담은 1인칭의 목소리, 그리고 10년 후에도 유효한 본질적인 통찰이다.

제임스 클리어의 『아주 작은 습관의 힘』이 수백만 명의 독자를 바꾼 이유는 새로운 기법을 제시해서가 아니다. 인간이 어떻게 행동하는지에 대한 본질적인 이해에서 출발했기 때문이다. 팀 페리스의 『타이탄의 도구들』이 가치 있는 것은 단순한 성공 비결 모음집이 아니라, 세계 최고들이 실패와 두려움을 어떻게 다루는지에 대한 날카로운 보고서이기 때문이다.

아카이뷰의 자기계발 큐레이션은 '할 수 있다'는 구호 대신 '어떻게 할 것인가'에 대한 구체적인 해답을 담은 도서들로 구성된다. 동기부여 강연의 흥분이 하루를 못 가는 것처럼, 자기계발서의 감동도 책장을 덮는 순간 사라진다면 아무 의미가 없다. 아카이뷰가 선별한 책들은 읽는 동안이 아니라 읽고 난 후에 진짜 효과가 나타난다.`
    },
    ECONOMY: {
        title: "경제 — 아카이뷰의 관점",
        body: `돈에 대해 배운 적이 있는가? 학교에서는 수학을 가르쳐도 돈의 심리학은 가르치지 않는다. 경제 뉴스는 매일 쏟아지지만 그 정보들이 내 통장을 두껍게 만들어주지는 않는다. 아카이뷰가 경제 카테고리에서 가장 중요하게 여기는 것은 '지식'이 아니라 '태도'다.

워런 버핏은 말했다. 투자에서 가장 중요한 두 가지 자질은 지능과 인내심인데, 지능은 120이면 충분하고 나머지 80은 모두 인내심에서 온다고. 모건 하우절이 『돈의 심리학』에서 강조하는 것도 같은 맥락이다. 수익률 계산보다 욕망을 통제하는 능력, 시장의 공포를 견디는 심리적 내구성이 장기적인 부를 결정한다.

아카이뷰 에디터들은 재테크 공식을 알려주는 책보다 돈과 인간의 관계를 깊이 탐구하는 책에 더 큰 가치를 부여한다. 매년 새로운 투자 트렌드가 등장하고 사라지지만, 탐욕과 공포라는 인간의 본성은 수천 년째 변하지 않는다. 그 본성을 이해하는 사람이 결국 오랫동안 살아남는다.

이 카테고리에 수록된 도서들은 단기적인 수익 공식이 아닌 경제를 바라보는 장기적인 시각, 복리의 위력과 리스크 관리의 본질, 그리고 소비와 저축에 대한 철학적 기반을 제공한다. 돈을 많이 버는 법보다 돈에 끌려다니지 않는 법을 먼저 배우는 것 — 그것이 아카이뷰 경제 컬렉션의 핵심 명제다.`
    },
    MANAGEMENT: {
        title: "경영 — 아카이뷰의 관점",
        body: `리더십이란 무엇인가? 직함이 있는 사람이 리더인가, 아니면 타인의 자발적인 따름을 이끌어내는 사람이 리더인가? 아카이뷰가 경영 카테고리에서 묻는 첫 번째 질문이 바로 이것이다. 경영서의 세계는 MBA 교재처럼 딱딱한 이론과 화려한 성공 신화로 가득하다. 아카이뷰는 그 사이에서 실제로 조직과 사람을 움직이는 본질적인 원칙들을 발굴한다.

피터 틸의 『제로 투 원』이 단순한 스타트업 지침서가 아닌 이유는, 비즈니스를 넘어 '새로운 것을 창조하는 인간의 사고방식'에 대해 말하기 때문이다. 경쟁하지 말고 독점하라는 그의 역설적인 명제는 기업을 경영하는 사람뿐 아니라 자신의 커리어를 경영하는 모든 직장인에게도 유효하다.

아카이뷰의 경영 큐레이션은 CEO를 위한 책이 아니다. 팀 안에서 영향력을 발휘하고 싶은 사람, 자신만의 비즈니스를 꿈꾸는 사람, 혹은 조직의 구조와 인간의 심리를 더 잘 이해하고 싶은 사람 모두를 위한 것이다. 경영이란 결국 사람을 이해하고, 시스템을 설계하고, 불확실성을 관리하는 일이기 때문이다.

위대한 기업은 어떻게 만들어지는가? 좋은 전략이 있는 곳에 좋은 팀이 모이는가, 아니면 좋은 팀이 있는 곳에서 좋은 전략이 나오는가? 이 카테고리의 도서들은 그 질문들에 대한 치열한 탐구의 결과물이다.`
    },
    HUMANITIES: {
        title: "인문 — 아카이뷰의 관점",
        body: `인문학은 왜 읽는가? 취업에 도움이 되어서? 교양이 생겨서? 아카이뷰 에디터들의 답은 다르다. 인문학은 세상을 다르게 볼 수 있는 언어를 제공하기 때문이다. 우리가 세상을 이해하는 언어의 수가 늘어날수록, 문제를 해결하는 방식의 폭도 그만큼 넓어진다.

유발 하라리가 『사피엔스』에서 보여준 것처럼, 인류 역사 전체를 조망하는 거시적 시각은 오늘 부장님에게 혼난 일을 전혀 다른 맥락에서 바라보게 만든다. 그것이 인문학의 힘이다. 어제의 고통을 더 넓은 시야 속에 놓음으로써, 우리는 그 고통으로부터 자유로워지는 능력을 얻는다.

아카이뷰가 인문 카테고리에서 선택하는 기준은 '오래된 지혜'와 '현재적 적용' 사이의 균형이다. 아리스토텔레스의 철학이나 중세 역사가 지금 이 시대의 우리에게 여전히 유효한 이유는 그것들이 인간의 본성을 다루기 때문이다. 인간의 본성은 스마트폰이 등장했다고 해서 달라지지 않는다.

역사, 철학, 문학, 종교 — 이 카테고리는 인간이 수천 년간 쌓아온 지식의 정수를 담은 책들로 구성된다. 빠르게 변하는 세상일수록 변하지 않는 본질을 아는 것이 가장 강력한 경쟁력이 된다. 아카이뷰의 인문 컬렉션은 그 본질을 향한 여정의 지도이다.`
    },
    PSYCHOLOGY: {
        title: "심리 — 아카이뷰의 관점",
        body: `우리는 스스로를 얼마나 잘 알고 있는가? 나는 왜 다이어트를 시작하면 3일 만에 포기하는가? 왜 화를 내지 않겠다고 다짐했는데도 같은 상황에서 또 화가 나는가? 왜 분명히 거절해야 하는 줄 알면서도 그러지 못하는가? 심리학은 이 질문들에 대한 과학적인 탐구의 역사다.

아카이뷰 에디터들은 심리 카테고리를 선정할 때 두 가지 극단을 모두 피한다. 하나는 지나치게 학술적이어서 일상에 적용하기 어려운 책, 다른 하나는 심리학 용어를 남용하는 자기계발서 스타일의 책이다. 아카이뷰가 주목하는 것은 연구에 기반하되 삶에 직접 닿는 심리학이다.

『설득의 심리학』이 수십 년째 전 세계에서 읽히는 이유는 단순하다. 인간이 왜 특정 방식으로 판단하고 행동하는지를 설명하는 원리들이 시대를 초월해 작동하기 때문이다. 우리가 타인의 요청에 어떻게 반응하는지, 어떤 상황에서 비합리적인 선택을 하는지를 이해하는 것은 자신을 지키는 가장 강력한 무기가 된다.

마음을 돌보는 것은 사치가 아니라 생존 전략이다. 아카이뷰의 심리 컬렉션은 나 자신을 더 잘 이해하고, 타인과의 관계에서 더 현명하게 반응하고, 반복되는 감정의 패턴으로부터 자유로워지는 데 필요한 통찰을 담은 도서들로 구성된다. 삶을 바꾸고 싶다면 먼저 자신의 마음을 알아야 한다.`
    }
};

const categoriesInfo = [
    { label: "내 성장을 가속화하고 싶을 때", subLabel: "자기계발 & 성공학", id: 'SELF_DEV', img: '/images/cat_success.png', seq: "01", accent: "orange-500", search: "자기계발" },
    { label: "실질적인 부와 경제를 알고 싶을 때", subLabel: "경제 & 재테크", id: 'ECONOMY', img: '/images/cat_wealth_mod.png', seq: "02", accent: "#34d399", search: "경제" },
    { label: "비즈니스의 본질과 성과를 내고 싶을 때", subLabel: "경영 & 리더십", id: 'MANAGEMENT', img: '/images/cat_career.png', seq: "03", accent: "#60a5fa", search: "경영" },
    { label: "삶의 지혜와 통찰이 필요할 때", subLabel: "인문 & 역사 & 철학", id: 'HUMANITIES', img: '/images/cat_philosophy_mod.png', seq: "04", accent: "#f87171", search: "인문" },
    { label: "나의 마음을 돌보고 싶을 때", subLabel: "심리학 & 치유", id: 'PSYCHOLOGY', img: '/images/cat_healing_mod.png', seq: "05", accent: "#818cf8", search: "심리" },
    { label: "일이 손에 안 잡히고 지칠 때", subLabel: "번아웃 & 커리어", id: 'BURNOUT', img: '/images/cat_burnout_v10.png', seq: "06", accent: "#34d399", search: "커리어" },

    // Legacy support for existing IDs if needed
    { label: "내 가치를 증명하고 부를 쌓고 싶을 때", subLabel: "연봉협상 & 경제적 자유", id: 'WEALTH', img: '/images/cat_wealth_v11.png', seq: "07", accent: "orange-500", search: "WEALTH" },
    { label: "마음이 답답하고 위로가 필요할 때", subLabel: "우울 & 고독 & 치유", id: 'HEALING', img: '/images/cat_healing_v8.png', seq: "08", accent: "#60a5fa", search: "HEALING" },
    { label: "어떻게 살아야 할지 막막할 때", subLabel: "자아성찰 & 인생철학", id: 'PHILOSOPHY', img: '/images/cat_philosophy_v8.png', seq: "09", accent: "#f87171", search: "PHILOSOPHY" }
];

export default function CategoryBooks() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getAllBooks } = useBookData();
    const { openScriptModal } = useAudio();

    const allBooks = getAllBooks();
    const categoryInfo = categoriesInfo.find(c => c.id === id) || categoriesInfo[0];

    const categoryBooks = useMemo(() => {
        const seen = new Set();
        return allBooks
            .filter(book => {
                const sec = (book.section || '').toUpperCase();
                const cat = (book.category || '').toLowerCase();

                if (categoryInfo.id === 'SELF_DEV') return cat.includes('자기계발');
                if (categoryInfo.id === 'ECONOMY') return cat.includes('경제');
                if (categoryInfo.id === 'MANAGEMENT') return cat.includes('경영');
                if (categoryInfo.id === 'HUMANITIES') return cat.includes('인문');
                if (categoryInfo.id === 'PSYCHOLOGY') return cat.includes('심리');

                // Keep BURNOUT mapping to old sections to not break completely if accessed
                if (categoryInfo.id === 'BURNOUT') return cat.includes('커리어') || sec === 'BURNOUT';

                // Keep Legacy Mappings so admin definitions still work
                if (categoryInfo.id === 'HEALING') return sec === 'HEALING';
                if (categoryInfo.id === 'WEALTH') return sec === 'WEALTH';
                if (categoryInfo.id === 'PHILOSOPHY') return sec === 'PHILOSOPHY';

                return false;
            })
            .sort((a, b) => {
                const getSec = (ts) => ts?.seconds || (ts ? new Date(ts).getTime() / 1000 : 0);
                return getSec(b.updatedAt) - getSec(a.updatedAt);
            })
            .filter(book => {
                const key = book.id || book.title;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
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

    const editorial = CATEGORY_EDITORIAL[categoryInfo.id];

    const CATEGORY_ID_TO_LABEL = {
        SELF_DEV: '자기계발', ECONOMY: '경제', MANAGEMENT: '경영',
        HUMANITIES: '인문', PSYCHOLOGY: '심리'
    };
    const storyBooks = useMemo(() => {
        const label = CATEGORY_ID_TO_LABEL[categoryInfo.id];
        if (!label) return [];
        return adsenseBooks.filter(b => b.category === label);
    }, [categoryInfo.id]);

    return (
        <div className="bg-black text-white font-sans antialiased min-h-screen flex flex-col relative selection:bg-orange-500/30 pb-32">
            <Helmet>
                <title>{categoryInfo.subLabel} 추천 도서 비평 & 인사이트 | 아카이뷰(ArchiView)</title>
                <meta name="description" content={`아카이뷰 에디터가 엄선한 ${categoryInfo.subLabel} 분야 핵심 도서 컬렉션. ${categoryInfo.label} — 단순 목록이 아닌 독창적인 관점으로 선별한 고품질 인사이트를 만나보세요.`} />
                <meta name="robots" content="noindex, nofollow" />
                <link rel="canonical" href={`https://archiview.shop/category/${categoryInfo.id}`} />
            </Helmet>
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
                <section className="relative h-[65vh] w-full flex flex-col justify-end overflow-hidden mb-12" style={{ touchAction: 'pan-y' }}>
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

                {editorial && (
                    <motion.article
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
                        className="px-6 py-10 border-b border-white/5"
                    >
                        <h2 className="text-lg font-black text-white mb-5 flex items-center gap-2">
                            <span className="w-1 h-5 bg-orange-500 rounded-full shrink-0"></span>
                            {editorial.title}
                        </h2>
                        <div className="space-y-4">
                            {editorial.body.split('\n\n').map((para, i) => (
                                <p key={i} className="text-zinc-400 text-[14px] leading-[1.85] font-medium break-keep">
                                    {para}
                                </p>
                            ))}
                        </div>
                    </motion.article>
                )}

                {storyBooks.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
                        className="px-6 py-10 border-b border-white/5"
                    >
                        <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                            <span className="w-1 h-5 bg-amber-500 rounded-full shrink-0"></span>
                            비평 & 인사이트 아카이브
                        </h2>
                        <p className="text-zinc-500 text-[12px] font-bold mb-6 ml-3">아카이뷰 에디터의 독창적인 관점으로 분석한 {categoryInfo.subLabel} 도서</p>
                        <div className="space-y-3">
                            {storyBooks.map(b => (
                                <Link
                                    key={b.id}
                                    to={`/story/${b.id}`}
                                    className="flex items-start gap-4 p-4 rounded-xl bg-white/3 border border-white/8 hover:bg-white/6 hover:border-amber-500/30 transition-all group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">{b.author}</p>
                                        <p className="text-[15px] font-black text-white leading-tight mb-1.5 group-hover:text-amber-400 transition-colors">『{b.title}』</p>
                                        <p className="text-zinc-400 text-[12px] leading-relaxed line-clamp-2">{b.desc}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-white/20 group-hover:text-amber-400 transition-colors text-[20px] shrink-0 mt-1">arrow_forward_ios</span>
                                </Link>
                            ))}
                        </div>
                    </motion.section>
                )}

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
                                                <img src={book.cover} alt={book.title} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
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
                
                <Footer />
            </main>

            <BottomNavigation />
        </div>
    );
}

