import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

export default function Disclaimer() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white text-slate-900 min-h-screen pb-24">
      <Helmet>
        <title>면책 및 편집 정책 | Whiteboard</title>
        <meta name="description" content="Whiteboard의 편집 기준, 저작권 존중, 광고 수익 공개, 제휴 링크, 정보 제공 한계에 대한 안내입니다." />
        <link rel="canonical" href="https://archiview.shop/disclaimer" />
      </Helmet>
      <TopNavigation title="면책 및 편집 정책" />

      <main className="mx-auto max-w-3xl px-6 pt-28 pb-16">
        <h1 className="text-3xl font-black tracking-tight">면책 및 편집 정책</h1>
        <p className="mt-3 text-sm text-slate-500">최종 수정: 2026년 5월 2일</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-700">

          <section className="rounded-lg border border-amber-100 bg-amber-50 p-5">
            <h2 className="text-base font-black text-slate-900">광고 및 수익 공개 (Advertising Disclosure)</h2>
            <p className="mt-3">
              Whiteboard는 사이트 운영 비용을 충당하기 위해 <strong>Google AdSense</strong>를 통한 광고 수익을 얻고 있습니다.
              Google은 사용자의 이전 방문 기록을 기반으로 맞춤형 광고를 표시할 수 있습니다.
            </p>
            <p className="mt-3">
              광고는 콘텐츠 영역과 명확하게 분리되며, 광고주는 Whiteboard의 편집 방향이나 도서 선정에
              어떠한 영향도 미치지 않습니다. 광고주의 제품·서비스에 대한 추천을 의미하지 않습니다.
            </p>
            <p className="mt-3">
              광고 쿠키 사용을 원하지 않으시면 사이트 하단의 쿠키 설정에서 <strong>필수만 허용</strong>을 선택하거나,{' '}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Google 광고 설정
              </a>에서 직접 관리할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">편집 독립성</h2>
            <p className="mt-3">
              Whiteboard의 모든 글은 독자의 이해를 돕기 위한 독자적 해설과 비평으로 작성됩니다.
              광고 또는 제휴 관계가 편집 판단을 대체하지 않도록 콘텐츠와 광고를 분리합니다.
              특정 도서나 제품을 유료로 추천하는 행위는 하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">저작권 존중</h2>
            <p className="mt-3">
              도서 원문을 대량으로 복제하지 않으며, 책을 대체하는 콘텐츠를 제공하지 않습니다.
              모든 도서 비평과 해설은 공정 이용(Fair Use) 원칙에 따른 비평·논평·교육 목적으로 작성됩니다.
              원저작물의 구매와 정식 독서를 권장합니다.
            </p>
            <p className="mt-3">
              도서 표지 이미지, 저자 사진 등 제3자 저작물을 사용하는 경우 해당 저작권자의 권리를 존중하며,
              저작권 침해 신고는{' '}
              <a className="text-blue-600 underline" href="mailto:gosipass902@gmail.com">gosipass902@gmail.com</a>으로
              보내주시면 신속히 검토합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">정보 제공 한계</h2>
            <p className="mt-3">
              사이트의 모든 정보는 일반적인 교육 및 비평 목적입니다. 다음 분야의 의사결정에는
              반드시 자격을 갖춘 전문가의 조언을 받으시기 바랍니다.
            </p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-slate-600">
              <li>투자, 재무, 세무 관련 결정</li>
              <li>건강, 의료, 심리 치료 관련 결정</li>
              <li>법률, 계약, 소송 관련 결정</li>
              <li>진로, 직업, 비즈니스 관련 중요 결정</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">AI 생성 콘텐츠</h2>
            <p className="mt-3">
              일부 콘텐츠(팟캐스트 스크립트, 요약문 등)는 AI 기술을 활용하여 초안이 작성되고
              편집자가 검토·수정한 것입니다. AI 생성 콘텐츠임을 별도로 표시하도록 노력하며,
              사실 관계는 원본 도서와 신뢰할 수 있는 출처를 통해 확인됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">오류 정정</h2>
            <p className="mt-3">
              사실 오류, 저작권 문제, 부적절한 표현을 발견한 경우{' '}
              <a className="text-blue-600 underline" href="mailto:gosipass902@gmail.com">gosipass902@gmail.com</a>으로
              알려주세요. 확인 후 신속하게 수정하겠습니다.
            </p>
          </section>

        </div>
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
}
