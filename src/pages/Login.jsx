import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginWithGoogleRedirect, getRedirectResult } from '../firebase';
import TopNavigation from '../components/TopNavigation';

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Monitor Auth State Changes (The most reliable way)
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("Auth State Changed: User Logged In", user.email);
                // Clear login flag
                localStorage.removeItem('isLoggingIn');
                // Redirect immediately to profile
                navigate('/profile', { replace: true });
            }
        });

        // Also check redirect result for errors specifically
        getRedirectResult(auth)
            .then((result) => {
                if (result) {
                    console.log("Redirect Result Success:", result.user.email);
                    // navigate is handled by onAuthStateChanged above
                } else {
                    // If we expected a redirect result (flag set) but got null, maybe it's still loading?
                    const isLoggingIn = localStorage.getItem('isLoggingIn');
                    if (isLoggingIn) {
                        console.log("Redirect returned null but flag is set. Waiting for Auth State...");
                        // Don't clear flag yet, let onAuthStateChanged handle it or timeout
                    }
                }
            })
            .catch((error) => {
                console.error("Redirect Login Error:", error);
                setErrorMsg(error.message);
                localStorage.removeItem('isLoggingIn'); // Clear flag on error
                // Handle specific error codes if needed
                if (error.code === 'auth/popup-closed-by-user') {
                    // Ignore strictly
                }
            });

        return () => unsubscribe();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            // Set flag to track login attempt across redirects
            localStorage.setItem('isLoggingIn', 'true');

            // Using Redirect method for maximum compatibility (mobile/desktop)
            // ensuring no popup blocker issues on a dedicated login page.
            await loginWithGoogleRedirect();
        } catch (error) {
            console.error("Initiate Login Error:", error);
            setErrorMsg(error.message);
            setIsLoading(false);
        }
    };

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
                            <p className="text-red-400 text-xs font-bold leading-relaxed">
                                {errorMsg}
                            </p>
                            <p className="text-red-500/50 text-[10px] mt-1">
                                (설정 → Safari → 팝업 차단 해제 필요할 수 있음)
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
