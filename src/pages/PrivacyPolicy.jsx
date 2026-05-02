import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white text-slate-900 min-h-screen pb-24">
      <Helmet>
        <title>개인정보처리방침 | Whiteboard</title>
        <meta name="description" content="Whiteboard의 개인정보 수집, 이용, 쿠키 및 Google AdSense 광고 기술 사용에 관한 안내입니다." />
        <link rel="canonical" href="https://archiview.shop/privacy" />
      </Helmet>
      <TopNavigation title="개인정보처리방침" />

      <main className="mx-auto max-w-3xl px-6 pt-28 pb-16">
        <h1 className="text-3xl font-black tracking-tight">개인정보처리방침</h1>
        <p className="mt-3 text-sm text-slate-500">시행일: 2026년 5월 2일 · 최종 수정: 2026년 5월 2일</p>

        <div className="mt-10 space-y-9 text-sm leading-7 text-slate-700">

          <section>
            <h2 className="text-lg font-black text-slate-900">1. 수집하는 정보</h2>
            <p className="mt-3">
              Whiteboard는 문의 처리, 로그인 세션, 독서 노트 저장 등 서비스 제공에 필요한 최소한의 정보를 처리합니다.
              수집할 수 있는 정보는 다음과 같습니다.
            </p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-slate-600">
              <li>사용자가 직접 입력한 이름, 이메일 주소, 문의 내용</li>
              <li>로그인 시 Google 계정 정보 (이름, 이메일, 프로필 사진)</li>
              <li>접속 IP 주소, 브라우저 종류 및 버전, 운영체제</li>
              <li>방문한 페이지, 체류 시간, 클릭 이벤트 등 사용 로그</li>
              <li>쿠키 및 유사 기술을 통한 식별자</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">2. 이용 목적</h2>
            <p className="mt-3">수집된 정보는 다음 목적으로만 사용됩니다.</p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-slate-600">
              <li>서비스 제공 및 계정 관리</li>
              <li>사용자 문의 응답 및 지원</li>
              <li>사이트 보안 유지 및 부정 사용 방지</li>
              <li>서비스 품질 개선 및 오류 분석</li>
              <li>맞춤형 광고 제공 및 광고 성과 측정 (동의한 경우)</li>
              <li>법적 의무 준수</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">3. 쿠키 사용 및 Google 광고 기술</h2>
            <p className="mt-3">
              Whiteboard는 사이트 운영, 분석, 광고 제공을 위해 쿠키 및 유사 추적 기술을 사용합니다.
              사용자가 쿠키 동의 배너에서 <strong>전체 동의</strong>를 선택한 경우에만 광고·분석 쿠키가 활성화됩니다.
            </p>

            <h3 className="mt-5 font-black text-slate-900">Google AdSense 및 광고 쿠키</h3>
            <p className="mt-2">
              본 사이트는 <strong>Google AdSense</strong>를 통해 광고를 게재합니다. Google 및 제휴사는 쿠키를 사용하여
              이전 방문 기록을 기반으로 광고를 표시할 수 있습니다. Google의 광고 쿠키 사용에 관한 자세한 내용은{' '}
              <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Google 광고 기술 정책
              </a>에서 확인할 수 있습니다.
            </p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-black text-slate-700">쿠키 이름</th>
                    <th className="px-4 py-3 text-left font-black text-slate-700">제공자</th>
                    <th className="px-4 py-3 text-left font-black text-slate-700">목적</th>
                    <th className="px-4 py-3 text-left font-black text-slate-700">보존 기간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="px-4 py-3 font-mono">_ga, _ga_*</td>
                    <td className="px-4 py-3">Google Analytics</td>
                    <td className="px-4 py-3">방문자 수 측정, 사용 패턴 분석</td>
                    <td className="px-4 py-3">2년</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono">_gid</td>
                    <td className="px-4 py-3">Google Analytics</td>
                    <td className="px-4 py-3">사용자 세션 구분</td>
                    <td className="px-4 py-3">24시간</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono">_gat</td>
                    <td className="px-4 py-3">Google Analytics</td>
                    <td className="px-4 py-3">요청 속도 제한</td>
                    <td className="px-4 py-3">1분</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono">IDE</td>
                    <td className="px-4 py-3">Google DoubleClick</td>
                    <td className="px-4 py-3">광고 개인화 및 성과 측정</td>
                    <td className="px-4 py-3">약 1년</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono">test_cookie</td>
                    <td className="px-4 py-3">DoubleClick.net</td>
                    <td className="px-4 py-3">쿠키 지원 여부 확인</td>
                    <td className="px-4 py-3">세션</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono">archiview_cookie_consent</td>
                    <td className="px-4 py-3">Whiteboard</td>
                    <td className="px-4 py-3">쿠키 동의 여부 저장</td>
                    <td className="px-4 py-3">1년</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-6 font-black text-slate-900">광고 쿠키 거부 방법</h3>
            <p className="mt-2">다음 방법으로 광고 쿠키 사용을 제한하거나 거부할 수 있습니다.</p>
            <ul className="mt-3 list-disc list-inside space-y-2 text-slate-600">
              <li>
                <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  Google 광고 설정
                </a>{' '}
                에서 관심 기반 광고를 직접 관리할 수 있습니다.
              </li>
              <li>
                <a href="https://optout.networkadvertising.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  NAI(Network Advertising Initiative) 옵트아웃 도구
                </a>를 통해 참여 네트워크의 맞춤 광고에서 제외될 수 있습니다.
              </li>
              <li>
                <a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  DAA(Digital Advertising Alliance) 옵트아웃 도구
                </a>를 이용할 수 있습니다.
              </li>
              <li>사이트 하단의 쿠키 동의 배너에서 <strong>필수만 허용</strong>을 선택하면 분석·광고 쿠키가 비활성화됩니다.</li>
              <li>브라우저 설정에서 쿠키를 직접 차단하거나 삭제할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">4. 제3자 제공 및 위탁</h2>
            <p className="mt-3">서비스 운영을 위해 다음 제3자 서비스가 사용될 수 있습니다. 각 서비스는 자체 개인정보처리방침에 따라 데이터를 처리합니다.</p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-black text-slate-700">서비스</th>
                    <th className="px-4 py-3 text-left font-black text-slate-700">목적</th>
                    <th className="px-4 py-3 text-left font-black text-slate-700">개인정보처리방침</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="px-4 py-3 font-bold">Google LLC</td>
                    <td className="px-4 py-3">광고 게재, 통계 분석, 로그인</td>
                    <td className="px-4 py-3">
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">보기</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Vercel Inc.</td>
                    <td className="px-4 py-3">웹 호스팅 및 CDN</td>
                    <td className="px-4 py-3">
                      <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">보기</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Kakao Corp.</td>
                    <td className="px-4 py-3">소셜 공유 기능</td>
                    <td className="px-4 py-3">
                      <a href="https://www.kakao.com/policy/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">보기</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">5. 개인정보 보관 기간</h2>
            <p className="mt-3">개인정보는 수집 목적 달성 후 지체 없이 파기합니다. 다만 다음의 경우 해당 기간 동안 보관할 수 있습니다.</p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-slate-600">
              <li>전자상거래 관련 법령: 계약·청약철회 기록 5년, 소비자 불만 기록 3년</li>
              <li>전자금융거래법: 전자금융 거래 기록 5년</li>
              <li>통신비밀보호법: 로그인 기록 3개월</li>
              <li>분쟁 해결을 위해 필요한 경우: 분쟁 종결 시까지</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">6. 이용자의 권리</h2>
            <p className="mt-3">
              이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.
              EU/EEA 거주자는 GDPR에 따른 데이터 이동권, 처리 반대권을 추가로 행사할 수 있습니다.
              요청은 아래 개인정보 보호 책임자에게 이메일로 보내주세요.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">7. 아동 개인정보 보호</h2>
            <p className="mt-3">
              Whiteboard는 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다.
              만 14세 미만 이용자가 개인정보를 제공한 사실이 확인되면 즉시 삭제 조치합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">8. 국제 데이터 이전</h2>
            <p className="mt-3">
              Google, Vercel 등 일부 서비스 제공자는 대한민국 외 지역(미국 등)에 데이터를 처리·저장할 수 있습니다.
              이 경우 각 서비스 제공자는 GDPR 표준계약조항(SCC) 등 적합한 보호 조치를 적용합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">9. 개인정보처리방침 변경</h2>
            <p className="mt-3">
              본 방침은 법령·서비스 변경에 따라 수정될 수 있습니다. 중요한 변경 사항은 사이트 공지 또는 이메일로 7일 전 안내합니다.
              변경된 방침은 사이트에 게시한 날로부터 효력이 발생합니다.
            </p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-black text-slate-900">10. 개인정보 보호 책임자</h2>
            <p className="mt-3">운영자: Whiteboard Team</p>
            <p>이메일: <a className="text-blue-600 underline" href="mailto:gosipass902@gmail.com">gosipass902@gmail.com</a></p>
            <p>사이트: <a className="text-blue-600 underline" href="https://archiview.shop">https://archiview.shop</a></p>
            <p className="mt-3 text-xs text-slate-500">
              개인정보 관련 불만이 해소되지 않을 경우{' '}
              <a href="https://www.privacy.go.kr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                개인정보보호위원회
              </a>에 신고하실 수 있습니다.
            </p>
          </section>
        </div>
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
}
