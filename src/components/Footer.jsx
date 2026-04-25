import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <section className="px-8 pt-16 pb-12 text-center border-t border-white/5 bg-background-dark/30">
            <div className="flex flex-col items-center mb-10">
                <div className="flex items-center justify-center gap-[7px] mb-4">
                    <div className="flex items-end h-[18px] gap-[2px] mr-1 pb-[2px] opacity-90">
                        <motion.div animate={{ height: [8, 12, 8] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }} className="w-[3px] bg-zinc-400 rounded-none" />
                        <motion.div animate={{ height: [12, 16, 12] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.1 }} className="w-[3px] bg-zinc-400 rounded-none" />
                        <motion.div animate={{ height: [16, 20, 16] }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.2 }} className="w-[3px] bg-zinc-400 rounded-none" />
                        <motion.div animate={{ height: [10, 14, 10] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut", delay: 0.3 }} className="w-[3px] bg-zinc-400 rounded-none" />
                        <motion.div animate={{ height: [14, 18, 14] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.4 }} className="w-[3px] bg-zinc-400 rounded-none" />
                    </div>
                    <h2
                        className="text-[19px] font-black tracking-[-0.03em] uppercase text-white leading-none mt-0.5"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
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
