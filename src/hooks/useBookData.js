import { useState, useEffect, useCallback } from 'react';
import { availableAudio } from '../data/availableAudio';
import { adsenseBooks as staticAdsenseBooksArr } from '../data/adsense/books';
import { getAdminEbook, ebookTextFromRecord } from '../utils/ebookContent';

const STATIC_ADSENSE_MAP = Object.fromEntries(staticAdsenseBooksArr.map((b) => [b.id, b]));
const bookDedupeKey = (book = {}) =>
  `${(book.title || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()}|${(book.author || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()}`;
const textScore = (book = {}) =>
  String(book.review || book.fullReview || book.description || book.desc || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;

const CACHE_KEY = 'whiteboard_book_overrides_cache';
const EBOOKS_KEY = 'whiteboard_ebooks_cache';

const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const loadEbooksCache = () => {
  try {
    const raw = localStorage.getItem(EBOOKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const useBookData = () => {
  const [celebrities, setCelebrities] = useState([]);
  const [overrides, setOverrides] = useState(() => loadCache());
  const [ebooks, setEbooks] = useState(() => loadEbooksCache());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../data/celebrities').then((m) => {
      setCelebrities(m.celebrities || []);
      setLoading(false);
    });
  }, []);

  const getBook = useCallback(
    (bookId) => {
      const localBook = celebrities
        .flatMap((c) => c.books || [])
        .find((b) => (b.id || b.title.toLowerCase().replace(/\s+/g, '-')) === bookId);
      const normStr = (s) => s.normalize('NFC');
      const adsense = STATIC_ADSENSE_MAP[bookId];
      const override =
        overrides[bookId] ||
        Object.entries(overrides).find(([k]) => {
          const nk = normStr(k);
          const ni = normStr(bookId);
          return nk === ni || nk.endsWith('-' + ni) || nk.replace(/^[a-z]+\d+-/, '') === ni;
        })?.[1];

      if (!localBook && !override && !adsense) return null;

      const fileName = `${bookId}.mp3`;
      const koreanFileName = `${(localBook?.title || '').replace(/\s+/g, '-')}.mp3`;
      const hasAudioFile = !!(availableAudio[fileName] || availableAudio[koreanFileName]);

      const ebook = ebooks[bookId] || getAdminEbook(bookId);

      return {
        ...(localBook || {}),
        ...(override || {}),
        ...(adsense || {}),
        id: bookId,
        isAdsense: !!adsense,
        isPodcast: override?.isPodcast || localBook?.isPodcast || adsense?.isPodcast || hasAudioFile,
        cover: override?.cover || localBook?.cover || adsense?.cover,
        audioPath:
          override?.audioPath || localBook?.audioPath || adsense?.audioUrl || `/audio/${bookId}.mp3`,
        podcastScript: override?.podcastScript || adsense?.script || '',
        ebookText: ebookTextFromRecord(ebook) || null,
      };
    },
    [overrides, celebrities, ebooks],
  );

  const getAllBooks = useCallback(
    (adminMode = false) => {
      const allLocalBooks = celebrities.flatMap((celeb) =>
        (celeb.books || []).map((book) => ({
          ...book,
          celebName: celeb.name,
        })),
      );

      const normStr = (s) => s.normalize('NFC');
      const findOverride = (id) =>
        overrides[id] ||
        Object.entries(overrides).find(([k]) => {
          const nk = normStr(k);
          const ni = normStr(id);
          return nk === ni || nk.endsWith('-' + ni) || nk.replace(/^[a-z]+\d+-/, '') === ni;
        })?.[1];

      const bookMap = new Map();
      allLocalBooks.forEach((book) => {
        const id = book.id || book.title.toLowerCase().replace(/\s+/g, '-');
        const override = findOverride(id);

        if (override?.isDeleted) return;
        if (!adminMode && override?.isPublic === false) return;

        const fileName = `${id}.mp3`;
        const koreanFileName = `${(book.title || '').replace(/\s+/g, '-')}.mp3`;
        const hasAudioFile = !!(availableAudio[fileName] || availableAudio[koreanFileName]);

        const ebook = ebooks[id] || getAdminEbook(id);

        const nextBook = {
          ...book,
          id,
          ...(override || {}),
          isPodcast: override?.isPodcast || book.isPodcast || hasAudioFile,
          cover: override?.cover || book.cover,
          purchaseLink: override?.purchaseLink || book.purchaseLink || '',
          coupangLink: override?.coupangLink || book.coupangLink || '',
          amazonLink: override?.amazonLink || book.amazonLink || '',
          isPublic: override?.isPublic !== undefined ? override.isPublic : true,
          ebookText: ebookTextFromRecord(ebook) || null,
        };
        const key = bookDedupeKey(nextBook) || id;
        const current = bookMap.get(key);
        if (!current || textScore(nextBook) > textScore(current)) {
          bookMap.set(key, nextBook);
        }
      });

      Object.entries(overrides).forEach(([id, data]) => {
        if (data.isDeleted) return;

        const key = bookDedupeKey(data) || id;
        if (!bookMap.has(key) && data.title && (adminMode || data.isPublic === true)) {
          const ebook = ebooks[id] || getAdminEbook(id);
          bookMap.set(key, {
            id,
            title: data.title,
            author: data.author || '',
            cover: data.cover || '',
            category: data.category || 'NOVEL',
            section: data.section || 'EDITORS_PICK',
            isPodcast: data.isPodcast || false,
            description: data.description || '',
            purchaseLink: data.purchaseLink || '',
            celebName: data.celebritySlug || '',
            audioUrl: data.audioUrl || '',
            voiceAudioUrl: data.voiceAudioUrl || '',
            ...data,
            ebookText: ebookTextFromRecord(ebook) || null,
          });
        }
      });

      Object.entries(STATIC_ADSENSE_MAP).forEach(([id, data]) => {
        const key = bookDedupeKey(data) || id;
        if (!bookMap.has(key)) {
          bookMap.set(key, {
            id,
            isAdsense: true,
            title: data.title,
            author: data.author || '',
            cover: data.cover || '',
            category: data.category || 'SELF_DEV',
            description: data.desc || data.description || '',
            isPodcast: !!(data.script || data.audioUrl),
            ...data,
            ebookText: ebookTextFromRecord(getAdminEbook(id)) || null,
          });
        } else {
          const existing = bookMap.get(key);
          const nextBook = {
            ...existing,
            ...data,
            id: existing.id || id,
            isAdsense: true,
          };
          if (textScore(nextBook) > textScore(existing)) {
            bookMap.set(key, nextBook);
          }
        }
      });

      return Array.from(bookMap.values());
    },
    [overrides, celebrities, ebooks],
  );

  return { getBook, getAllBooks, loading, overrides, ebooks };
};
