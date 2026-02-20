import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';

export default function About() {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen pb-24">
            <TopNavigation title="Brand Story" />

            <main className="px-6 pt-24 pb-12">
                <section className="mb-12 animate-fade-in">
                    <span className="text-gold text-[10px] font-black uppercase tracking-[0.3em] block mb-4">The Vision</span>
                    <h2 className="serif-title text-3xl text-slate-900 dark:text-white mb-6 leading-tight">
                        아카이드: <br />
                        생각의 시간
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-light">
                        우리는 매일 수많은 정보의 홍수 속에서 살아갑니다. <br />
                        하지만 정작 '나 자신'의 생각을 정리하고 마주할 시간은 점점 줄어들고 있습니다.
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-light">
                        <strong>아카이드(Archide)</strong>는 'Archive'와 'Ideation'의 합성어로,
                        단순히 책을 읽는 행위를 넘어 그 과정에서 발생하는 '생각의 조각'들을 기록하고
                        나만의 철학을 구축하는 공간을 지향합니다.
                    </p>
                </section>

                <div className="h-px bg-slate-100 dark:bg-white/5 mb-12"></div>

                <section className="mb-12 animate-fade-in delay-200">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">왜 아카이드인가요?</h3>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <span className="material-symbols-outlined text-gold">auto_stories</span>
                            <div>
                                <h4 className="font-bold text-sm mb-1">맞춤형 인지 분석</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">심리학과 빅데이터를 결합하여 당신의 독서 유형과 인지 패턴을 분석합니다.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <span className="material-symbols-outlined text-gold">history_edu</span>
                            <div>
                                <h4 className="font-bold text-sm mb-1">고유한 사색의 기록</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">남들의 평가가 아닌, 오직 나의 내면에 집중하는 기록의 도구를 제공합니다.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <span className="material-symbols-outlined text-gold">self_improvement</span>
                            <div>
                                <h4 className="font-bold text-sm mb-1">성장을 위한 큐레이션</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">단순 베스트셀러가 아닌, 당신의 페르소나에 맞는 책과 경험을 제안합니다.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2rem] text-center border border-slate-100 dark:border-white/5 animate-fade-in delay-300">
                    <p className="text-sm font-serif italic text-slate-600 dark:text-slate-300 mb-4">
                        "책을 기록하는 '아카이드'의 공간에서,<br />
                        오롯이 나만의 '생각의 시간'을 갖는다"
                    </p>
                    <button
                        onClick={() => navigate('/quiz')}
                        className="mt-4 px-8 py-3 bg-gold text-slate-900 font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                        지금 진단 시작하기
                    </button>
                </section>
            </main>

            <BottomNavigation />
        </div>
    );
}
