import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { logout } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../contexts/AudioContext';
import Footer from '../components/Footer';

const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function Profile() {
    const { user, loading } = useAuth();
    const { dailyListenTime, dailyTarget, streak } = useAudio();
    const navigate = useNavigate();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    const handleKakaoChannel = () => {
        if (!window.Kakao) return;
        if (!window.Kakao.isInitialized()) {
            window.Kakao.init('9cbdeec02a8ce33b5deb576a0e63c380');
        }
        window.Kakao.Channel.followChannel({ channelPublicId: '_HssEX' });
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

    if (loading) {
        return (
            <div className="bg-background-dark min-h-screen flex flex-col items-center justify-center p-8 text-center">
                <div className="relative mb-10">
                    <div className="absolute inset-0 bg-gold/20 blur-3xl rounded-none scale-150 animate-pulse"></div>
                    <div className="size-20 rounded-none border-t-2 border-gold animate-spin"></div>
                </div>
                <h2 className="text-white text-xl font-bold mb-2">인증 확인 중</h2>
                <p className="text-slate-500 text-sm">잠시만 기다려주세요...</p>
            </div>
        );
    }

    if (!user) return null;

    const totalBlocks = 30;
    const filledBlocks = Math.max(0, Math.min(totalBlocks, dailyTarget > 0 ? Math.floor(dailyListenTime / (dailyTarget / totalBlocks)) : 0));
    const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(Math.max(0, totalBlocks - filledBlocks));

    return (
        <div className="bg-white font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 flex justify-center">
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5">
                <TopNavigation title="멤버십" type="sub" />

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
                                        <span className="text-xs text-slate-300 font-mono">2024. 05. 21</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Status</span>
                                        <span className="text-xs text-emerald-400 font-bold tracking-wide">ACTIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Insight Time Banner (Replacing Stats Row) */}
                    <div className="relative bg-[#101218]/90 backdrop-blur-3xl border border-white/10 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm w-full">
                        {/* Premium Glassmorphism Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 blur-xl opacity-50 pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col gap-4">
                            {/* Header Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-[13px] font-black tracking-tight text-white/90 uppercase">오늘의 인사이트 타임</h3>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-orange-500/10 border border-orange-500/20">
                                    <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">ON AIR</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_5px_rgba(249,115,22,0.8)]" />
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-baseline justify-between">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[28px] font-black text-white tracking-tighter tabular-nums leading-none">
                                        {formatTime(dailyListenTime)}
                                    </span>
                                    <span className="text-[10px] font-bold text-white/40 tracking-tight uppercase">Min Listened</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[14px] font-bold text-white/60 tracking-tight">
                                        / {formatTime(dailyTarget)} <span className="text-white/20 ml-1 font-black">GOAL</span>
                                    </span>
                                </div>
                            </div>

                            {/* Progress Row */}
                            <div className="space-y-2">
                                <div className="text-[14px] sm:text-[16px] font-mono tracking-[0.12em] text-orange-500/90 leading-none filter drop-shadow-[0_0_8px_rgba(249,115,22,0.4)] whitespace-nowrap overflow-hidden text-clip flex justify-center w-full">
                                    {progressBar}
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[12px] font-black text-white/70 tracking-tight">{streak}일 연속 달성 중</span>
                                    </div>
                                    <span className="text-[9px] font-black text-orange-500/50 uppercase tracking-[0.2em]">Growing Daily</span>
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
                            <button className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="size-8 rounded-none bg-teal-500/20 flex items-center justify-center text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-lg">bookmark</span>
                                    </div>
                                    <span className="text-sm text-slate-200 font-medium">스크랩북</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-500 text-sm">arrow_forward_ios</span>
                            </button>
                        </div>
                    </div>

                    {/* Account Management */}
                    <div className="space-y-4 pt-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Account</h4>

                        <div className="bg-white/5 rounded-none overflow-hidden border border-white/5 divide-y divide-white/5">
                            <button className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-slate-400">settings</span>
                                    <span className="text-sm text-slate-200 font-medium">설정</span>
                                </div>
                            </button>
                            <button onClick={handleKakaoChannel} className="w-full flex items-center justify-between p-4 hover:bg-[#FEE500]/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.477 2 2 5.805 2 10.5c0 3.027 1.86 5.687 4.686 7.25L5.5 22l4.688-2.6A11.6 11.6 0 0012 19c5.523 0 10-3.806 10-8.5S17.523 2 12 2z" fill="#FEE500"/></svg>
                                    <span className="text-sm text-slate-200 font-medium">카카오 채널 친구추가</span>
                                </div>
                                <span className="text-[10px] text-[#FEE500] font-bold">알림 받기</span>
                            </button>
                            <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors group text-red-400">
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined">logout</span>
                                    <span className="text-sm font-medium">로그아웃</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    <p className="text-center text-[10px] text-slate-600 font-mono pt-8">
                        The Archiview ID: {user.uid.slice(0, 8).toUpperCase()}<br />
                        Version 1.4.0 (Build 2024.05)
                    </p>
                    <Footer />
                </main>

                <BottomNavigation />
            </div>
        </div>
    );
}
