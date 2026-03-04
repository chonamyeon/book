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
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 pt-8 border-t border-white/5 mb-8">
                <Link to="/about" className="text-[10px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">About</Link>
                <Link to="/contact" className="text-[10px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">Contact</Link>
                <Link to="/privacy" className="text-[10px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">Privacy Policy</Link>
            </div>

            <div className="max-w-[320px] mx-auto mb-8">
                <p className="text-[9px] text-slate-700 leading-relaxed break-keep">
                    아카이뷰는 도서 원문을 낭독하지 않으며, 각 도서의 핵심 철학을 분석한 **독창적인 2차 창작물**을 제공합니다. 
                    본 서비스에서 제공되는 모든 인사이트의 저작권은 아카이뷰에 있습니다.
                </p>
            </div>

            <p className="text-[9px] text-slate-600 uppercase tracking-widest">&copy; 2026 ARCHIVIEW. ALL RIGHTS RESERVED.</p>
        </section>
    );
}
