// ============================================================
// 동적 추천 시스템 v2 — celebrities.js에서 전체 도서 164권 활용
// ============================================================
import { celebrities } from './celebrities';

// === 1. celebrities.js에서 고유 도서 목록 자동 추출 ===
function extractAllBooks() {
    const seen = new Map(); // title → index in books
    const books = [];

    for (const celeb of celebrities) {
        if (!celeb.books) continue;
        for (const book of celeb.books) {
            if (!book.title || !book.isPodcast) continue;
            if (seen.has(book.title)) {
                // id 있는 항목으로 업데이트
                if (book.id && !books[seen.get(book.title)].id) {
                    books[seen.get(book.title)].id = book.id;
                    if (book.podcastFile) books[seen.get(book.title)].podcastFile = book.podcastFile;
                }
                continue;
            }
            seen.set(book.title, books.length);
            books.push({
                id: book.id || '',
                title: book.title,
                author: book.author || '',
                cover: book.cover || '/images/covers/b_06.jpg',
                desc: book.desc || '',
                category: book.category || '',
                section: book.section || '',
                isPodcast: book.isPodcast || false,
                podcastFile: book.podcastFile || '',
                // 관리자 등록 전용 링크 우선 사용, 없으면 검색 URL 폴백
                coupangLink: book.coupangLink || book.purchaseLink || '',
                amazonLink: book.amazonLink || '',
                link: book.coupangLink || book.purchaseLink || `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(book.title)}&channel=relate`,
            });
        }
    }
    return books;
}

// === 2. Section/Category → 4차원 유형 자동 매핑 ===
// 각 도서는 복수 유형에 매핑될 수 있음 (가중치 배열)
const SECTION_TO_TYPE = {
    // Growth (성장/경제/경영)
    'WEALTH': { growth: 1.0, entertainment: 0.0, empathy: 0.1, mindfulness: 0.2 },
    'ECONOMY': { growth: 0.9, entertainment: 0.1, empathy: 0.1, mindfulness: 0.2 },
    'BUSINESS': { growth: 0.9, entertainment: 0.2, empathy: 0.1, mindfulness: 0.1 },
    'SUCCESS': { growth: 0.8, entertainment: 0.2, empathy: 0.1, mindfulness: 0.2 },

    // Entertainment (즐거움/모험)
    'SCIENCE': { growth: 0.3, entertainment: 0.7, empathy: 0.1, mindfulness: 0.3 },

    // Empathy (공감/감성)
    'HEALING': { growth: 0.1, entertainment: 0.1, empathy: 1.0, mindfulness: 0.5 },
    'BURNOUT': { growth: 0.2, entertainment: 0.1, empathy: 0.8, mindfulness: 0.4 },

    // Mindfulness (성찰/철학)
    'PHILOSOPHY': { growth: 0.2, entertainment: 0.1, empathy: 0.4, mindfulness: 1.0 },
    'MINDSET': { growth: 0.5, entertainment: 0.1, empathy: 0.3, mindfulness: 0.7 },
    'HABIT': { growth: 0.6, entertainment: 0.2, empathy: 0.2, mindfulness: 0.5 },
    'HISTORY': { growth: 0.4, entertainment: 0.3, empathy: 0.3, mindfulness: 0.6 },

    // General
    'GENERAL': { growth: 0.4, entertainment: 0.3, empathy: 0.4, mindfulness: 0.4 },
};

const CATEGORY_TO_TYPE = {
    '경제': { growth: 0.9, entertainment: 0.1, empathy: 0.1, mindfulness: 0.2 },
    '경영': { growth: 0.8, entertainment: 0.2, empathy: 0.2, mindfulness: 0.2 },
    '경제경영': { growth: 0.8, entertainment: 0.2, empathy: 0.1, mindfulness: 0.2 },
    '자기계발': { growth: 0.6, entertainment: 0.2, empathy: 0.3, mindfulness: 0.5 },
    '심리': { growth: 0.2, entertainment: 0.1, empathy: 0.8, mindfulness: 0.6 },
    '인문': { growth: 0.3, entertainment: 0.3, empathy: 0.5, mindfulness: 0.7 },
};

