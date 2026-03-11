import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

export default function TopNavigation({ title, type = 'main' }) {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <nav className="sticky top-0 z-50 w-full bg-[#090b10] border-b border-white/5 flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-4">
                {type === 'sub' ? (
                    <button onClick={() => navigate(-1)} className="text-white flex items-center justify-center transition-transform active:scale-90">
                        <span className="material-symbols-outlined text-2xl font-bold">arrow_back_ios_new</span>
                    </button>
                ) : (
                    <div className="text-gold flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">menu_book</span>
                    </div>
                )}
            </div>

            <Link to="/" className="flex-1 transition-opacity active:opacity-70 group flex justify-center">
                <div className="flex items-center gap-[7px]">
                    {/* 🔊 Gray Waveform Graphic Logo */}
                    <div className="flex items-end h-[18px] gap-[2px] mr-1 pb-[2px]">
                        <motion.div animate={{ height: [8, 12, 8] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }} className="w-[3px] bg-zinc-400 rounded-sm" />
                        <motion.div animate={{ height: [12, 16, 12] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.1 }} className="w-[3px] bg-zinc-400 rounded-sm" />
                        <motion.div animate={{ height: [16, 20, 16] }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.2 }} className="w-[3px] bg-zinc-400 rounded-sm" />
                        <motion.div animate={{ height: [10, 14, 10] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut", delay: 0.3 }} className="w-[3px] bg-zinc-400 rounded-sm" />
                        <motion.div animate={{ height: [14, 18, 14] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.4 }} className="w-[3px] bg-zinc-400 rounded-sm" />
                    </div>
                    <span className="text-white uppercase tracking-[-0.03em] font-black text-[18px] leading-none mt-0.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>ARCHIVIEW</span>
                </div>
            </Link>

            <div className="flex items-center justify-end">
                <Link to="/profile" className="flex size-10 items-center justify-center rounded-full bg-white/5 text-gold border border-gold/30 shadow-sm transition-all active:scale-95 overflow-hidden">
                    {user ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-2xl">person</span>
                    )}
                </Link>
            </div>
        </nav>
    );
}

