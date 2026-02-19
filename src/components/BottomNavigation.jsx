import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function BottomNavigation() {
    const location = useLocation();
    const currentPath = location.pathname;

    const navItems = [
        { path: '/', label: '홈', icon: 'home' },
        { path: '/editorial', label: '에디토리얼', icon: 'auto_awesome' },
        { path: '/library', label: '서재', icon: 'auto_stories' },
        { path: '/profile', label: '프로필', icon: 'person' },
    ];

    return (
        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-white/5 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-lg pb-6 pt-2 transition-all duration-300">
            <div className="max-w-lg mx-auto flex justify-around items-center px-6">
                {navItems.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors duration-200 ${isActive
                                ? 'text-primary dark:text-gold'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <div className={`flex h-10 items-center justify-center rounded-full px-5 ${isActive ? 'bg-primary/5 dark:bg-gold/10' : ''}`}>
                                <span className={`material-symbols-outlined text-[26px] ${isActive ? 'fill-1' : ''}`}>
                                    {item.icon}
                                </span>
                            </div>
                            <p className={`text-[13px] font-bold uppercase tracking-widest ${isActive ? 'font-black' : 'font-medium'}`}>
                                {item.label}
                            </p>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
