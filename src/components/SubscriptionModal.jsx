import React from 'react';

export default function SubscriptionModal({ onClose, trialDaysLeft, siteConfig }) {
    const isExpired = !trialDaysLeft || trialDaysLeft === 0;
    
    // 관리자 설정 가격 (팟캐스트 또는 트라이얼)
    const podcastConfig = siteConfig?.podcastAccess || {};
    const trialConfig = siteConfig?.trialAccess || {};
    
    // 팟캐스트 설정이 free이면 모달 자체를 닫기 (안전장치)
    if (podcastConfig.mode === 'free' && trialConfig.mode === 'free') {
        setTimeout(onClose, 100);
        return null;
    }

    const price = podcastConfig.price || trialConfig.price || 4900;
    const originalPrice = podcastConfig.originalPrice || trialConfig.originalPrice || 9900;

    return (
        <div
            className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            {/* 배경 블러 */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <div
                className="relative w-full sm:max-w-sm mx-auto bg-[#0e1118] border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-8 space-y-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* 아이콘 */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="size-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-400 text-3xl">workspace_premium</span>
                    </div>
                    <h2 className="text-white font-black text-2xl tracking-tight">
                        {isExpired ? '무료 체험이 종료됐어요' : `체험 ${trialDaysLeft}일 남았어요`}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        {isExpired
                            ? '팟캐스트를 계속 듣고 싶다면\n아카이뷰 프리미엄을 시작하세요.'
                            : '프리미엄으로 업그레이드하면\n광고 없이 무제한으로 즐길 수 있어요.'}
                    </p>
                </div>

                {/* 혜택 목록 */}
                <ul className="space-y-3">
                    {[
                        '팟캐스트 무제한 청취',
                        '모든 광고 완전 제거',
                        '매주 월요일 신규 콘텐츠 2편',
                        '백그라운드 재생',
                    ].map(item => (
                        <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                            <span className="material-symbols-outlined text-amber-400 text-base">check_circle</span>
                            {item}
                        </li>
                    ))}
                </ul>

                {/* 가격 */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                    <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-1">월 구독</p>
                    <div className="flex items-center justify-center gap-2">
                        {originalPrice > price && (
                            <span className="text-slate-500 line-through text-sm">₩{originalPrice.toLocaleString()}</span>
                        )}
                        <p className="text-white font-black text-3xl">
                            {price.toLocaleString()}<span className="text-lg font-medium text-slate-400">원</span>
                        </p>
                        {originalPrice > price && (
                            <span className="text-xs font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                                {Math.round((1 - price / originalPrice) * 100)}% OFF
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 text-xs mt-1">언제든 해지 가능</p>
                </div>

                {/* 버튼 */}
                <div className="space-y-3">
                    <button
                        disabled
                        className="w-full py-4 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black text-sm cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-base">schedule</span>
                        구독하기 (준비 중)
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-2xl bg-white/5 text-slate-400 text-sm font-bold hover:bg-white/10 transition-all"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
