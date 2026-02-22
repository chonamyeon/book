import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <section className="px-8 pt-16 pb-12 text-center border-t border-white/5 bg-background-dark/30">
            <h2 className="serif-title text-2xl text-white mb-4 tracking-tight">아카이뷰: 생각의 시간</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto font-light mb-10">
                "책을 기록하는 '아카이뷰'의 공간에서,<br />
                오롯이 나만의 '생각의 시간'을 갖는다"
            </p>

            {/* Information Links */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 pt-8 border-t border-white/5">
                <Link to="/about" className="text-[10px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">About</Link>
                <Link to="/contact" className="text-[10px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">Contact</Link>
                <Link to="/privacy" className="text-[10px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">Privacy Policy</Link>
            </div>
            <p className="mt-8 text-[9px] text-slate-600 uppercase tracking-widest">&copy; 2026 ARCHIVIEW. ALL RIGHTS RESERVED.</p>
        </section>
    );
}
