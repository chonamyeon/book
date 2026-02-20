import React, { useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import BottomNavigation from '../components/BottomNavigation';

export default function PrivacyPolicy() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen pb-24">
            <TopNavigation title="Privacy Policy" />

            <main className="px-6 pt-24 pb-12 overflow-y-auto">
                <article className="prose prose-sm dark:prose-invert">
                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4">개인정보처리방침</h2>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            본 방침은 2026년 2월 20일부터 시행됩니다.
                        </p>
                        <p className="text-sm leading-relaxed mb-4">
                            '아카이드: 생각의 시간'은(이하 '회사'는) 고객님의 개인정보를 중요시하며, "개인정보 보호법" 및 "정보통신망 이용촉진 및 정보보호 등에 관한 법률"을 준수하고 있습니다.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-sm font-bold border-l-4 border-gold pl-2 mb-3">1. 수집하는 개인정보 항목</h3>
                        <p className="text-xs leading-relaxed opacity-80">
                            - 필수항목: 이름(닉네임), 이메일 주소, 소셜 로그인 정보(Google)<br />
                            - 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보
                        </p>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-sm font-bold border-l-4 border-gold pl-2 mb-3">2. 개인정보의 수집 및 이용목적</h3>
                        <p className="text-xs leading-relaxed opacity-80">
                            - 서비스 제공에 따른 본인 식별 및 포인트 결제 처리<br />
                            - 신규 서비스 개발 및 개인화된 추천 서비스 제공 (테스트 결과 분석)<br />
                            - 구글 애드센스 등 광고 게재 및 분석
                        </p>
                    </section>

                    <section className="mb-8 border-gold/20 border p-4 rounded-xl bg-gold/5">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">cookie</span>
                            3. 쿠키(Cookie)의 운용 및 거부
                        </h3>
                        <p className="text-[11px] leading-relaxed opacity-90">
                            - 회사는 귀하에 대한 정보를 저장하고 수시로 찾아내는 '쿠키(cookie)'를 사용합니다.<br />
                            - **구글 애드센스 사용**: 구글은 제3자 제공업체로서, 귀하의 웹사이트 방문 기록에 따라 광고를 게재하기 위해 쿠키를 사용합니다.<br />
                            - 이용자는 쿠키 설치에 대한 선택권을 가지고 있으며, 브라우저 설정을 통해 모든 쿠키를 허용하거나 거부할 수 있습니다.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-sm font-bold border-l-4 border-gold pl-2 mb-3">4. 개인정보의 보유 및 이용기간</h3>
                        <p className="text-xs leading-relaxed opacity-80">
                            - 이용자가 회원 탈퇴를 요청하거나 개인정보 수집 목적이 달성된 후에는 지체 없이 해당 정보를 파기합니다.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-sm font-bold border-l-4 border-gold pl-2 mb-3">5. 개인정보 보호책임자</h3>
                        <p className="text-xs leading-relaxed opacity-80">
                            - 성명: 운영자 (Archide Team)<br />
                            - 이메일: support@archide.co.kr
                        </p>
                    </section>
                </article>
            </main>

            <BottomNavigation />
        </div>
    );
}
