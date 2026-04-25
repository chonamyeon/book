/**
 * 날짜 + 퀴즈 페르소나 기반 Today Contents 개인화
 * - 기존 Firestore Weekly Focus 데이터(books/videos)를 받아서
 *   페르소나와 날짜 시드로 순서를 결정해 2개씩 반환
 * - 오디오/팟캐스트/TTS 시스템에 영향 없음
 */

// 페르소나별 선호 도서 ID (availableAudio 키 기반)
const PERSONA_BOOK_AFFINITY = {
    growth: [
        'lean-startup', 'atomic-habits', 'zero-to-one', 'deep-work', 'essentialism',
        '7-habits', 'willpower', 'power-of-habit', 'mindset', 'grit',
        'ultralearning', 'peak', 'thinking-fast-slow', 'outliers', 'drive',
        'purple-cow', 'blue-ocean', 'good-to-great', 'built-to-last', 'flywheel',
        'shoe-dog', 'hard-thing', 'no-rules-rules', 'rework', 'zero-to-one',
    ],
    entertainment: [
        'sapiens', 'factfulness', '21-lessons', 'cosmos', 'brief-history-of-time',
        '1984', 'brave-new-world', 'catcher-in-the-rye', 'demian', 'almond',
        'greek-lessons', 'gentleman-in-moscow', 'eichmann-jerusalem', 'brahms',
        'the-old-man-and-the-sea', 'siddhartha',
    ],
    empathy: [
        'man-search-for-meaning', 'emotional-intelligence', 'give-and-take',
        'courage-to-disliked', 'nonviolent-communication', 'attachment',
        'almond', 'greek-lessons', 'demian', 'brahms',
        'how-to-win-friends', 'quiet', 'highly-sensitive', 'daring-greatly',
    ],
    mindfulness: [
        'power-of-now', 'stoicism', 'meditations', 'ikigai', 'flow',
        'man-search-for-meaning', 'courage-to-disliked', 'siddhartha',
        'deep-work', '4-hour-workweek', 'essentialism', 'digital-minimalism',
        'demian', 'brahms', 'greek-lessons',
    ],
};

// 페르소나별 유튜브 키워드 가중치 (제목/설명에 포함 여부로 점수 계산)
const PERSONA_VIDEO_KEYWORDS = {
    growth:        ['startup', 'entrepreneur', 'business', 'success', 'productivity', 'leadership', '창업', '성공', '생산성', '리더십', '비즈니스'],
    entertainment: ['science', 'history', 'story', 'culture', 'art', '과학', '역사', '문화', '예술', '우주'],
    empathy:       ['emotion', 'relationship', 'psychology', 'mental', 'community', '감정', '관계', '심리', '공감', '소통'],
    mindfulness:   ['mindfulness', 'meditation', 'life', 'philosophy', 'happiness', '마음', '철학', '행복', '명상', '삶'],
};

/**
 * 결정론적 셔플 (같은 시드 → 항상 같은 결과)
 */
const seededShuffle = (arr, seed) => {
    const s = [...arr];
    let h = seed;
    for (let i = s.length - 1; i > 0; i--) {
        h = ((h * 1664525 + 1013904223) | 0) >>> 0;
        const j = h % (i + 1);
        [s[i], s[j]] = [s[j], s[i]];
    }
    return s;
};

/**
 * 오늘 날짜 시드 (YYYYMMDD 정수)
 */
const getTodaySeed = () => {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

/**
 * 페르소나 기반 도서 점수 계산
 * Firestore에서 받은 books 배열을 페르소나 친화도 순으로 정렬 후 날짜 시드로 선택
 */
const scoreBook = (book, affinityIds) => {
    const id = (book.id || '').toLowerCase();
    // 완전 일치
    if (affinityIds.includes(id)) return 2;
    // 부분 일치
    if (affinityIds.some(a => id.includes(a) || a.includes(id))) return 1;
    return 0;
};

/**
 * 페르소나 기반 유튜브 점수 계산
 */
const scoreVideo = (video, keywords) => {
    const text = `${video.title || ''} ${video.description || ''} ${video.speaker || ''}`.toLowerCase();
    return keywords.filter(k => text.includes(k.toLowerCase())).length;
};

/**
 * 메인 함수: Today Contents 도서 2개 + 유튜브 2개 반환
 * @param {Array} books - Firestore weekly_focus books 배열
 * @param {Array} videos - Firestore weekly_focus videos 배열
 * @param {string|null} persona - 'growth'|'empathy'|'mindfulness'|'entertainment'|null
 * @returns {{ todayBooks: Array, todayVideos: Array }}
 */
export const getTodayContents = (books, videos, persona) => {
    const seed = getTodaySeed();
    const affinityIds = PERSONA_BOOK_AFFINITY[persona] || [];
    const keywords = PERSONA_VIDEO_KEYWORDS[persona] || [];

    // 도서: 페르소나 점수 → 날짜 시드 셔플 → 상위 2개
    const scoredBooks = books.map(b => ({ ...b, _score: scoreBook(b, affinityIds) }));
    const highBooks = scoredBooks.filter(b => b._score >= 2);
    const midBooks  = scoredBooks.filter(b => b._score === 1);
    const lowBooks  = scoredBooks.filter(b => b._score === 0);

    const shuffled = [
        ...seededShuffle(highBooks, seed),
        ...seededShuffle(midBooks, seed + 1),
        ...seededShuffle(lowBooks, seed + 2),
    ];
    const todayBooks = shuffled.slice(0, 2);

    // 유튜브: 페르소나 점수 → 날짜 시드 셔플 → 상위 2개
    const scoredVideos = videos.map(v => ({ ...v, _score: scoreVideo(v, keywords) }));
    const highVids = scoredVideos.filter(v => v._score > 0);
    const lowVids  = scoredVideos.filter(v => v._score === 0);

    const shuffledVids = [
        ...seededShuffle(highVids, seed + 3),
        ...seededShuffle(lowVids,  seed + 4),
    ];
    const todayVideos = shuffledVids.slice(0, 2);

    return { todayBooks, todayVideos };
};
