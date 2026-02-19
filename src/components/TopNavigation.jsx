import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function TopNavigation({ title, type = 'main' }) {
    const navigate = useNavigate();

    return (
        <nav className="sticky top-0 z-50 w-full bg-[#090b10] border-b border-white/5 flex items-center justify-between px-6 py-5 rounded-t-[40px]">
            <div className="flex items-center gap-4">
                {type === 'sub' ? (
                    <button onClick={() => navigate(-1)} className="text-gold flex items-center justify-center transition-transform active:scale-90">
                        <span className="material-symbols-outlined text-2xl">arrow_back_ios</span>
                    </button>
                ) : (
                    <div className="text-gold flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">menu_book</span>
                    </div>
                )}
            </div>

            <h1 className="text-gold text-[22px] font-bold tracking-tight flex-1 text-center">
                {title ? (
                    <span>{title}</span>
                ) : (
                    <>
                        <span>아카이브</span> <span className="font-serif italic">(The Archive)</span>
                    </>
                )}
            </h1>

            <div className="flex items-center justify-end">
                <Link to="/profile" className="flex size-10 items-center justify-center rounded-full bg-white/5 text-gold border border-gold/30 shadow-sm transition-all active:scale-95">
                    <span className="material-symbols-outlined text-2xl">person</span>
                </Link>
            </div>
        </nav>
    );
}
