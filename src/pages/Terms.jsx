import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white text-slate-900 min-h-screen pb-24">
      <Helmet>
        <title>이용약관 | Whiteboard</title>
        <meta name="description" content="Whiteboard 서비스 이용 조건, 콘텐츠 저작권, 광고 및 면책 조항 안내입니다." />
        <link rel="canonical" href="https://archiview.shop/terms" />
      </Helmet>
      <TopNavigation title="이용약관" />

      <main className="mx-auto max-w-3xl px-6 pt-28 pb-16">
        <h1 className="text-3xl font-black tracking-tight">이용약관</h1>
        <p className="mt-3 text-sm text-slate-500">시행일: 2026년 5월 2일 · 최종 수정: 2026년 5월 2일</p>

        <div className="mt-10 space-y-9 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-black text-slate-900">1. 목적</h2>
            <p className="mt-3">
              본 약관은 Whiteboard(이하 "서비스")가 제공하는 독서 인사이트 콘텐츠, 리뷰, 오디오 및 관련 서비스의
              이용 조건과 이용자와 서비스 운영자 간의 권리·의무 관계를 정합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">2. 이용 자격</h2>
            <p className="mt-3">
              본 서비스는 만 14세 이상 누구나 이용할 수 있습니다. 만 14세 미만 이용자는 법정대리인의 동의 없이
              회원가입 또는 개인정보 제공이 제한됩니다. 서비스를 이용함으로써 본 약관에 동의한 것으로 간주합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">3. 콘텐츠 이용</h2>
            <p className="mt-3">
              Whiteboard의 모든 콘텐츠(텍스트, 이미지, 오디오, 비평 글 등)는 정보 제공 및 비평 목적의 2차 창작물입니다.
              사전 서면 허가 없이 다음 행위를 금지합니다.
            </p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-slate-600">
              <li>콘텐츠의 무단 복제, 배포, 전송, 방송</li>
              <li>상업적 목적의 재사용 및 2차 가공</li>
              <li>자동화된 수단(크롤러, 스크래퍼 등)을 이용한 대량 수집</li>
            </ul>
            <p className="mt-3">
              비상업적 인용, 교육 목적의 짧은 발췌는 출처를 명시하는 조건으로 허용됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">4. 이용자 행동 규범</h2>
            <p className="mt-3">이용자는 서비스를 이용할 때 다음 사항을 준수해야 합니다.</p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-slate-600">
              <li>타인의 권리를 침해하는 콘텐츠를 게시하지 않습니다.</li>
              <li>허위 정보, 스팸, 악성코드를 전파하지 않습니다.</li>
              <li>서비스의 정상적인 운영을 방해하는 행위를 하지 않습니다.</li>
              <li>관련 법령 및 본 약관을 위반하지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">5. 광고와 제휴</h2>
            <p className="mt-3">
              사이트 운영을 위해 <strong>Google AdSense</strong> 등 광고 서비스와 제휴 링크가 포함될 수 있습니다.
              광고와 편집 콘텐츠는 명확히 구분되며, 광고주의 주장은 Whiteboard의 의견을 의미하지 않습니다.
              광고 수익은 사이트 운영 및 콘텐츠 제작 비용에 사용됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">6. 서비스 변경 및 중단</h2>
            <p className="mt-3">
              운영자는 서비스의 내용, 기능, 이용 조건을 사전 공지 후 변경하거나 일시적·영구적으로 중단할 수 있습니다.
              서비스 중단으로 인한 손해에 대해 법령이 정한 범위 내에서 책임을 집니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">7. 면책</h2>
            <p className="mt-3">
              모든 콘텐츠는 일반 정보 제공을 목적으로 합니다. 투자, 법률, 의료, 직업 선택 등 중요한 결정은
              별도의 전문가 상담과 원문 확인을 권장합니다. 서비스 이용으로 발생하는 손해에 대해 고의 또는
              중과실이 없는 경우 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">8. 준거법 및 분쟁 해결</h2>
            <p className="mt-3">
              본 약관은 <strong>대한민국 법률</strong>에 따라 해석되고 적용됩니다.
              서비스 이용과 관련하여 분쟁이 발생한 경우, 운영자와 이용자는 상호 협의를 통해 해결하는 것을 우선으로 합니다.
              협의가 이루어지지 않을 경우 관련 법령에 따른 관할 법원에 소를 제기할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">9. 약관 변경</h2>
            <p className="mt-3">
              본 약관은 필요 시 변경될 수 있으며, 중요한 변경 사항은 사이트 공지 또는 이메일을 통해 7일 전에 안내합니다.
              변경된 약관에 동의하지 않을 경우 서비스 이용을 중단할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">10. 문의</h2>
            <p className="mt-3">
              약관 및 서비스 관련 문의:{' '}
              <a className="text-blue-600 underline" href="mailto:gosipass902@gmail.com">gosipass902@gmail.com</a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
}
