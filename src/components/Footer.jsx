import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <section className="px-8 pt-16 pb-12 text-center border-t border-white/5 bg-background-dark/30">
            <div className="flex flex-col items-center mb-10">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="flex items-end gap-[3px] h-[20px] opacity-80 pb-0.5">
                        <div className="w-1 bg-slate-400 h-[60%]"></div>
                        <div className="w-1 bg-slate-200 h-[100%]"></div>
                        <div className="w-1 bg-slate-400 h-[40%]"></div>
                        <div className="w-1 bg-slate-300 h-[80%]"></div>
                    </div>
                    <h2 className="serif-title text-xl font-black text-white tracking-widest uppercase" 
                        style={{ 
                            fontFamily: "'Montserrat', sans-serif",
                            textShadow: "rgba(0, 255, 255, 0.9) -1.5px 0px 0px, rgba(255, 102, 0, 0.9) 1.5px 0px 0px"
                        }}>
                        ARCHIVIEW
                    </h2>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto font-light">
                    "성공한 사람들의 인사이트를 듣다"
                </p>
            </div>

            {/* Information Links */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 pt-8 border-t border-white/5 mb-8">
                <Link to="/about" className="text-[11px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">About</Link>
                <Link to="/contact" className="text-[11px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">Contact</Link>
                <Link to="/privacy" className="text-[11px] font-bold text-slate-500 hover:text-gold uppercase tracking-[0.2em] transition-colors">Privacy Policy</Link>
            </div>

            <div className="max-w-[320px] mx-auto mb-8">
                <p className="text-[11px] text-slate-700 leading-relaxed break-keep">
                    아카이뷰는 도서 원문을 낭독하지 않으며, 각 도서의 핵심 철학을 분석한 <strong className="font-bold text-slate-500">독창적인 2차 창작물</strong>을 제공합니다.
                    본 서비스에서 제공되는 모든 인사이트의 저작권은 아카이뷰에 있습니다.
                </p>
            </div>

            <p className="text-[11px] text-slate-600 uppercase tracking-widest">&copy; 2026 ARCHIVIEW. ALL RIGHTS RESERVED.</p>
        </section>
    );
}
