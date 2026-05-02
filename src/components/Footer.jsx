import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-900 no-underline" aria-label="Whiteboard 홈">
          <span className="inline-flex h-5 items-end gap-[3px]" aria-hidden="true">
            <span className="h-3 w-1 rounded-sm bg-blue-300" />
            <span className="h-5 w-1 rounded-sm bg-blue-600" />
            <span className="h-2 w-1 rounded-sm bg-blue-400" />
            <span className="h-4 w-1 rounded-sm bg-blue-500" />
          </span>
          <span className="text-xl font-black tracking-tight">Whiteboard</span>
        </Link>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600">
          Whiteboard는 책의 핵심 주장, 맥락, 비판적 관점, 실천 아이디어를 정리하는 독서 인사이트 매거진입니다.
          모든 글은 원저작권을 존중하는 비평과 해설 목적으로 작성됩니다.
        </p>

        <nav className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3" aria-label="사이트 정보">
          <Link to="/about" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">About</Link>
          <Link to="/guide" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">Guide</Link>
          <Link to="/contact" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">Contact</Link>
          <Link to="/privacy" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">Privacy</Link>
          <Link to="/terms" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">Terms</Link>
          <Link to="/disclaimer" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">Disclaimer</Link>
          <Link to="/sitemap.xml" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">Sitemap</Link>
        </nav>

        <div className="mt-8 text-xs leading-6 text-slate-500">
          <p>Contact: <a className="underline hover:text-blue-600" href="mailto:gosipass902@gmail.com">gosipass902@gmail.com</a></p>
          <p className="mt-2">&copy; 2026 Whiteboard. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
