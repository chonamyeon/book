import { celebrities } from './celebrities.js';
import { adsenseBooks } from './adsense/books.js';
import adminEbooks from './generated/adminEbooks.js';
import { stripHtml } from '../utils/ebookContent.js';

const normalize = (value = '') => String(value).normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
const keyOf = (book = {}) => `${normalize(book.title)}|${normalize(book.author)}`;
const idOf = (book = {}) => book.id || normalize(book.title).replace(/\s+/g, '-');
const textScore = (book = {}) => stripHtml(book.ebookText || book.content || book.fullReview || book.review || book.desc || '').length;

const metadataById = new Map();
const metadataByKey = new Map();

for (const celebrity of celebrities) {
  for (const book of celebrity.books || []) {
    const id = idOf(book);
    const withMeta = {
      ...book,
      id,
      celebrityId: celebrity.id,
      celebrityName: celebrity.name,
    };
    metadataById.set(id, withMeta);
    metadataByKey.set(keyOf(withMeta), withMeta);
  }
}

for (const book of adsenseBooks) {
  const id = idOf(book);
  const current = metadataById.get(id) || metadataByKey.get(keyOf(book)) || {};
  const merged = { ...current, ...book, id: current.id || id };
  metadataById.set(id, merged);
  metadataByKey.set(keyOf(merged), merged);
}

const bestByKey = new Map();

for (const [id, ebook] of Object.entries(adminEbooks)) {
  const metadata = metadataById.get(id) || metadataByKey.get(keyOf(ebook)) || {};
  const book = {
    ...metadata,
    ...ebook,
    id,
    title: ebook.title || metadata.title || id,
    author: ebook.author || metadata.author || '',
    category: metadata.category || metadata.section || 'BOOK',
    desc: metadata.desc || metadata.description || '',
    cover: metadata.cover || '',
    ebookText: ebook.content,
  };
  const key = keyOf(book) || id;
  const current = bestByKey.get(key);
  if (!current || textScore(book) > textScore(current)) {
    bestByKey.set(key, book);
  }
}

export const bookInsights = Array.from(bestByKey.values()).sort((a, b) =>
  normalize(a.title).localeCompare(normalize(b.title), 'ko'),
);

export const bookInsightById = Object.fromEntries(
  bookInsights.map((book) => [idOf(book), book]),
);

export const bookInsightIds = bookInsights.map((book) => idOf(book));
