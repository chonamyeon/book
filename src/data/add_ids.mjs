import { readFileSync, writeFileSync } from 'fs';

// 34 books without IDs → assigned slugs
const ID_MAP = {
  '파운데이션':                        'foundation',
  '슈퍼인텔리전스':                    'super-intelligence',
  '은하수를 여행하는 히치하이커를 위한 안내서': 'hitchhikers-guide',
  '제로 투 원':                        'zero-to-one',
  '벤자민 프랭클린 인생의 발견':        'benjamin-franklin',
  '우리 본성의 선한 천사':              'better-angels',
  '선심초심':                          'beginner-mind',
  '혁신 기업의 딜레마':                'innovators-dilemma',
  '모비 딕':                           'moby-dick',
  '리어 왕':                           'king-lear',
  '국가는 왜 실패하는가':              'why-nations-fail',
  '약속의 땅':                         'promised-land',
  '삼체':                              'three-body-problem',
  '가라, 파수꾼이여':                  'go-set-watchman',
  '비커밍':                            'becoming',
  '언더그라운드 레일로드':             'underground-railroad',
  '내가 확실히 아는 것들':             'what-i-know-for-sure',
  '와일드':                            'wild-strayed',
  '앵무새 죽이기':                     'to-kill-a-mockingbird',
  '슈독':                              'shoe-dog',
  '파리대왕':                          'lord-of-the-flies',
  '위대한 개츠비':                     'great-gatsby',
  '연금술사':                          'the-alchemist',
  '솔로몬의 노래':                     'song-of-solomon',
  '파이 이야기':                       'life-of-pi',
  '카라마조프 가의 형제들':            'brothers-karamazov',
  '최선의 삶':                         'best-life',
  '바깥은 여름':                       'outside-summer',
  '료마가 간다':                       'ryoma-ga-yuku',
  '손정의 제곱법칙':                   'softbank-square-law',
  '남아 있는 나날':                    'remains-of-the-day',
  '어린 왕자':                         'little-prince',
  '천 개의 찬란한 태양':               'thousand-splendid-suns',
  '행동경제학':                        'behavioral-economics',
};

let src = readFileSync('./celebrities.js', 'utf8');

for (const [title, id] of Object.entries(ID_MAP)) {
  // Find book objects that have this title but no "id" field
  // Pattern: opening brace of book object, then "section" (no "id" before title)
  // We'll look for: `"title": "제목"` not preceded by `"id":` within the same object
  // Simpler: find `"title": "TITLE"` where the surrounding object has no id, add id before section

  // Replace pattern: find the title line where there's no id right above it
  // We target:  `            "section":` followed eventually by `"title": "TITLE"`
  // Actually let's insert "id" right before "title" for matching titles

  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/,/g, ',');

  // Match: line with "title": "TITLE" that is NOT preceded by "id" on the line above
  // Use a regex to find the pattern and insert id before it
  const titleLine = `"title": "${title}"`;

  // Find all occurrences of this title and add id if missing
  let pos = 0;
  while (true) {
    const idx = src.indexOf(titleLine, pos);
    if (idx === -1) break;

    // Check if "id" exists within 300 chars before this title
    const before = src.substring(Math.max(0, idx - 300), idx);
    const lastBrace = before.lastIndexOf('{');
    const segment = before.substring(lastBrace);

    if (!segment.includes('"id"')) {
      // Insert id line before the title line
      // Find the start of the title line
      const lineStart = src.lastIndexOf('\n', idx) + 1;
      const indent = src.substring(lineStart, idx); // whitespace indent
      const insertion = `"id": "${id}",\n${indent}`;
      src = src.substring(0, idx) + insertion + src.substring(idx);
    }

    pos = idx + titleLine.length + 50;
  }
}

writeFileSync('./celebrities.js', src, 'utf8');
console.log('Done! Added IDs to books in celebrities.js');

// Verify
const missingCount = Object.keys(ID_MAP).filter(title =>
  src.includes(`"title": "${title}"`) && (() => {
    let pos = 0;
    while (true) {
      const idx = src.indexOf(`"title": "${title}"`, pos);
      if (idx === -1) return false;
      const before = src.substring(Math.max(0, idx - 300), idx);
      const lastBrace = before.lastIndexOf('{');
      const segment = before.substring(lastBrace);
      if (!segment.includes('"id"')) return true;
      pos = idx + 1;
    }
  })()
).length;
console.log('Books still missing IDs:', missingCount);
