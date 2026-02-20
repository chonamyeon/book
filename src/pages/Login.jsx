import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginWithGoogle } from '../firebase';
import TopNavigation from '../components/TopNavigation';

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isPWA, setIsPWA] = useState(false);

    useEffect(() => {
        // Check if running in PWA (Standalone) mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        setIsPWA(isStandalone);

        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("Auth State Changed: User Logged In", user.email);
                navigate('/profile', { replace: true });
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        if (isPWA) {
            // Force open in external browser (Safari)
            // By adding a random query param, we force the browser to treat it as a new navigation
            const targetUrl = window.location.origin;
            window.location.href = targetUrl;
            alert("Safari 브라우저가 열리면 거기서 로그인해주세요.\n(아이폰 보안 정책상 앱 내 로그인이 제한됩니다.)");
            return;
        }

        setIsLoading(true);
        setErrorMsg('');

        try {
            await loginWithGoogle();
        } catch (error) {
            console.error("Popup Login Failed:", error);
            setIsLoading(false);

            if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
                setErrorMsg("팝업이 차단되었습니다. 아이폰 설정 > Safari > 팝업 차단(Pop-up Block)을 '해제'하고 다시 시도해주세요.");
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
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-center animate-pulse">
                            <p className="text-red-400 text-sm font-bold leading-relaxed break-keep">
                                {errorMsg}
                            </p>
                        </div>
                    )}

                    {/* PWA Warning & Action */}
                    {isPWA ? (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
                            <p className="text-amber-400 font-bold mb-2">⚠️ 아이폰 앱 로그인 제한</p>
                            <p className="text-slate-400 text-xs mb-4 leading-relaxed break-keep">
                                아이폰 보안 정책상 홈 화면 앱에서는 구글 로그인이 제한됩니다.<br />
                                아래 버튼을 눌러 <strong>Safari</strong>에서 로그인해주세요.
                            </p>
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full bg-amber-500 text-slate-900 h-12 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg mb-2"
                            >
                                <span className="material-symbols-outlined text-xl">open_in_browser</span>
                                <span>Safari에서 열기</span>
                            </button>
                        </div>
                    ) : (
                        /* Standard Login Button */
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
                    )}

                    <p className="text-center text-slate-500 text-[10px] mt-6">
                        로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
                    </p>
                </div>
            </main>
        </div>
    );
}
