import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginWithGoogle, loginWithGoogleRedirect, getRedirectResult } from '../firebase';
import { setPersistence, browserLocalPersistence } from 'firebase/auth'; // Import required
import TopNavigation from '../components/TopNavigation';

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingResult, setIsCheckingResult] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        // [Redirect Result Check]
        // This MUST run before auth state check to catch users returning from Google.
        getRedirectResult(auth)
            .then((result) => {
                if (result) {
                    console.log("Redirect Login Success:", result.user.email);
                    // Auth state listener will handle the actual navigation
                } else {
                    // No redirect result. Just a normal load.
                    setIsCheckingResult(false);
                }
            })
            .catch((error) => {
                console.error("Redirect Error:", error);
                setErrorMsg(error.message);
                setIsCheckingResult(false);
            });

        // [Auth State Listener]
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("Auth State Confirmed:", user.email);
                setIsCheckingResult(false);
                navigate('/profile', { replace: true });
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setErrorMsg('');

        try {
            // [CRITICAL FIX]
            // Explicitly force LOCAL persistence before redirecting.
            // This tells iOS Safari: "Save this session to disk, don't lose it!"
            await setPersistence(auth, browserLocalPersistence);

            // Using Redirect for Mobile robustness (Popup is too flaky on iOS)
            // Now that authDomain is correct (firebaseapp.com), redirect should 100% work.
            // And setPersistence ensures we stay logged in upon return.
            await loginWithGoogleRedirect();

        } catch (error) {
            console.error("Login Error:", error);
            setErrorMsg(error.message);
            setIsLoading(false);
        }
    };

    // Initial Loading (Wait for Redirect Result)
    if (isCheckingResult) {
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
                                <span>Google로 계속하기</span>
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
