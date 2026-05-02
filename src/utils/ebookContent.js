import adminEbooks from '../data/generated/adminEbooks.js';

export const adminEbookById = adminEbooks;

export function getAdminEbook(bookId) {
  return adminEbookById[bookId] || null;
}

export function stripHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ebookTextFromRecord(record) {
  if (!record) return '';
  if (Array.isArray(record.pages)) return record.pages.join('\n\n');
  return record.content || record.ebookText || '';
}

export function resolveEbookContent(book = {}) {
  const admin = getAdminEbook(book.id);
  const adminContent = ebookTextFromRecord(admin);
  if (adminContent) return adminContent;
  return book.ebookText || book.fullReview || book.review || book.content || '';
}

export function plainTextToHtml(text = '') {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
      if (lines.length === 1 && lines[0].length < 80) {
        return `<h2>${lines[0]}</h2>`;
      }
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('\n');
}

export function ensureHtml(content = '') {
  if (!content) return '';
  return /<[a-z][\s\S]*>/i.test(content) ? content : plainTextToHtml(content);
}
