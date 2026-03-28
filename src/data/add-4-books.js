import fs from 'fs';

const filePath = 'c:/Users/admin/Desktop/book/the-archive/src/data/celebrities.js';
let data = fs.readFileSync(filePath, 'utf8');

const newBooks = [
    {
        id: "brain-desire",
        section: "WEALTH",
        isPodcast: false,
        podcastFile: "",
        title: "뇌 욕망의 비밀을 풀다",
        author: "한스 게오르크 호이젤",
        cover: "/images/covers/default_custom.jpg",
        desc: "뇌과학과 마케팅을 결합한 소비 심리학의 바이블.",
        review: "현재 이 도서에 대한 리뷰 스크립트는 준비 중입니다. 조만간 추가될 예정입니다.",
        source: "Archiview Original Production",
        price: "18,000원",
        category: "경제경영",
        actionGuide: [{ title: "소비 감정 인지하기", description: "물건을 살 때 내 안의 어떤 지배 동기가 작동했는지 5초간 생각하기" }]
    },
    {
        id: "think-again",
        section: "MINDSET",
        isPodcast: false,
        podcastFile: "",
        title: "싱크 어게인",
        author: "애덤 그랜트",
        cover: "/images/covers/default_custom.jpg",
        desc: "내 안의 확증편향을 깨고 유연한 사고로 나아가는 지혜.",
        review: "현재 이 도서에 대한 리뷰 스크립트는 준비 중입니다. 조만간 추가될 예정입니다.",
        source: "Archiview Original Production",
        price: "19,800원",
        category: "자기계발",
        actionGuide: [{ title: "내 의견 의심하기", description: "내가 철석같이 믿는 사실 하나를 골라, 반대되는 증거 찾아보기" }]
    },
    {
        id: "thinking-fast-and-slow",
        section: "MINDSET",
        isPodcast: false,
        podcastFile: "",
        title: "생각에 관한 생각",
        author: "대니얼 카너먼",
        cover: "/images/covers/default_custom.jpg",
        desc: "행동경제학의 창시자가 밝히는 두 가지 사고 시스템의 비밀.",
        review: "현재 이 도서에 대한 리뷰 스크립트는 준비 중입니다. 조만간 추가될 예정입니다.",
        source: "Archiview Original Production",
        price: "22,000원",
        category: "경제경영",
        actionGuide: [{ title: "시스템 2 작동시키기", description: "중요한 결정을 내리기 전 숫자로 계산해보거나 하룻밤 묵혀두기" }]
    },
    {
        id: "optimize-brain",
        section: "MINDSET",
        isPodcast: false,
        podcastFile: "",
        title: "당신의 뇌는 최적화를 원한다",
        author: "가바사와 시온",
        cover: "/images/covers/default_custom.jpg",
        desc: "뇌내 물질들을 조절하여 최고의 성과를 끌어내는 실전 뇌과학.",
        review: "현재 이 도서에 대한 리뷰 스크립트는 준비 중입니다. 조만간 추가될 예정입니다.",
        source: "Archiview Original Production",
        price: "15,000원",
        category: "자기계발",
        actionGuide: [{ title: "도파민 보상 주기", description: "작은 목표를 달성할 때마다 스스로에게 기분 좋은 보상 주기" }]
    }
];

let targetIndex = data.indexOf('"id": "archiview-editor"');

if (targetIndex !== -1) {
    let booksIndex = data.indexOf('"books": [', targetIndex);
    if (booksIndex !== -1) {
        let insertPos = booksIndex + '"books": ['.length;
        let newBooksString = "\n";
        newBooks.forEach(b => {
             newBooksString += `            ${JSON.stringify(b, null, 4).replace(/\n/g, '\n            ')},\n`;
        });
        
        const newData = data.slice(0, insertPos) + newBooksString + data.slice(insertPos);
        fs.writeFileSync(filePath, newData, 'utf8');
        console.log("Books successfully added to archiview-editor in celebrities.js");
    } else {
        console.log("Could not find books array for archiview-editor");
    }
} else {
    console.log("Could not find archiview-editor");
}
