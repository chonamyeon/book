import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginWithGoogleRedirect } from '../firebase';
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

const BENEFITS = [
    { icon: 'bookmark',          text: '독서 기록 영구 저장',       sub: '읽은 책과 인사이트를 나만의 아카이브에' },
    { icon: 'recommend',         text: '맞춤 도서 큐레이션',        sub: '취향 분석 기반 personalized 추천' },
    { icon: 'headphones',        text: '오디오 인사이트 전체 이용', sub: '이동 중에도 15분 핵심 요약 청취' },
    { icon: 'workspace_premium', text: '프리미엄 멤버십 혜택',      sub: '전문 에디터의 심층 분석 콘텐츠 이용' },
];

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [googleReady, setGoogleReady] = useState(false);
    const googleBtnRef = useRef(null);

    const saveUserToFirestore = async (user) => {
        try {
            const { db } = await import('../firebase');
            const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore');
            const userRef = doc(db, 'users', user.uid);
            const snap = await getDoc(userRef);
            const isNewUser = !snap.exists() || !snap.data().trialStartDate;
            await setDoc(userRef, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                lastLogin: serverTimestamp(),
                status: '활동중',
                ...(isNewUser ? { trialStartDate: serverTimestamp(), isPremium: false } : {}),
            }, { merge: true });
            if (isNewUser && window.fbq) window.fbq('track', 'CompleteRegistration', { method: 'Google' });
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        // 모바일 redirect 결과 처리
        getRedirectResult(auth).then((result) => {
            if (result) navigate('/profile', { replace: true });
        }).catch(() => setIsLoading(false));

        const initGoogle = () => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: "176157090689-b1cis9q41ikr4qd004nbvsst7l8lrjvm.apps.googleusercontent.com",
                    callback: handleGoogleResponse,
                    ux_mode: "popup",
                });
                setIsLoading(false);
                setGoogleReady(true); // div 렌더 후 renderButton 트리거
            } else {
                setTimeout(initGoogle, 300);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                await saveUserToFirestore(user);
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
            const { user } = await signInWithCredential(auth, credential);
            await saveUserToFirestore(user);
            navigate('/profile', { replace: true });
        } catch (e) {
            console.error('Auth Fail:', e);
            setIsLoading(false);
        }
    };

    const handleMobileLogin = async () => {
        setIsLoading(true);
        try { await loginWithGoogleRedirect(); }
        catch { setIsLoading(false); }
    };

    // googleReady & div 마운트 후 SDK 버튼 렌더링 (PC만)
    useEffect(() => {
        if (googleReady && googleBtnRef.current && window.innerWidth >= 768) {
            window.google.accounts.id.renderButton(
                googleBtnRef.current,
                { theme: "outline", size: "large", width: "360", logo_alignment: "left" }
            );
        }
    }, [googleReady]);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div className="bg-background-dark min-h-screen flex flex-col font-display text-white">
            <TopNavigation title="무료 시작하기" type="sub" />

            <main className="flex-1 flex flex-col items-center justify-start px-5 pt-6 pb-10 overflow-y-auto">
                <div className="w-full max-w-sm">

                    {/* 헤더 */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full mb-5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Free Membership</span>
                        </div>
                        <h1 className="text-[26px] font-black text-white tracking-tight leading-tight mb-2">
                            지금 바로<br />
                            <span className="text-amber-400">무료</span>로 시작하세요
                        </h1>
                        <p className="text-slate-500 text-[13px] font-medium">구글 계정으로 10초 만에 가입 완료</p>
                    </div>

                    {/* 혜택 구분선 */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1 h-px bg-white/5"></div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">회원 혜택</span>
                        <div className="flex-1 h-px bg-white/5"></div>
                    </div>

                    {/* 혜택 리스트 */}
                    <div className="space-y-2.5 mb-8">
                        {BENEFITS.map((b, i) => (
                            <div key={i} className="flex items-center gap-4 px-4 py-3.5 bg-[#0e1117] border border-white/[0.06] rounded-xl">
                                <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-amber-400 text-[18px]">{b.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-black text-white leading-tight">{b.text}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{b.sub}</p>
                                </div>
                                <span className="material-symbols-outlined text-emerald-400 text-[17px] shrink-0">check_circle</span>
                            </div>
                        ))}
                    </div>

                    {/* 로그인 버튼 */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <div className="size-7 border-[2.5px] border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* 데스크탑: Google Identity SDK 버튼 */}
                            {!isMobile && (
                                <div ref={googleBtnRef} className="w-full flex justify-center py-2 bg-white rounded-2xl overflow-hidden shadow-xl min-h-[52px] mb-4"></div>
                            )}

                            {/* 모바일: redirect 버튼 (기존 방식) */}
                            {isMobile && (
                                <button
                                    onClick={handleMobileLogin}
                                    className="w-full py-4 px-5 bg-white hover:bg-gray-50 text-slate-800 font-bold rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-[15px] mb-4"
                                >
                                    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
                                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                    </svg>
                                    Google 계정으로 무료 시작
                                </button>
                            )}
                        </>
                    )}

                    {/* 약관 */}
                    <p className="text-center text-[10px] text-slate-600 leading-relaxed">
                        가입 시{' '}
                        <span className="text-slate-400 underline cursor-pointer" onClick={() => navigate('/terms')}>이용약관</span>
                        {' '}및{' '}
                        <span className="text-slate-400 underline cursor-pointer" onClick={() => navigate('/privacy')}>개인정보처리방침</span>에 동의합니다.
                    </p>

                    {/* 신뢰 지표 */}
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-6">
                        <div className="text-center">
                            <p className="text-[15px] font-black text-white">15,400+</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Members</p>
                        </div>
                        <div className="w-px h-8 bg-white/5"></div>
                        <div className="text-center">
                            <p className="text-[15px] font-black text-white">28+</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Insights</p>
                        </div>
                        <div className="w-px h-8 bg-white/5"></div>
                        <div className="text-center">
                            <p className="text-[15px] font-black text-white">100%</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Free</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
            <BottomNavigation />
        </div>
    );
}
