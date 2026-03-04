import { celebrities } from './celebrities';

export const getReviewText = (idOrTitle) => {
    const idMap = {
        "sapiens": "사피엔스",
        "1984": "1984",
        "demian": "데미안",
        "vegetarian": "채식주의자",
        "factfulness": "팩트풀니스",
        "almond": "아몬드",
        "leverage": "레버리지",
        "one-thing": "원씽",
        "ubermensch": "위버멘쉬",
        "sayno": "세이노의 가르침",
        "psychology": "돈의 심리학",
        "your-name": "너의 이름은",
        "property-money": "돈의 속성",
        "stoner": "스토너",
        "small-things": "이처럼 사소한 것들",
        "homo-deus": "호모 데우스",
        "gatsby": "위대한 개츠비",
        "we-do-not-part": "작별하지 않는다",
        "human-acts-hk": "소년이 온다",
        "brahms": "브람스를 좋아하세요..."
    };

    // Check if it's an ID from the map
    const titleFromId = idMap[idOrTitle];
    const targetTitle = titleFromId || idOrTitle;

    for (const celeb of celebrities) {
        // Try to match by ID first, then by title
        const book = celeb.books.find(b => b.id === idOrTitle || b.title === targetTitle);
        if (book?.review) return book.review;
        if (book?.desc) return book.desc;
    }
    return "";
};

export const getReviewLength = (idOrTitle) => {
    const review = getReviewText(idOrTitle);
    return review ? review.length : 0;
};

export const isPremium = (idOrTitle) => {
    return getReviewLength(idOrTitle) > 5000;
};

export const getBookId = (title) => {
    const reverseIdMap = {
        "사피엔스": "sapiens",
        "1984": "1984",
        "데미안": "demian",
        "채식주의자": "vegetarian",
        "팩트풀니스": "factfulness",
        "아몬드": "almond",
        "레버리지": "leverage",
        "원씽": "one-thing",
        "위버멘쉬": "ubermensch",
        "세이노의 가르침": "sayno",
        "돈의 심리학": "psychology",
        "너의 이름은": "your-name",
        "돈의 속성": "property-money",
        "스토너": "stoner",
        "이처럼 사소한 것들": "small-things",
        "호모 데우스": "homo-deus",
        "위대한 개츠비": "gatsby",
        "작별하지 않는다": "we-do-not-part",
        "소년이 온다": "human-acts-hk",
        "브람스를 좋아하세요...": "brahms"
    };

    if (reverseIdMap[title]) return reverseIdMap[title];

    for (const celeb of celebrities) {
        const book = celeb.books.find(b => b.title === title);
        if (book?.id) return book.id;
    }
    return null;
};
