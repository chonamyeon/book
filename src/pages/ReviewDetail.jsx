import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
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
import { useBookData } from '../hooks/useBookData';
import SubscriptionModal from '../components/SubscriptionModal';
import { chatWithGemini } from '../services/gemini';
import { shareCard } from '../utils/shareCard';
import './ReviewDetail.css';

const CHARS_PER_PAGE = 400;

// 모바일 화면 높이별 안전한 페이지 글자수
// 패널티를 현실적으로 낮췄으므로(h1/h2=20, blockquote=40) maxChars를 넉넉하게 설정
function getMobileMaxChars() {
    if (window.innerWidth > 600) return 480;
    const h = window.innerHeight;
    if (h < 700) return 280;   // iPhone SE
    if (h < 820) return 330;   // iPhone 12 mini, 일반 iPhone
    return 400;                 // iPhone 14 Pro Max 등 대형
}

// <br><br> 연속 줄바꿈을 </p><p>로 정규화 (긴 단락 분할 가능하게)
function normalizeBrTags(html) {
    return html.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>');
}

// 문단(p, div, section, h1-6 등)의 시작이나 br, 줄바꿈 직후에 나타나는 불필요한 첫 줄 공백(스페이스) 제거
function removeLeadingSpaces(html) {
    if (!html) return html;
    // <p>, <div>, <section>, <h1>-<h6>, <blockquote> 블록 태그 직후의 모든 공백 문자(&nbsp; 포함) 제거
    let res = html.replace(/(<(p|div|section|h[1-6]|blockquote)[^>]*>)(?:\s|&nbsp;)+/gi, '$1');
    // <br> 태그 직후의 공백 문자 제거
    res = res.replace(/(<br\s*\/?>)(?:\s|&nbsp;)+/gi, '$1');
    // HTML 내부의 단순 줄바꿈(\n) 직후에 나오는 대량의 공백 제거
    res = res.replace(/\n(?:\s|&nbsp;)+/g, '\n');
    return res;
}

// 모바일 가독성을 위해 긴 문단을 3문장 단위로 강제 분할
function optimizeParagraphs(html) {
    if (!html || window.innerWidth > 600) return html;

    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const ps = Array.from(doc.querySelectorAll('p'));
    
    ps.forEach(p => {
        let inner = p.innerHTML;
        // 직접적인 nbsp 제거 및 첫 공백 제거
        inner = inner.replace(/^(?:\s|&nbsp;)+/, '');
        
        // 마침표, 물음표, 느낌표 뒤에 공백이 있는 경우를 문장의 끝으로 간주
        const parts = inner.replace(/([.?!。？！])\s+/g, '$1\x00').split('\x00').filter(s => s.trim());
        
        if (parts.length > 3) {
            let newHtml = '';
            for (let i = 0; i < parts.length; i++) {
                newHtml += parts[i].trim() + ' ';
                // 3문장마다 새로운 문단으로 나눔
                if ((i + 1) % 3 === 0 && i !== parts.length - 1) {
                    newHtml += '</p><p>';
                }
            }
            p.outerHTML = `<p>${newHtml.trim()}</p>`;
        } else {
            p.innerHTML = inner.trim();
        }
    });
    return doc.body.innerHTML;
}

// 재귀적으로 긴 HTML 노드를 쪼개고 묶어서 빈 공간 없이 페이지를 최적화
function reflowHtmlToPages(htmlStr, div, maxH) {
    div.innerHTML = htmlStr;
    const allChildren = Array.from(div.children);
    
    const pages = [];
    let curHtml = '';
    
    const pushCurrent = () => {
        if (!curHtml.replace(/<[^>]*>/g, '').trim()) {
            curHtml = '';
            return; // completely empty text (ignore)
        }
        pages.push(curHtml.trim());
        curHtml = '';
    };

    for (const child of allChildren) {
        // 빈 태그 무시 (단, 브레이크나 이미지는 시각적으로 중요할 수 있으나 이북 본문엔 img가 없을 확률이 높음)
        if (!child.textContent.trim() && !['BR', 'IMG', 'HR'].includes(child.tagName)) {
            continue;
        }

        const testHtml = curHtml + child.outerHTML;
        div.innerHTML = testHtml;
        
        if (div.scrollHeight > maxH) {
            if (curHtml) {
                pushCurrent();
                // 남은 child 하나 담았을 때도 넘치는지 체크
                div.innerHTML = child.outerHTML;
                if (div.scrollHeight > maxH) {
                    pages.push(...splitSingleLargeElement(child.outerHTML, div, maxH));
                } else {
                    curHtml = child.outerHTML;
                }
            } else {
                // 부모 없이 단일 child만으로 넘치는 경우
                pages.push(...splitSingleLargeElement(child.outerHTML, div, maxH));
            }
        } else {
            curHtml = testHtml;
        }
    }
    
    if (curHtml) {
        pushCurrent();
    }
    return pages.length > 0 ? pages : [htmlStr];
}

