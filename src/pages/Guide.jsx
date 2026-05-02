import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

const sections = [
  {
    icon: 'menu_book',
    title: '1. 왜 독서 인사이트가 필요한가?',
    content: [
      '매년 국내에서 출간되는 도서는 6만 권이 넘습니다. 그 중에서 자신에게 맞는 책을 고르는 일 자체가 하나의 능력이 되었습니다. 좋은 책이라고 알려진 책을 읽어도 막상 무엇을 얻었는지 불분명한 경우도 많습니다.',
      '독서 인사이트란 단순히 책 내용을 요약하는 것이 아닙니다. 저자가 왜 이 주장을 했는지, 어떤 근거를 제시했는지, 그리고 그 주장이 내 삶에 어떻게 적용될 수 있는지를 연결하는 과정입니다. 이 과정을 혼자 하기 어렵기 때문에 Whiteboard가 존재합니다.',
    ],
  },
  {
    icon: 'psychology',
    title: '2. 효과적으로 독서 인사이트를 활용하는 법',
    content: [
      '책 한 권에서 단 하나의 인사이트만 건져도 충분합니다. 처음부터 모든 내용을 흡수하려 하면 오히려 아무것도 남지 않는 경우가 많습니다. 자신의 현재 상황과 관련된 한 가지 개념에 집중해보세요.',
      'Whiteboard의 각 리뷰에는 "핵심 주장", "비판적 시각", "실천 질문"이 포함되어 있습니다. 리뷰를 읽은 뒤 실천 질문에 먼저 스스로 답해보는 것이 독서 효과를 높이는 가장 빠른 방법입니다.',
    ],
  },
  {
    icon: 'category',
    title: '3. 분야별 독서 전략',
    content: [
      '**자기계발**: 너무 많은 자기계발서를 읽는 것보다 한 권을 깊게 읽고 실천하는 편이 효과적입니다. "시스템 만들기"를 다루는 책들(습관, 루틴, 생산성)부터 시작하면 다른 분야의 책들도 훨씬 잘 흡수됩니다.',
      '**경제·경영**: 이론서보다는 실제 사례 중심의 책이 처음에는 더 재미있습니다. 개념이 생소할 때는 한 권을 다 읽으려 하기보다 관심 있는 챕터부터 읽어도 괜찮습니다.',
      '**인문·심리**: 이 분야는 빠르게 읽을 필요가 없습니다. 한 문장, 한 단락에서 오래 머무는 것이 오히려 가치 있습니다. 밑줄을 긋고 자신의 생각을 짧게 메모하는 습관이 특히 효과적입니다.',
    ],
  },
  {
    icon: 'lightbulb',
    title: '4. Whiteboard를 200% 활용하는 방법',
    content: [
      '리뷰를 읽기 전에 먼저 책 제목과 저자를 검색해서 어떤 책인지 30초만 파악해보세요. 그리고 리뷰를 읽을 때는 "이 내용이 내 상황과 어떻게 연결되는가"를 계속 생각하면서 읽으면 훨씬 많이 남습니다.',
      '한 번에 여러 리뷰를 몰아보는 것보다, 하루 하나씩 읽고 그날 하루 그 인사이트를 의식하며 지내보는 것이 장기적으로 훨씬 더 큰 변화를 만듭니다.',
      '서재 기능을 활용해서 나중에 읽고 싶은 책을 보관해두면, 다음에 뭘 읽을지 고민하는 시간을 줄일 수 있습니다.',
    ],
  },
  {
    icon: 'format_quote',
    title: '5. 책을 고를 때 주의할 점',
    content: [
      '베스트셀러라고 해서 모든 사람에게 좋은 책은 아닙니다. 유명한 책이 내 상황과 맞지 않는 경우도 많고, 반대로 덜 알려진 책이 나에게는 인생책이 될 수도 있습니다.',
      'Whiteboard의 비판적 시각 섹션은 이런 판단을 도와주기 위해 존재합니다. 단순히 "이 책은 좋다/나쁘다"가 아니라 "어떤 독자에게, 어떤 상황에서 이 책이 가치 있는가"를 함께 생각해보기를 권합니다.',
    ],
  },
];

export default function Guide() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white text-slate-900 min-h-screen pb-24">
      <Helmet>
        <title>독서 가이드 | Whiteboard — 효과적인 독서법과 인사이트 활용법</title>
        <meta
          name="description"
          content="독서 인사이트를 효과적으로 활용하는 방법, 분야별 독서 전략, Whiteboard를 200% 활용하는 팁을 소개합니다."
        />
        <link rel="canonical" href="https://archiview.shop/guide" />
      </Helmet>
      <TopNavigation />

      <main className="mx-auto max-w-3xl px-6 pt-28 pb-16">

        <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">Reading Guide</p>
        <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight md:text-4xl">
          독서 인사이트 활용 가이드
        </h1>
        <p className="mt-5 text-base leading-8 text-slate-600">
          책을 읽고 싶지만 어디서 시작해야 할지 모르겠다면, 읽었는데 남는 게 없다면,
          이 가이드가 도움이 될 것입니다. Whiteboard의 콘텐츠를 더 잘 활용하는 방법도 함께 소개합니다.
        </p>

        <div className="mt-12 space-y-12">
          {sections.map(({ icon, title, content }) => (
            <section key={title}>
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-blue-500 text-[24px]">{icon}</span>
                <h2 className="text-lg font-black text-slate-900">{title}</h2>
              </div>
              <div className="space-y-3 pl-9">
                {content.map((para, i) => (
                  <p key={i} className="text-sm leading-8 text-slate-600">{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Categories nav */}
        <section className="mt-14 rounded-xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-base font-black text-slate-900 mb-2">지금 바로 시작해보세요</h2>
          <p className="text-sm text-slate-600 mb-5">관심 있는 분야를 선택하면 해당 카테고리의 도서 인사이트를 바로 볼 수 있습니다.</p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: '자기계발', path: '/' },
              { label: '경제', path: '/' },
              { label: '경영', path: '/' },
              { label: '인문', path: '/' },
              { label: '심리', path: '/' },
            ].map(({ label, path }) => (
              <Link
                key={label}
                to={path}
                className="px-4 py-2 rounded-full border border-blue-200 text-blue-600 text-sm font-bold hover:bg-blue-600 hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
}
