import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { availableAudio } from '../data/availableAudio';
import { shareCard } from '../utils/shareCard';
import { useAuth } from '../hooks/useAuth';

const KAKAO_KEY = '9cbdeec02a8ce33b5deb576a0e63c380';
const SITE_ORIGIN = 'https://archiview.store';

// Instagram SVG icon
const InstagramIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
);

// KakaoTalk SVG icon (speech bubble)
const KakaoIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.698 1.524 5.08 3.84 6.56l-.96 3.52 4.16-2.24c.95.22 1.93.36 2.96.36 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
    </svg>
);

/**
 * 공유 북카드 액션 버튼 컴포넌트
 * 4개 버튼: 리뷰 디테일 | ▶ 재생 | 서재 추가 | 도서 구매
 * + 공유 버튼: 인스타그램 | 카카오톡 | 링크 복사
 * 이 컴포넌트를 수정하면 모든 페이지에 동시 적용됩니다.
 */
export default function BookCardActions({ book, className = '' }) {
    const [toast, setToast] = useState('');
    const [cardLoading, setCardLoading] = useState(false);
    const navigate = useNavigate();
    const { hasAccess } = useAuth();

    const handlePremiumNav = (e, path) => {
        e.stopPropagation();
        e.preventDefault();
        if (!hasAccess) {
            alert('7일 무료 이용기간이 지났습니다.');
            navigate('/membership');
            return;
        }
        navigate(path);
    };

    const purchaseUrl = book.purchaseLink ||
        `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=All&SearchWord=${encodeURIComponent(book.title)}`;

    const safeId = book.id || book.title.toLowerCase().replace(/\s+/g, '-');
    const shareUrl = `${SITE_ORIGIN}/review/${encodeURIComponent(safeId)}`;

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 2000);
    };

    const addToLibrary = (e) => {
        e.stopPropagation();
        const saved = JSON.parse(localStorage.getItem('savedBooks') || '[]');
        if (saved.some(b => b.title === book.title)) {
            alert('이미 서재에 보관된 도서입니다.');
            return;
        }
        const updated = [...saved, { id: safeId, title: book.title, author: book.author, cover: book.cover }];
        localStorage.setItem('savedBooks', JSON.stringify(updated));
        window.dispatchEvent(new Event('savedBooksUpdated'));
        alert('서재에 보관되었습니다. ✅');
    };

    const handleLinkCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('링크 복사됨! 📋');
        }).catch(() => {
            showToast('복사 실패');
        });
    };

    const handleKakaoShare = (e) => {
        e.stopPropagation();
        try {
            if (!window.Kakao) throw new Error('no sdk');
            if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_KEY);
            window.Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: book.title,
                    description: book.desc || book.description || 'The Archiview에서 확인하세요.',
                    imageUrl: book.cover
                        ? (book.cover.startsWith('http') ? book.cover : `${SITE_ORIGIN}${book.cover}`)
                        : `${SITE_ORIGIN}/images/hero_expert_v5.png`,
                    link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
                },
                buttons: [
                    { title: '리뷰 보기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
                ],
            });
        } catch {
            // SDK 도메인 미등록 등 오류 시 → 카카오 공유 URL로 직접 이동
            const kakaoShareUrl = `https://sharer.kakao.com/talk/friends/picker/easylink?app_key=${KAKAO_KEY}&link_ver=4.0&template_id=&url=${encodeURIComponent(shareUrl)}`;
            if (navigator.share) {
                navigator.share({
                    title: book.title,
                    text: `📚 『${book.title}』 - The Archiview에서 확인하세요!`,
                    url: shareUrl,
                }).catch(() => {
                    navigator.clipboard.writeText(shareUrl).then(() => showToast('링크 복사됨! 카카오톡에 붙여넣기 하세요'));
                });
            } else {
                navigator.clipboard.writeText(shareUrl).then(() => showToast('링크 복사됨! 카카오톡에 붙여넣기 하세요'));
            }
        }
    };

    const handleInstagramShare = (e) => {
        e.stopPropagation();
        // 모바일: 네이티브 공유 시트 (인스타그램 DM 등 선택 가능)
        if (navigator.share) {
            navigator.share({
                title: `[아카이뷰] ${book.title}`,
                text: `📚 『${book.title}』\n아카이뷰에서 읽어보세요!`,
                url: shareUrl,
            }).catch(() => { });
        } else {
            // PC: 링크 복사 (인스타그램은 웹 공유 API 미지원)
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast('링크 복사됨! 인스타그램에 붙여넣기 하세요 📸');
            }).catch(() => showToast('복사 실패'));
        }
    };

    const handleCardShare = async (e) => {
        e.stopPropagation();
        if (cardLoading) return;
        setCardLoading(true);
        showToast('카드 생성 중... ✨');
        try {
            await shareCard(book, shareUrl);
        } catch {
            showToast('공유 실패. 다시 시도해주세요.');
        } finally {
            setCardLoading(false);
        }
    };

    const getAudioDurationMin = (podcastFile) => {
        if (!podcastFile) return 15;
        const fileName = podcastFile.split('/').pop();
        const duration = availableAudio[fileName];
        return Math.ceil((duration || 900) / 60);
    };

    const getAudioDurationFormatted = (bookData) => {
        if (!bookData) return "15:00";
        let duration = null;

        const findDuration = (filename) => {
            if (!filename) return null;
            const key = String(filename).toLowerCase();
            return availableAudio[key] || availableAudio[`${key}.mp3`];
        };

        if (bookData.podcastFile) duration = findDuration(bookData.podcastFile.split('/').pop());
        if (!duration && bookData.audioPath) duration = findDuration(bookData.audioPath.split('/').pop());
        if (!duration && bookData.voiceAudioUrl) duration = findDuration(bookData.voiceAudioUrl.split('/').pop());
        if (!duration && bookData.audioUrl) duration = findDuration(bookData.audioUrl.split('/').pop());
        if (!duration && bookData.id) duration = findDuration(bookData.id);

        if (!duration) return "15:00";

        const m = Math.floor(duration / 60);
        const s = Math.floor(duration % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`w-full relative ${className}`}>
            {/* 토스트 알림 */}
            {toast && (
                <div className="absolute -top-7 left-0 right-0 flex justify-center z-50 pointer-events-none">
                    <span className="bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        {toast}
                    </span>
                </div>
            )}

            {/* 시간/페이지 뱃지 + 공유 아이콘 (한 줄) */}
            <div className="flex gap-2 items-center mb-3">
                <div className="flex items-center gap-1 text-[9px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-xs">
                    <span>🎧</span>
                    <span>{book.isPodcast ? getAudioDurationFormatted(book) : '15:00'}</span>
                </div>
                {(book.youtubeUrl || book.videoUrl || book.videoId || book.videoLength || book.videoTime || book.isYoutube) && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-xs">
                        <span>▶️</span>
                        <span>{book.videoLength || book.videoTime || book.youtubeDuration || 5}분</span>
                    </div>
                )}

                {/* 공유 아이콘 (오른쪽 정렬) */}
                <div className="ml-auto flex items-center gap-1" style={{ flexShrink: 0 }}>
                    <span className="text-[10px] font-black text-white/90 tracking-wider whitespace-nowrap">공유</span>
                    <button onClick={handleCardShare} title="이미지 카드 공유" disabled={cardLoading}
                        style={{ width: 26, height: 26, minWidth: 26, minHeight: 26, borderRadius: '50%', flexShrink: 0, background: cardLoading ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', opacity: cardLoading ? 0.7 : 1 }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37' }} className={`material-symbols-outlined text-[13px] ${cardLoading ? 'animate-spin' : ''}`}>
                            {cardLoading ? 'progress_activity' : 'qr_code'}
                        </span>
                    </button>
                    {/* ios_share 버튼 — 카드/링크와 중복으로 비활성화
                    <button onClick={handleInstagramShare} title="공유"
                        style={{width:26,height:26,minWidth:26,minHeight:26,borderRadius:'50%',flexShrink:0,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.15)'}}>
                        <span style={{display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.8)'}} className="material-symbols-outlined text-[13px]">ios_share</span>
                    </button>
                    */}
                    <button onClick={handleKakaoShare} title="카카오톡 공유"
                        style={{ width: 26, height: 26, minWidth: 26, minHeight: 26, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFE400' }}><KakaoIcon /></span>
                    </button>
                    <button onClick={handleLinkCopy} title="링크 복사"
                        style={{ width: 26, height: 26, minWidth: 26, minHeight: 26, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,1)' }} className="material-symbols-outlined text-[12px]">link</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {/* 1. 리뷰 디테일 */}
                <button
                    onClick={(e) => handlePremiumNav(e, `/review/${safeId}?tab=ebook`)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white hover:from-white/20 hover:to-white/5 transition-all whitespace-nowrap"
                >
                    <span className="material-symbols-outlined text-[14px]">menu_book</span>
                    리뷰 디테일
                </button>

                {/* 2. 팟캐스트 탭으로 이동 */}
                <button
                    onClick={(e) => handlePremiumNav(e, `/review/${safeId}?tab=podcast`)}
                    className="group flex items-center justify-center gap-1.5 py-2 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white hover:from-white/20 hover:to-white/5 transition-all whitespace-nowrap"
                >
                    <span className="material-symbols-outlined text-[14px] group-hover:hidden group-active:hidden">graphic_eq</span>
                    <div className="hidden group-hover:flex group-active:flex items-center justify-center gap-[1.5px] h-[14px] w-[14px]">
                        <div className="w-[1.5px] bg-current rounded-sm h-[6px] animate-wave-bar wave-delay-1" />
                        <div className="w-[1.5px] bg-current rounded-sm h-[10px] animate-wave-bar wave-delay-2" />
                        <div className="w-[1.5px] bg-current rounded-sm h-[14px] animate-wave-bar wave-delay-3" />
                        <div className="w-[1.5px] bg-current rounded-sm h-[8px] animate-wave-bar wave-delay-4" />
                        <div className="w-[1.5px] bg-current rounded-sm h-[4px] animate-wave-bar wave-delay-5" />
                    </div>
                    <span>팟캐스트</span>
                </button>

                {/* 3. 서재 추가 */}
                <button
                    onClick={addToLibrary}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white hover:from-white/20 hover:to-white/5 transition-all whitespace-nowrap"
                >
                    <span className="material-symbols-outlined text-[14px]">bookmark_add</span>
                    서재 추가
                </button>

                {/* 4. 도서 구매 */}
                <a
                    href={purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white hover:from-white/20 hover:to-white/5 transition-all whitespace-nowrap"
                >
                    <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
                    도서 구매
                </a>
            </div>
        </div>
    );
}
