import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import HTMLFlipBook from 'react-pageflip';
import { celebrities } from '../data/celebrities';
import { useAudio } from '../contexts/AudioContext';
import { bookScripts } from '../data/bookScripts';
import { availableAudio } from '../data/availableAudio';
import { db } from '../firebase';
import { getDoc, doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import './ReviewDetail.css';

const CHARS_PER_PAGE = 400;

// 한 페이지에 표시하기엔 긴 HTML 섹션을 단락 단위로 재분할
function splitEbookSection(html, maxChars = 480) {
    // </p> </h1~6> 닫힘 태그 뒤에 구분자를 삽입해 분할 (정규식 백레퍼런스 오류 방지)
    const marked = html
        .replace(/<\/p>/gi, '</p>\x00')
        .replace(/<\/h[1-6]>/gi, m => m + '\x00');
    const parts = marked.split('\x00').filter(p => p.trim());
    if (parts.length <= 1) return [html];

    const pages = [];
    let cur = '';
    let curLen = 0;
    for (const part of parts) {
        const textLen = part.replace(/<[^>]*>/g, '').trim().length;
        // h1/h2 헤딩은 margin + line-height 때문에 본문 텍스트보다 2~3줄 더 차지함
        const headingPenalty = /<h[12][^>]*>/i.test(part) ? 100 : /<h[3-6][^>]*>/i.test(part) ? 60 : 0;
        const len = textLen + headingPenalty;
        if (cur && curLen + len > maxChars) {
            pages.push(cur.trim());
            cur = part;
            curLen = len;
        } else {
            cur += part;
            curLen += len;
        }
    }
    if (cur.trim()) pages.push(cur.trim());
    return pages.length > 0 ? pages : [html];
}

function buildPages(book) {
    if (!book || !book.review) return [];
    const review = book.review;

    const clean = (t) => {
        if (!t) return "";
        return t.replace(/\[GEMINI [\d.]+ ANALYSIS\]/gi, '')
            .replace(/팟캐스트 대본 제작을 위한/g, '')
            .replace(/[#*]/g, '')
            .replace(/---/g, '')
            .replace(/([.?!,])([^\s\n0-9"'])/g, '$1 $2').trim();
    };

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
    const reviewFlipBook = useRef(null);
    const ebookFlipBook = useRef(null);

    const [pageIdx, setPageIdx] = useState(0);
    const [showUI, setShowUI] = useState(true);
    const { user } = useAuth();
    const { isSpeaking, activeAudioId, playPodcast, stopAll, playPodcastMP3, podcastPlaying, podcastInfo, currentTime, duration, seekPodcastMP3 } = useAudio();

    // ─── Action Integration ───
    const [completedActions, setCompletedActions] = useState([]);

    useEffect(() => {
        if (!user || !book) return;

        const q = query(
            collection(db, 'users', user.uid, 'readingNotes'),
            where('bookTitle', '==', book.title),
            where('type', 'in', ['action', '#액션'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const actions = snapshot.docs.map(doc => doc.data().actionTitle).filter(Boolean);
            setCompletedActions(actions);
        });

        return () => unsubscribe();
    }, [user, book]);

    const book = useMemo(() => {
        if (!celebrities) return null;
        for (const c of celebrities) {
            const b = c.books?.find((b) => b.id === id);
            if (b) {
                // Auto-detect isPodcast and podcastFile based on availableAudio
                const fileName = `${b.id}.mp3`;
                const hasAudioFile = !!availableAudio[fileName];

                return {
                    ...b,
                    isPodcast: b.isPodcast || hasAudioFile,
                    podcastFile: b.podcastFile || (hasAudioFile ? `/audio/${fileName}` : null)
                };
            }
        }
        return null;
    }, [id]);

    const hasReview = useMemo(() => !!(book?.review && book.review.trim().length > 100), [book]);
    const pages = useMemo(() => (book ? buildPages(book) : []), [book]);

    const initialTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(initialTab || 'review');

    // Firestore / Script / Podcast States & Derivations
    const [firestoreScript, setFirestoreScript] = useState(null);
    const [firestoreAudioUrl, setFirestoreAudioUrl] = useState(null);
    const [firestoreIsPodcast, setFirestoreIsPodcast] = useState(false);
    const [firestoreEbook, setFirestoreEbook] = useState(null);
    const [ebookLoading, setEbookLoading] = useState(true);

    const script = useMemo(() => bookScripts[id] || firestoreScript || [], [id, firestoreScript]);
    const hasScript = script.length > 0;
    const isPodcast = book?.isPodcast || firestoreIsPodcast;

    const podcastSrc = useMemo(() => {
        if (!book) return '';
        return firestoreAudioUrl || book.voiceAudioUrl || book.podcastFile || `/audio/${book.id}.mp3`;
    }, [book, firestoreAudioUrl]);

    const ebookPages = useMemo(() => firestoreEbook || [], [firestoreEbook]);
    const hasEbook = ebookPages.length > 0;
    const hasAnyReview = hasEbook || hasReview;

    const displayPages = useMemo(() => {
        // We handle 'ebook' separately in the render now for the premium experience
        return pages;
    }, [pages]);

    const total = displayPages.length + 2;
    const progress = (total > 1) ? pageIdx / (total - 1) : 0;

    // 탭 파라미터 감지 및 자동 재생 연동
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['review', 'podcast', 'ebook'].includes(tab)) {
            setActiveTab(tab);
            if (tab === 'podcast' && isPodcast) {
                // 자동 재생 시도 (이미 재생 중인 게 아닐 때만)
                if (!podcastPlaying || podcastInfo?.src !== podcastSrc) {
                    setTimeout(() => {
                        playPodcastMP3(podcastSrc, book.title, book.cover, book.id);
                    }, 500);
                }
            }
        } else if (book && !hasReview) {
            if (hasEbook) setActiveTab('ebook');
            else if (isPodcast) setActiveTab('podcast');
        }
    }, [book, hasReview, hasEbook, searchParams, podcastPlaying, podcastInfo, podcastSrc, playPodcastMP3, isPodcast]);

    const isThisPodcastActive = podcastInfo?.src === podcastSrc;

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
            }).catch(() => { });
        }
        // 성우 MP3 / 오디오 URL / isPodcast Firestore 오버라이드 조회
        getDoc(doc(db, 'book_overrides', id)).then(snap => {
            if (snap.exists()) {
                const d = snap.data();
                setFirestoreAudioUrl(d.voiceAudioUrl || d.audioUrl || null);
                if (d.isPodcast) setFirestoreIsPodcast(true);
            }
        }).catch(() => { });

        // 이북 데이터 조회
        getDoc(doc(db, 'ebooks', id)).then(snap => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.pages && Array.isArray(data.pages)) {
                    setFirestoreEbook(data.pages.flatMap(p => splitEbookSection(p)));
                } else if (data.content) {
                    // Split content by <section class="ebook-page">
                    const content = data.content;
                    const sections = content.split(/<section[^>]*class=["']ebook-page["'][^>]*>/i);
                    const validSections = sections
                        .map(s => s.split(/<\/section>/i)[0])
                        .filter(s => s.trim() && !s.includes('<!DOCTYPE') && !s.includes('<html'));

                    if (validSections.length > 0) {
                        setFirestoreEbook(validSections.flatMap(s => splitEbookSection(s || '')));
                    } else {
                        setFirestoreEbook(splitEbookSection(content || ''));
                    }
                }
            }
        }).catch(() => { }).finally(() => setEbookLoading(false));
    }, [id]);

    // 오디오 싱크: public/timestamps/{id}.json 로드
    const bubbleRefs = useRef([]);
    const [timestampData, setTimestampData] = useState(null);

    useEffect(() => {
        if (!id) return;
        fetch(`/timestamps/${id}.json`)
            .then(r => r.ok ? r.json() : null)
            .then(data => setTimestampData(data))
            .catch(() => setTimestampData(null));
    }, [id]);

    // 각 턴의 시작 시간 계산 (timestamps JSON → 글자 수 비율 추정 순서로 fallback)
    const turnStartTimes = useMemo(() => {
        if (script.length === 0) return [];
        // 1순위: public/timestamps/{id}.json
        if (timestampData?.segments?.length > 0) {
            return timestampData.segments.map(s => s.start ?? 0);
        }
        // 2순위: script turn에 time 필드
        if (script[0]?.time !== undefined) {
            return script.map(turn => turn.time);
        }
        // 3순위: 글자 수 비율 추정 (duration 필요)
        if (!duration) return [];
        const totalChars = script.reduce((sum, t) => sum + t.text.length, 0);
        let acc = 0;
        return script.map(turn => {
            const start = (acc / totalChars) * duration;
            acc += turn.text.length;
            return start;
        });
    }, [script, duration, timestampData]);

    const activeTurnIndex = useMemo(() => {
        if (!duration || !isThisPodcastActive || turnStartTimes.length === 0) return -1;
        let idx = 0;
        for (let i = 0; i < turnStartTimes.length; i++) {
            if (currentTime >= turnStartTimes[i]) idx = i;
            else break;
        }
        return idx;
    }, [currentTime, duration, turnStartTimes, isThisPodcastActive]);

    useEffect(() => {
        if (activeTurnIndex >= 0 && bubbleRefs.current[activeTurnIndex]) {
            bubbleRefs.current[activeTurnIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [activeTurnIndex]);

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
                if (activeTab === 'review') reviewFlipBook.current?.pageFlip()?.flipNext();
                else if (activeTab === 'ebook') ebookFlipBook.current?.pageFlip()?.flipNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                if (activeTab === 'review') reviewFlipBook.current?.pageFlip()?.flipPrev();
                else if (activeTab === 'ebook') ebookFlipBook.current?.pageFlip()?.flipPrev();
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
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className="flex items-end h-[14px] gap-[1.5px] mr-0.5 pb-[1px]">
                            <motion.div animate={{ height: [6, 10, 6] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }} className="w-[2px] bg-zinc-400 rounded-none" />
                            <motion.div animate={{ height: [10, 14, 10] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.1 }} className="w-[2px] bg-zinc-400 rounded-none" />
                            <motion.div animate={{ height: [14, 18, 14] }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.2 }} className="w-[2px] bg-zinc-400 rounded-none" />
                            <motion.div animate={{ height: [8, 12, 8] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut", delay: 0.3 }} className="w-[2px] bg-zinc-400 rounded-none" />
                            <motion.div animate={{ height: [12, 16, 12] }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.4 }} className="w-[2px] bg-zinc-400 rounded-none" />
                        </div>
                        <span className="text-[12px] font-black tracking-[-0.03em] uppercase text-white/50" style={{ fontFamily: "'Montserrat', sans-serif" }}>ARCHIVIEW</span>
                    </div>
                    <span className="rv-topbar-title">{book.title}</span>
                    <span className="rv-topbar-count">{pageIdx} / {total - 1}</span>
                </div>
                <div className="rv-topbar-right">
                    <button
                        onClick={handleKakaoShare}
                        className="size-10 flex items-center justify-center rounded-none bg-[#FEE500] text-[#3c1e1e] active:scale-95 transition-all shadow-lg"
                    >
                        <span className="material-symbols-outlined text-xl font-bold">chat_bubble</span>
                    </button>
                </div>
            </div>

            {/* ── Tab Bar ── */}
            <div className="rv-tab-bar">
                <button
                    className={`rv-tab ${activeTab === 'review' ? 'active' : ''} ${!hasAnyReview ? 'disabled' : ''}`}
                    onClick={() => hasAnyReview && setActiveTab('review')}
                    disabled={!hasAnyReview}
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
                        <span>🎧 팟캐스트</span>
                    </button>
                )}
                {book.actionGuide && book.actionGuide.length > 0 && (
                    <button
                        className={`rv-tab ${activeTab === 'action' ? 'active' : ''}`}
                        onClick={() => setActiveTab('action')}
                    >
                        <span className="material-symbols-outlined">rocket_launch</span>
                        <span>액션 가이드</span>
                    </button>
                )}
            </div>

            {/* ── Stage (FlipBook Container) ── */}
            {(activeTab === 'review' || activeTab === 'ebook') ? (
                ebookLoading && activeTab === 'ebook' ? (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'#c8a870', fontSize:'14px' }}>
                        <span>이북 불러오는 중...</span>
                    </div>
                ) :
                <div className="rv-stage">
                    <div className="rv-book-container">
                        <HTMLFlipBook
                            key={`flipbook-${hasEbook ? 'ebook' : 'review'}`}
                            ref={hasEbook ? ebookFlipBook : reviewFlipBook}
                            width={window.innerWidth > 600 ? 520 : window.innerWidth}
                            height={window.innerWidth > 600 ? 740 : (hasEbook ? window.innerHeight * 0.82 : 740)}
                            size="stretch"
                            minWidth={hasEbook ? 300 : 280}
                            maxWidth={520}
                            minHeight={400}
                            maxHeight={740}
                            maxShadowOpacity={0.4}
                            showCover={!hasEbook}
                            usePortrait={true}
                            startPage={0}
                            mobileScrollSupport={true}
                            onFlip={onFlip}
                            className="rv-flipbook"
                            drawShadow={true}
                            flippingTime={800}
                            autoSize={hasEbook}
                        >
                            {hasEbook ? (
                                // --- Ebook Layout Content ---
                                [
                                    <EbookPage key="ebook-cover" className="rv-ebook-cover-page">
                                        <div className="rv-ebook-cover-inner">
                                            <div className="rv-ebook-glow"></div>
                                            <div className="rv-ebook-cover-frame" style={{ backgroundImage: `url(${book.cover})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
                                                <div className="rv-ebook-cover-shadow"></div>
                                            </div>
                                            <h1 className="rv-ebook-title">{book.title}</h1>
                                            <div className="rv-ebook-author-box">
                                                <p className="rv-ebook-author">{book.author}</p>
                                                <div className="rv-ebook-divider"></div>
                                            </div>
                                            <p className="rv-ebook-tagline">"통찰의 아카이브, 당신의 성장을 위한 기록"</p>
                                            <p className="rv-ebook-hint">스와이프하여 읽기 →</p>
                                        </div>
                                    </EbookPage>,
                                    ...ebookPages.map((pageHtml, i) => (
                                        <EbookPage key={`ebook-p-${i}`} className="rv-ebook-content-page">
                                            <div className="rv-ebook-page-header">
                                                <span className="rv-ebook-chapter-label">INSIGHT ESSAY</span>
                                                <span className="rv-ebook-brand">ARCHIVIEW</span>
                                            </div>
                                            <div className="rv-ebook-body-container">
                                                {i === 0 && book.cover && (
                                                    <div className="rv-ebook-page-cover-thumb">
                                                        <img src={book.cover} alt={book.title} />
                                                    </div>
                                                )}
                                                <div
                                                    className="rv-ebook-body-html"
                                                    dangerouslySetInnerHTML={{ __html: pageHtml }}
                                                />
                                            </div>
                                            <div className="rv-ebook-page-footer">
                                                <span className="rv-ebook-page-number">— {i + 1} —</span>
                                            </div>
                                        </EbookPage>
                                    )),
                                    <EbookPage key="ebook-final" className="rv-ebook-final-page">
                                        <div className="rv-ebook-final-inner">
                                            <div className="rv-ebook-final-icon">
                                                <span className="material-symbols-outlined">local_library</span>
                                            </div>
                                            <h4 className="rv-ebook-finish-text">FINISH</h4>
                                            <p className="rv-ebook-thanks">아카이뷰와 함께해주셔서 감사합니다.</p>
                                        </div>
                                    </EbookPage>
                                ]
                            ) : (
                                // --- Original Summary Layout Content ---
                                [
                                    <Page key="review-cover" density="hard" className="rv-cover-page">
                                        <div className="rv-cover">
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
                                    </Page>,
                                    ...displayPages.map((p, i) => (
                                        <Page key={`review-${i}`}>
                                            <div className="rv-content">
                                                <div className="rv-section-label">
                                                    The Archiview · Review
                                                </div>
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
                                                        <div className="rv-biblio-card">
                                                            <div className="rv-biblio-cover">
                                                                <img src={book.cover} alt={p.body.title} />
                                                            </div>
                                                            <div className="rv-biblio-info">
                                                                <h3>{p.body.title}</h3>
                                                                <p className="author">{p.body.author}</p>
                                                                <p className="publisher">{p.body.publisher}</p>
                                                            </div>
                                                        </div>
                                                        <div className="rv-biblio-stamp">
                                                            <div className="stamp-inner">ORIGINAL CONTENT</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="rv-body">
                                                        {p.body.split('\n').map((line, li) => (
                                                            <p key={li}>{line}</p>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="rv-page-footer">
                                                    — {i + 1} —
                                                </div>
                                            </div>
                                        </Page>
                                    )),
                                    <Page key="review-final" density="hard" className="rv-final-page">
                                        <div className="rv-final-inner">
                                            <div className="rv-final-logo">ARCHIVIEW</div>
                                            <div className="rv-final-divider"></div>
                                            <h3>READ & ASCEND</h3>
                                            <p>기록은 영감이 되고,<br />영감은 행동이 됩니다.</p>
                                            <div className="rv-final-footer">THE ARCHIVIEW ORIGINAL</div>
                                        </div>
                                    </Page>
                                ]
                            )}
                        </HTMLFlipBook>
                    </div>

                    {/* ── Progress Bar ── */}
                    <div className="rv-progress-track">
                        <div className="rv-progress-fill" style={{ width: `${progress * 100}%` }} />
                    </div>

                    {/* ── Nav Buttons ── */}
                    <div className={`rv-nav ${showUI ? 'visible' : 'hidden'}`}>
                        <button 
                            className="rv-nav-btn" 
                            onClick={() => {
                                if (hasEbook) ebookFlipBook.current?.pageFlip()?.flipPrev();
                                else reviewFlipBook.current?.pageFlip()?.flipPrev();
                            }} 
                            disabled={pageIdx === 0}
                        >
                            <span className="material-symbols-outlined">arrow_back_ios_new</span>
                        </button>
                        <button 
                            className="rv-nav-btn" 
                            onClick={() => {
                                if (hasEbook) ebookFlipBook.current?.pageFlip()?.flipNext();
                                else reviewFlipBook.current?.pageFlip()?.flipNext();
                            }} 
                            disabled={pageIdx === total - 1}
                        >
                            <span className="material-symbols-outlined">arrow_forward_ios</span>
                        </button>
                    </div>
                </div>


            ) : activeTab === 'podcast' ? (
                <div className="rv-podcast-stage">
                    {/* ── Chat View ── */}
                    <div className="rv-chat-container">
                        {script.map((turn, i) => (
                            <div
                                key={i}
                                ref={el => bubbleRefs.current[i] = el}
                                className={`rv-chat-row ${turn.role === 'A' ? 'james' : 'stella'}${i === activeTurnIndex ? ' active' : ''}`}
                            >
                                <div className={`rv-chat-avatar ${turn.role === 'A' ? 'james' : 'stella'}`}>
                                    <Avatar role={turn.role} />
                                </div>
                                <div className="rv-chat-bubble-wrap">
                                    <div className="rv-chat-name">{i % 2 === 0 ? '제임스' : '스텔라'}</div>
                                    <div className={`rv-chat-bubble ${turn.role === 'A' ? 'james' : 'stella'}${i === activeTurnIndex ? ' active' : ''}`}>
                                        {turn.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                </div>
            ) : (
                <div className="rv-action-stage">
                    <div className="rv-action-header">
                        <div className="rv-action-badge">POPULAR FOCUS GUIDE</div>
                        <h2 className="rv-action-title">오늘의 액션 가이드</h2>
                        <p className="rv-action-subtitle">인사이트를 당신의 성장으로 바꾸는 실천 지침</p>
                    </div>

                    <div className="rv-action-list">
                        {book.actionGuide?.map((item, idx) => {
                            const isCompleted = completedActions.includes(item.title);
                            return (
                                <div key={idx} className={`rv-action-card group ${isCompleted ? 'completed' : ''}`}>
                                    <div className="rv-action-card-number">{idx + 1}</div>
                                    <div className="rv-action-card-content">
                                        <h3 className="rv-action-card-title">{item.title}</h3>
                                        <p className="rv-action-card-desc">{item.description}</p>
                                        {!isCompleted && (
                                            <button
                                                className="rv-action-record-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/reading-notes?mode=action&bookId=${book.id}&actionTitle=${encodeURIComponent(item.title)}`);
                                                }}
                                            >
                                                <span className="material-symbols-outlined text-sm">edit_note</span>
                                                기록 남기기
                                            </button>
                                        )}
                                    </div>
                                    <div className={`rv-action-card-check ${isCompleted ? 'visible' : ''}`}>
                                        <span className="material-symbols-outlined">{isCompleted ? 'check_circle' : 'pending'}</span>
                                        {isCompleted && <span className="rv-action-done-label">완료</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="rv-action-footer">
                        <p>작은 실천이 모여 당신의 커리어를 만듭니다.</p>
                        <button className="rv-action-complete-btn" onClick={() => navigate('/library')}>
                            실행 완료하고 서재로 가기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
// ── Ebook Page Component ──
const EbookPage = React.forwardRef(({ children, className }, ref) => {
    return (
        <div className={`rv-page-wrapper ebook-page ${className}`} ref={ref}>
            <div className="rv-sheet">
                {children}
            </div>
        </div>
    );
});

