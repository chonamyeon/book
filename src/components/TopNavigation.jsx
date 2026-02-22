import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function TopNavigation({ title, type = 'main' }) {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <nav className="sticky top-0 z-50 w-full bg-[#090b10] border-b border-white/5 flex items-center justify-between px-6 py-5">
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

            <Link to="/" className="flex-1 text-center transition-opacity active:opacity-70 group">
                <h1 className="text-gold text-[22px] font-bold tracking-tight inline-block">
                    {title ? (
                        <span>{title}</span>
                    ) : (
                        <>
                            <span>아카이뷰</span> <span className="font-serif italic font-light opacity-80 group-hover:opacity-100 transition-opacity">The Archiview</span>
                        </>
                    )}
                </h1>
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

