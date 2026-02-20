
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginWithGoogleRedirect } from '../firebase';
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const googleBtnRef = useRef(null);

    useEffect(() => {
        // 1. Check for redirect result (Mobile/Safari flow)
        getRedirectResult(auth).then((result) => {
            if (result) {
                console.log("Redirect login success");
                navigate('/profile', { replace: true });
            }
        }).catch((error) => {
            console.error("Redirect login error:", error);
            setIsLoading(false);
        });

        const initGoogle = () => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: "176157090689-b1cis9q41ikr4qd004nbvsst7l8lrjvm.apps.googleusercontent.com",
                    callback: handleGoogleResponse,
                    ux_mode: "popup",
                });

                if (googleBtnRef.current) {
                    window.google.accounts.id.renderButton(
                        googleBtnRef.current,
                        { theme: "outline", size: "large", width: "320", logo_alignment: "left" }
                    );
                }
                setIsLoading(false);
            } else {
                // Try again in 300ms if script is not ready
                setTimeout(initGoogle, 300);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                navigate('/profile', { replace: true });
            } else {
                initGoogle();
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleGoogleResponse = async (response) => {
        setIsLoading(true);
        try {
            const credential = GoogleAuthProvider.credential(response.credential);
            await signInWithCredential(auth, credential);
            navigate('/profile', { replace: true });
        } catch (error) {
            console.error("Auth Fail:", error);
            setIsLoading(false);
        }
    };

    const handleMobileLogin = async () => {
        setIsLoading(true);
        try {
            await loginWithGoogleRedirect();
        } catch (error) {
            console.error("Redirect start fail:", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-background-dark min-h-screen flex flex-col font-display text-white">
            <TopNavigation title="로그인" type="sub" />

            <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-10">
                        <div className="size-20 bg-white/5 rounded-2xl mx-auto flex items-center justify-center border border-white/10 mb-6">
                            <span className="material-symbols-outlined text-4xl text-gold">menu_book</span>
                        </div>
                        <h1 className="serif-title text-3xl mb-2">The Archive</h1>
                        <p className="text-slate-400 text-sm">당신의 지적 여정을 기록하는 프리미엄 아카이브</p>
                    </div>

                    <div className="flex flex-col items-center justify-center min-h-[60px] relative space-y-4">
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background-dark/80 z-20">
                                <div className="size-8 border-3 border-gold/20 border-t-gold rounded-full animate-spin"></div>
                            </div>
                        )}
                        {/* PC: Show Google Button, Hide Mobile Button */}
                        <div ref={googleBtnRef} className="hidden md:flex w-full justify-center py-2 bg-white rounded-xl overflow-hidden shadow-2xl transition-opacity duration-500 min-h-[50px]"></div>

                        {/* Mobile: Show Mobile Button, Hide Google Button */}
                        <button
                            onClick={async (e) => {
                                setIsLoading(true);
                                try {
                                    await loginWithGoogleRedirect();
                                } catch (error) {
                                    setIsLoading(false);
                                }
                            }}
                            className="md:hidden w-full py-4 px-6 bg-white text-slate-900 font-bold rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3 mt-4"
                            style={{ zIndex: 50, position: 'relative' }}
                        >
                            <span className="material-symbols-outlined">touch_app</span>
                            여기를 눌러 로그인하세요
                        </button>
                    </div>

                    <div className="mt-12 p-5 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            The Archive는 당신의 독서 취향을 분석하여<br />
                            최고의 지적 경험을 선사합니다.
                        </p>
                    </div>
                </div>
            </main>
            <BottomNavigation />
        </div>
    );
}

