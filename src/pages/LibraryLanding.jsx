import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useSiteDesign } from '../hooks/useSiteDesign';
import Library from './Library';
import MainHeader from '../components/MainHeader';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

const features = [
    {
        icon: 'bookmark',
        title: '내 서재',
        desc: '마음에 드는 책을 저장하고 언제든 꺼내볼 수 있는 나만의 공간'
    },
    {
        icon: 'psychology',
        title: '독서 성향 분석',
        desc: '퀴즈를 통해 분석된 나의 독서 유형과 맞춤 도서 추천 결과 보관'
    },
    {
        icon: 'recommend',
        title: '큐레이션 컬렉션',
        desc: 'AI가 분석한 취향 기반 도서 리스트를 언제나 한눈에'
    },
];

export default function LibraryLanding() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { design } = useSiteDesign();

    if (loading) return null;
    if (user) return <Library />;

    return (
        <div className="bg-[#0a0a0f] min-h-screen flex flex-col text-white font-sans">
            <MainHeader showBack />

            {/* Hero Section */}
            <section className="relative h-[420px] w-full overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/50 to-[#0a0a0f] z-10" />
                {design.library_hero.type === 'image' ? (
                    <img src={design.library_hero.src} alt="hero" className="absolute inset-0 w-full h-full object-cover opacity-70" style={{ objectPosition: 'center center' }} />
                ) : (
                    <video src={design.library_hero.src} autoPlay muted loop playsInline preload="auto" className="absolute inset-0 w-full h-full object-cover opacity-70" style={{ objectPosition: 'center center' }} />
                )}
                <div className="relative z-20 h-full flex flex-col justify-end px-6 pb-10">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-3 mb-3"
                    >
                        <div className="flex items-end gap-[2px] h-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-[3px] bg-orange-500"
                                    animate={{ height: ['30%', '100%', '30%'] }}
                                    transition={{ repeat: Infinity, duration: 0.8 + (i % 3) * 0.2, ease: 'easeInOut' }}
                                />
                            ))}
                        </div>
                        <span className="text-orange-400 text-[11px] font-bold tracking-[0.25em] uppercase">My Library</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                        className="text-[34px] font-light leading-tight tracking-tighter mb-3"
                    >
                        나만의<br />
                        <span className="font-bold">지식 서재</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.16 }}
                        className="text-white/55 text-sm leading-relaxed max-w-xs"
                    >
                        읽고 싶은 책, 분석된 성향, 큐레이션 결과까지<br />
                        모든 독서 데이터를 한 곳에서 관리하세요
                    </motion.p>
                </div>
            </section>

            {/* Features */}
            <section className="px-6 py-8 flex flex-col gap-3">
                {features.map((f, i) => (
                    <motion.div
                        key={f.title}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.08 }}
                        className="flex items-start gap-4 p-4 bg-white/[0.04] border border-white/[0.07]"
                    >
                        <div className="w-10 h-10 bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-orange-400" style={{ fontSize: 20 }}>{f.icon}</span>
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-white/90 mb-0.5">{f.title}</p>
                            <p className="text-white/45 text-xs leading-relaxed">{f.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </section>

            {/* CTA */}
            <div className="px-6 pb-8 mt-auto">
                <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => navigate('/login')}
                    className="w-full py-4 bg-orange-500 text-white font-bold text-base tracking-tight active:scale-95 transition-transform"
                >
                    로그인하고 서재 열기
                </motion.button>
                <p className="text-center text-white/25 text-xs mt-3">구글 계정으로 3초만에 시작</p>
            </div>

            <Footer />
            <BottomNavigation />
        </div>
    );
}
