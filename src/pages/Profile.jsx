import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainHeader from '../components/MainHeader';
import LoadingScreen from '../components/LoadingScreen';
import BottomNavigation from '../components/BottomNavigation';
import { logout, auth, db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import Footer from '../components/Footer';
import KakaoAdFit from '../components/KakaoAdFit';
import { deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const TYPE_META = {
    growth:        { label: '성장·실행형', icon: 'trending_up',      color: 'text-blue-400',    bg: 'bg-blue-500/20' },
    entertainment: { label: '창의·탐험형', icon: 'auto_stories',     color: 'text-violet-400',  bg: 'bg-violet-500/20' },
    empathy:       { label: '공감·관계형', icon: 'favorite',         color: 'text-rose-400',    bg: 'bg-rose-500/20' },
    mindfulness:   { label: '사색·마음형', icon: 'self_improvement', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
};


export default function Profile() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    const memberSince = (() => {
        const t = user?.metadata?.creationTime;
        if (!t) return '';
        const d = new Date(t);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}. ${m}. ${day}`;
    })();

    const quizResultType = localStorage.getItem('quizResult') || localStorage.getItem('myResultType');
    const quizScores = (() => { try { return JSON.parse(localStorage.getItem('quizScores')); } catch { return null; } })();

    const handlePersona = () => {
        if (quizResultType) {
            navigate('/result', { state: { resultType: quizResultType, scores: quizScores } });
        } else {
            navigate('/quiz');
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        setDeleteError('');
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('인증 정보 없음');

            // 재인증 (구글)
            const provider = new GoogleAuthProvider();
            await reauthenticateWithPopup(currentUser, provider);

            const email = currentUser.email;
            const uid = currentUser.uid;

            // 1. 블랙리스트에 이메일 저장
            const safeKey = email.replace(/[.#$\[\]]/g, '_');
            await setDoc(doc(db, 'deletedUsers', safeKey), {
                email,
                uid,
                deletedAt: serverTimestamp(),
            });

            // 2. 유저 문서 삭제
            await deleteDoc(doc(db, 'users', uid));

            // 3. Firebase Auth 계정 삭제
            await deleteUser(currentUser);

            navigate('/', { replace: true });
        } catch (err) {
            console.error('탈퇴 실패:', err);
            if (err.code === 'auth/popup-closed-by-user') {
                setDeleteError('재인증을 완료해야 탈퇴가 가능합니다.');
            } else {
                setDeleteError('탈퇴 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleLogout = async () => {
        if (window.confirm("로그아웃 하시겠습니까?")) {
            try {
                await logout();
                navigate('/login'); // Redirect to login after logout
            } catch (error) {
                console.error("Logout failed:", error);
                alert("로그아웃 중 오류: " + error.message);
            }
        }
    };

    if (loading) return <LoadingScreen />;

    if (!user) return null;

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5">
                <MainHeader showBack />

                <main className="px-6 pt-8 pb-24 animate-fade-in-up space-y-8">

                    {/* Membership Card */}
                    <div className="relative w-full aspect-[1.58/1] rounded-none overflow-hidden shadow-2xl group">
                        {/* Background with texture */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black"></div>
                        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.15)1px,transparent 1px)',backgroundSize:'12px 12px'}}></div>
                        <div className="absolute -top-24 -right-24 size-64 bg-gold/20 blur-[80px] rounded-none"></div>

                        {/* Card Content */}
                        <div className="absolute inset-0 p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="serif-title text-gold text-lg italic tracking-wider">The Archiview</h3>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] block mt-1">Private Membership</span>
                                </div>
                                <div className="size-8 rounded-none border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm">
                                    <span className="material-symbols-outlined text-white/80 text-sm">fingerprint</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="size-12 rounded-none bg-slate-700 border-2 border-gold/50 overflow-hidden shadow-lg">
                                        <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=0D8ABC&color=fff`} alt={user.displayName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-lg leading-none">{user.displayName}</p>
                                        <p className="text-slate-400 text-xs mt-1 font-mono tracking-wide">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end border-t border-white/10 pt-3">
                                    <div>
                                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Member Since</span>
                                        <span className="text-xs text-slate-300 font-mono">{memberSince}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Status</span>
                                        <span className="text-xs text-emerald-400 font-bold tracking-wide">ACTIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Menu Links */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">My archiview</h4>

                        <div className="bg-white/5 rounded-none overflow-hidden border border-white/5 divide-y divide-white/5">
                            <button className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="size-8 rounded-none bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-lg">book_2</span>
                                    </div>
                                    <span className="text-sm text-slate-200 font-medium">나의 서재</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-500 text-sm">arrow_forward_ios</span>
                            </button>
                            <button onClick={() => navigate('/reading-notes')} className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="size-8 rounded-none bg-pink-500/20 flex items-center justify-center text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-lg">edit_note</span>
                                    </div>
                                    <span className="text-sm text-slate-200 font-medium">기록노트</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-500 text-sm">arrow_forward_ios</span>
                            </button>
                            <button onClick={handlePersona} className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={`size-8 rounded-none flex items-center justify-center transition-colors ${quizResultType ? (TYPE_META[quizResultType]?.bg || 'bg-orange-500/20') : 'bg-orange-500/20'} group-hover:bg-orange-500`}>
                                        <span className={`material-symbols-outlined text-lg group-hover:text-white transition-colors ${quizResultType ? (TYPE_META[quizResultType]?.color || 'text-orange-400') : 'text-orange-400'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                            {quizResultType ? (TYPE_META[quizResultType]?.icon || 'psychology') : 'psychology'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-slate-200 font-medium">나의 페르소나</span>
                                        {quizResultType && (
                                            <span className="block text-[11px] text-slate-500 mt-0.5">{TYPE_META[quizResultType]?.label || ''}</span>
                                        )}
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-slate-500 text-sm">arrow_forward_ios</span>
                            </button>
                        </div>
                    </div>

                    {/* Account Management */}
                    <div className="space-y-4 pt-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Account</h4>

                        <div className="bg-white/5 rounded-none overflow-hidden border border-white/5 divide-y divide-white/5">
                            <div className="flex justify-center px-4 py-3">
                                <KakaoAdFit unit="DAN-aXfyL1HtK8zp0vui" width="320" height="100" />
                            </div>
                            <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors group text-red-400">
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined">logout</span>
                                    <span className="text-sm font-medium">로그아웃</span>
                                </div>
                            </button>
                            <button onClick={() => setShowDeleteModal(true)} className="w-full flex items-center justify-between p-4 hover:bg-red-900/20 transition-colors group text-red-600/70">
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-[18px]">person_remove</span>
                                    <span className="text-sm font-medium">탈퇴하기</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    <Footer />

                    {/* 탈퇴 확인 모달 */}
                    {showDeleteModal && (
                        <div className="fixed inset-0 z-[500] flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
                            <div className="w-full max-w-[320px] bg-[#12141c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-red-400" style={{ fontSize: 20 }}>warning</span>
                                        </div>
                                        <h3 className="text-white font-black text-[16px]">정말 탈퇴하시겠습니까?</h3>
                                    </div>
                                    <p className="text-white/50 text-[12px] leading-relaxed mb-2">
                                        탈퇴 시 모든 데이터가 영구 삭제되며 복구가 불가능합니다.
                                    </p>
                                    <p className="text-red-400/80 text-[11px] font-bold leading-relaxed mb-5">
                                        ※ 탈퇴 후 동일한 구글 계정으로 재가입이 불가능합니다.
                                    </p>
                                    {deleteError && (
                                        <p className="text-red-400 text-[11px] font-bold mb-4 p-3 bg-red-500/10 rounded-lg">{deleteError}</p>
                                    )}
                                    <p className="text-white/30 text-[10px] mb-5">본인 확인을 위해 구글 재인증이 필요합니다.</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setShowDeleteModal(false); setDeleteError(''); }}
                                            className="flex-1 py-3 bg-white/10 text-white text-[13px] font-bold rounded-xl hover:bg-white/15 transition-colors"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleDeleteAccount}
                                            disabled={deleteLoading}
                                            className="flex-1 py-3 bg-red-600 text-white text-[13px] font-black rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50"
                                        >
                                            {deleteLoading ? '처리중...' : '탈퇴하기'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
