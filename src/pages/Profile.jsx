import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { logout, auth } from '../firebase';
import { getRedirectResult } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';

export default function Profile() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [debugLogs, setDebugLogs] = useState([]);

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [`[${time}] ${msg}`, ...prev]);
        console.log(`[${time}] ${msg}`);
    };

    // DEBUG: Monitor User State
    useEffect(() => {
        if (user && !loading) {
            addLog("AUTH STATE: User is logged in as " + user.email);
        } else if (!loading) {
            addLog("AUTH STATE: User is null (waiting for login action)");
        }
    }, [user, loading]);

    const handleLogout = async () => {
        if (window.confirm("로그아웃 하시겠습니까?")) {
            try {
                await logout();
                addLog("Logged out");
                navigate('/');
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
                <div className="mt-8 text-left w-full max-w-xs bg-black/50 p-2 rounded text-[10px] text-green-400 font-mono h-32 overflow-y-auto">
                    {debugLogs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen rounded-t-[40px] overflow-hidden border-t border-white/5">
                <TopNavigation title="프로필" type="sub" />

                <main className="px-4 pt-12 pb-24 animate-fade-in-up">
                    {user ? (
                        <>
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
                        </>
                    ) : (
                        /* Logged Out View */
                        <div className="flex flex-col items-center justify-center pt-8 pb-10 animate-fade-in">
                            <div className="size-20 rounded-full bg-white/5 flex items-center justify-center border border-gold/20 mb-8 shadow-2xl">
                                <span className="material-symbols-outlined text-gold text-4xl">menu_book</span>
                            </div>
                            <h2 className="serif-title text-white text-2xl font-bold mb-2">아카이브 시작하기</h2>
                            <p className="text-slate-400 text-sm text-center max-w-[240px] mb-8 leading-relaxed font-medium">
                                당신만의 개인 서재를 완성하고<br />지적인 기록을 즐겨보세요.
                            </p>

                            <div className="w-full flex flex-col gap-3 mb-10">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-white text-primary font-black rounded-2xl shadow-xl hover:scale-[1.01] active:scale-95 transition-all border-b-4 border-slate-200"
                                >
                                    <span className="material-symbols-outlined text-gold">login</span>
                                    <span>로그인 페이지로 이동</span>
                                </button>

                                <p className="text-center text-xs text-slate-500 mt-2">
                                    안전한 로그인을 위해 전용 로그인 페이지를 이용합니다.
                                </p>
                            </div>

                            {/* Diagnostic Logs */}
                            <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/5 text-left">
                                <p className="text-white text-[10px] font-bold mb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-gold">bug_report</span>
                                        DIAGNOSTIC LOGS
                                    </span>
                                    <button onClick={() => setDebugLogs([])} className="text-[9px] opacity-40 hover:opacity-100">Clear</button>
                                </p>
                                <div className="h-40 overflow-y-auto font-mono text-[9px] text-emerald-400 space-y-1 bg-black/30 p-3 rounded-xl scrollbar-hide">
                                    {debugLogs.length === 0 ? (
                                        <span className="text-slate-600 italic">No activity logs.</span>
                                    ) : (
                                        debugLogs.map((log, i) => <div key={i} className="border-b border-white/5 pb-1 mb-1 break-all opacity-80">{log}</div>)
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <p className="text-center text-[10px] text-slate-500 mt-12 mb-4">
                        The Archive v1.3.1<br />
                        Secured Login Flow Active
                    </p>
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
