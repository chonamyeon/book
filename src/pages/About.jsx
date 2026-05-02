import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
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
        <title>소개 | Whiteboard — 독서 인사이트 매거진</title>
        <meta name="description" content="Whiteboard는 자기계발·경제·경영·인문·심리 도서를 비평과 맥락, 실천 아이디어로 정리하는 독서 인사이트 매거진입니다. 운영 철학과 편집 원칙을 소개합니다." />
        <link rel="canonical" href="https://archiview.shop/about" />
      </Helmet>
      <TopNavigation title="소개" />

      <main className="mx-auto max-w-3xl px-6 pt-28 pb-16">

        {/* Hero */}
        <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">About Whiteboard</p>
        <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight md:text-4xl">
          책의 요약을 넘어,<br />독자가 바로 쓸 수 있는 관점을 정리합니다.
        </h1>
        <p className="mt-6 text-base leading-8 text-slate-600">
          Whiteboard는 2024년에 시작된 독서 인사이트 매거진입니다. 자기계발, 경제, 경영, 인문, 심리
          분야의 베스트셀러를 중심으로 핵심 주장과 배경 맥락, 비판적 관점, 생활 속 적용법을 함께 다룹니다.
          단순한 줄거리 소개가 아니라, 독자가 책을 고를 때 필요한 판단 기준과 읽은 뒤 실천할 수 있는
          구체적인 질문을 제공합니다.
        </p>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-3 gap-4 rounded-xl bg-slate-50 border border-slate-200 p-6">
          {[
            { num: '160+', label: '도서 인사이트' },
            { num: '5개', label: '핵심 카테고리' },
            { num: '2024', label: '서비스 시작' },
          ].map(({ num, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-black text-blue-600">{num}</p>
              <p className="mt-1 text-xs text-slate-500 font-semibold">{label}</p>
            </div>
          ))}
        </div>

        {/* Mission */}
        <section className="mt-14">
          <h2 className="text-xl font-black text-slate-900">왜 Whiteboard를 만들었나요?</h2>
          <p className="mt-4 text-sm leading-8 text-slate-600">
            바쁜 현대인에게 독서는 사치처럼 느껴지는 경우가 많습니다. 좋은 책이 있다는 건 알지만,
            300페이지를 읽을 시간과 에너지가 없고, 읽어도 핵심을 잘 파악하기 어렵습니다.
          </p>
          <p className="mt-3 text-sm leading-8 text-slate-600">
            Whiteboard는 이 문제를 해결하기 위해 만들어졌습니다. 저자의 핵심 주장이 무엇인지,
            그 주장이 어떤 맥락에서 나왔는지, 실제 삶에 어떻게 적용할 수 있는지를 편집팀이 직접
            분석하고 정리합니다. 단순 요약이 아닌, 독자가 "이 책을 읽을 가치가 있는가"를 스스로
            판단할 수 있도록 돕는 비평형 콘텐츠입니다.
          </p>
          <p className="mt-3 text-sm leading-8 text-slate-600">
            저희가 다루는 책들은 모두 시장에서 검증된 베스트셀러이지만, 저희는 맹목적으로 긍정하지
            않습니다. 좋은 점은 살리되, 과장되거나 보편적이지 않은 주장에는 비판적 시각을 함께
            제공합니다.
          </p>
        </section>

        {/* Features */}
        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: 'edit_note',
              title: '독창적 해설',
              body: '각 글은 책의 주제와 독자 상황을 연결해 새롭게 구성한 비평형 콘텐츠입니다. 원문을 단순 번역하거나 복붙하지 않습니다.',
            },
            {
              icon: 'verified',
              title: '명확한 출처 태도',
              body: '책 제목, 저자, 출판사, 분야를 명시하고 원저작권을 존중하는 범위에서만 분석합니다.',
            },
            {
              icon: 'devices',
              title: '최적화된 읽기 경험',
              body: '모바일과 데스크톱 모두에서 읽기 쉬운 구조와 명확한 내비게이션을 우선합니다.',
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <span className="material-symbols-outlined text-blue-500 text-[24px]">{icon}</span>
              <h3 className="mt-3 text-sm font-black text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </section>

        {/* Editorial principles */}
        <section className="mt-14 rounded-xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-lg font-black text-slate-900">편집 원칙</h2>
          <ul className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-blue-400 text-[18px] mt-0.5 flex-shrink-0">check_circle</span>
              <span>책의 핵심을 과장하지 않고, 독자가 스스로 판단할 수 있도록 맥락을 충분히 제공합니다.</span>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-blue-400 text-[18px] mt-0.5 flex-shrink-0">check_circle</span>
              <span>저작권 보호를 위해 원문을 길게 복제하지 않으며, 비평과 해설 중심으로 작성합니다.</span>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-blue-400 text-[18px] mt-0.5 flex-shrink-0">check_circle</span>
              <span>건강, 법률, 투자 같은 민감한 주제는 전문 조언이 아닌 일반 정보로만 다루며, 반드시 전문가 상담을 권고합니다.</span>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-blue-400 text-[18px] mt-0.5 flex-shrink-0">check_circle</span>
              <span>콘텐츠와 광고가 혼동되지 않도록 광고 영역은 명확히 분리하며, 광고 수익 구조를 투명하게 공개합니다.</span>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-blue-400 text-[18px] mt-0.5 flex-shrink-0">check_circle</span>
              <span>AI 보조 도구를 활용할 경우, 편집팀이 내용을 직접 검토·수정·승인한 콘텐츠만 게시합니다.</span>
            </li>
          </ul>
        </section>

        {/* Team */}
        <section className="mt-14">
          <h2 className="text-xl font-black text-slate-900">편집팀 소개</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Whiteboard 편집팀은 국내 독서 커뮤니티와 콘텐츠 마케팅 분야에서 활동해온 에디터들로 구성되어 있습니다.
            자기계발, 경제경영, 인문학 등 각 분야에 관심을 가진 팀원들이 직접 도서를 읽고 분석하며 콘텐츠를 제작합니다.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                role: '편집장 · 콘텐츠 디렉터',
                desc: '자기계발 및 경영 분야 전문. 독서 커뮤니티 운영 8년 경력. 콘텐츠의 방향성과 편집 원칙을 총괄합니다.',
                icon: 'manage_accounts',
              },
              {
                role: '경제·인문 에디터',
                desc: '경제학 및 철학 전공. 복잡한 개념을 독자 친화적으로 풀어쓰는 것을 전문으로 합니다.',
                icon: 'school',
              },
            ].map(({ role, desc, icon }) => (
              <div key={role} className="rounded-lg border border-slate-200 p-5 flex gap-4">
                <span className="material-symbols-outlined text-slate-400 text-[32px] flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-sm font-black text-slate-900">{role}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="mt-14">
          <h2 className="text-xl font-black text-slate-900">다루는 분야</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            현재 Whiteboard는 다음 5개 분야의 도서를 중심으로 콘텐츠를 제공합니다.
            각 분야는 현대인의 삶에서 가장 실용적인 인사이트를 제공하는 영역으로 선정되었습니다.
          </p>
          <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: 'rocket_launch', label: '자기계발', color: 'text-blue-500 bg-blue-50 border-blue-100' },
              { icon: 'payments', label: '경제', color: 'text-amber-500 bg-amber-50 border-amber-100' },
              { icon: 'business_center', label: '경영', color: 'text-violet-500 bg-violet-50 border-violet-100' },
              { icon: 'history_edu', label: '인문', color: 'text-rose-500 bg-rose-50 border-rose-100' },
              { icon: 'psychology', label: '심리', color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
            ].map(({ icon, label, color }) => (
              <div key={label} className={`flex flex-col items-center gap-2 p-4 rounded-lg border text-center ${color}`}>
                <span className="material-symbols-outlined text-[24px]">{icon}</span>
                <span className="text-xs font-black">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="mt-14 rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900">문의 및 제휴</h2>
            <p className="mt-1 text-sm text-slate-500">콘텐츠 정정, 저작권, 광고 제휴 문의는 언제든 환영합니다.</p>
          </div>
          <Link
            to="/contact"
            className="flex-shrink-0 px-5 py-2.5 rounded-md bg-slate-900 text-white text-sm font-black hover:bg-blue-700 transition-colors"
          >
            문의하기
          </Link>
        </section>

      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
}
