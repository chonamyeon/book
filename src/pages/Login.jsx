import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import TopNavigation from '../components/TopNavigation';

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isRedirectCheck, setIsRedirectCheck] = useState(true);

    useEffect(() => {
        // [Redirect Result Handling]
        // Crucial for iOS navigation flow.
        getRedirectResult(auth)
            .then((result) => {
                if (result) {
                    console.log("Redirect Success:", result.user.email);
                    // Auth state listener below will handle the navigation
                }
                setIsRedirectCheck(false);
            })
            .catch((error) => {
                console.error("Redirect Error:", error);
                setIsRedirectCheck(false);
                if (error.code !== 'auth/popup-closed-by-user') {
                    // Only show real errors
                    setErrorMsg(error.message);
                }
            });

        // [Auth State Listener]
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                navigate('/profile', { replace: true });
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setErrorMsg('');

        // Detect Mobile (iOS/Android)
        // If mobile, use Redirect to avoid "New Tab/Window" confusion.
        // If PC, use Popup for better UX.
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        try {
            if (isMobile) {
                console.log("Starting Mobile Redirect Flow...");
                await signInWithRedirect(auth, googleProvider);
                // Page will unload here.
            } else {
                console.log("Starting PC Popup Flow...");
                await signInWithPopup(auth, googleProvider);
            }
        } catch (error) {
            console.error("Login Error:", error);
            setIsLoading(false);
            setErrorMsg(error.message);
        }
    };

    if (isRedirectCheck) {
        return (
            <div className="bg-background-dark min-h-screen flex flex-col items-center justify-center text-white">
                <div className="size-8 border-4 border-slate-700 border-t-gold rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 text-sm">로그인 확인 중...</p>
                <p className="text-slate-600 text-xs mt-2">잠시만 기다려주세요 (v3.0)</p>
            </div>
        );
    }

    return (
        <div className="bg-background-dark min-h-screen flex flex-col font-display text-white">
            <TopNavigation title="로그인" type="sub" />

            <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="text-center mb-10">
                        <div className="size-20 bg-white/5 rounded-2xl mx-auto flex items-center justify-center border border-white/10 mb-6 shadow-2xl shadow-gold/5">
                            <span className="material-symbols-outlined text-4xl text-gold">menu_book</span>
                        </div>
                        <h1 className="serif-title text-3xl mb-2">The Archive</h1>
                        <p className="text-slate-400 text-sm">기록하고, 기억하고, 성장하세요.</p>
                    </div>

                    {/* Error Msg */}
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
                                <span>Google로 계속하기</span>
                            </>
                        )}
                    </button>

                    <p className="text-center text-slate-500 text-[10px] mt-6">
                        로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
                        <br /><span className="text-[10px] opacity-30 mt-1 block">v3.0 (Auto-Redirect)</span>
                    </p>
                </div>
            </main>
        </div>
    );
}
