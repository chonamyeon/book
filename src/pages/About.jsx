import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white text-slate-900 min-h-screen pb-24">
      <Helmet>
        <title>소개 | Whiteboard</title>
        <meta
          name="description"
          content="Whiteboard는 책을 읽을 시간이 부족한 독자를 위해 비평, 맥락, 실천 아이디어를 정리하는 독서 인사이트 매거진입니다."
        />
        <link rel="canonical" href="https://archiview.shop/about" />
      </Helmet>
      <TopNavigation title="소개" />

      <main className="mx-auto max-w-3xl px-6 pt-28 pb-16">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">About Whiteboard</p>
        <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight md:text-5xl">
          책의 요약을 넘어, 독자가 바로 쓸 수 있는 관점을 정리합니다.
        </h1>
        <p className="mt-6 text-base leading-8 text-slate-600">
          Whiteboard는 자기계발, 경제, 경영, 인문, 심리 분야의 도서를 중심으로 핵심 주장과 배경 맥락,
          비판적 관점, 생활 속 적용법을 함께 다룹니다. 단순 줄거리 소개가 아니라 독자가 책을 고를 때
          필요한 판단 기준과 읽은 뒤 실천할 수 있는 질문을 제공합니다.
        </p>

        <section className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            ['독창적 해설', '각 글은 책의 주제와 독자 상황을 연결해 새롭게 구성한 비평형 콘텐츠입니다.'],
            ['명확한 출처 태도', '책 제목, 저자, 분야를 명시하고 원저작권을 존중하는 범위에서 분석합니다.'],
            ['사용자 경험', '모바일과 데스크톱 모두에서 읽기 쉬운 구조와 명확한 내비게이션을 우선합니다.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-sm font-black text-slate-900">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-lg border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-lg font-black text-slate-900">편집 원칙</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <li>책의 핵심을 과장하지 않고, 독자가 판단할 수 있도록 맥락을 제공합니다.</li>
            <li>저작권 보호를 위해 원문을 길게 복제하지 않으며, 비평과 해설 중심으로 작성합니다.</li>
            <li>건강, 법률, 투자 같은 민감한 주제는 전문 조언이 아닌 일반 정보로만 다룹니다.</li>
            <li>콘텐츠와 광고가 혼동되지 않도록 광고 영역은 명확히 분리합니다.</li>
          </ul>
        </section>
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
}