function splitSingleLargeElement(html, div, maxH) {
    div.innerHTML = html;
    if (div.scrollHeight <= maxH) return [html];

    const m = html.match(/^(<[a-zA-Z0-9]+[^>]*>)([\s\S]*?)(<\/[a-zA-Z0-9]+>)$/i);
    if (!m) return [html];

    const [, open, text, close] = m;
    const parts = text.replace(/([.?!。？！])\s+/g, '$1\x00').split('\x00').filter(Boolean);
    
    if (parts.length <= 1) return [html];

    const pages = [];
    let cur = '';
    
    for (const s of parts) {
        const test = open + cur + s + ' ' + close;
        div.innerHTML = test;
        if (cur && div.scrollHeight > maxH) {
            pages.push((open + cur.trimEnd() + close).trim());
            cur = s + ' ';
        } else {
            cur += s + ' ';
        }
    }
    if (cur.trim()) {
        pages.push((open + cur.trim() + close).trim());
    }
    return pages.length > 0 ? pages : [html];
}

// 단말기 및 웹 뷰(리액트 페이지플립) 크기에 맞춘 DOM 측정으로 rawPages를 재분할
async function measureAndResplitPages(rawPages) {
    try { await document.fonts.ready; } catch (_) {}

    const isPC = window.innerWidth > 600;

    // 모바일은 전체화면 기준, PC는 HTMLFlipBook 사이즈(400x600) 기준
    const bodyH = isPC ? 600 - 170 : window.innerHeight - 170;
    const bodyW = isPC ? 400 - 40  : window.innerWidth - 40;

    const div = document.createElement('div');
    div.id = '__ebk_m__';
    div.style.cssText = `position:fixed;top:-9999px;left:0;width:${bodyW}px;overflow:visible;visibility:hidden;font-family:'Noto Serif KR',Georgia,serif;font-size:20px;line-height:1.75;word-break:keep-all;overflow-wrap:break-word;letter-spacing:-0.2px;`;

    const sty = document.createElement('style');
    sty.id = '__ebk_s__';
    sty.textContent = `#__ebk_m__ p{margin-bottom:1.35em;margin-top:0;text-indent:0.4em;} #__ebk_m__ h1{font-size:1em;padding:1.2em 0.5em;margin:0 0 1.5em;font-weight:800;} #__ebk_m__ h2{font-size:1.15em;margin:1.5em 0 0.8em;font-weight:600;} #__ebk_m__ h3{font-size:1.1em;margin:1.2em 0 0.4em;} #__ebk_m__ blockquote{margin:1.5em 0;padding:1.2em 1.2em 1.2em 1.8em;} #__ebk_m__ blockquote p{font-size:0.95em;margin-bottom:0;text-indent:0;} #__ebk_m__ .ebook-quote{text-align:center;padding:1.4em 1em;margin:1.5em 0;border-left:none;border-top:1px solid rgba(255,255,255,0.15);border-bottom:1px solid rgba(255,255,255,0.15);} #__ebk_m__ .ebook-quote p{font-size:1em;font-style:italic;text-indent:0;margin-bottom:0.5em;} #__ebk_m__ .ebook-quote cite{display:block;font-size:0.8em;opacity:0.6;font-style:normal;}`;

    document.head.appendChild(sty);
    document.body.appendChild(div);

    const result = [];
    try {
        const fullHtml = rawPages.join('');
        result.push(...reflowHtmlToPages(fullHtml, div, bodyH));
    } finally {
        document.body.removeChild(div);
        document.head.removeChild(sty);
    }
    return result;
}

