import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { loginWithGoogle, loginWithGoogleRedirect, logout } from '../firebase';
import { useAuth } from '../hooks/useAuth';

export default function Profile() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error("Login failed:", error);
            if (error.code === 'auth/popup-blocked') {
                alert("팝업이 차단되었습니다. 리디렉션 방식으로 로그인을 시도합니다.");
                try {
                    await loginWithGoogleRedirect();
                } catch (err) {
                    alert("로그인 중 오류가 발생했습니다: " + err.message);
                }
            } else if (error.code === 'auth/operation-not-allowed') {
                alert("Firebase 콘솔에서 Google 로그인이 활성화되어 있지 않습니다. Authentication > Sign-in method에서 Google을 활성화해주세요.");
            } else {
                alert("로그인 중 오류가 발생했습니다: " + error.message);
            }
        }
    };

    const handleLogout = async () => {
        if (window.confirm("로그아웃 하시겠습니까?")) {
            try {
                await logout();
                navigate('/');
            } catch (error) {
                console.error("Logout failed:", error);
            }
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-background-dark min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            {/* Main Layout Container: Everything constrained to max-w-lg */}
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen rounded-t-[40px] overflow-hidden border-t border-white/5">
                <TopNavigation title="프로필" type="sub" />

                <main className="px-4 py-20 animate-fade-in-up">
                    {/* Profile Header */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="size-24 rounded-full bg-slate-200 dark:bg-slate-700 mb-4 overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl">
                            {user ? (
                                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                            ) : (
                                <img src="https://ui-avatars.com/api/?name=Guest+Reader&background=0D8ABC&color=fff" alt="User" className="w-full h-full object-cover" />
                            )}
                        </div>

                        <h2 className="text-2xl font-bold text-primary dark:text-white mb-1">
                            {user ? user.displayName : 'Guest Reader'}
                        </h2>

                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-full">
                            {user ? 'Verified Member' : 'Novice Reader'}
                        </span>

                        {!user && (
                            <button
                                onClick={handleLogin}
                                className="mt-6 px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
                            >
                                Google로 로그인
                            </button>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 text-center">
                            <span className="block text-2xl font-black text-primary dark:text-gold mb-1">0</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Books Read</span>
                        </div>
                        <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 text-center">
                            <span className="block text-2xl font-black text-primary dark:text-gold mb-1">1</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Tests Taken</span>
                        </div>
                        <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 text-center">
                            <span className="block text-2xl font-black text-primary dark:text-gold mb-1">0</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Saved</span>
                        </div>
                    </div>

                    {/* Settings Menu */}
                    <div className="bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5">
                        <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-slate-400">notifications</span>
                                <span className="text-sm font-medium">알림 설정</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 text-sm">arrow_forward_ios</span>
                        </button>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-slate-400">dark_mode</span>
                                <span className="text-sm font-medium">다크 모드</span>
                            </div>
                            <div className="w-10 h-5 bg-slate-200 rounded-full relative">
                                <div className="absolute left-1 top-1 size-3 bg-white rounded-full shadow-sm"></div>
                            </div>
                        </button>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-slate-400">support</span>
                                <span className="text-sm font-medium">고객 지원</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 text-sm">arrow_forward_ios</span>
                        </button>
                    </div>

                    {user && (
                        <div className="mt-6 px-2">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/10 text-red-500 font-bold rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined">logout</span>
                                <span>로그아웃</span>
                            </button>
                        </div>
                    )}

                    <p className="text-center text-[10px] text-slate-400 mt-8 mb-4">
                        The Archive v1.0.2<br />
                        Powered by Stitch MCP
                    </p>
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
