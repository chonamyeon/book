import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useSiteDesign } from '../hooks/useSiteDesign';
import ReadingNotes from './ReadingNotes';
import MainHeader from '../components/MainHeader';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

const features = [
    {
        icon: 'edit_note',
        title: '독서 노트 작성',
        desc: '책에서 받은 감동, 깨달음, 실천 다짐을 감정과 함께 기록'
    },
    {
        icon: 'auto_awesome',
        title: 'AI 인사이트 요약',
        desc: '작성한 노트를 AI가 분석해 핵심 통찰을 한 문장으로 정리'
    },
    {
        icon: 'share',
        title: '카드 공유',
        desc: '노트를 감성 카드 이미지로 변환해 SNS에 바로 공유'
    },
    {
        icon: 'trending_up',
        title: '독서 습관 추적',
        desc: '연속 기록 스트릭과 청취 시간으로 나의 성장을 시각화'
    },
];

export default function ReadingNotesLanding() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { design } = useSiteDesign();

    if (loading) return null;
    if (user) return <ReadingNotes />;

    return (
        <div className="bg-[#0a0a0f] min-h-screen flex flex-col text-white font-sans">
            <MainHeader showBack />

            {/* Hero Section */}
            <section className="relative h-[420px] w-full overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/50 to-[#0a0a0f] z-10" />
                {design.notes_hero.type === 'image' ? (
                    <img src={design.notes_hero.src} alt="hero" className="absolute inset-0 w-full h-full object-cover opacity-70" style={{ objectPosition: 'center center' }} />
                ) : (
                    <video
                        src={design.notes_hero.src}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        poster={design.notes_hero_poster || undefined}
                        className="absolute inset-0 w-full h-full object-cover opacity-70"
                        style={{ objectPosition: 'center center' }}
                    />
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
                        <span className="text-orange-400 text-[11px] font-bold tracking-[0.25em] uppercase">Reading Notes</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                        className="text-[34px] font-light leading-tight tracking-tighter mb-3"
                    >
                        읽은 것을<br />
                        <span className="font-bold">내 것으로 만드는 법</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.16 }}
                        className="text-white/55 text-sm leading-relaxed max-w-xs"
                    >
                        지식은 기록할 때 비로소 내 것이 됩니다<br />
                        감동받은 문장, 실천할 다짐, 오늘의 통찰을<br />
                        아카이뷰와 함께 쌓아가세요
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
                        transition={{ delay: 0.1 + i * 0.07 }}
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

            {/* Sample note preview */}
            <section className="px-6 pb-6">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="p-5 bg-white/[0.04] border border-white/[0.07] relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-orange-500/60 to-transparent" />
                    <p className="text-[10px] text-orange-400/80 font-bold tracking-widest uppercase mb-2">Sample Note</p>
                    <p className="text-white/70 text-sm leading-relaxed italic">
                        "성공한 사람들은 시간을 다르게 쓰는 게 아니라,<br />
                        시간의 우선순위를 다르게 정한다."
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="text-base">🔥</span>
                        <span className="text-white/30 text-[11px]">원씽 · 감명받음</span>
                    </div>
                </motion.div>
            </section>

            {/* CTA */}
            <div className="px-6 pb-8 mt-auto">
                <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => navigate('/login')}
                    className="w-full py-4 bg-orange-500 text-white font-bold text-base tracking-tight active:scale-95 transition-transform"
                >
                    로그인하고 기록 시작하기
                </motion.button>
                <p className="text-center text-white/25 text-xs mt-3">구글 계정으로 3초만에 시작</p>
            </div>

            <Footer />
            <BottomNavigation />
        </div>
    );
}
