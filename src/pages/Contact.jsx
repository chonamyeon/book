import React, { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

export default function Contact() {
  const [status, setStatus] = useState('');
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const messageRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = nameRef.current?.value || '';
    const email = emailRef.current?.value || '';
    const message = messageRef.current?.value || '';

    const subject = encodeURIComponent(`[Whiteboard 문의] ${name}`);
    const body = encodeURIComponent(
      `이름: ${name}\n이메일: ${email}\n\n문의 내용:\n${message}`
    );

    window.location.href = `mailto:gosipass902@gmail.com?subject=${subject}&body=${body}`;
    setStatus('sent');
  };

  return (
    <div className="bg-white text-slate-900 min-h-screen pb-24">
      <Helmet>
        <title>문의 | Whiteboard</title>
        <meta name="description" content="Whiteboard 운영팀에 문의하거나 콘텐츠 정정, 제휴, 광고 관련 의견을 보낼 수 있습니다." />
        <link rel="canonical" href="https://archiview.shop/contact" />
      </Helmet>
      <TopNavigation title="문의" />

      <main className="mx-auto max-w-3xl px-6 pt-28 pb-16">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">Contact</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">문의하기</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          콘텐츠 정정 요청, 저작권 관련 문의, 제휴 및 광고 문의는 아래 이메일로 보내주세요.
          일반적으로 영업일 기준 3일 이내에 확인합니다.
        </p>

        <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Official Email</p>
          <a href="mailto:gosipass902@gmail.com" className="mt-2 inline-block text-lg font-black text-blue-600 underline">
            gosipass902@gmail.com
          </a>
        </section>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-lg border border-slate-200 p-6">
          <div>
            <label htmlFor="contact-name" className="block text-xs font-black uppercase tracking-widest text-slate-500">
              이름
            </label>
            <input
              id="contact-name"
              ref={nameRef}
              required
              className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-xs font-black uppercase tracking-widest text-slate-500">
              이메일
            </label>
            <input
              id="contact-email"
              ref={emailRef}
              required
              type="email"
              className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="block text-xs font-black uppercase tracking-widest text-slate-500">
              문의 내용
            </label>
            <textarea
              id="contact-message"
              ref={messageRef}
              required
              rows={6}
              className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
          >
            이메일로 문의 보내기
          </button>
          <p className="text-xs text-slate-400 text-center">
            버튼을 누르면 이메일 앱이 열립니다. 직접 이메일을 보내셔도 됩니다.
          </p>
          {status === 'sent' && (
            <p className="rounded-md bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
              이메일 앱이 열렸습니다. 작성 후 전송해 주세요.
            </p>
          )}
        </form>
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
}
