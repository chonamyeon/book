import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useSiteDesign } from '../hooks/useSiteDesign';
import Profile from './Profile';
import MainHeader from '../components/MainHeader';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';
import KakaoAdFit from '../components/KakaoAdFit';

const features = [
    {
        icon: 'person',
        title: '나의 독서 프로필',
        desc: '독서 유형, 청취 시간, 연속 기록 스트릭을 한눈에 확인'
    },
    {
        icon: 'verified',
        title: '프리미엄 멤버십',
        desc: '구독 상태와 남은 체험 기간을 관리하고 전체 콘텐츠를 무제한으로'
    },
    {
        icon: 'notifications',
        title: '맞춤 알림 설정',
        desc: '새로운 팟캐스트와 이북 업데이트를 가장 먼저 받아보세요'
    },
    {
        icon: 'workspace_premium',
        title: '독서 통계',
        desc: '오늘 얼마나 들었는지, 목표 달성률은 어느 정도인지 추적'
    },
];

export default function ProfileLanding() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { design } = useSiteDesign();

    if (loading) return null;
    if (user) return <Profile />;

    return (
        <div className="bg-[#0a0a0f] min-h-screen flex flex-col text-white font-sans">
            <MainHeader showBack />

            {/* Hero Section */}
            <section className="relative h-[480px] w-full overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/50 to-[#0a0a0f] z-10" />
                {design.profile_hero.type === 'image' ? (
                    <img src={design.profile_hero.src} alt="hero" className="absolute inset-0 w-full h-full object-cover opacity-70" style={{ objectPosition: 'center center' }} />
                ) : (
                    <video
                        src={design.profile_hero.src}
                        poster={design.profile_hero_poster || undefined}
                        className="absolute inset-0 w-full h-full object-cover opacity-70"
                        style={{ objectPosition: 'center center' }}
                        autoPlay muted loop playsInline
                    />
                )}
                <div className="relative z-20 h-full flex flex-col justify-end px-6 pb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-3 mb-4"
                    >
                        <div className="flex items-end gap-[2px] h-4">
                            {[6, 14, 16, 10, 8].map((h, i) => (
                                <div key={i} className="w-[3px] bg-orange-500 rounded-none" style={{ height: h }} />
                            ))}
                        </div>
                        <span className="text-orange-400 text-[11px] font-bold tracking-[0.25em] uppercase">My Profile</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                        className="text-[35px] font-light leading-tight tracking-tighter mb-4"
                    >
                        성장하는<br />
                        <span className="font-bold">나를 기록하다</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.16 }}
                        className="text-white/55 text-sm leading-relaxed max-w-xs"
                    >
                        매일 조금씩 쌓이는 독서 습관이<br />
                        6개월 후 당신을 완전히 바꿉니다<br />
                        그 변화를 아카이뷰가 함께 기록합니다
                    </motion.p>
                </div>
            </section>

            {/* 로그인 버튼 — 히어로 바로 아래 */}
            <div className="px-6 pt-2 pb-2">
                <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => navigate('/login')}
                    className="w-full py-4 bg-orange-500 text-white font-bold text-base tracking-tight active:scale-95 transition-transform"
                >
                    로그인하고 프로필 만들기
                </motion.button>
                <p className="text-center text-white/25 text-xs mt-3">구글 계정으로 3초만에 시작</p>
            </div>

            {/* Features */}
            <section className="px-6 py-4 flex flex-col gap-3">
                {features.map((f, i) => (
                    <motion.div
                        key={f.title}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.07 }}
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

            {/* 카카오 애드핏 배너 */}
            <div className="flex justify-center px-6 py-4">
                <KakaoAdFit unit="DAN-aXfyL1HtK8zp0vui" width="320" height="100" />
            </div>

            <Footer />
            <BottomNavigation />
        </div>
    );
}
