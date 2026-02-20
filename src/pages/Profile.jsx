import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { logout } from '../firebase';
import { useAuth } from '../hooks/useAuth';

export default function Profile() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

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

    if (loading) {
        return (
            <div className="bg-background-dark min-h-screen flex flex-col items-center justify-center p-8 text-center">
                <div className="relative mb-10">
                    <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                    <div className="size-20 rounded-full border-t-2 border-gold animate-spin"></div>
                </div>
                <h2 className="text-white text-xl font-bold mb-2">인증 확인 중</h2>
                <p className="text-slate-500 text-sm">잠시만 기다려주세요...</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen rounded-t-[40px] overflow-hidden border-t border-white/5">
                <TopNavigation title="프로필" type="sub" />

                <main className="px-4 pt-12 pb-24 animate-fade-in-up">
                    {/* Logged In View */}
                    <div className="w-full bg-green-500/10 text-green-500 border border-green-500/20 p-4 font-bold text-center mb-6 rounded-xl shadow-lg">
                        🎉 로그인 성공! {user.displayName}님 환영합니다.
                    </div>

                    <div className="flex flex-col items-center mb-8">
                        <div className="size-22 rounded-full bg-slate-200 dark:bg-slate-700 mb-4 overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl">
                            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`} alt={user.displayName} className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-2xl font-bold text-primary dark:text-white mb-1">{user.displayName}</h2>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-full">
                            Verified Member
                        </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 text-center">
                            <span className="block text-2xl font-black text-primary dark:text-gold mb-1">2</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Books Read</span>
                        </div>
                        <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 text-center">
                            <span className="block text-2xl font-black text-primary dark:text-gold mb-1">5</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Tests Taken</span>
                        </div>
                        <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 text-center">
                            <span className="block text-2xl font-black text-primary dark:text-gold mb-1">12</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Saved</span>
                        </div>
                    </div>

                    {/* Settings Menu */}
                    <div className="bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5">
                        <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-slate-400">notifications</span>
                                <span className="text-sm font-medium">알림 설정</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 text-sm">arrow_forward_ios</span>
                        </button>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-slate-400">dark_mode</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">다크 모드</span>
                                    <span className="text-xs text-slate-400">(준비중)</span>
                                </div>
                            </div>
                            <div className="w-10 h-5 bg-slate-200 rounded-full relative">
                                <div className="absolute left-1 top-1 size-3 bg-white rounded-full shadow-sm"></div>
                            </div>
                        </button>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-slate-400">support</span>
                                <span className="text-sm font-medium">고객 지원</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 text-sm">arrow_forward_ios</span>
                        </button>
                    </div>

                    <div className="mt-8 px-2">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/10 text-red-500 font-bold rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined">logout</span>
                            <span>로그아웃</span>
                        </button>
                    </div>
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