function getBookTypeScores(book) {
    const sectionScores = SECTION_TO_TYPE[book.section] || { growth: 0.3, entertainment: 0.3, empathy: 0.3, mindfulness: 0.3 };
    const categoryScores = CATEGORY_TO_TYPE[book.category] || { growth: 0.3, entertainment: 0.3, empathy: 0.3, mindfulness: 0.3 };

    // 가중 평균 (section 60%, category 40%)
    return {
        growth: sectionScores.growth * 0.6 + categoryScores.growth * 0.4,
        entertainment: sectionScores.entertainment * 0.6 + categoryScores.entertainment * 0.4,
        empathy: sectionScores.empathy * 0.6 + categoryScores.empathy * 0.4,
        mindfulness: sectionScores.mindfulness * 0.6 + categoryScores.mindfulness * 0.4,
    };
}

// === 3. 도서를 4차원 유형별로 분류 (주 유형 기준) ===
function classifyBooks(allBooks) {
    const pools = { growth: [], entertainment: [], empathy: [], mindfulness: [] };

    for (const book of allBooks) {
        const scores = getBookTypeScores(book);
        // 가장 높은 점수의 유형에 배치
        const primary = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
        pools[primary].push({ ...book, typeScores: scores });

        // 부 유형에도 교차 배치 (0.5 이상인 경우)
        Object.entries(scores).forEach(([type, score]) => {
            if (type !== primary && score >= 0.5) {
                pools[type].push({ ...book, typeScores: scores });
            }
        });
    }

    return pools;
}

