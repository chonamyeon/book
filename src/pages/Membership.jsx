import React from 'react';
import { Link } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';

export default function Membership() {
    return (
        <div className="bg-background-dark min-h-screen pb-24 font-display text-slate-100">
            <TopNavigation type="sub" title="Membership" />

            <main className="px-6 pt-8">
                {/* Headline */}
                <div className="text-center mb-10">
                    <span className="text-gold text-xs font-bold uppercase tracking-[0.2em] mb-3 block">Premium Access</span>
                    <h1 className="serif-title text-4xl text-white mb-4 leading-tight">
                        Invest in <br /><span className="italic text-gold">Your Mind</span>
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                        Unlock the full potential of The archiview. Access deep-dive analysis and exclusive curated lists from world leaders.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="space-y-6">
                    {/* Free Tier */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">Explorer</h3>
                                <p className="text-slate-400 text-xs mt-1">For casual readers</p>
                            </div>
                            <span className="text-2xl font-bold text-white">$0</span>
                        </div>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-center gap-3 text-sm text-slate-300">
                                <span className="material-symbols-outlined text-gold text-base">check</span>
                                Basic Book Lists
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-300">
                                <span className="material-symbols-outlined text-gold text-base">check</span>
                                Weekly Updates
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-500 line-through">
                                <span className="material-symbols-outlined text-slate-600 text-base">close</span>
                                Deep Dive Analysis
                            </li>
                        </ul>
                        <button className="w-full py-3 rounded-lg border border-white/20 text-slate-300 text-sm font-bold hover:bg-white/5 transition-colors">
                            Current Plan
                        </button>
                    </div>

                    {/* Pro Tier - The Money Maker */}
                    <div className="bg-gradient-to-br from-gold/10 to-primary/50 border border-gold/30 rounded-2xl p-6 relative overflow-hidden shadow-2xl shadow-gold/10">
                        <div className="absolute top-0 right-0 bg-gold text-primary text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                            POPULAR
                        </div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gold serif-title italic">Visionary</h3>
                                <p className="text-gold/60 text-xs mt-1">For serious thinkers</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-white">$9</span>
                                <span className="text-slate-400 text-xs">/mo</span>
                            </div>
                        </div>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3 text-sm text-white">
                                <div className="p-1 rounded-full bg-gold/20">
                                    <span className="material-symbols-outlined text-gold text-xs">check</span>
                                </div>
                                <span className="font-bold">Unlimited</span> Book Analysis
                            </li>
                            <li className="flex items-center gap-3 text-sm text-white">
                                <div className="p-1 rounded-full bg-gold/20">
                                    <span className="material-symbols-outlined text-gold text-xs">check</span>
                                </div>
                                Exclusive "Secret" Lists
                            </li>
                            <li className="flex items-center gap-3 text-sm text-white">
                                <div className="p-1 rounded-full bg-gold/20">
                                    <span className="material-symbols-outlined text-gold text-xs">check</span>
                                </div>
                                Ad-Free Experience
                            </li>
                            <li className="flex items-center gap-3 text-sm text-white">
                                <div className="p-1 rounded-full bg-gold/20">
                                    <span className="material-symbols-outlined text-gold text-xs">check</span>
                                </div>
                                Global Shipping Support
                            </li>
                        </ul>
                        <button className="w-full py-4 rounded-xl bg-gold text-primary text-sm font-bold uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
                            Become a Visionary <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </button>
                        <p className="text-center text-[10px] text-gold/40 mt-3">
                            Start your 7-day free trial. Cancel anytime.
                        </p>
                    </div>
                </div>

                {/* Social Proof */}
                <div className="mt-10 text-center border-t border-white/5 pt-8">
                    <p className="text-slate-400 text-xs mb-4">Trusted by thinkers from</p>
                    <div className="flex justify-center gap-6 opacity-40 grayscale">
                        {/* Mock Logos - Text for now */}
                        <span className="text-white font-bold text-lg">Google</span>
                        <span className="text-white font-bold text-lg italic">Notion</span>
                        <span className="text-white font-bold text-lg font-serif">Medium</span>
                    </div>
                </div>
            </main>

            <BottomNavigation />
        </div>
    );
}
