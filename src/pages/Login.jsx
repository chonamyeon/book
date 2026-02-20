import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginWithGoogleRedirect } from '../firebase';
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import TopNavigation from '../components/TopNavigation';

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
                        <p className="text-slate-400 text-sm">안전한 로그인을 위해 버튼을 불러오는 중입니다.</p>
                    </div>

                    <div className="flex flex-col items-center justify-center min-h-[60px] relative space-y-4">
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background-dark/80 z-20">
                                <div className="size-8 border-3 border-gold/20 border-t-gold rounded-full animate-spin"></div>
                            </div>
                        )}
                        <div ref={googleBtnRef} className="w-full flex justify-center py-2 bg-white rounded-xl overflow-hidden shadow-2xl transition-opacity duration-500 min-h-[50px]"></div>

                        <button
                            onClick={handleMobileLogin}
                            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl text-sm text-slate-300 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">touch_app</span>
                            로그인이 안 되나요? (구 방식 로그인)
                        </button>
                    </div>

                    <div className="mt-12 p-5 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            아이폰 사용자를 위한 구글 공식 버튼이 적용되었습니다. <br />
                            <strong>버튼이 동작하지 않으면 아래 '구 방식 로그인'을 이용해주세요.</strong>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
