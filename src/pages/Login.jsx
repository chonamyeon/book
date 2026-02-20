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

    // [Safari Detection]
    // User-provided strict detection for Safari
    const isSafari = () => {
        const ua = navigator.userAgent;
        return /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
    };

    useEffect(() => {
        // [Redirect Result Handling]
        // Crucial for capturing the user after they return from Google on Safari.
        getRedirectResult(auth)
            .then((result) => {
                if (result) {
                    console.log("Redirect Login Success:", result.user.email);
                    // Navigation will be handled by onAuthStateChanged
                }
                setIsRedirectCheck(false);
            })
            .catch((error) => {
                console.error("Redirect Login Error:", error);
                setIsRedirectCheck(false);
                if (error.code !== 'auth/popup-closed-by-user') {
                    setErrorMsg(error.message);
                }
            });

        // [Auth State Listener]
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("Auth State Changed: User Logged In", user.email);
                navigate('/profile', { replace: true });
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setErrorMsg('');

        try {
            if (isSafari()) {
                // Safari ITP Fix: Use Redirect
                console.log("Detected Safari: Using Redirect Flow");
                await signInWithRedirect(auth, googleProvider);
                // Page unloads here.
            } else {
                // Chrome/Others: Use Popup (Better UX)
                console.log("Detected Non-Safari: Using Popup Flow");
                await signInWithPopup(auth, googleProvider);
                // Popup success handled by onAuthStateChanged or await completion
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
                <p className="text-slate-600 text-xs mt-2">v4.0 (Safari ITP Fix)</p>
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
                        <br /><span className="text-[10px] opacity-30 mt-1 block">v4.0 (Safari ITP Fix)</span>
                    </p>
                </div>
            </main>
        </div>
    );
}
