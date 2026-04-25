import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const DESIGN_DEFAULTS = {
    main_hero:      { type: 'video', src: '/video/main7.mp4' },
    main_hero_poster: '',
    editorial_hero: { type: 'video', src: '/video/Figure_walking9.mp4' },
    editorial_hero_poster: '',
    library_hero:   { type: 'video', src: '/video/Figure_walking6.mp4' },
    library_hero_poster: '',
    notes_hero:     { type: 'video', src: '/video/Figure_walking7.mp4' },
    notes_hero_poster: '',
    profile_hero:   { type: 'video', src: '/video/Figure_walking10.mp4' },
    profile_hero_poster: '',
    youtube_hero:   { type: 'image', src: '/images/hero_expert_v5.png' },
    youtube_hero_poster: '',
    category_heroes: {
        SELF_DEV:    { type: 'image', src: '/images/cat_success.png' },
        ECONOMY:     { type: 'image', src: '/images/cat_wealth_mod.png' },
        MANAGEMENT:  { type: 'image', src: '/images/cat_career.png' },
        HUMANITIES:  { type: 'image', src: '/images/cat_philosophy_mod.png' },
        PSYCHOLOGY:  { type: 'image', src: '/images/cat_healing_mod.png' },
        BURNOUT:     { type: 'image', src: '/images/cat_burnout_new.jpg' },
        WEALTH:      { type: 'image', src: '/images/cat_wealth_new.jpg' },
        HEALING:     { type: 'image', src: '/images/cat_healing_new.jpg' },
        PHILOSOPHY:  { type: 'image', src: '/images/cat_philosophy_new.jpg' },
    },
    main_categories: [
        { id: 'BURNOUT',    label: '일이 손에 안 잡히고 지칠 때',         subLabel: '(번아웃 & 커리어 슬럼프)', img: '/images/cat_burnout_new.jpg' },
        { id: 'WEALTH',     label: '내 가치를 증명하고 부를 쌓고 싶을 때', subLabel: '(연봉협상 & 경제적 자유)',   img: '/images/cat_wealth_new.jpg' },
        { id: 'HEALING',    label: '마음이 답답하고 위로가 필요할 때',      subLabel: '(우울 & 고독 & 치유)',      img: '/images/cat_healing_new.jpg' },
        { id: 'PHILOSOPHY', label: '어떻게 살아야 할지 막막할 때',          subLabel: '(자아성찰 & 인생철학)',     img: '/images/cat_philosophy_new.jpg' },
    ],
    editorial_slider: [
        { id: 'BURNOUT',    label: '일이 손에 안 잡히고 지칠 때',         sub: '번아웃 솔루션', img: '/images/cat_burnout_new.jpg' },
        { id: 'WEALTH',     label: '내 가치를 증명하고 부를 쌓고 싶을 때', sub: '경제/자유',     img: '/images/cat_wealth_new.jpg' },
        { id: 'HEALING',    label: '마음이 답답하고 위로가 필요한 때',      sub: '치유/명상',     img: '/images/cat_healing_new.jpg' },
        { id: 'PHILOSOPHY', label: '어떻게 살아야 할지 막막할 때',          sub: '철학/인생',     img: '/images/cat_philosophy_new.jpg' },
    ],
    editorial_tabs: [
        { id: 'SELF_DEV',   label: '자기계발', img: '/images/photo_selfdev.jpg' },
        { id: 'ECONOMY',    label: '경제',     img: '/images/photo_economy.jpg' },
        { id: 'MANAGEMENT', label: '경영',     img: '/images/photo_management.jpg' },
        { id: 'HUMANITIES', label: '인문',     img: '/images/photo_humanities.jpg' },
        { id: 'PSYCHOLOGY', label: '심리',     img: '/images/photo_psychology.jpg' },
    ],
};

const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?|$)/i;

function resolveType(obj) {
    if (!obj || !obj.src) return obj;
    if (obj.type === 'video') return obj;
    if (VIDEO_EXT.test(obj.src)) return { ...obj, type: 'video' };
    return obj;
}

function merge(saved, key, defaultVal) {
    if (!saved) return defaultVal;
    const v = saved[key];
    if (Array.isArray(defaultVal)) return (Array.isArray(v) && v.length) ? v : defaultVal;
    if (typeof defaultVal === 'object') {
        if (!v) return defaultVal;
        const merged = { ...defaultVal, ...v };
        // src가 비어있으면 기본값으로 fallback
        if (merged.src === '' || merged.src == null) return defaultVal;
        return resolveType(merged);
    }
    return v ?? defaultVal;
}

const CACHE_KEY = 'site_design_cache';

function buildDesign(d) {
    return {
        main_hero:        merge(d, 'main_hero',        DESIGN_DEFAULTS.main_hero),
        editorial_hero:   merge(d, 'editorial_hero',   DESIGN_DEFAULTS.editorial_hero),
        library_hero:     merge(d, 'library_hero',     DESIGN_DEFAULTS.library_hero),
        notes_hero:       merge(d, 'notes_hero',       DESIGN_DEFAULTS.notes_hero),
        profile_hero:     merge(d, 'profile_hero',     DESIGN_DEFAULTS.profile_hero),
        youtube_hero:     merge(d, 'youtube_hero',     DESIGN_DEFAULTS.youtube_hero),
        category_heroes:  d?.category_heroes ? { ...DESIGN_DEFAULTS.category_heroes, ...d.category_heroes } : DESIGN_DEFAULTS.category_heroes,
        main_categories:  merge(d, 'main_categories',  DESIGN_DEFAULTS.main_categories),
        editorial_slider: merge(d, 'editorial_slider', DESIGN_DEFAULTS.editorial_slider),
        editorial_tabs:   merge(d, 'editorial_tabs',   DESIGN_DEFAULTS.editorial_tabs),
        main_hero_poster:       d?.main_hero_poster       || DESIGN_DEFAULTS.main_hero_poster,
        editorial_hero_poster:  d?.editorial_hero_poster  || DESIGN_DEFAULTS.editorial_hero_poster,
        library_hero_poster:    d?.library_hero_poster    || DESIGN_DEFAULTS.library_hero_poster,
        notes_hero_poster:      d?.notes_hero_poster      || DESIGN_DEFAULTS.notes_hero_poster,
        profile_hero_poster:    d?.profile_hero_poster    || DESIGN_DEFAULTS.profile_hero_poster,
        youtube_hero_poster:    d?.youtube_hero_poster    || DESIGN_DEFAULTS.youtube_hero_poster,
    };
}

export function useSiteDesign() {
    const cached = (() => { try { const s = localStorage.getItem(CACHE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } })();
    const [design, setDesign] = useState(cached || DESIGN_DEFAULTS);
    const [loading, setLoading] = useState(!cached);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'site_design', 'main'), (snap) => {
            const d = snap.exists() ? snap.data() : null;
            const next = buildDesign(d);
            setDesign(next);
            setLoading(false);
            try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
        }, () => { setDesign(DESIGN_DEFAULTS); setLoading(false); });
        return () => unsub();
    }, []);

    return { design, loading };
}
