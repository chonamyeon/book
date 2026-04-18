import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * BottomNavigation — 경량화 버전
 * - recommendations, bookScripts 등 무거운 데이터 import 제거 (325KB+22KB 절약)
 * - 사용되지 않은 Finder 모달 UI 코드 완전 제거
 * - framer-motion 제거 (불필요한 의존성)
 * - React.memo로 불필요한 리렌더 방지
 */

const navItems = [
    { path: '/', label: '홈', icon: 'home' },
    { path: '/editorial', label: '에디토리얼', icon: 'auto_awesome' },
    { path: '/insights', label: '지식인사이트', icon: 'play_circle' },
    { path: '/library', label: '서재', icon: 'auto_stories' },
    { path: '/reading-notes', label: '기록노트', icon: 'edit_note' },
    { path: '/profile', label: '프로필', icon: 'person' },
];

function BottomNavigation() {
    const location = useLocation();
    const currentPath = location.pathname;

    return (
        <nav
            className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-gold/20 bg-[#090b10]/95 backdrop-blur-2xl transition-all duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] gpu-accelerated"
            style={{
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                transform: 'translate3d(-50%, 0, 0)',
                willChange: 'transform',
            }}
        >
            <div className="flex justify-around items-center px-4 pt-3 pb-3 relative">
                {/* Subtle gold line on top */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/10 to-transparent"></div>

                {navItems.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center gap-1.5 transition-colors duration-200 active:scale-95 ${isActive
                                ? 'text-gold'
                                : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            <div className="relative group/nav">
                                {isActive && (
                                    <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-none scale-150"></div>
                                )}
                                <div className="flex items-center justify-center relative z-10 mb-1">
                                    <span className={`material-symbols-outlined text-[26px] transition-colors duration-200 ${isActive ? 'fill-1 scale-110 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] text-gold' : 'scale-90 opacity-80 text-white/50 group-hover/nav:text-white/80'}`}>
                                        {item.icon}
                                    </span>
                                </div>
                            </div>
                            <p className={`text-[11px] font-black uppercase tracking-[0.1em] -translate-y-0.5 ${isActive ? 'opacity-100 scale-105' : 'opacity-60 group-hover/nav:opacity-100'}`}>
                                {item.label}
                            </p>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default memo(BottomNavigation);
