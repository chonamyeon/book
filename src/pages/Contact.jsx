import React, { useState, useRef, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import MainHeader from '../components/MainHeader';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

// ── EmailJS 설정 ──────────────────────────────────────────
const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'YOUR_PUBLIC_KEY';
// ─────────────────────────────────────────────────────────

export default function Contact() {
    const formRef = useRef(null);
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState(''); // '' | 'sending' | 'success' | 'error'

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !message.trim()) return;
        setStatus('sending');

        try {
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    from_name: name,
                    message: message,
                    to_email: 'gosipaa902@gmail.com',
                },
                EMAILJS_PUBLIC_KEY
            );
            setStatus('success');
            setName('');
            setMessage('');
            setTimeout(() => setStatus(''), 4000);
        } catch (err) {
            console.error('EmailJS error:', err);
            setStatus('error');
            setTimeout(() => setStatus(''), 4000);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen pb-24">
            <MainHeader showBack />

            <main className="px-6 pt-6 pb-12">
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
                            <a href="mailto:gosipaa902@gmail.com" className="text-sm font-bold text-slate-900 dark:text-white hover:text-gold transition-colors">gosipaa902@gmail.com</a>
                        </div>
                    </div>

                    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Name</label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="성함을 입력하세요"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all font-light"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Message</label>
                            <textarea
                                required
                                rows="5"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="문의 내용을 입력하세요"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all font-light"
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'sending' || status === 'success'}
                            className={`w-full py-4 rounded-2xl font-bold text-sm tracking-widest shadow-xl transition-all active:scale-95 ${
                                status === 'success'
                                    ? 'bg-green-500 text-white'
                                    : status === 'error'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-gold hover:text-slate-900'
                            }`}
                        >
                            {status === 'sending' ? '보내는 중...'
                                : status === 'success' ? '✓ 전송 완료!'
                                : status === 'error' ? '전송 실패 — 다시 시도'
                                : '문의 보내기'}
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
