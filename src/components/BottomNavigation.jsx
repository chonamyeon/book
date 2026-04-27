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
            className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-white/10 bg-[#0a0d12] gpu-accelerated"
            style={{
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                transform: 'translate3d(-50%, 0, 0)',
                willChange: 'transform',
            }}
        >
            <div className="flex justify-around items-center px-3 pt-2.5 pb-2.5 relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                {navItems.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center gap-1.5 active:scale-95 px-2 py-1.5 rounded-none ${
                                isActive
                                    ? 'bg-[#3a3f47] text-gold'
                                    : 'text-white/85'
                            }`}
                        >
                            <div className="flex items-center justify-center mb-0.5">
                                <span className={`material-symbols-outlined text-[23px] ${
                                    isActive ? 'text-gold' : 'text-white/85'
                                }`}>
                                    {item.icon}
                                </span>
                            </div>
                            <p className={`text-[11px] font-black tracking-[0.02em] -translate-y-0.5 ${
                                isActive ? 'opacity-100 text-gold' : 'opacity-90'
                            }`}>
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
