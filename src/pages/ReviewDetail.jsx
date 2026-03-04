import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { celebrities } from '../data/celebrities';
import { useAudio } from '../contexts/AudioContext';
import { bookScripts } from '../data/bookScripts';
import { db } from '../firebase';
import { getDoc, doc } from 'firebase/firestore';
import './ReviewDetail.css';

const CHARS_PER_PAGE = 280;

function buildPages(book) {
    if (!book || !book.review) return [];
    const review = book.review;

    const clean = (t) =>
        t.replace(/---/g, '').replace(/([.?!,])([^\s\n0-9"'])/g, '$1 $2').trim();

    const raw = review.split('---');
    const main = raw[0] || '';
    const summary = raw[1] || '';

    const pages = [];

    const sections = clean(main).split('■').filter((s) => s.trim());
    sections.forEach((sec) => {
        const lines = sec.split('\n').filter((l) => l.trim());
        if (!lines.length) return;
        const header = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();
        if (!body) return;

        if (body.length <= CHARS_PER_PAGE) {
            pages.push({ header, body });
        } else {
            const paras = body.split(/\n+/);
            let chunk = '';
            paras.forEach((p) => {
                if (chunk.length + p.length > CHARS_PER_PAGE && chunk) {
                    pages.push({ header, body: chunk.trim() });
                    chunk = p + '\n\n';
                } else {
                    chunk += p + '\n\n';
                }
            });
            if (chunk.trim()) pages.push({ header, body: chunk.trim() });
        }
    });

    if (summary.trim()) {
        const cs = clean(summary).replace(/【지혜의 갈무리】/g, '');
        const pick = (name) => {
            const m = cs.match(new RegExp(`${name}:([\\s\\S]*?)(?=(책을 선택한 이유:|저자 소개:|추천 대상:|지혜의 요약:|$))`));
            return m ? m[1].trim() : '';
        };
        const s1 = pick('책을 선택한 이유');
        const s2 = pick('저자 소개');
        const s3 = pick('추천 대상');
        const s4Raw = pick('지혜의 요약');

        if (s1 || s2) {
            pages.push({
                header: '지혜의 갈무리 I',
                body: `책을 선택한 이유\n${s1}\n\n저자 소개\n${s2}`,
                isSummary: true
            });
        }

        if (s3) {
            pages.push({
                header: '지혜의 갈무리 II',
                body: `추천 대상\n${s3}`,
                isSummary: true
            });
        }

        if (s4Raw) {
            const lines = s4Raw.split('\n').map(l => l.trim()).filter(l => l);
            // Bullet points are usually starting with numbers. 
            // We want to group them so they fit on pages.
            // Let's put point 1 on one page, and 2, 3 on another if there are many.
            if (lines.length > 1) {
                pages.push({
                    header: '지혜의 요약 (1/2)',
                    body: `포인트 1\n${lines[0]}`,
                    isSummary: true
                });
                const rest = lines.slice(1).map((l, idx) => `포인트 ${idx + 2}\n${l}`).join('\n\n');
                pages.push({
                    header: '지혜의 요약 (2/2)',
                    body: rest,
                    isSummary: true
                });
            } else {
                pages.push({
                    header: '지혜의 요약',
                    body: `포인트 1\n${lines[0]}`,
                    isSummary: true
                });
            }
        }
    }

    // -- Bibliography Page (Always include) --
    let bibTitle = book.title;
    let bibAuthor = book.author;
    let bibPublisher = '아카이뷰 에디션';

    const biblioMatch = main.match(/참고\s*도서:\s*([^,/\n]+)[,/]\s*저자:?\s*([^,/\n]+)[,/]\s*출판사:?\s*([^\n\r]+)/);
    if (biblioMatch) {
        bibTitle = biblioMatch[1].trim();
        bibAuthor = biblioMatch[2].trim();
        bibPublisher = biblioMatch[3].trim();
    }

    pages.push({
        header: 'Reference Book',
        body: {
            title: bibTitle,
            author: bibAuthor,
            publisher: bibPublisher
        },
        isBiblio: true
    });

    return pages;
}

const Page = React.forwardRef((props, ref) => {
    return (
        <div className="rv-page-wrapper" ref={ref} data-density={props.density || 'soft'}>
            <div className={`rv-sheet ${props.className || ''}`}>
                {props.children}
            </div>
        </div>
    );
});

const Avatar = ({ role }) => {
    const [error, setError] = useState(false);
    const src = role === 'A' ? '/images/celebrities/james.jpg' : '/images/celebrities/stella.jpg';
    const icon = role === 'A' ? 'person' : 'face';

    if (error) {
        return (
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#666' }}>
                {icon}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt={role === 'A' ? 'James' : 'Stella'}
            onError={() => setError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
    );
};

export default function ReviewDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const flipBook = useRef(null);

    const [pageIdx, setPageIdx] = useState(0);
    const [showUI, setShowUI] = useState(true);
    const { isSpeaking, activeAudioId, playPodcast, stopAll, playPodcastMP3, podcastPlaying, podcastInfo, currentTime, duration, seekPodcastMP3 } = useAudio();

    const book = useMemo(() => {
        if (!celebrities) return null;
        for (const c of celebrities) {
            const b = c.books?.find((b) => b.id === id);
            if (b) return b;
        }
        return null;
    }, [id]);

    const hasReview = useMemo(() => !!(book?.review && book.review.trim().length > 100), [book]);
    const pages = useMemo(() => (book ? buildPages(book) : []), [book]);
    const [activeTab, setActiveTab] = useState('review');

    // Firestore 상태 — podcastSrc보다 먼저 선언해야 함
    const [firestoreScript, setFirestoreScript] = useState(null);
    const [firestoreAudioUrl, setFirestoreAudioUrl] = useState(null);
    const [firestoreIsPodcast, setFirestoreIsPodcast] = useState(false);

    // 팟캐스트 소스 경로 미리 정의 (useEffect에서 사용하기 위함)
    const podcastSrc = useMemo(() => {
        if (!book) return '';
        return firestoreAudioUrl || book.voiceAudioUrl || book.podcastFile || `/audio/${book.id}.mp3`;
    }, [book, firestoreAudioUrl]);

    // 탭 파라미터 감지 및 자동 재생 연동
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'podcast' && isPodcast) {
            setActiveTab('podcast');
            // 자동 재생 시도 (이미 재생 중인 게 아닐 때만)
            if (!podcastPlaying || podcastInfo?.src !== podcastSrc) {
                setTimeout(() => {
                    playPodcastMP3(podcastSrc, book.title, book.cover, book.id);
                }, 500);
            }
        } else if (book && !hasReview && isPodcast) {
            setActiveTab('podcast');
        }
    }, [book, hasReview, searchParams, podcastPlaying, podcastInfo, podcastSrc, playPodcastMP3]);

    const total = pages.length + 2;
    const chatEndRef = useRef(null);

    // Firestore에서 대본 + 오디오 URL + isPodcast 실시간 로드
    useEffect(() => {
        if (!id) return;
        // 로컬에 없을 때만 Firestore 대본 조회
        if (!bookScripts[id]) {
            getDoc(doc(db, 'scripts', id)).then(snap => {
                if (snap.exists()) {
                    setFirestoreScript((snap.data().lines || []).map(l => ({
                        role: l.speaker === '스텔라' ? 'B' : 'A',
                        text: l.text
                    })));
                }
            }).catch(() => {});
        }
        // 성우 MP3 / 오디오 URL / isPodcast Firestore 오버라이드 조회
        getDoc(doc(db, 'book_overrides', id)).then(snap => {
            if (snap.exists()) {
                const d = snap.data();
                setFirestoreAudioUrl(d.voiceAudioUrl || d.audioUrl || null);
                if (d.isPodcast) setFirestoreIsPodcast(true);
            }
        }).catch(() => {});
    }, [id]);

    const script = useMemo(() => bookScripts[id] || firestoreScript || [], [id, firestoreScript]);
    const hasScript = script.length > 0;
    const isPodcast = book?.isPodcast || firestoreIsPodcast;

    // 타이머 비활성화 (버튼 고정 요청)
    const resetHideTimer = useCallback(() => {
        setShowUI(true);
    }, []);

    useEffect(() => {
        resetHideTimer();
    }, [pageIdx, resetHideTimer]);

    const onFlip = useCallback((e) => {
        setPageIdx(e.data);
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                flipBook.current?.pageFlip().flipNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                flipBook.current?.pageFlip().flipPrev();
            } else if (e.key === 'Escape') {
                navigate(-1);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [navigate]);

    if (!book) {
        return (
            <div style={{ minHeight: '100vh', background: '#f0ebe0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#888', fontSize: 16 }}>도서를 찾을 수 없습니다.</p>
            </div>
        );
    }

    const progress = pageIdx / (total - 1);
    const isThisPodcastActive = podcastInfo?.src === podcastSrc;

    const handlePodcastClick = () => {
        playPodcastMP3(podcastSrc, book.title, book.cover, book.id);
    };

    const formatTime = (sec) => {
        if (!sec || isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleKakaoShare = useCallback(() => {
        if (!window.Kakao) return;
        if (!window.Kakao.isInitialized()) {
            window.Kakao.init('91e847c5035f8d9758712395669f6927');
        }
        window.Kakao.Link.sendDefault({
            objectType: 'feed',
            content: {
                title: `[아카이뷰] ${book.title}`,
                description: book.desc || '아카이뷰의 정밀 도서 리뷰',
                imageUrl: `https://the-archive.web.app${book.cover}`,
                link: {
                    mobileWebUrl: window.location.href,
                    webUrl: window.location.href,
                },
            },
            buttons: [
                {
                    title: '리뷰 보기',
                    link: {
                        mobileWebUrl: window.location.href,
                        webUrl: window.location.href,
                    },
                },
            ],
        });
    }, [book]);

    return (
        <div
            className={`rv-root ${activeTab === 'podcast' ? 'podcast-view' : ''}`}
            onClick={resetHideTimer}
        >
            {/* ── Top Bar ── */}
            <div className={`rv-topbar ${showUI ? 'visible' : 'hidden'}`}>
                <button className="rv-close-btn" onClick={() => navigate(-1)}>
                    <span className="material-symbols-outlined">close</span>
                </button>
                <div className="rv-topbar-title-wrap">
                    <span className="rv-topbar-title">{book.title}</span>
                    <span className="rv-topbar-count">{pageIdx} / {total - 1}</span>
                </div>
                <div className="rv-topbar-right">
                    <button
                        onClick={handleKakaoShare}
                        className="size-10 flex items-center justify-center rounded-xl bg-[#FEE500] text-[#3c1e1e] active:scale-95 transition-all shadow-lg"
                    >
                        <span className="material-symbols-outlined text-xl font-bold">chat_bubble</span>
                    </button>
                </div>
            </div>

            {/* ── Tab Bar ── */}
            <div className="rv-tab-bar">
                <button
                    className={`rv-tab ${activeTab === 'review' ? 'active' : ''} ${!hasReview ? 'disabled' : ''}`}
                    onClick={() => hasReview && setActiveTab('review')}
                    disabled={!hasReview}
                >
                    <span className="material-symbols-outlined">menu_book</span>
                    <span>리뷰</span>
                </button>
                {hasScript && isPodcast && (
                    <button
                        className={`rv-tab ${activeTab === 'podcast' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('podcast');
                            if (!podcastPlaying || podcastInfo?.src !== podcastSrc) {
                                playPodcastMP3(podcastSrc, book.title, book.cover, book.id);
                            }
                        }}
                    >
                        <span className="material-symbols-outlined">podcasts</span>
                        <span>팟캐스트</span>
                    </button>
                )}
            </div>

            {/* ── Stage (FlipBook Container) ── */}
            {activeTab === 'review' ? (
                <div className="rv-stage">
                    <div className="rv-book-container">
                        <HTMLFlipBook
                            width={520}
                            height={740}
                            size="stretch"
                            minWidth={280}
                            maxWidth={520}
                            minHeight={400}
                            maxHeight={740}
                            maxShadowOpacity={0.4}
                            showCover={true}
                            usePortrait={true}
                            startPage={0}
                            mobileScrollSupport={true}
                            onFlip={onFlip}
                            className="rv-flipbook"
                            ref={flipBook}
                            drawShadow={true}
                            flippingTime={800}
                        >
                            {/* 1. Cover Page */}
                            <Page density="hard" className="rv-cover-page">
                                <div className="rv-cover">
                                    {/* 액자 프레임 */}
                                    <div className="rv-frame-outer">
                                        <div className="rv-frame-inner">
                                            <div className="rv-cover-img">
                                                <img src={book.cover} alt={book.title} loading="lazy" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rv-cover-divider" />
                                    <h1 className="rv-cover-title">{book.title}</h1>
                                    <p className="rv-cover-author">{book.author}</p>
                                    <div className="rv-cover-divider" style={{ marginBottom: 0 }} />
                                    <p className="rv-cover-edition">Premium Archiview Edition</p>
                                    <p className="rv-cover-hint">스와이프하여 넘기기 →</p>
                                </div>
                            </Page>

                            {/* 2. Content Pages */}
                            {pages.map((p, i) => (
                                <Page key={i}>
                                    <div className="rv-content">
                                        <div className="rv-section-label">The Archiview · Review</div>
                                        <h2 className="rv-page-header">{p.header}</h2>
                                        {p.isSummary ? (
                                            <div className="rv-summary-body">
                                                {p.body
                                                    .split(/\n\n+/)
                                                    .map((block, bi) => {
                                                        const lines = block.split('\n').filter(l => l.trim());
                                                        if (!lines.length) return null;
                                                        const label = lines[0].trim();
                                                        const text = lines.slice(1).join('\n').trim();
                                                        if (text) {
                                                            return (
                                                                <div key={bi} className="rv-summary-card">
                                                                    <div className="rv-summary-card-label">{label}</div>
                                                                    <div className="rv-summary-card-text" style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                            </div>
                                        ) : p.isBiblio ? (
                                            <div className="rv-biblio-body">
                                                <div className="rv-biblio-book-img">
                                                    <img src={book.cover} alt={book.title} loading="lazy" />
                                                </div>
                                                <div className="rv-biblio-card">
                                                    <div className="rv-biblio-item">
                                                        <span className="rv-biblio-label">도서명</span>
                                                        <span className="rv-biblio-value">{p.body.title}</span>
                                                    </div>
                                                    <div className="rv-biblio-item">
                                                        <span className="rv-biblio-label">저자</span>
                                                        <span className="rv-biblio-value">{p.body.author}</span>
                                                    </div>
                                                    <div className="rv-biblio-item">
                                                        <span className="rv-biblio-label">출판사</span>
                                                        <span className="rv-biblio-value">{p.body.publisher}</span>
                                                    </div>
                                                </div>
                                                <div className="rv-biblio-note">
                                                    이 리뷰는 위 도서의 내용을 바탕으로 에디터의 주관적인 해석을 담아 작성되었습니다.
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rv-page-body" spellCheck={false}>
                                                {p.body}
                                            </div>
                                        )}
                                        <div className="rv-footer">
                                            <span className="rv-footer-brand">The Archiview</span>
                                            <span className="rv-footer-page">— {i + 1} / {total - 1} —</span>
                                        </div>
                                    </div>
                                </Page>
                            ))}

                            {/* 3. Final Page */}
                            <Page density="hard" className="rv-final-page">
                                <div className="rv-final">
                                    <div className="rv-final-logo-large">ARCHIVIEW</div>
                                    <button
                                        className="rv-final-btn"
                                        onClick={(e) => { e.stopPropagation(); navigate('/library'); }}
                                    >
                                        서재로 돌아가기
                                    </button>
                                </div>
                            </Page>
                        </HTMLFlipBook>
                    </div>

                    {/* ── Progress Bar ── */}
                    <div className="rv-progress-track">
                        <div className="rv-progress-fill" style={{ width: `${progress * 100}%` }} />
                    </div>

                    {/* ── Nav Buttons ── */}
                    <div className={`rv-nav ${showUI ? 'visible' : 'hidden'}`}>
                        <button className="rv-nav-btn" onClick={() => flipBook.current?.pageFlip().flipPrev()} disabled={pageIdx === 0}>
                            <span className="material-symbols-outlined">arrow_back_ios</span>
                        </button>
                        <button className="rv-nav-btn" onClick={() => flipBook.current?.pageFlip().flipNext()} disabled={pageIdx === total - 1}>
                            <span className="material-symbols-outlined">arrow_forward_ios</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="rv-podcast-stage">
                    {/* ── Chat View ── */}
                    <div className="rv-chat-container">
                        {script.map((turn, i) => (
                            <div key={i} className={`rv-chat-row ${turn.role === 'A' ? 'james' : 'stella'}`}>
                                <div className={`rv-chat-avatar ${turn.role === 'A' ? 'james' : 'stella'}`}>
                                    <Avatar role={turn.role} />
                                </div>
                                <div className="rv-chat-bubble-wrap">
                                    <div className="rv-chat-name">{i % 2 === 0 ? '제임스' : '스텔라'}</div>
                                    <div className={`rv-chat-bubble ${turn.role === 'A' ? 'james' : 'stella'}`}>
                                        {turn.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                </div>
            )}
        </div>
    );
}

