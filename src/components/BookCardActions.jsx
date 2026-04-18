import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { availableAudio } from '../data/availableAudio';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../contexts/AudioContext';
import { shareCard } from '../utils/shareCard';
import { useBookData } from '../hooks/useBookData';

const SITE_ORIGIN = 'https://archiview.shop';

/**
 * 공유 북카드 액션 버튼 컴포넌트
 * 1층: 리뷰 디테일 | 서재추가 (50:50)
 * 2층: 팟캐스트 (50% 사이즈)
 * 3층: 쿠팡 | 아마존 (50:50)
 */
export default function BookCardActions({ book, className = '' }) {
    const [toast, setToast] = useState('');
    const navigate = useNavigate();
    const { playPodcastMP3 } = useAudio();
    const { overrides } = useBookData();

    const handlePremiumNav = (e, path, isPodcastAction = false) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (isPodcastAction) {
            const validId = book.id || book.title?.toLowerCase()?.replace(/\s+/g, '-');
            const fileName = `${validId}.mp3`;
            const hasAudioFile = !!(availableAudio[fileName] || availableAudio[validId]);
            const src = book.voiceAudioUrl || book.audioUrl || book.podcastFile || (hasAudioFile ? `/audio/${fileName}` : null);
            
            if (src) {
                try {
                    playPodcastMP3(src, book.title, book.coverUrl || book.cover, validId);
                } catch (err) {}
            }
        }
        
        navigate(path);
    };

    // 구매 링크 로직 — book에 없으면 Firestore override에서 직접 조회
    const titleId = book.title?.toLowerCase().replace(/\s+/g, '-') || '';
    const bookKey = book.id || titleId;
    const normStr = s => s.normalize('NFC');
    const findInOverrides = (field) => {
        if (overrides?.[bookKey]?.[field]) return overrides[bookKey][field];
        const found = Object.entries(overrides || {}).find(([k]) => {
            const nk = normStr(k); const ni = normStr(titleId);
            return nk === ni || nk.endsWith('-' + ni) || nk.replace(/^[a-z]+\d+-/, '') === ni;
        });
        return found?.[1]?.[field] || '';
    };
    const coupangUrl = useMemo(() => {
        if (!book) return '';
        // 1. Firestore 오버라이드 확인
        const overrideLink = findInOverrides('coupangLink') || findInOverrides('purchaseLink');
        if (overrideLink && (overrideLink.includes('coupang.com') || overrideLink.includes('link.coupang.com'))) {
            return overrideLink;
        }

        // 2. 도서 데이터 내 쿠팡 링크
        if (book.coupangLink) return book.coupangLink;
        
        // 3. 기존 purchaseLink 폴백
        if (book.purchaseLink && (book.purchaseLink.includes('coupang.com') || book.purchaseLink.includes('link.coupang.com'))) {
            return book.purchaseLink;
        }
        
        // 4. 자동 검색 링크
        return `https://www.coupang.com/np/search?q=${encodeURIComponent(book.title || '')}&channel=relate`;
    }, [book, overrides, findInOverrides]);
    
    const amazonUrl = useMemo(() => {
        if (!book) return '';
        // 1. Firestore 오버라이드 확인
        const overrideLink = findInOverrides('amazonLink');
        
        // 2. 도서 데이터 내 아마존 링크 또는 오버라이드 링크 처리
        const rawAmazon = overrideLink || book.amazonLink || '';
        if (rawAmazon) {
            if (rawAmazon.includes('amazon.com') && !rawAmazon.includes('tag=')) {
                return rawAmazon + (rawAmazon.includes('?') ? '&' : '?') + 'tag=archiview2026-20';
            }
            return rawAmazon;
        }
        
        // 3. 자동 검색 링크
        return `https://www.amazon.com/s?k=${encodeURIComponent(book.title || '')}&tag=archiview2026-20`;
    }, [book, overrides, findInOverrides]);

    const safeId = book.id || book.title.toLowerCase().replace(/\s+/g, '-');
    const reviewPath = book.isAdsense ? `/story/${safeId}` : `/review/${safeId}`;

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

    const formatTime = (sec) => {
        if (!sec || isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const podcastDuration = useMemo(() => {
        if (!book) return 0;
        const validId = book.id || book.title?.toLowerCase()?.replace(/\s+/g, '-');
        const fileName = `${validId}.mp3`;
        if (availableAudio[fileName]) return availableAudio[fileName];
        const koreanSlug = (book.title || '').replace(/\s+/g, '-');
        if (availableAudio[`${koreanSlug}.mp3`]) return availableAudio[`${koreanSlug}.mp3`];
        return 0;
    }, [book]);

    const getAudioDuration = () => {
        if (book.audioDuration) return book.audioDuration;
        if (podcastDuration > 0) return formatTime(podcastDuration);
        return '15:00';
    };

    const handleKakaoShare = (e) => {
        e.stopPropagation();
        if (!window.Kakao) { alert('카카오 SDK가 로드되지 않았습니다. 잠시 후 다시 시도해주세요.'); return; }
        if (!window.Kakao.isInitialized()) {
            window.Kakao.init('9cbdeec02a8ce33b5deb576a0e63c380');
        }
        const shareUrl = `${SITE_ORIGIN}${reviewPath}`;
        const shareImage = book.cover?.startsWith('http')
            ? book.cover
            : `${SITE_ORIGIN}${book.cover}`;
        window.Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: `[아카이뷰] ${book.title}`,
                description: book.desc || '아카이뷰의 정밀 도서 리뷰',
                imageUrl: shareImage,
                link: {
                    mobileWebUrl: shareUrl,
                    webUrl: shareUrl,
                },
            },
            buttons: [
                {
                    title: '리뷰 보기',
                    link: {
                        mobileWebUrl: shareUrl,
                        webUrl: shareUrl,
                    },
                },
            ],
        });
    };

    const handleCopyLink = (e) => {
        e.stopPropagation();
        const shareUrl = `${SITE_ORIGIN}${reviewPath}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => alert('링크 복사됨! ✅'))
            .catch(() => {
                // clipboard API 실패 시 fallback
                const el = document.createElement('textarea');
                el.value = shareUrl;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                alert('링크 복사됨! ✅');
            });
    };

    const handleCardShare = async (e) => {
        e.stopPropagation();
        const shareUrl = `${SITE_ORIGIN}${reviewPath}`;
        try {
            await shareCard(book, shareUrl);
        } catch {
            alert('카드 생성 실패. 다시 시도해주세요.');
        }
    };
    const hasAmazon = !!(findInOverrides('amazonLink') || book.amazonLink);

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

            {/* 시간/페이지 뱃지 & 공유 버튼 */}
            <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-2 items-center flex-1">
                    <div className="flex items-center gap-1 text-[9px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-xs">
                        <span>🎧</span>
                        <span>{getAudioDuration()}</span>
                    </div>
                    {(book.youtubeUrl || book.videoUrl || book.videoId || book.isYoutube) && (
                        <div className="flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-xs">
                            <span>▶️</span>
                            <span>{book.videoLength || '5분'}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2" style={{ alignItems: 'center' }}>
                    {/* 원형 아이콘: 32×32 고정 */}
                    {[
                        { onClick: handleCardShare, bg: 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400', icon: 'qr_code_2', isIcon: true },
                        { onClick: handleKakaoShare, bg: 'bg-[#FAE100]', icon: null, isIcon: false },
                        { onClick: handleCopyLink, bg: 'bg-blue-500/10 border border-blue-500/30 text-blue-400', icon: 'link', isIcon: true },
                    ].map((btn, i) => (
                        <button
                            key={i}
                            onClick={btn.onClick}
                            className={`rounded-full transition-all shadow-sm ${btn.bg}`}
                            style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                            {btn.isIcon
                                ? <span className="material-symbols-outlined" style={{ fontSize: 17, lineHeight: 1 }}>{btn.icon}</span>
                                : <svg width="16" height="16" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.707 4.8 4.33 6.091l-.828 3.066c-.052.193.174.351.327.245l3.607-2.399c.504.07 1.028.112 1.564.112 4.97 0 9-3.185 9-7.115S16.97 3 12 3z"/></svg>
                            }
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                {/* 1층: 리뷰 디테일 & 팟캐스트 */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={(e) => handlePremiumNav(e, `${reviewPath}${reviewPath.includes('?') ? '&' : '?'}tab=ebook`)}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white transition-all whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined text-[14px]">menu_book</span>
                        리뷰 디테일
                    </button>

                    <button
                        onClick={(e) => handlePremiumNav(e, `${reviewPath}${reviewPath.includes('?') ? '&' : '?'}tab=podcast`, true)}
                        className="group flex items-center justify-center gap-1.5 py-2.5 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white transition-all whitespace-nowrap"
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
                </div>

                {/* 2층: 서재추가 & 구매링크 (쿠팡/아마존) */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={addToLibrary}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white transition-all whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined text-[14px]">bookmark</span>
                        서재추가
                    </button>

                    {hasAmazon ? (
                        <div className="grid grid-cols-2 gap-2">
                            <a
                                href={coupangUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center gap-1.5 py-2.5 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white transition-all whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
                                쿠팡
                            </a>

                            <a
                                href={amazonUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center gap-1.5 py-2.5 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white transition-all whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-[14px]">public</span>
                                아마존
                            </a>
                        </div>
                    ) : (
                        <a
                            href={coupangUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center gap-1.5 py-2.5 rounded-none bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)] text-[10px] font-black text-white/90 hover:text-white transition-all whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
                            쿠팡
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