// === 4. 여행지 풀 (기존 유지 — 세계 여행지는 외부 데이터 없으므로) ===
const travelPools = {
    growth: [
        { place: "실리콘밸리", country: "미국", image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=800&auto=format&fit=crop", desc: "혁신의 심장부에서 느끼는 압도적인 동기부여와 미래의 숨결" },
        { place: "뉴욕", country: "미국", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=800&auto=format&fit=crop", desc: "끊임없이 변화하고 경쟁하는 세계 경제의 중심에서의 강렬한 자극" },
        { place: "싱가포르", country: "싱가포르", image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=800&auto=format&fit=crop", desc: "완벽한 시스템과 효율성 속에서 배우는 성공적인 도시 모델" },
        { place: "베를린", country: "독일", image: "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?q=80&w=800&auto=format&fit=crop", desc: "역사의 폐허 위에서 피어난 예술과 스타트업의 자유로운 에너지" },
        { place: "두바이", country: "UAE", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800&auto=format&fit=crop", desc: "상상을 현실로 만드는 불가능 도전의 현장, 사막 위의 기적" },
        { place: "선전", country: "중국", image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=800&auto=format&fit=crop", desc: "세계 제조업의 수도에서 체감하는 압도적인 스케일의 혁신" },
        { place: "텔아비브", country: "이스라엘", image: "https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=800&auto=format&fit=crop", desc: "스타트업 네이션의 심장, 생존 본능에서 싹튼 혁신의 문화" },
        { place: "도쿄", country: "일본", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=800&auto=format&fit=crop", desc: "전통과 미래가 공존하는 세계 최대 경제 도시의 치밀한 시스템" },
        { place: "런던", country: "영국", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=800&auto=format&fit=crop", desc: "금융의 중심지이자 글로벌 비즈니스의 교차로" },
        { place: "스톡홀름", country: "스웨덴", image: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?q=80&w=800&auto=format&fit=crop", desc: "스포티파이와 이케아를 낳은 북유럽 혁신의 요람" },
    ],
    entertainment: [
        { place: "라스베이거스", country: "미국", image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=800&auto=format&fit=crop", desc: "24시간 잠들지 않는 화려한 불빛과 엔터테인먼트의 천국" },
        { place: "오사카", country: "일본", image: "https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?q=80&w=800&auto=format&fit=crop", desc: "먹고 즐기고 웃고 떠드는 오감을 만족시키는 미식과 활기의 도시" },
        { place: "바르셀로나", country: "스페인", image: "https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?q=80&w=800&auto=format&fit=crop", desc: "가우디의 상상력과 지중해의 열정이 만나는 예술적인 놀이터" },
        { place: "방콕", country: "태국", image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=800&auto=format&fit=crop", desc: "활기찬 야시장과 화려한 사원이 공존하는 배낭여행자들의 성지" },
        { place: "퀸스타운", country: "뉴질랜드", image: "https://images.unsplash.com/photo-1589802829985-817e51171b92?q=80&w=800&auto=format&fit=crop", desc: "번지점프부터 스카이다이빙까지, 심장이 뛰는 익스트림 스포츠의 수도" },
        { place: "올랜도", country: "미국", image: "https://images.unsplash.com/photo-1575089776834-8be34b8ab9b4?q=80&w=800&auto=format&fit=crop", desc: "디즈니와 유니버설이 만드는 꿈의 테마파크 왕국" },
        { place: "리우데자네이루", country: "브라질", image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=800&auto=format&fit=crop", desc: "삼바 리듬과 카니발의 열기가 넘치는 열정의 도시" },
        { place: "부다페스트", country: "헝가리", image: "https://images.unsplash.com/photo-1541343672885-9be56236302a?q=80&w=800&auto=format&fit=crop", desc: "다뉴브강 야경과 온천, 밤문화가 어우러진 동유럽의 보석" },
        { place: "아이슬란드", country: "아이슬란드", image: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?q=80&w=800&auto=format&fit=crop", desc: "오로라와 빙하, 화산이 공존하는 초현실적 대자연의 모험" },
        { place: "마라케시", country: "모로코", image: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?q=80&w=800&auto=format&fit=crop", desc: "이국적인 수크(시장), 향신료, 사하라의 매혹적인 밤" },
    ],
    empathy: [
        { place: "파리", country: "프랑스", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop", desc: "사랑과 예술이 흐르는 센강 변에서 발견하는 낭만의 정수" },
        { place: "피렌체", country: "이탈리아", image: "https://images.unsplash.com/photo-1543429258-0e0ad21f4987?q=80&w=800&auto=format&fit=crop", desc: "르네상스의 숨결이 살아있는 골목마다 느껴지는 인간에 대한 찬사" },
        { place: "치앙마이", country: "태국", image: "https://images.unsplash.com/photo-1512553267889-4f4fa81848?q=80&w=800&auto=format&fit=crop", desc: "느린 호흡으로 살아가며 현지인들과 따뜻하게 교감하는 시간" },
        { place: "프라하", country: "체코", image: "https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?q=80&w=800&auto=format&fit=crop", desc: "중세의 풍경 속에서 보헤미안의 감성을 채우는 산책" },
        { place: "산토리니", country: "그리스", image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=800&auto=format&fit=crop", desc: "파란 지붕과 하얀 벽, 눈부신 석양 아래서 나누는 깊은 대화" },
        { place: "제주도", country: "대한민국", image: "https://images.unsplash.com/photo-1579169825329-61ae4184e800?q=80&w=800&auto=format&fit=crop", desc: "바람과 돌과 바다가 만들어낸 치유의 섬, 마음의 rest area" },
        { place: "포르투", country: "포르투갈", image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?q=80&w=800&auto=format&fit=crop", desc: "아줄레주 타일 골목과 도우루강 석양, 감성 가득한 항구 도시" },
        { place: "브뤼헤", country: "벨기에", image: "https://images.unsplash.com/photo-1491557345352-5929e343eb89?q=80&w=800&auto=format&fit=crop", desc: "운하를 따라 걷는 중세 동화 같은 도시, 초콜릿 향기가 감싸는 거리" },
        { place: "루체른", country: "스위스", image: "https://images.unsplash.com/photo-1527668752968-14dc70a27c95?q=80&w=800&auto=format&fit=crop", desc: "알프스 산자락 호수 마을, 자연과 고요함이 주는 깊은 위안" },
        { place: "코펜하겐", country: "덴마크", image: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?q=80&w=800&auto=format&fit=crop", desc: "휘게(Hygge)의 본고장, 소소한 행복과 따뜻함을 체험하는 도시" },
    ],
    mindfulness: [
        { place: "우붓", country: "인도네시아 발리", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop", desc: "논밭 뷰를 바라보며 요가와 명상에 잠기는 평온한 시간" },
        { place: "리시케시", country: "인도", image: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=800&auto=format&fit=crop", desc: "갠지스강 상류, 요가의 본고장에서 찾는 영적 깨달음" },
        { place: "세도나", country: "미국", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop", desc: "붉은 사암에서 뿜어져 나오는 신비로운 볼텍스 에너지 체험" },
        { place: "할슈타트", country: "오스트리아", image: "https://images.unsplash.com/photo-1499678329028-101435549a4e?q=80&w=800&auto=format&fit=crop", desc: "호수와 산이 어우러진 그림 같은 풍경 속에서의 고요한 휴식" },
        { place: "교토", country: "일본", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop", desc: "천년의 고도, 젠 가든(Zen Garden)을 거닐며 비우는 마음" },
        { place: "부탄", country: "부탄", image: "https://images.unsplash.com/photo-1553856622-d1b352e24a4c?q=80&w=800&auto=format&fit=crop", desc: "국민행복지수 1위, 히말라야 왕국에서 경험하는 진정한 행복의 의미" },
        { place: "산티아고 순례길", country: "스페인", image: "https://images.unsplash.com/photo-1533107862482-0e6974b06ec4?q=80&w=800&auto=format&fit=crop", desc: "800km를 걸으며 나 자신을 마주하는 인생 최고의 성찰 여행" },
        { place: "라다크", country: "인도", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&auto=format&fit=crop", desc: "해발 3,500m 티벳 불교 문화권, 지구 끝에서 만나는 고요" },
        { place: "파타고니아", country: "아르헨티나", image: "https://images.unsplash.com/photo-1508181304878-89906bc10698?q=80&w=800&auto=format&fit=crop", desc: "세상 끝 대자연 앞에서 인간 존재의 겸허함을 깨닫는 경험" },
        { place: "노르웨이 피오르", country: "노르웨이", image: "https://images.unsplash.com/photo-1520769669658-f07657f5a307?q=80&w=800&auto=format&fit=crop", desc: "빙하가 깎아낸 절벽, 그 장엄한 침묵 속에서 듣는 내면의 소리" },
    ],
};

// === 5. Seeded random (일관된 셔플) ===
function seededRandom(seed) {
    let s = seed;
    return function () {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function weightedShuffle(arr, rng) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// === 6. 사용자 점수와 도서 적합도 계산 ===
function calculateRelevance(book, userProfile) {
    const bookScores = book.typeScores || getBookTypeScores(book);
    // 코사인 유사도 기반 매칭
    let dot = 0, magA = 0, magB = 0;
    const types = ['growth', 'entertainment', 'empathy', 'mindfulness'];
    for (const t of types) {
        dot += (userProfile[t] || 0) * (bookScores[t] || 0);
        magA += (userProfile[t] || 0) ** 2;
        magB += (bookScores[t] || 0) ** 2;
    }
    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude === 0 ? 0 : dot / magnitude;
}

// === 7. 메인 동적 추천 생성 함수 ===
export function generateRecommendations(scores) {
    const seed = Object.values(scores).reduce((a, b) => a * 31 + b, 7);
    const rng = seededRandom(seed);

    const typeMap = { A: 'growth', B: 'entertainment', C: 'empathy', D: 'mindfulness' };
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const primaryType = typeMap[sorted[0][0]];
    const secondaryType = typeMap[sorted[1][0]];

    // 사용자 프로필 정규화
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    const userProfile = {
        growth: (scores.A || 0) / total,
        entertainment: (scores.B || 0) / total,
        empathy: (scores.C || 0) / total,
        mindfulness: (scores.D || 0) / total,
    };

    // 전체 도서 추출 & 분류
    const allBooks = extractAllBooks();
    const bookPools = classifyBooks(allBooks);

    // 도서 적합도 계산 후 정렬
    const scoredBooks = allBooks.map(book => ({
        ...book,
        relevance: calculateRelevance(book, userProfile) + rng() * 0.15, // 약간의 랜덤 변동
    }));
    scoredBooks.sort((a, b) => b.relevance - a.relevance);

    // 중복 제거하며 상위 도서 선택
    const selectedTitles = new Set();
    const selectedBooks = [];

    // 주 유형에서 4권
    const primaryCandidates = weightedShuffle(bookPools[primaryType] || [], rng);
    for (const book of primaryCandidates) {
        if (selectedTitles.has(book.title)) continue;
        selectedTitles.add(book.title);
        selectedBooks.push(book);
        if (selectedBooks.length >= 4) break;
    }

    // 부 유형에서 1-2권
    const secondaryCandidates = weightedShuffle(bookPools[secondaryType] || [], rng);
    let secondaryCount = 0;
    for (const book of secondaryCandidates) {
        if (selectedTitles.has(book.title)) continue;
        selectedTitles.add(book.title);
        selectedBooks.push(book);
        secondaryCount++;
        if (secondaryCount >= 2) break;
    }

    // 적합도 기반으로 나머지 채우기 (최소 7권, 최대 8권)
    for (const book of scoredBooks) {
        if (selectedBooks.length >= 8) break;
        if (selectedTitles.has(book.title)) continue;
        selectedTitles.add(book.title);
        selectedBooks.push(book);
    }

    // 최종 셔플 후 5권 선택
    const finalBooks = weightedShuffle(selectedBooks, rng).slice(0, 5).map(b => ({
        id: b.id || '',
        title: b.title,
        author: b.author,
        cover: b.cover,
        desc: b.desc,
        link: b.link,
        podcastFile: b.podcastFile || '',
        isPodcast: b.isPodcast || false,
        coupangLink: b.coupangLink || '',
        amazonLink: b.amazonLink || '',
    }));

    // 여행지: 주 유형에서 4곳, 부 유형에서 1곳
    const primaryTravel = weightedShuffle(travelPools[primaryType] || [], rng).slice(0, 4);
    const secondaryTravel = weightedShuffle(travelPools[secondaryType] || [], rng).slice(0, 1);
    const allTravel = [...primaryTravel, ...secondaryTravel];

    // 설명 텍스트 동적 생성
    const bookDescOptions = {
        growth: [
            "지속적인 성장과 자기 혁신을 꿈꾸는 당신을 위한 맞춤 큐레이션",
            "실행력과 전략적 사고를 한 단계 끌어올릴 핵심 도서 모음",
            "당신의 잠재력을 극대화할 성장 로드맵 큐레이션",
            "부와 성공을 향한 전략적 독서 큐레이션",
        ],
        entertainment: [
            "일상의 지루함을 날려버릴 짜릿하고 몰입감 넘치는 이야기",
            "상상력의 날개를 활짝 펼쳐줄 서사의 보석들",
            "시간 가는 줄 모르고 빠져들 중독성 강한 스토리 셀렉션",
            "호기심을 자극하는 탐험적 독서 큐레이션",
        ],
        empathy: [
            "마음의 온기를 채워주고 깊은 위안을 건네는 치유의 책",
            "당신의 감수성과 공감 능력을 더욱 빛나게 할 감성 큐레이션",
            "지친 마음을 따뜻하게 감싸줄 공감의 도서 셀렉션",
            "번아웃을 극복하고 내면의 평화를 찾는 힐링 큐레이션",
        ],
        mindfulness: [
            "나를 지키는 단단한 지혜가 담긴 사유의 걸작들",
            "생각의 깊이를 한없이 확장시켜 줄 철학적 독서 큐레이션",
            "존재의 본질을 탐구하는 당신을 위한 지적 여정",
            "삶의 의미를 깊이 성찰하게 하는 마인드풀니스 큐레이션",
        ],
    };

    const travelDescOptions = {
        growth: [
            "성장 욕구를 자극하고 새로운 비전을 제시하는 영감의 여행지",
            "글로벌 혁신의 현장에서 미래를 체감하는 동기부여 여행",
        ],
        entertainment: [
            "도파민이 폭발하는 축제와 모험의 세계",
            "지루할 틈 없이 펼쳐지는 엔터테인먼트 천국",
        ],
        empathy: [
            "감성을 어루만지고 사람과 문화를 만나는 낭만의 여행지",
            "따뜻한 이야기와 아름다운 풍경이 공존하는 감성 충전 여행",
        ],
        mindfulness: [
            "영혼을 맑게 하고 내면에 집중하는 침묵의 성지",
            "복잡한 생각을 비우고 본질을 마주하는 사유의 여행지",
        ],
    };

    return {
        title: `당신만을 위한 맞춤 큐레이션 (Premium Collection)`,
        desc: bookDescOptions[primaryType][Math.floor(rng() * bookDescOptions[primaryType].length)],
        books: finalBooks,
        travelTitle: `AI가 선정한 맞춤 여행지 (Travel Curation)`,
        travelDesc: travelDescOptions[primaryType][Math.floor(rng() * travelDescOptions[primaryType].length)],
        travel: allTravel,
        meta: {
            totalBooksInPool: allBooks.length,
            primaryType,
            secondaryType,
            userProfile,
        },
    };
}

// 레거시 호환용 (직접 접속 시 기본값)
export const recommendations = {
    growth: generateRecommendations({ A: 8, B: 2, C: 1, D: 1 }),
    entertainment: generateRecommendations({ A: 1, B: 8, C: 2, D: 1 }),
    empathy: generateRecommendations({ A: 1, B: 2, C: 8, D: 1 }),
    mindfulness: generateRecommendations({ A: 1, B: 1, C: 2, D: 8 }),
};
