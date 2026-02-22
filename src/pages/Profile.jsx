import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import { logout } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import Footer from '../components/Footer';

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
            <div className="w-full max-w-lg relative bg-background-dark shadow-2xl min-h-screen overflow-hidden border-t border-white/5">
                <TopNavigation title="멤버십" type="sub" />

                <main className="px-6 pt-8 pb-24 animate-fade-in-up space-y-8">

                    {/* Membership Card */}
                    <div className="relative w-full aspect-[1.58/1] rounded-2xl overflow-hidden shadow-2xl group">
                        {/* Background with texture */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black"></div>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="absolute -top-24 -right-24 size-64 bg-gold/20 blur-[80px] rounded-full"></div>

                        {/* Card Content */}
                        <div className="absolute inset-0 p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="serif-title text-gold text-lg italic tracking-wider">The Archiview</h3>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] block mt-1">Private Membership</span>
                                </div>
                                <div className="size-8 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm">
                                    <span className="material-symbols-outlined text-white/80 text-sm">fingerprint</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="size-12 rounded-full bg-slate-700 border-2 border-gold/50 overflow-hidden shadow-lg">
                                        <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=0D8ABC&color=fff`} alt={user.displayName} className="w-full h-full object-cover" />
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

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                            <span className="block text-2xl font-black text-white mb-1">12</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider">Archived</span>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                            <span className="block text-2xl font-black text-white mb-1">85</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider">Insights</span>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                            <span className="block text-2xl font-black text-white mb-1">4</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider">Badges</span>
                        </div>
                    </div>

                    {/* Menu Links */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">My archiview</h4>

                        <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
                            <button className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="size-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-lg">book_2</span>
                                    </div>
                                    <span className="text-sm text-slate-200 font-medium">나의 서재</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-500 text-sm">arrow_forward_ios</span>
                            </button>
                            <button onClick={() => navigate('/reading-notes')} className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="size-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-lg">edit_note</span>
                                    </div>
                                    <span className="text-sm text-slate-200 font-medium">독서 노트</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-500 text-sm">arrow_forward_ios</span>
                            </button>
                            <button className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="size-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
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

                        <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
                            <button className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-slate-400">settings</span>
                                    <span className="text-sm text-slate-200 font-medium">설정</span>
                                </div>
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
