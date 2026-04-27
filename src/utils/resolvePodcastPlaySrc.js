/**
 * 팟캐스트 재생 URL을 한 곳에서 결정 (Today 카드 / 출퇴근 알람 / BookCard).
 * - site_config `weekly_focus` 엔트리는 오래된 podcastFile·audioUrl을 담는 경우가 있어
 *   enrich 시 카탈로그보다 뒤에서 덮어쓰면 잘못된 TTS URL이 끼어듦.
 * - 카탈로그(publicAllBooks / getBook)에 있는 podcastFile이 있으면 항상 우선.
 * - audioPath·audioUrl(샘플/구 TTS)은 사용하지 않음 (리뷰/팟캐스트 버튼과 동일 취지).
 *
 * @param {object} book
 * @param {function(string): object|undefined|null} getCatalogBook - id -> 카탈로그(마스터) 도서
 * @returns {string|null}
 */
export function resolvePodcastPlaySrc(book, getCatalogBook) {
    if (!book) return null;
    const id = book.id || String(book.title || '').toLowerCase().replace(/\s+/g, '-');
    if (!id) return null;
    const cat = getCatalogBook ? getCatalogBook(id) : null;
    const podcastFile = (cat && cat.podcastFile) || book.podcastFile;
    return podcastFile || `/audio/${id}.mp3`;
}
