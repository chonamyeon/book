import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import MainHeader from '../components/MainHeader';
import BottomNavigation from '../components/BottomNavigation';
import Footer from '../components/Footer';

export default function Terms() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen pb-24">
            <Helmet>
                <title>이용약관 | 아카이뷰(ArchiView)</title>
                <meta name="description" content="아카이뷰 서비스 이용약관입니다. 서비스 이용 전 반드시 확인해 주세요." />
                <link rel="canonical" href="https://archiview.shop/terms" />
            </Helmet>
            <MainHeader showBack />

            <main className="px-6 pt-24 pb-12">
                <article>
                    <h1 className="text-2xl font-black mb-2">서비스 이용약관</h1>
                    <p className="text-xs text-slate-400 mb-8">시행일: 2026년 2월 20일 · 최종 수정: 2026년 4월 1일</p>

                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                        아카이뷰(이하 '회사')가 제공하는 모든 서비스(이하 '서비스')를 이용하기 전에 본 이용약관을 주의 깊게 읽어주시기 바랍니다. 서비스를 이용하거나 접속함으로써 이 약관에 동의하게 됩니다.
                    </p>

                    <div className="space-y-8">

                        <section className="border-l-4 border-amber-400 pl-4">
                            <h2 className="text-base font-black mb-3">제1조 (목적)</h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                본 약관은 아카이뷰(https://archiview.shop)가 제공하는 오디오 인사이트 플랫폼 서비스의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
                            </p>
                        </section>

                        <section className="border-l-4 border-amber-400 pl-4">
                            <h2 className="text-base font-black mb-3">제2조 (정의)</h2>
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                                <li>① "서비스"란 회사가 제공하는 오디오 인사이트 콘텐츠, 도서 리뷰, 독서 성향 테스트, 독서 노트 등 일체의 서비스를 의미합니다.</li>
                                <li>② "이용자"란 본 약관에 동의하고 서비스를 이용하는 모든 회원 및 비회원을 의미합니다.</li>
                                <li>③ "콘텐츠"란 회사가 서비스를 통해 제공하는 오디오, 텍스트, 이미지 등 모든 형태의 정보를 의미합니다.</li>
                            </ul>
                        </section>

                        <section className="border-l-4 border-amber-400 pl-4">
                            <h2 className="text-base font-black mb-3">제3조 (약관의 효력 및 변경)</h2>
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                                <li>① 본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
                                <li>② 회사는 합리적인 사유가 발생할 경우 약관을 변경할 수 있으며, 변경 시 시행일 7일 전 공지합니다.</li>
                                <li>③ 이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.</li>
                            </ul>
                        </section>

                        <section className="border-l-4 border-amber-400 pl-4">
                            <h2 className="text-base font-black mb-3">제4조 (서비스 이용)</h2>
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                                <li>① 회사가 제공하는 일부 콘텐츠는 비회원도 이용할 수 있으나, 서재 관리·독서 노트 등 개인화 기능은 회원 가입 후 이용 가능합니다.</li>
                                <li>② 회사는 서비스의 질적 향상을 위해 사전 공지 없이 콘텐츠 및 기능을 변경하거나 중단할 수 있습니다.</li>
                                <li>③ 서비스 이용 시간은 원칙적으로 연중무휴 24시간이나, 시스템 유지보수 등의 사유로 일시 중단될 수 있습니다.</li>
                            </ul>
                        </section>

                        <section className="border-l-4 border-amber-400 pl-4">
                            <h2 className="text-base font-black mb-3">제5조 (이용자의 의무)</h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">이용자는 다음 행위를 하여서는 안 됩니다.</p>
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                                <li>① 타인의 정보를 도용하거나 허위 정보를 등록하는 행위</li>
                                <li>② 회사의 지식재산권을 침해하는 행위 (콘텐츠 무단 복제·배포·상업적 이용 등)</li>
                                <li>③ 서비스의 정상적인 운영을 방해하는 행위</li>
                                <li>④ 관련 법령 또는 공서양속에 반하는 행위</li>
                                <li>⑤ 기타 회사가 부적절하다고 판단하는 행위</li>
                            </ul>
                        </section>

                        <section className="border-l-4 border-amber-400 pl-4">
                            <h2 className="text-base font-black mb-3">제6조 (지식재산권)</h2>
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                                <li>① 서비스 내의 모든 콘텐츠(오디오, 텍스트, 이미지, 디자인 등)에 대한 저작권 및 지식재산권은 회사에 귀속됩니다.</li>
                                <li>② 아카이뷰의 콘텐츠는 원저작물을 낭독하지 않으며, 각 도서의 핵심 철학을 분석한 독창적인 2차 창작물입니다.</li>
                                <li>③ 이용자는 회사의 사전 동의 없이 콘텐츠를 복제·배포·방송·전송하거나 상업적 목적으로 활용할 수 없습니다.</li>
                            </ul>
                        </section>

                        <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-5 rounded-xl">
                            <h2 className="text-base font-black mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500 text-[18px]">campaign</span>
                                제7조 (광고 게재)
                            </h2>
                            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                                <p>① 회사는 서비스 운영을 위해 Google AdSense 등 제3자 광고 서비스를 통해 광고를 게재할 수 있습니다.</p>
                                <p>② 이용자는 광고 게재에 동의하며, 광고 내용에 관한 책임은 광고주에게 있습니다.</p>
                                <p>③ Google AdSense는 이용자의 관심사에 맞는 맞춤형 광고를 위해 쿠키를 사용할 수 있습니다. 쿠키 설정은 개인정보처리방침 및 쿠키 동의 배너를 통해 관리할 수 있습니다.</p>
                            </div>
                        </section>

                        <section className="border-l-4 border-amber-400 pl-4">
                            <h2 className="text-base font-black mb-3">제8조 (면책 조항)</h2>
                            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                                <li>① 회사는 천재지변, 불가항력적 사유로 인한 서비스 제공 불가에 대해 책임을 지지 않습니다.</li>
                                <li>② 회사는 이용자의 귀책 사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
                                <li>③ 아카이뷰의 콘텐츠는 정보 제공 목적으로 제작된 독창적 2차 창작물이며, 투자·법률·의료 등 전문 분야에 대한 조언을 대체하지 않습니다.</li>
                            </ul>
                        </section>

                        <section className="border-l-4 border-amber-400 pl-4">
                            <h2 className="text-base font-black mb-3">제9조 (준거법 및 관할)</h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                본 약관은 대한민국 법률에 따라 규율되며, 서비스와 관련한 분쟁이 발생한 경우 회사의 소재지를 관할하는 법원을 전속 관할 법원으로 합니다.
                            </p>
                        </section>

                        <section className="border-l-4 border-amber-400 pl-4">
                            <h2 className="text-base font-black mb-3">제10조 (문의)</h2>
                            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
                                <p>약관과 관련한 문의는 아래 연락처로 해주시기 바랍니다.</p>
                                <p>• 서비스명: 아카이뷰 (Archiview)</p>
                                <p>• 이메일: <a href="mailto:gosipass902@gmail.com" className="text-amber-600 underline">gosipass902@gmail.com</a></p>
                                <p>• 웹사이트: <a href="https://archiview.shop" className="text-amber-600 underline">https://archiview.shop</a></p>
                            </div>
                        </section>

                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-white/5 flex gap-4 justify-center flex-wrap">
                        <Link to="/about" className="text-xs text-slate-400 hover:text-slate-600 underline">서비스 소개</Link>
                        <Link to="/privacy" className="text-xs text-slate-400 hover:text-slate-600 underline">개인정보처리방침</Link>
                        <Link to="/contact" className="text-xs text-slate-400 hover:text-slate-600 underline">문의하기</Link>
                    </div>
                </article>
            </main>

            <Footer />
            <BottomNavigation />
        </div>
    );
}
