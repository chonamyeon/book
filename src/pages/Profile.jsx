import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { loginWithGoogle, loginWithGoogleRedirect, logout, auth } from '../firebase';
import { getRedirectResult } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';

export default function Profile() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    // Handle redirect result on mount
    useEffect(() => {
        getRedirectResult(auth).catch(err => {
            if (err.code !== 'auth/redirect-cancelled-by-user') {
                console.error("Redirect Result Error:", err);
            }
        });
    }, []);

    // Handle post-login redirection
    useEffect(() => {
        if (user && !loading) {
            const redirectPath = localStorage.getItem('authRedirectPath');
            if (redirectPath && redirectPath !== '/profile') {
                localStorage.removeItem('authRedirectPath');
                const timer = setTimeout(() => {
                    navigate(redirectPath, { replace: true });
                }, 800);
                return () => clearTimeout(timer);
            }
        }
    }, [user, loading, navigate]);

    const handleLogin = async () => {
        try {
            // Popup is generally better if the user action is direct
            await loginWithGoogle();
        } catch (error) {
            console.error("Login failed:", error.code);
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
                // If popup is blocked, use redirect as fallback
                await loginWithGoogleRedirect();
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
            <div className="bg-background-dark min-h-screen flex flex-col items-center justify-center p-8 text-center">
                <div className="relative mb-10">
                    <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                    <div className="size-20 rounded-full border-t-2 border-gold animate-spin"></div>
                </div>
                <h2 className="text-white text-xl font-bold mb-2">인증 확인 중</h2>
                <p className="text-slate-500 text-sm">잠시만 기다려주세요...</p>
            </div>
        );
    }

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen rounded-t-[40px] overflow-hidden border-t border-white/5">
                <TopNavigation title="프로필" type="sub" />

                <main className="px-4 pt-12 pb-24 animate-fade-in-up">
                    {user ? (
                        <>
                            {/* Logged In View */}
                            <div className="flex flex-col items-center mb-8">
                                <div className="size-22 rounded-full bg-slate-200 dark:bg-slate-700 mb-4 overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl">
                                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`} alt={user.displayName} className="w-full h-full object-cover" />
                                </div>
                                <h2 className="text-2xl font-bold text-primary dark:text-white mb-1">{user.displayName}</h2>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-full">
                                    Verified Member
                                </span>
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
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">다크 모드</span>
                                            <span className="text-xs text-slate-400">(준비중)</span>
                                        </div>
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

                            <div className="mt-8 px-2">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/10 text-red-500 font-bold rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined">logout</span>
                                    <span>로그아웃</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Logged Out View */
                        <div className="flex flex-col items-center justify-center pt-8 pb-10 animate-fade-in">
                            <div className="size-20 rounded-full bg-white/5 flex items-center justify-center border border-gold/20 mb-8 shadow-2xl">
                                <span className="material-symbols-outlined text-gold text-4xl">menu_book</span>
                            </div>
                            <h2 className="serif-title text-white text-2xl font-bold mb-2">아카이브 시작하기</h2>
                            <p className="text-slate-400 text-sm text-center max-w-[240px] mb-10 leading-relaxed font-medium">
                                당신만의 개인 서재를 완성하고<br />지적인 기록을 즐겨보세요.
                            </p>
                            <button
                                onClick={handleLogin}
                                className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-white text-primary font-black rounded-2xl shadow-xl hover:scale-[1.01] active:scale-95 mb-10 transition-all border-b-4 border-slate-200"
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="size-6" />
                                <span>Google로 시작하기</span>
                            </button>

                            {/* Diagnostic & Troubleshooting UI */}
                            <div className="w-full p-6 bg-gold/5 rounded-2xl border border-gold/10 text-center">
                                <p className="text-gold text-[11px] font-bold mb-3 flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-sm">verified_user</span>
                                    아이폰 이용자 필수 확인사항
                                </p>
                                <div className="space-y-3 text-left">
                                    <p className="text-slate-400 text-[10px] leading-snug">
                                        1. <span className="text-slate-200 font-bold">인앱 브라우저 차단:</span> 카톡/네이버 앱이 아닌 아이폰 전용 <span className="text-slate-200 font-bold">Safari 앱</span>으로 접속해주세요.
                                    </p>
                                    <p className="text-slate-400 text-[10px] leading-snug">
                                        2. <span className="text-slate-200 font-bold">중요! 도메인 승인:</span> Firebase 콘솔의 Auth &gt; 설정 &gt; <span className="text-white font-bold underline">승인된 도메인</span>에 현재 주소가 추가되었는지 꼭 확인하세요.
                                    </p>
                                    <p className="text-slate-400 text-[10px] leading-snug">
                                        3. <span className="text-slate-200 font-bold">브라우저 설정:</span> 설정 &gt; Safari &gt; <span className="text-slate-200 font-bold">크로스 사이트 추적 방지</span>를 잠시 끄면 즉시 해결됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-center text-[10px] text-slate-500 mt-12 mb-4">
                        The Archive v1.0.3<br />
                        Authorized Domain Check Required
                    </p>
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
