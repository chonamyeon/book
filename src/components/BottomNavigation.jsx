import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function BottomNavigation() {
  const { pathname } = useLocation();
  const navItems = [
    { path: '/', label: '홈', icon: 'home' },
    { path: '/review-board', label: '리뷰', icon: 'library_books' },
    { path: '/library', label: '서재', icon: 'auto_stories' },
    { path: '/about', label: '소개', icon: 'info' },
    { path: '/contact', label: '문의', icon: 'mail' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 z-50 w-full border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="모바일 메뉴"
    >
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold no-underline ${
                active ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
