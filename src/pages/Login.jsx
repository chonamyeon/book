import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginWithGoogle, loginWithGoogleRedirect, getRedirectResult } from '../firebase';
import TopNavigation from '../components/TopNavigation';

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Prevent premature rendering
    const [isMobile, setIsMobile] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        // Simple Mobile Detection
        const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        setIsMobile(mobile);

        // 1. Initial Auth Check
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("Logged In User:", user.email);
                setIsCheckingAuth(false);
                navigate('/profile', { replace: true });
            } else {
                // If not logged in, wait for redirect result logic below (on mobile)
                if (!mobile) setIsCheckingAuth(false);
            }
        });

        // 2. Handle Redirect Result (Mobile Key Logic)
        if (mobile) {
            getRedirectResult(auth)
                .then((result) => {
                    if (result) {
                        console.log("Redirect Success:", result.user.email);
                        // onAuthStateChanged will handle navigation
                    } else {
                        // No redirect result found -> Show login screen
                        setIsCheckingAuth(false);
                    }
                })
                .catch((error) => {
                    console.error("Redirect Error:", error);
                    setErrorMsg(error.message);
                    setIsCheckingAuth(false);
                });
        }

        return () => unsubscribe();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setErrorMsg('');

        try {
            if (isMobile) {
                // Mobile: Redirect (Robust, survives page navigation)
                // Now that authDomain is fixed to firebaseapp.com, this should work perfectly.
                await loginWithGoogleRedirect();
            } else {
                // PC: Popup (Better UX)
                await loginWithGoogle();
            }
        } catch (error) {
            console.error("Login Error:", error);
            setErrorMsg(error.message);
            setIsLoading(false);
        }
    };

    // Loading screen while checking auth/redirect result
    if (isCheckingAuth) {
        return (
            <div className="bg-background-dark min-h-screen flex flex-col items-center justify-center text-white">
                <div className="size-8 border-4 border-slate-700 border-t-gold rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 text-sm">로그인 확인 중...</p>
            </div>
        );
    }

    return (
        <div className="bg-background-dark min-h-screen flex flex-col font-display text-white">
            <TopNavigation title="로그인" type="sub" />

            <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
                <div className="w-full max-w-sm">
                    {/* Logo / Branding */}
                    <div className="text-center mb-10">
                        <div className="size-20 bg-white/5 rounded-2xl mx-auto flex items-center justify-center border border-white/10 mb-6 shadow-2xl shadow-gold/5">
                            <span className="material-symbols-outlined text-4xl text-gold">menu_book</span>
                        </div>
                        <h1 className="serif-title text-3xl mb-2">The Archive</h1>
                        <p className="text-slate-400 text-sm">기록하고, 기억하고, 성장하세요.</p>
                    </div>

                    {/* Error Message */}
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-center">
                            <p className="text-red-400 text-sm font-bold leading-relaxed break-keep">
                                {errorMsg}
                            </p>
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-white text-slate-900 h-14 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {isLoading ? (
                            <div className="size-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="size-5" />
                                <span>Google로 {isMobile ? "이동하여" : ""} 계속하기</span>
                            </>
                        )}
                    </button>

                    <p className="text-center text-slate-500 text-[10px] mt-6">
                        로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
                    </p>
                </div>
            </main>
        </div>
    );
}
