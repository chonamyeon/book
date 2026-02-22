import React, { useState, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

export default function Contact() {
    const [status, setStatus] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        setStatus('sending');
        // Simple simulation
        setTimeout(() => {
            setStatus('success');
            setTimeout(() => setStatus(''), 3000);
        }, 1000);
    };

    return (
        <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen pb-24">
            <TopNavigation title="Contact Us" />

            <main className="px-6 pt-24 pb-12">
                <section className="mb-10">
                    <span className="text-gold text-[10px] font-black uppercase tracking-[0.3em] block mb-4">Get in touch</span>
                    <h2 className="serif-title text-3xl text-slate-900 dark:text-white mb-6">운영진에게 <br />문의하기</h2>
                    <p className="text-sm text-slate-500 leading-relaxed font-light">
                        서비스 이용 중 궁금하신 점이나 개선 제안이 있다면 언제든 편하게 메시지를 남겨주세요. 아카이뷰 팀이 정성껏 답변해 드리겠습니다.
                    </p>
                </section>

                <section className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="size-10 rounded-full bg-gold/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-gold">mail</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Official Email</p>
                            <a href="mailto:support@archiview.co.kr" className="text-sm font-bold text-slate-900 dark:text-white hover:text-gold transition-colors">support@archiview.co.kr</a>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Name</label>
                            <input
                                required
                                type="text"
                                placeholder="성함을 입력하세요"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all font-light"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Message</label>
                            <textarea
                                required
                                rows="5"
                                placeholder="문의 내용을 입력하세요"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all font-light"
                            ></textarea>
                        </div>

                        <button
                            disabled={status === 'sending' || status === 'success'}
                            className={`w-full py-4 rounded-2xl font-bold text-sm tracking-widest shadow-xl transition-all active:scale-95 ${status === 'success'
                                ? 'bg-green-500 text-white'
                                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-gold hover:text-slate-900'
                                }`}
                        >
                            {status === 'sending' ? '보내는 중...' : status === 'success' ? '전송 완료!' : '문의 보내기'}
                        </button>
                    </form>
                </section>

                <p className="text-[10px] text-center text-slate-400 font-medium">제안하신 내용은 서비스 운영 및 발전에 큰 도움이 됩니다. 감사합니다.</p>
            </main>

            <Footer />
            <BottomNavigation />
        </div>
    );
}
