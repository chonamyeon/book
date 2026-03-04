import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

export default function Membership() {
    const navigate = useNavigate();

    const handleSubscribe = () => {
        alert('출퇴근길 자기계발 프로젝트, 아카이뷰 프리미엄이 곧 시작됩니다!');
    };

    return (
        <div className="bg-[#0a0c10] min-h-screen pb-24 font-display text-slate-200 selection:bg-gold/30">
            <TopNavigation type="sub" title="Premium Pass" />

            <main className="pt-12 pb-20">
                {/* 🎯 Target Audience Hero Section */}
                <div className="px-8 text-center mb-16 space-y-6">
                    <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2">
                        For Busy Professionals
                    </div>
                    <h1 className="text-3xl md:text-4xl text-white font-black leading-tight tracking-tight break-keep">
                        "성공한 사람들의 성공 비결, <br />
                        이제 <span className="text-gold">출퇴근 시간</span>에 <br/> 쉽고 편하게 들어보세요!"
                    </h1>
                    <p className="text-slate-400 text-base leading-relaxed font-light break-keep">
                        무거운 책 대신 핸드폰 속에 담긴 한 권의 도서가 <br/>
                        <span className="text-white font-medium italic underline underline-offset-4 decoration-gold/50">당신의 인생을 바꿀 시작점</span>이 됩니다.
                    </p>
                </div>

                {/* 💼 Why Archiview? (Pain Point Solution) */}
                <section className="px-6 mb-20 space-y-4">
                    <h2 className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] text-center mb-8">Why Archiview Premium?</h2>
                    
                    <div className="grid gap-4">
                        {/* Point 1: For Commuters */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-3 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 opacity-5">
                                <span className="material-symbols-outlined text-8xl">commute</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-gold">directions_subway</span>
                                <h3 className="text-white font-bold text-lg">지하철, 버스에서 듣는 지혜</h3>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed font-light break-keep text-[13px]">
                                만원 버스에서 책 한 장 넘기기 힘드셨죠? 이제 에어팟만 끼세요. 제임스와 스텔라가 핵심만 콕 찝어 읽어드립니다.
                            </p>
                        </div>

                        {/* Point 2: For Busy Schedule */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-3 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 opacity-5">
                                <span className="material-symbols-outlined text-8xl">schedule</span>
                            </div>
                            <div className="flex items-center gap-3 text-emerald-400">
                                <span className="material-symbols-outlined">auto_awesome</span>
                                <h3 className="font-bold text-lg">서점 갈 시간 없는 당신을 위해</h3>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed font-light break-keep text-[13px]">
                                무슨 책을 읽을지 고민하는 시간도 아깝습니다. 매주 월요일 아침, 금주의 성공 큐레이션 2권을 카톡으로 바로 쏴드립니다.
                            </p>
                        </div>

                        {/* Point 3: Global Leader's Insight */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-3 relative overflow-hidden text-blue-400">
                            <div className="absolute -right-4 -top-4 opacity-5">
                                <span className="material-symbols-outlined text-8xl">psychology</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined">trending_up</span>
                                <h3 className="font-bold text-lg">성공한 사람들의 마인드셋</h3>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed font-light break-keep text-[13px]">
                                빌 게이츠, 일론 머스크가 극찬한 도서들의 통찰을 내 것으로 만드세요. 점심시간 15분이면 충분합니다.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 💳 Pricing Pass */}
                <section className="px-6 mb-12">
                    <div className="bg-gradient-to-br from-[#1a1d24] to-black border border-gold/30 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
                        <div className="space-y-8 relative z-10">
                            <div className="text-center space-y-2">
                                <h4 className="text-gold font-black text-xs uppercase tracking-widest">Limited Access</h4>
                                <h3 className="text-white text-3xl font-black italic serif-title">Archiview Pass</h3>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black text-white">9,900</span>
                                    <span className="text-gold font-bold">원</span>
                                </div>
                                <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">Coffee 2 Cups / Monthly</p>
                            </div>

                            <ul className="space-y-4 py-6 border-y border-white/5">
                                {[
                                    '모든 팟캐스트 & 풀 대본 무제한',
                                    '매주 월요일 카톡 추천도서 배달',
                                    'MP3 파일 & 리뷰 PDF 다운로드',
                                    '프리미엄 딥다이브 이북 열람'
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                                        <span className="material-symbols-outlined text-gold text-lg">check_circle</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <button 
                                onClick={handleSubscribe}
                                className="w-full py-5 bg-gold text-primary font-black rounded-2xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all text-sm"
                            >
                                지금 바로 시작하기
                            </button>
                            <p className="text-center text-[9px] text-slate-600 uppercase tracking-widest font-bold">커피 두 잔 값으로 당신의 인생을 투자하세요</p>
                        </div>
                    </div>
                </section>

                <div className="px-10 text-center space-y-6">
                    <p className="text-slate-500 text-xs font-light leading-relaxed break-keep italic">
                        "당신의 가방은 가볍게, <br/> 당신의 머릿속은 선구자들의 지혜로 묵직하게."
                    </p>
                    
                    {/* ⚖️ Legal & Service Scope Notice */}
                    <div className="pt-8 border-t border-white/5 space-y-3">
                        <p className="text-[10px] text-slate-600 leading-relaxed break-keep text-left">
                            <span className="text-slate-400 font-bold">[안내 및 주의사항]</span><br/>
                            본 서비스는 도서의 원문을 그대로 낭독하거나 전문을 제공하는 '오디오북' 또는 '전자책 대여' 서비스가 아닙니다. 
                            아카이뷰는 각 도서가 담고 있는 핵심 철학과 성공 원칙을 분석하여, 인공지능 제임스와 스텔라의 대담 형식을 빌려 **독창적인 2차 창작물(인사이트 리포트 및 팟캐스트)**을 제공합니다. 
                            도서의 원문 및 상세 내용이 궁금하신 분들은 반드시 서점 또는 도서관을 통해 정식 출판물을 이용해 주시기 바랍니다. 모든 통찰의 저작권은 아카이뷰에 있으며, 무단 복제 및 배포를 금합니다.
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
            <BottomNavigation />
        </div>
    );
}
