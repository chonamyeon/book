import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged } from 'firebase/auth';
import TopNavigation from '../components/TopNavigation';

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const googleBtnRef = useRef(null);

    useEffect(() => {
        const initGoogle = () => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: "81562499893-ur8s5hh4m8019htb6uo0j52qf7qg0s09.apps.googleusercontent.com",
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

                    <div className="flex flex-col items-center justify-center min-h-[60px] relative">
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background-dark z-10">
                                <div className="size-8 border-3 border-gold/20 border-t-gold rounded-full animate-spin"></div>
                            </div>
                        )}
                        <div ref={googleBtnRef} className="w-full flex justify-center py-2 bg-white rounded-xl overflow-hidden shadow-2xl transition-opacity duration-500"></div>
                    </div>

                    <div className="mt-12 p-5 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            아이폰 사용자를 위한 구글 공식 버튼이 적용되었습니다. <br />
                            <strong>버튼이 보이지 않을 경우 잠시만 기다려주세요.</strong>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