// 한 페이지에 표시하기엔 긴 HTML 섹션을 단락 단위로 재분할
function splitEbookSection(html, maxChars = 480) {
    // blockquote 내부의 </p>는 분할하지 않도록 보호 (cite가 다음 페이지로 넘어가는 버그 방지)
    let working = html.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, m =>
        m.replace(/<\/p>/gi, '</\x01p>')
    );
    // 분할 지점 마킹: </p>, </h1~6>, </blockquote> 뒤에 \x00 삽입
    working = working
        .replace(/<\/p>/gi, '</p>\x00')
        .replace(/<\/h[1-6]>/gi, m => m + '\x00')
        .replace(/<\/blockquote>/gi, '</blockquote>\x00');
    // 보호된 </p> 복원
    working = working.replace(/<\/\x01p>/g, '</p>');

    const parts = working.split('\x00').filter(p => p.trim());
    if (parts.length <= 1) return [html];

    const pages = [];
    let cur = '';
    let curLen = 0;
    for (const part of parts) {
        const textLen = part.replace(/<[^>]*>/g, '').trim().length;
        // 실제 시각적 높이 반영: h1/h2는 font+margin 합산시 약 1줄 추가, blockquote는 padding 추가
        const headingPenalty = /<h[12][^>]*>/i.test(part) ? 20 : /<h[3-6][^>]*>/i.test(part) ? 10 : 0;
        const blockquotePenalty = /<blockquote/i.test(part) ? 40 : 0;
        const len = textLen + headingPenalty + blockquotePenalty;
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

const BookCoverImage = ({ book, className, alt, isBackground = false, children, style = {} }) => {
    // 1순위: 커버 링크 (외부 링크 리스트), 2순위: 로컬 링크
    const [currentIdx, setCurrentIdx] = useState(0);

    const sources = useMemo(() => {
        if (!book) return [];
        const srcs = [];
        
        // 1. 커버 링크 명시적 프로퍼티 확인
        if (book.coverUrl && String(book.coverUrl).startsWith('http')) srcs.push(book.coverUrl);
        if (book.coverLink && String(book.coverLink).startsWith('http')) srcs.push(book.coverLink);
        // 2. 현재 cover 프로퍼티가 http로 시작하는 경우 (외부 링크)
        if (book.cover && String(book.cover).startsWith('http')) srcs.push(book.cover);
        
        // 3. 로컬 경로 형태인 경우
        if (book.cover && !String(book.cover).startsWith('http')) srcs.push(book.cover);
        
        // 4. 마지막 폴백 로컬 링크 (id 기반)
        if (book.id) srcs.push(`/images/covers/${book.id}.jpg`);
        if (book.id) srcs.push(`/images/covers/${book.id}.png`);
        
        // 중복 제거
        return [...new Set(srcs)];
    }, [book]);

    const handleError = () => {
        if (currentIdx < sources.length - 1) {
            setCurrentIdx(currentIdx + 1);
        }
    };

    if (!sources.length || currentIdx >= sources.length) {
        if (isBackground) {
            return <div className={className} style={{ ...style, backgroundColor: '#333' }}>{children}</div>;
        }
        return (
            <div className={`flex items-center justify-center bg-slate-800 ${className || ''}`} style={style}>
                <span className="material-symbols-outlined text-4xl text-white/20">menu_book</span>
            </div>
        );
    }

    if (isBackground) {
        return (
            <>
                <img 
                    src={sources[currentIdx]} 
                    onError={handleError} 
                    style={{ display: 'none' }} 
                    alt="hidden-preload" 
                />
                <div 
                    className={className} 
                    style={{ 
                        ...style,
                        backgroundImage: `url(${sources[currentIdx]})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                >
                    {children}
                </div>
            </>
        );
    }

    return (
        <img
            src={sources[currentIdx]}
            alt={alt || book?.title}
            className={className}
            onError={handleError}
            loading="lazy"
            style={style}
        />
    );
};

// 모바일 플립북 가용 높이 계산 (탭바 + 탑바 + safe-area 제외)
function getMobileFlipbookHeight() {
    if (window.innerWidth > 600) return 740;
    const safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top')) || 0;
    const safeBot = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom')) || 0;
    return Math.max(400, window.innerHeight - 96 - safeTop - safeBot);
}

export default function ReviewDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const reviewFlipBook = useRef(null);
    const ebookFlipBook = useRef(null);
    const [flipbookH] = useState(() => getMobileFlipbookHeight());

    const { getBook, loading: bookLoading } = useBookData();
    const [pageIdx, setPageIdx] = useState(0);
    const [showUI, setShowUI] = useState(true);
    const { user, hasAccess, trialDaysLeft } = useAuth();
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [cardLoading, setCardLoading] = useState(false);
    const { isSpeaking, activeAudioId, playPodcast, stopAll, playPodcastMP3, podcastPlaying, podcastInfo, currentTime, duration, seekPodcastMP3, updatePodcastCover } = useAudio();
    // currentTime, duration: 싱크 제거됐으나 seekPodcastMP3/진행바에서 사용

    const [firestoreCoverUrl, setFirestoreCoverUrl] = useState(null);

    // 파이어스토어 표지가 로드되면 미니플레이어 커버 즉시 업데이트
    useEffect(() => {
        if (firestoreCoverUrl && id) {
            updatePodcastCover(id, firestoreCoverUrl);
        }
    }, [firestoreCoverUrl, id, updatePodcastCover]);

    const book = useMemo(() => {
        if (!id) return null;
        let b = getBook(id);
        if (!b) {
            // Find in celebrities manually as fallback just in case
            for (const c of celebrities || []) {
                const cb = c.books?.find((bk) => (bk?.id || bk?.title?.toLowerCase()?.replace(/\s+/g, '-')) === id);
                if (cb) { b = cb; break; }
            }
        }
        if (b) {
            const validId = b.id || b.title?.toLowerCase()?.replace(/\s+/g, '-');
            const fileName = `${validId}.mp3`;
            const hasAudioFile = !!availableAudio[fileName];
            
            return {
                ...b,
                id: validId,
                isPodcast: b.isPodcast || hasAudioFile,
                podcastFile: b.podcastFile || (hasAudioFile ? `/audio/${fileName}` : null),
                coverUrl: firestoreCoverUrl || b.cover || b.coverUrl
            };
        }
        return null;
    }, [id, firestoreCoverUrl, getBook]);

    const hasReview = useMemo(() => !!(book?.review && book.review.trim().length > 100), [book]);
    const pages = useMemo(() => (book ? buildPages(book) : []), [book]);

    // ─── Action Integration ───
    const [completedActions, setCompletedActions] = useState([]);

    useEffect(() => {
        if (!user || !book) return;

        const q = query(
            collection(db, 'users', user.uid, 'readingNotes'),
            where('bookTitle', '==', book?.title || ''),
            where('type', 'in', ['action', '#액션'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const actions = snapshot.docs.map(doc => doc.data().actionTitle).filter(Boolean);
            setCompletedActions(actions);
        });

        return () => unsubscribe();
    }, [user, book]);

    const initialTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(initialTab || 'ebook');

    // ── 모바일 주소창 자동 숨김 (눈속임 기법) ──
    useEffect(() => {
        const hideAddressBar = () => {
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 100);
        };

        if (document.readyState === 'complete') {
            hideAddressBar();
        } else {
            window.addEventListener('load', hideAddressBar);
            return () => window.removeEventListener('load', hideAddressBar);
        }
    }, []);

    // ── Overlay Arrow Visibility (모바일 탭 시 잠깐 표시) ──
    const [showArrows, setShowArrows] = useState(false);
    const arrowFadeRef = useRef(null);
    const handleBookTap = () => {
        setShowArrows(true);
        clearTimeout(arrowFadeRef.current);
        arrowFadeRef.current = setTimeout(() => setShowArrows(false), 2500);

        try {
            // 안드로이드 모바일 등에서 화면 터치 시 브라우저 UI(주소창)를 전체화면 모드로 숨김
            if (window.innerWidth <= 600 && document.documentElement.requestFullscreen) {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                }
            }
        } catch (e) {}
    };

    // ── Insight Chat State ─────────────────────────────────
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatScrollRef = useRef(null);

    // Firestore / Script / Podcast States & Derivations
    const [firestoreScript, setFirestoreScript] = useState(null);
    const [firestoreAudioUrl, setFirestoreAudioUrl] = useState(null);
    const [firestoreIsPodcast, setFirestoreIsPodcast] = useState(false);
    const [firestoreEbook, setFirestoreEbook] = useState(null);
    const [ebookLoading, setEbookLoading] = useState(true);

    const script = useMemo(() => {
        let raw = firestoreScript && firestoreScript.length > 0 ? firestoreScript : (bookScripts[id] || []);
        if (raw.length === 0 && book?.podcastScript) {
            try { raw = typeof book.podcastScript === 'string' ? JSON.parse(book.podcastScript) : book.podcastScript; } catch {}
        }
        return raw.map(turn => ({
            ...turn,
            role: turn.role || (turn.speaker === 'B' || turn.speaker === '스텔라' ? 'B' : 'A'),
        }));
    }, [id, firestoreScript, book]);
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

    const total = hasEbook ? (ebookPages.length + 2) : (displayPages.length + 2);
    const progress = (total > 1) ? pageIdx / (total - 1) : 0;

    // 탭 파라미터 감지 (초기 마운트 + book/ebook 로드 시)
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['review', 'podcast', 'ebook'].includes(tab)) {
            setActiveTab(tab);
            // podcast 탭으로 URL 진입 시 자동 재생 (사용자 제스처 유효성 위해 지연 최소화)
            if (tab === 'podcast' && book && podcastSrc && isPodcast) {
                if (!podcastPlaying || podcastInfo?.src !== podcastSrc) {
                    try { playPodcastMP3(podcastSrc, book.title, book.coverUrl || book.cover, book.id); } catch (e) {}
                }
            }
        } else if (book && !hasReview) {
            if (hasEbook) setActiveTab('ebook');
            else if (isPodcast) setActiveTab('podcast');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [book, hasReview, hasEbook, isPodcast, podcastSrc]);

    const isThisPodcastActive = podcastInfo?.src === podcastSrc;

    const chatEndRef = useRef(null);

    // Firestore에서 대본 + 오디오 URL + isPodcast 실시간 로드
    useEffect(() => {
        if (!id) return;
        // Firestore 대본 항상 조회 (로컬보다 우선)
        getDoc(doc(db, 'scripts', id)).then(snap => {
            if (snap.exists() && snap.data().script) {
                const d = snap.data();
                if (Array.isArray(d.script) && d.script.length > 0) {
                    setFirestoreScript(d.script.map(l => ({
                        role: l.role || (l.speaker === '스텔라' || l.speaker?.toLowerCase() === 'stella') ? 'B' : 'A',
                        text: l.text || l.message || ''
                    })));
                } else if (d.script.length === 0) {
                    setFirestoreScript([]);
                }
            }
        }).catch(() => { });
        // 성우 MP3 / 오디오 URL / isPodcast / Cover URL Firestore 오버라이드 조회
        getDoc(doc(db, 'book_overrides', id)).then(snap => {
            if (snap.exists()) {
                const d = snap.data();
                setFirestoreAudioUrl(d.voiceAudioUrl || d.audioUrl || null);
                if (d.isPodcast) setFirestoreIsPodcast(true);
                if (d.cover) setFirestoreCoverUrl(d.cover);
            }
        }).catch(() => { });

        // 이북 데이터 조회 — 파싱은 idle time에 실행해 초기 렌더링 블로킹 방지
        getDoc(doc(db, 'ebooks', id)).then(snap => {
            const parseEbook = async () => {
                if (snap.exists()) {
                    const data = snap.data();
                    const mc = getMobileMaxChars();
                    let rawPages = null;
                    if (data.pages && Array.isArray(data.pages)) {
                        rawPages = data.pages.flatMap(p => splitEbookSection(optimizeParagraphs(normalizeBrTags(p)), mc));
                    } else if (data.content) {
                        const content = data.content;
                        const sections = content.split(/<section[^>]*class=["']ebook-page["'][^>]*>/i);
                        const validSections = sections
                            .map(s => s.split(/<\/section>/i)[0])
                            .filter(s => s.trim() && !s.includes('<!DOCTYPE') && !s.includes('<html'));
                        if (validSections.length > 0) {
                            rawPages = validSections.flatMap(s => splitEbookSection(optimizeParagraphs(normalizeBrTags(s || '')), mc));
                        } else {
                            rawPages = splitEbookSection(optimizeParagraphs(normalizeBrTags(content || '')), mc);
                        }
                    }
                    if (rawPages) {
                        const finalPages = await measureAndResplitPages(rawPages);
                        setFirestoreEbook(finalPages);
                    }
                }
                setEbookLoading(false);
            };
            // requestIdleCallback 지원 브라우저는 idle time에 파싱, 미지원 시 setTimeout
            if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(() => parseEbook(), { timeout: 3000 });
            } else {
                setTimeout(parseEbook, 200);
            }
        }).catch(() => setEbookLoading(false));
    }, [id]);

    const bubbleRefs = useRef([]);

    // 수동 타임스탬프 (Firestore timestamps/{id}) 로드 + mode
    // localStorage 캐시로 매번 Firestore 호출 방지 (24시간 유효)
    const [timestampSegments, setTimestampSegments] = useState(null);
    const [syncMode, setSyncMode] = useState(false);
    useEffect(() => {
        if (!id) return;
        const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간
        const cacheKey = `rv_ts_${id}`;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { segments, mode, cachedAt } = JSON.parse(cached);
                if (segments?.length && Date.now() - cachedAt < CACHE_TTL) {
                    setTimestampSegments(segments);
                    setSyncMode(mode === 'sync');
                    return; // Firestore 호출 없이 캐시 사용
                }
            }
        } catch (e) {}
        // 캐시 없거나 만료 → Firestore 호출
        getDoc(doc(db, 'timestamps', id)).then(snap => {
            if (snap.exists() && snap.data().segments?.length) {
                const { segments, mode } = snap.data();
                setTimestampSegments(segments);
                setSyncMode(mode === 'sync');
                localStorage.setItem(cacheKey, JSON.stringify({ segments, mode, cachedAt: Date.now() }));
            } else {
                setTimestampSegments(null);
                setSyncMode(false);
            }
        }).catch(() => { setTimestampSegments(null); setSyncMode(false); });
    }, [id]);

    const hasSyncData = !!(timestampSegments && script.length && timestampSegments.length === script.length);

    // currentTime 기반 activeTurnIndex — 싱크 모드 + 타임스탬프 있을 때만 활성
    const activeTurnIndex = useMemo(() => {
        if (!syncMode || !hasSyncData) return -1;
        let idx = -1;
        for (let i = 0; i < timestampSegments.length; i++) {
            if (currentTime >= timestampSegments[i].start) idx = i;
            else break;
        }
        return idx;
    }, [syncMode, hasSyncData, timestampSegments, currentTime]);

    // 활성 말풍선 자동 스크롤 (싱크 모드일 때만)
    useEffect(() => {
        if (!syncMode || activeTurnIndex < 0) return;
        const el = bubbleRefs.current[activeTurnIndex];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [syncMode, activeTurnIndex]);

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
        if (bookLoading) {
            return (
                <div style={{ minHeight: '100vh', background: '#101218', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="w-[50px] h-[50px] border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
            );
        }
        return (
            <div style={{ minHeight: '100vh', background: '#101218', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined text-[60px] text-white/10 mb-4">menu_book</span>
                <p style={{ color: '#888', fontSize: 16 }}>도서를 찾을 수 없습니다.</p>
                <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-orange-500/20 text-orange-500 rounded-full text-[12px] font-bold">홈으로 돌아가기</button>
            </div>
        );
    }

    const handlePodcastClick = () => {
        playPodcastMP3(podcastSrc, book.title, book.coverUrl || book.cover, book.id);
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
            window.Kakao.init('9cbdeec02a8ce33b5deb576a0e63c380');
        }
        const shareUrl = `https://archiview.store/review/${encodeURIComponent(book.id)}`;
        const shareImage = book.cover?.startsWith('http')
            ? book.cover
            : `https://archiview.store${book.cover}`;
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
        setShowShareMenu(false);
    }, [book]);

    const handleInstagramShare = useCallback(() => {
        const shareUrl = `https://archiview.store/review/${encodeURIComponent(book.id)}`;
        if (navigator.share) {
            navigator.share({
                title: `[아카이뷰] ${book.title}`,
                text: `『${book.title}』 - 아카이뷰에서 읽어보세요!`,
                url: shareUrl,
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(shareUrl).then(() => alert('링크 복사됨! 인스타그램에 붙여넣기 하세요.'));
        }
        setShowShareMenu(false);
    }, [book]);

    const handleCopyLink = useCallback(() => {
        const shareUrl = `https://archiview.store/review/${encodeURIComponent(book.id)}`;
        navigator.clipboard.writeText(shareUrl).then(() => alert('링크 복사됨!'));
        setShowShareMenu(false);
    }, [book]);

    const handleCardShare = useCallback(async () => {
        const shareUrl = `https://archiview.store/review/${encodeURIComponent(book.id)}`;
        setShowShareMenu(false);
        setCardLoading(true);
        try {
            await shareCard(book, shareUrl);
        } catch {
            alert('카드 생성 실패. 다시 시도해주세요.');
        } finally {
            setCardLoading(false);
        }
    }, [book]);

    // ── Insight Chat 핸들러 ─────────────────────────────────
    const handleSendChat = useCallback(async (inputText) => {
        const msg = (inputText || chatInput).trim();
        if (!msg || chatLoading) return;
        setChatInput('');

        // 시스템 컨텍스트 구성
        const scriptContext = script.slice(0, 30).map(t => t.text).join(' ');
        const systemPrompt = `당신은 '${book?.title}' (저자: ${book?.author}) 책 전문 독서 도우미입니다.
아래는 이 책을 주제로 한 팟캐스트 대본 일부입니다:
---
${scriptContext}
---
독자의 질문에 이 책의 핵심 인사이트를 바탕으로 친근하고 통찰력 있게 답변하세요. 한국어로 답변하고, 실생활 적용 방법도 함께 제안하세요.`;

        const userMsg = { role: 'user', content: msg };
        setChatMessages(prev => [...prev, userMsg]);
        setChatLoading(true);

        try {
            // chatWithGemini expects history as [{role, parts:[{text}]}] and must start with user
            let geminiHistory = [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: `안녕하세요! 저는 『${book?.title}』 인사이트 도우미입니다 📖\n이 책에서 가장 인상 깊었던 부분이나 궁금한 점을 자유롭게 물어보세요.` }] }
            ];

            chatMessages.forEach((m, idx) => {
                if (idx === 0 && m.role === 'model') return; // 첫 환영 메시지 스킵
                geminiHistory.push({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }]
                });
            });

            const reply = await chatWithGemini(msg, geminiHistory);
            setChatMessages(prev => [...prev, { role: 'model', content: reply }]);
        } catch {
            setChatMessages(prev => [...prev, { role: 'model', content: '잠시 후 다시 시도해 주세요.' }]);
        } finally {
            setChatLoading(false);
        }
    }, [chatInput, chatLoading, chatMessages, book, script]);

    // 채팅 탭 진입 시 환영 메시지
    useEffect(() => {
        if (activeTab === 'chat' && chatMessages.length === 0 && book?.title) {
            setChatMessages([{
                role: 'model',
                content: `안녕하세요! 저는 『${book.title}』 인사이트 도우미입니다 📖\n이 책에서 가장 인상 깊었던 부분이나 궁금한 점을 자유롭게 물어보세요.`
            }]);
        }
    }, [activeTab, book?.title]);

    // 채팅 자동 스크롤
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const ogImage = book.cover?.startsWith('http') ? book.cover : `https://archiview.store${book.cover}`;

    return (
        <>
        <Helmet>
            <title>{book.title || '아카이뷰 도서'} - ARCHIVIEW</title>
            <meta property="og:title" content={`[아카이뷰] ${book.title || '도서'}`} />
            <meta property="og:description" content={book.desc || '아카이뷰의 정밀 도서 리뷰'} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:url" content={`https://archiview.store/review/${encodeURIComponent(book.id)}`} />
            <meta property="og:type" content="article" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:image" content={ogImage} />
        </Helmet>
        <div
            className={`rv-root ${activeTab === 'podcast' ? 'podcast-view' : ''}`}
            style={{ background: '#0d0b08' }}
            onClick={resetHideTimer}
        >
            {/* ── Top Bar ── */}
            <div className={`rv-topbar ${showUI ? 'visible' : 'hidden'}`}>
                <button className="rv-close-btn" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
                    <span className="material-symbols-outlined">close</span>
                </button>
                <div className="rv-topbar-title-wrap">
                    <span className="rv-topbar-title">{book.title}</span>
                    <span className="rv-topbar-count">{pageIdx} / {total - 1}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                    <button className="rv-close-btn" onClick={() => setShowShareMenu(v => !v)} title="공유">
                        <span className="material-symbols-outlined">ios_share</span>
                    </button>
                    <button className="rv-close-btn" onClick={() => navigate('/')}>
                        <span className="material-symbols-outlined">home</span>
                    </button>
                </div>
            </div>

            {/* ── Share Menu ── */}
            {showShareMenu && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 997 }}
                    onClick={() => setShowShareMenu(false)}
                >
                    <div
                        style={{
                            position: 'absolute', top: '52px', right: '44px',
                            background: '#1c1f2e', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '16px', padding: '6px', minWidth: '170px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                            display: 'flex', flexDirection: 'column', gap: '2px',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={handleCardShare}
                            disabled={cardLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: cardLoading ? 'rgba(212,175,55,0.08)' : 'none', border: 'none', color: '#d4af37', cursor: cardLoading ? 'not-allowed' : 'pointer', borderRadius: '10px', fontSize: '14px', textAlign: 'left', fontWeight: 'bold' }}
                            onMouseOver={e => { if (!cardLoading) e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; }}
                            onMouseOut={e => { if (!cardLoading) e.currentTarget.style.background = 'none'; }}
                        >
                            <span className={`material-symbols-outlined ${cardLoading ? 'animate-spin' : ''}`} style={{ fontSize: '18px' }}>
                                {cardLoading ? 'progress_activity' : 'photo_camera'}
                            </span>
                            {cardLoading ? '카드 생성 중...' : '이미지 카드 공유'}
                        </button>
                        <button
                            onClick={handleKakaoShare}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '10px', fontSize: '14px', textAlign: 'left' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}
                        >
                            <span style={{ fontSize: '18px' }}>💬</span>
                            카카오톡 공유
                        </button>
                        <button
                            onClick={handleInstagramShare}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '10px', fontSize: '14px', textAlign: 'left' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}
                        >
                            <span style={{ fontSize: '18px' }}>📸</span>
                            공유하기
                        </button>
                        <button
                            onClick={handleCopyLink}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '10px', fontSize: '14px', textAlign: 'left' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link</span>
                            링크 복사
                        </button>
                    </div>
                </div>
            )}

            {/* ── Tab Bar ── */}
            <div className={`rv-tab-bar ${showUI ? 'visible' : 'hidden'}`}>
                <button
                    className={`rv-tab ${activeTab === 'ebook' || activeTab === 'review' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ebook')}
                >
                    이북보기
                </button>

                {isPodcast && (
                    <button
                        className={`rv-tab ${activeTab === 'podcast' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('podcast');
                            if (!podcastPlaying || podcastInfo?.src !== podcastSrc) {
                                playPodcastMP3(podcastSrc, book.title, book.coverUrl || book.cover, book.id);
                            }
                        }}
                    >
                        팟캐스트
                    </button>
                )}

                <button
                    className={`rv-tab ${activeTab === 'chat' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chat')}
                >
                    인사이트 챗
                </button>
            </div>

            {/* ── Stage (FlipBook Container) ── */}
            {(activeTab === 'review' || activeTab === 'ebook') ? (
                ebookLoading && activeTab === 'ebook' ? (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'#c8a870', fontSize:'14px' }}>
                        <span>이북 불러오는 중...</span>
                    </div>
                ) :
                <div className="rv-stage" onTouchStart={handleBookTap} onClick={handleBookTap}>
                    <div className="rv-book-container">
                        <HTMLFlipBook
                            key={`flipbook-${hasEbook ? 'ebook' : 'review'}`}
                            ref={hasEbook ? ebookFlipBook : reviewFlipBook}
                            width={window.innerWidth > 600 ? 520 : window.innerWidth}
                            height={flipbookH}
                            size="fixed"
                            minWidth={280}
                            maxWidth={window.innerWidth > 600 ? 520 : window.innerWidth}
                            minHeight={400}
                            maxHeight={flipbookH}
                            maxShadowOpacity={0.4}
                            showCover={!hasEbook}
                            usePortrait={true}
                            startPage={0}
                            mobileScrollSupport={true}
                            onFlip={onFlip}
                            className="rv-flipbook"
                            drawShadow={true}
                            flippingTime={800}
                            autoSize={false}
                        >
                            {hasEbook ? (
                                // --- Ebook Layout Content ---
                                [
                                    <EbookPage key="ebook-cover" className="rv-ebook-cover-page">
                                        <div className="rv-ebook-cover-inner">
                                            <div className="rv-ebook-glow"></div>
                                            <BookCoverImage book={book} className="rv-ebook-cover-frame" isBackground={true}>
                                                <div className="rv-ebook-cover-shadow"></div>
                                            </BookCoverImage>
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

                                            <div className="rv-ebook-body-container">
                                                {i === 0 && (
                                                    <div className="rv-ebook-page-cover-thumb">
                                                        <BookCoverImage book={book} alt={book.title} />
                                                    </div>
                                                )}
                                                <div
                                                    className="rv-ebook-body-html"
                                                    dangerouslySetInnerHTML={{ 
                                                        __html: pageHtml.replace(/(<blockquote>.*?<p>)\s*["“”](.*?)\s*["“”](\s*<\/p>)/gs, '$1$2$3') 
                                                    }}
                                                />
                                            </div>
                                        </EbookPage>
                                    )),
                                    <EbookPage key="ebook-final" className="rv-ebook-final-page">
                                        <div className="rv-ebook-final-inner">
                                            <div className="rv-ebook-final-top">
                                                <div className="rv-ebook-final-brand-row">
                                                    <span className="rv-ebook-final-ornament">✦</span>
                                                    <span className="rv-ebook-final-brand-name">THE ARCHIVIEW</span>
                                                    <span className="rv-ebook-final-ornament">✦</span>
                                                </div>
                                                <h2 className="rv-ebook-final-booktitle" style={{marginBottom:'16px'}}>{book.title}</h2>
                                                <div className="rv-ebook-final-rule"></div>
                                            </div>
                                            {book.actionGuide?.length > 0 && (
                                                <div className="rv-ebook-final-action">
                                                    <div className="rv-ebook-inline-action-header">✦ 오늘의 실전기록노트</div>
                                                    {book.actionGuide.map((item, idx) => (
                                                        <div key={idx} className="rv-ebook-inline-action-box">
                                                            <span className="rv-ebook-inline-action-num">{idx + 1}</span>
                                                            <div className="rv-ebook-inline-action-body">
                                                                <p className="rv-ebook-inline-action-title">{item.title}</p>
                                                                <p className="rv-ebook-inline-action-desc">{item.description}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button className="rv-ebook-inline-action-btn" onClick={(e) => { e.stopPropagation(); navigate(`/reading-notes?bookId=${book.id}`); }}>
                                                        기록노트 바로가기 →
                                                    </button>
                                                </div>
                                            )}
                                            <div className="rv-ebook-final-bottom">
                                                <p className="rv-ebook-final-copyright">본 콘텐츠는 독자의 인사이트를 담은 창작 에세이 리뷰이며, 더 풍부한 내용은 가까운 서점이나 온라인 서점에서 구매하여 보시기 바랍니다.</p>
                                                <p className="rv-ebook-final-copyright-mark">© The Archiview — All Rights Reserved</p>
                                            </div>
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
                                                        <BookCoverImage book={book} alt={book.title} />
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
                                                                <BookCoverImage book={book} alt={p.body.title} />
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

                    {/* ── Overlay Arrows (투명, hover/탭 시 표시) ── */}
                    <button
                        className={`rv-overlay-btn rv-overlay-prev ${showArrows ? 'visible' : ''}`}
                        onClick={e => { e.stopPropagation(); if (hasEbook) ebookFlipBook.current?.pageFlip()?.flipPrev(); else reviewFlipBook.current?.pageFlip()?.flipPrev(); }}
                        disabled={pageIdx === 0}
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button
                        className={`rv-overlay-btn rv-overlay-next ${showArrows ? 'visible' : ''}`}
                        onClick={e => { e.stopPropagation(); if (hasEbook) ebookFlipBook.current?.pageFlip()?.flipNext(); else reviewFlipBook.current?.pageFlip()?.flipNext(); }}
                        disabled={pageIdx === total - 1}
                    >
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>


            ) : activeTab === 'podcast' ? (
                <div className="rv-podcast-stage">
                    {/* ── Chat View ── */}
                    <div className={`rv-chat-container${(syncMode && hasSyncData) ? ' sync-active' : ''}`}>
                        {script.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(212,175,55,0.7)' }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>🎙️</div>
                                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.5)' }}>
                                    대본을 불러오는 중이에요.<br />잠시 후 다시 시도해주세요.
                                </p>
                                {isPodcast && (
                                    <button
                                        onClick={() => {
                                            if (!podcastPlaying || podcastInfo?.src !== podcastSrc) {
                                                playPodcastMP3(podcastSrc, book.title, book.coverUrl || book.cover, book.id);
                                            }
                                        }}
                                        style={{
                                            marginTop: 20, padding: '10px 24px',
                                            background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)',
                                            borderRadius: 24, color: '#d4af37', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                                        }}
                                    >
                                        🎧 오디오만 재생하기
                                    </button>
                                )}
                            </div>
                        )}
                        {script.map((turn, i) => {
                            // 싱크 모드: 최근 3개 메시지만 표시 (현재 + 이전 2개), -1일 경우 0번 보여줌
                            if (syncMode && hasSyncData) {
                                const renderIdx = activeTurnIndex < 0 ? 0 : activeTurnIndex;
                                if (i > renderIdx) return null;
                                if (i < renderIdx - 2) return null;
                            }
                            return (
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
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>
                </div>

            ) : activeTab === 'chat' ? (
                /* ── Insight Chat ── */
                <div className="rv-insight-stage">
                    <div className="rv-insight-messages" ref={chatScrollRef}>
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`rv-insight-row ${msg.role === 'user' ? 'user' : 'ai'}`}>
                                {msg.role !== 'user' && (
                                    <div className="rv-insight-avatar">
                                        <span className="material-symbols-outlined">psychology</span>
                                    </div>
                                )}
                                <div className={`rv-insight-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                                    {msg.content.split('\n').map((line, j) => (
                                        <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br/>}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="rv-insight-row ai">
                                <div className="rv-insight-avatar">
                                    <span className="material-symbols-outlined">psychology</span>
                                </div>
                                <div className="rv-insight-bubble ai rv-insight-typing">
                                    <span/><span/><span/>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="rv-insight-input-bar">
                        <textarea
                            className="rv-insight-input"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendChat();
                                }
                            }}
                            placeholder={`『${book.title}』에 대해 무엇이든 물어보세요...`}
                            rows={1}
                            disabled={chatLoading}
                        />
                        <button
                            className="rv-insight-send"
                            onClick={() => handleSendChat()}
                            disabled={!chatInput.trim() || chatLoading}
                        >
                            <span className="material-symbols-outlined">send</span>
                        </button>
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

            {showSubscriptionModal && (
                <SubscriptionModal
                    onClose={() => setShowSubscriptionModal(false)}
                    trialDaysLeft={trialDaysLeft}
                />
            )}
        </div>
        </>
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

