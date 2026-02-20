import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import TopNavigation from '../components/TopNavigation';

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [retryMode, setRetryMode] = useState(false);

    useEffect(() => {
        // Auth State Listener
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
            // [Force Sync Strategy]
            // We await the popup result. If it succeeds, it means the user authenticated in the popup.
            const result = await signInWithPopup(auth, googleProvider);

            console.log("Popup Login Success:", result.user.email);

            // [CRITICAL FIX for Safari]
            // Even if signInWithPopup succeeds, the main window might not detect the cookie change immediately due to ITP.
            // We FORCE a page reload. This forces the browser to re-establish the session from the server/cookies.
            alert("로그인에 성공했습니다. 잠시 후 이동합니다.");
            window.location.reload();

        } catch (error) {
            console.error("Popup Login Failed:", error);
            setIsLoading(false);

            if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
                setRetryMode(true);
                setErrorMsg("팝업이 차단되었습니다. 아래 '다시 시도' 버튼을 눌러주세요.");
            } else if (error.code === 'auth/popup-closed-by-user') {
                setErrorMsg("로그인 창이 닫혔습니다. 다시 시도해주세요.");
            } else {
                setErrorMsg("로그인 오류: " + error.message);
            }
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
                        <div className={`border rounded-xl p-4 mb-6 text-center animate-pulse ${retryMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <p className={`${retryMode ? 'text-amber-400' : 'text-red-400'} text-sm font-bold leading-relaxed break-keep`}>
                                {errorMsg}
                            </p>
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 ${retryMode ? 'bg-amber-500 text-slate-900 animate-bounce' : 'bg-white text-slate-900'}`}
                    >
                        {isLoading ? (
                            <div className="size-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                {retryMode ? (
                                    <>
                                        <span className="material-symbols-outlined text-xl">refresh</span>
                                        <span>다시 시도하기 (팝업 허용)</span>
                                    </>
                                ) : (
                                    <>
                                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="size-5" />
                                        <span>Google로 계속하기</span>
                                    </>
                                )}
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
