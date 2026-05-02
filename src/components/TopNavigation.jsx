import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function TopNavigation({ searchTerm, setSearchTerm }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '홈' },
    { path: '/review-board', label: '리뷰' },
    { path: '/library', label: '서재' },
    { path: '/about', label: '소개' },
    { path: '/contact', label: '문의' },
  ];

  return (
    <header className="fixed left-0 top-0 z-50 flex h-16 w-full items-center border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex w-full items-center gap-4 px-4 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2 no-underline" aria-label="Whiteboard 홈">
          <span className="flex h-[18px] items-end gap-[3px]" aria-hidden="true">
            <span className="h-2 w-[3px] rounded-sm bg-blue-300" />
            <span className="h-[18px] w-[3px] rounded-sm bg-blue-600" />
            <span className="h-3 w-[3px] rounded-sm bg-blue-400" />
            <span className="h-4 w-[3px] rounded-sm bg-blue-500" />
          </span>
          <span className="text-base font-black tracking-tight text-slate-900">Whiteboard</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 md:flex" aria-label="주요 메뉴">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-bold no-underline ${active ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center sm:flex">
          <label className="sr-only" htmlFor="site-search">검색</label>
          <input
            id="site-search"
            className="w-44 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="책 제목 검색"
            value={searchTerm || ''}
            onChange={(event) => setSearchTerm && setSearchTerm(event.target.value)}
          />
        </div>
      </div>
    </header>
  );
}
