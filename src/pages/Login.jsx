
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginWithGoogleRedirect } from '../firebase';
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import MainHeader from '../components/MainHeader';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const googleBtnRef = useRef(null);

    const finishLogin = () => {
        const redirectTo = sessionStorage.getItem('loginRedirect');
        if (redirectTo) {
            sessionStorage.removeItem('loginRedirect');
            navigate(redirectTo, { replace: true });
        } else {
            navigate('/profile', { replace: true });
        }
    };

    const syncUserProfile = async (user) => {
        if (!user) return false;
        const { db } = await import('../firebase');
        const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore');

        const safeKey = (user.email || '').replace(/[.#$\[\]]/g, '_');
        const blockedSnap = await getDoc(doc(db, 'deletedUsers', safeKey));
        if (blockedSnap.exists()) {
            await import('firebase/auth').then(({ signOut }) => signOut(auth));
            alert('탈퇴된 계정입니다. 동일한 구글 계정으로는 재가입이 불가능합니다.');
            return false;
        }

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        const updates = {
            displayName: user.displayName || user.email?.split('@')[0] || '회원',
            name: user.displayName || user.email?.split('@')[0] || '회원',
            email: user.email,
            photoURL: user.photoURL,
            lastLogin: serverTimestamp(),
            status: '활동중',
        };
        const isNewUser = !snap.exists() || !snap.data().trialStartDate;
        if (isNewUser) {
            updates.trialStartDate = serverTimestamp();
            updates.isPremium = false;
        }
        await setDoc(userRef, updates, { merge: true });
        if (isNewUser && window.fbq) {
            window.fbq('track', 'CompleteRegistration', { method: 'Google' });
        }
        return true;
    };

    useEffect(() => {
        // 1. Check for redirect result (브라우저 redirect flow)
        getRedirectResult(auth).then(async (result) => {
            if (result) {
                const synced = await syncUserProfile(result.user);
                if (synced) finishLogin();
            }
            // result 없으면(= redirect 아님) 로딩 해제는 onAuthStateChanged에서 처리
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

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Save/Update user profile in Firestore
                try {
                    const synced = await syncUserProfile(user);
                    if (!synced) return;
                } catch (error) {
                    console.error("Error updating user profile:", error);
                }
                finishLogin();
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
            const userCredential = await signInWithCredential(auth, credential);
            const synced = await syncUserProfile(userCredential.user);
            if (synced) finishLogin();
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

    const handleKakaoLogin = () => {
        if (!window.Kakao) return;
        if (!window.Kakao.isInitialized()) {
            window.Kakao.init('9cbdeec02a8ce33b5deb576a0e63c380');
        }
        window.Kakao.Auth.login({
            success: function(authObj) {
                console.log("Kakao login success", authObj);
                // In a real app, you'd send the authObj.access_token to your server/Firebase
                // Here we'll simulate a login for demo purposes
                navigate('/profile', { replace: true });
            },
            fail: function(err) {
                console.error("Kakao login fail", err);
            },
        });
    };

    return (
        <div className="bg-background-dark min-h-screen flex flex-col font-display text-white">
            <MainHeader showBack />

            <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-10">
                        <div className="size-20 bg-white/5 rounded-2xl mx-auto flex items-center justify-center border border-white/10 mb-6">
                            <span className="material-symbols-outlined text-4xl text-gold">menu_book</span>
                        </div>
                        <h1 className="serif-title text-3xl mb-2">The Archiview</h1>
                        <p className="text-slate-400 text-sm">당신의 지적 여정을 기록하는 프리미엄 아카이브</p>
                    </div>

                    <div className="flex flex-col items-center justify-center min-h-[60px] relative space-y-4">
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background-dark/80 z-20">
                                <div className="av-loader-bars" style={{ height: 28 }}>
                                    <span style={{ height: 10 }} /><span style={{ height: 22 }} />
                                    <span style={{ height: 28 }} /><span style={{ height: 17 }} />
                                    <span style={{ height: 25 }} /><span style={{ height: 13 }} />
                                    <span style={{ height: 20 }} />
                                </div>
                            </div>
                        )}
                        
                        {/* PC: Show Google Button, Hide Mobile Button */}
                        <div ref={googleBtnRef} className="hidden md:flex w-full justify-center py-2 bg-white rounded-xl overflow-hidden shadow-2xl transition-opacity duration-500 min-h-[50px]"></div>

                        {/* Mobile Google Button */}
                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                try {
                                    const result = await loginWithGoogleRedirect();
                                    // PWA popup 방식이면 result가 즉시 반환됨
                                    if (result?.user) {
                                        const synced = await syncUserProfile(result.user);
                                        if (synced) finishLogin();
                                    }
                                    // redirect 방식이면 페이지가 이동하므로 여기 도달 안 함
                                } catch (error) {
                                    console.error("Login error:", error);
                                    setIsLoading(false);
                                }
                            }}
                            className="md:hidden w-full py-4 px-6 bg-white text-slate-900 font-bold rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3"
                            style={{ zIndex: 50, position: 'relative' }}
                        >
                            <span className="material-symbols-outlined">touch_app</span>
                            구글 계정으로 로그인
                        </button>
                    </div>

                    <div className="mt-12 p-5 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            The Archiview는 당신의 독서 취향을 분석하여<br />
                            최고의 지적 경험을 선사합니다.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
            <BottomNavigation />
        </div>
    );
}

