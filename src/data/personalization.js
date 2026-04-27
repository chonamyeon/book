/**
 * Today Contents: 전원 동일
 * - 짝(도서 2 + 영상 2)은 **한국(Asia/Seoul) 캘린더 날짜가 바뀔 때** 바뀜 = 그날 **밤 12시(자정) 이후**부터 다음 짝
 * - 도서 n권(예: 60): (0,1)→(2,3)…(58,59) · `dayIndex % 30` · 30일에 한 주기
 * - 유튜브 m개(예: 10): 별도로 `dayIndex % 5` · 5일 주기
 * persona: 호환용(미사용)
 */

/**
 * 한국(Asia/Seoul) 기준 YYYYMMDD 정수
 */
export const getCalendarDayKey = () => {
    try {
        const fmt = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const p = fmt.formatToParts(new Date());
        const y = +p.find((x) => x.type === 'year').value;
        const m = +p.find((x) => x.type === 'month').value;
        const d = +p.find((x) => x.type === 'day').value;
        return y * 10000 + m * 100 + d;
    } catch {
        const x = new Date();
        return x.getFullYear() * 10000 + (x.getMonth() + 1) * 100 + x.getDate();
    }
};

/** 이번 **서울** 날의 다음 자정(다음날 00:00:00) 시각(UTC ms). PWA가 자정에 Today를 맞출 때 씀. */
export const getNextSeoulMidnightAfter = (nowMs = Date.now()) => {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const p = fmt.formatToParts(new Date(nowMs));
    const y = p.find((x) => x.type === 'year').value;
    const mo = p.find((x) => x.type === 'month').value;
    const da = p.find((x) => x.type === 'day').value;
    const t0 = new Date(`${y}-${mo}-${da}T00:00:00+09:00`).getTime();
    return t0 + 24 * 60 * 60 * 1000;
};

/** YYYYMMDD → 2020-01-01(UTC 달력)부터 경과한 **일 수** (하루마다 1씩 증가) */
export const dayIndexFromYmd = (ymd) => {
    const y = Math.floor(ymd / 10000);
    const m = Math.floor((ymd % 10000) / 100);
    const d = ymd % 100;
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2020, 0, 1)) / 86400000);
};

/**
 * id/title 기준 중복 제거(선행 유지). 키가 비어 있으면 `__w_i`로 구분 — **빈 키로 통째로 버리지 않음**(그랬다가 60→2면 짝이 영원히 안 밀림)
 */
const dedupeOrdered = (arr, getKey) => {
    const seen = new Set();
    const out = [];
    const a = arr || [];
    for (let i = 0; i < a.length; i++) {
        const x = a[i];
        const raw = getKey(x, i);
        const k = raw && String(raw).trim() ? String(raw).trim() : `__w_${i}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(x);
    }
    return out;
};

/** 붙은 두 칸씩(0-1, 2-3, …) 짝. `dayIndex % pairCount`로 **그날** 어느 짝인지. 링(끈 이어 붙이기) 없음. */
const pickDisjointPairBlock = (ordered, dayIndex) => {
    const n = ordered.length;
    if (n === 0) return [];
    if (n === 1) return [ordered[0]];
    const pairCount = Math.floor(n / 2);
    const slot = dayIndex % pairCount;
    const i = slot * 2;
    return [ordered[i], ordered[i + 1]];
};

export const getTodaySeed = getCalendarDayKey;

/**
 * @param {Array} books
 * @param {Array} videos
 * @param {string|null|undefined} _persona — 호환용(현재 미사용)
 * @param {number} [dayKey] — YYYYMMDD (미주입 시 오늘 서울)
 */
export const getTodayContents = (books, videos, _persona, dayKey) => {
    const ymd = typeof dayKey === 'number' ? dayKey : getCalendarDayKey();
    const dayIdx = dayIndexFromYmd(ymd);

    const bookList = dedupeOrdered(books || [], (b) => String(b.id || b.title || '').trim() || null);
    const videoList = dedupeOrdered(
        videos || [],
        (v) => String(v.id || v.videoId || v.url || v.youtubeUrl || v.title || '').trim() || null
    );

    return {
        todayBooks: pickDisjointPairBlock(bookList, dayIdx),
        todayVideos: pickDisjointPairBlock(videoList, dayIdx),
    };
};
