import fs from 'fs';

const existingData = fs.readFileSync('c:/Users/admin/Desktop/book/the-archive/src/data/celebrities.js', 'utf8');

// I will write all books as a single "curation" author to add to the celebrities list
const newCelebrity = {
    id: "youtube-bestsellers",
    name: "유튜브/셀럽 베스트 추천",
    role: "도서 추천 큐레이터",
    image: "/images/celebrities/youtube.jpg",
    readingNow: "역행자",
    intro: "유튜브 자기계발, 경제 채널과 유명 인플루언서들이 인생을 바꾼 책으로 가장 강력하게 추천하는 분야별 최고의 명저들을 모았습니다.",
    quote: "읽은 책이 곧 나의 미래를 결정한다.",
    books: [
        {
            id: "yeok-haeng-ja", section: "WEALTH", title: "역행자", author: "자청", 
            cover: "/images/covers/yeokhaengja.jpg",
            desc: "돈, 시간, 운명으로부터 완전한 자유를 얻는 7단계 인생 공략집.",
            review: "순리자로 살 것인가, 역행자로 살 것인가? 자수성가 청년 '자청'이 제안하는 무자본 연쇄 창업과 마인드 리셋의 정수입니다.",
            source: "YouTube Top Choice", price: "17,500원", category: "자기계발", actionGuide: [{title:"자아 해체하기", description:"내 고집과 자존심을 버리고 객관적으로 나를 바라보기"}]
        },
        {
            id: "atomic-habits", section: "HABIT", title: "아주 작은 습관의 힘", author: "제임스 클리어", 
            cover: "/images/covers/atomic-habits.jpg",
            desc: "1퍼센트의 성장이 만드는 단단한 습관 복리의 마법.",
            review: "목표를 높이지 말고 시스템의 수준을 낮춰라! 삶을 자동화하고 사소한 행동을 성공으로 연결하는 전 세계적 베스트셀러.",
            source: "YouTube Top Choice", price: "16,000원", category: "자기계발", actionGuide: [{title:"환경 설계", description:"나쁜 습관은 하기 어렵게, 좋은 습관은 하기 쉽게 주변을 세팅하기"}]
        },
        {
            id: "tools-of-titans", section: "SUCCESS", title: "타이탄의 도구들", author: "팀 페리스", 
            cover: "/images/covers/titans.jpg",
            desc: "세계 최정상에 오른 1만 시간의 법칙을 깨는 혁신적 방법들.",
            review: "비범한 성취를 이룬 수백 명의 타이탄들이 매일 실천하는 사소한 디테일과 마인드셋의 총집합.",
            source: "YouTube Top Choice", price: "18,000원", category: "자기계발", actionGuide: [{title:"승리하는 아침 만들기", description:"이부자리 정리부터 명상까지 아침 루틴 확보하기"}]
        },
        {
            id: "rich-dad-poor-dad", section: "WEALTH", title: "부자 아빠 가난한 아빠", author: "로버트 기요사키", 
            cover: "/images/covers/rich-dad.jpg",
            desc: "돈과 투자의 개념을 완전히 뒤바꾼 금융 문맹 탈출 바이블.",
            review: "돈을 위해 일하지 말고 돈이 나를 위해 일하게 하라. 소득 공간을 어떻게 이동해야 하는지를 명확히 짚어줍니다.",
            source: "YouTube Top Choice", price: "15,800원", category: "경제경영", actionGuide: [{title:"자산과 부채 구분하기", description:"내 주머니에 돈을 넣어주는 자산만 사기"}]
        },
        {
            id: "guns-germs-and-steel", section: "HISTORY", title: "총, 균, 쇠", author: "재레드 다이아몬드", 
            cover: "/images/covers/guns-germs-steel.jpg",
            desc: "무기, 병균, 금속이 문명의 불평등과 권력 지도를 어떻게 바꿨는가.",
            review: "인류의 역사가 지리적 환경 차이에서 비롯되었음을 설득력 있게 증명해낸 퓰리처상 수상작.",
            source: "YouTube Top Choice", price: "28,000원", category: "역사", actionGuide: [{title:"환경적 시각 가지기", description:"현상의 원인을 개인의 능력이 아닌 구조적/환경적 차이로 넓혀서 바라보기"}]
        },
        {
            id: "how-to-win-friends", section: "MINDSET", title: "데일 카네기 인간관계론", author: "데일 카네기", 
            cover: "/images/covers/carnegie.jpg",
            desc: "시대를 초월하는 인간관계의 성공 철학이자 가장 완벽한 멘토링.",
            review: "비판하지 말고 칭찬하라. 상대방의 입장에서 생각하는 법을 다룬 절대불변의 인간관계 교과서.",
            source: "YouTube Top Choice", price: "11,500원", category: "자기계발", actionGuide: [{title:"진심으로 인정하기", description:"오늘 세 사람에게 진심을 다해 칭찬 건네기"}]
        },
        {
            id: "grit", section: "SUCCESS", title: "그릿 (GRIT)", author: "앤절라 더크워스", 
            cover: "/images/covers/grit.jpg",
            desc: "천재를 이기는 끝없는 열정과 끈기의 힘.",
            review: "재능보다 중요한 것은 넘어졌을 때 다시 일어나는 투지와 집념이라는 사실을 수많은 연구로 증명합니다.",
            source: "YouTube Top Choice", price: "16,000원", category: "자기계발", actionGuide: [{title:"작은 목표부터 끝내기", description:"포기하지 않고 끝까지 마무리를 짓는 경험 쌓기"}]
        },
        {
            id: "miracle-morning", section: "HABIT", title: "미라클 모닝", author: "할 엘로드", 
            cover: "/images/covers/miracle-morning.jpg",
            desc: "하루를 바꾸고 인생을 기적처럼 변화시키는 아침 의식.",
            review: "침묵, 확언, 시각화, 운동, 독서, 기록의 6가지 '라이프 세이버'로 아침을 혁명적으로 바꾸는 책.",
            source: "YouTube Top Choice", price: "13,500원", category: "자기계발", actionGuide: [{title:"10분 일찍 일어나기", description:"기존 기상 시간보다 10분 일찍 일어나 확언 외치기"}]
        },
        {
            id: "mindset", section: "MINDSET", title: "마인드셋", author: "캐럴 드웩", 
            cover: "/images/covers/mindset.jpg",
            desc: "무엇이든 배울 수 있고 변할 수 있다는 성장을 이끄는 믿음.",
            review: "고정 마인드셋을 버리고 성장 마인드셋을 장착할 때 우리 한계는 무한히 확장됨을 역설합니다.",
            source: "YouTube Top Choice", price: "17,000원", category: "자기계발", actionGuide: [{title:"'아직'이라는 단어 쓰기", description:"못한다가 아니라 '아직' 배우는 중이라고 말하기"}]
        },
        {
            id: "think-and-grow-rich", section: "WEALTH", title: "생각하라 그리고 부자가 되어라", author: "나폴레온 힐", 
            cover: "/images/covers/think-rich.jpg",
            desc: "성공을 위한 위대한 철학, 잠재의식을 활용하여 부를 끌어당기는 법.",
            review: "소망을 현실로 만드는 강력한 신념과 끈기의 중요성, 그리고 명확한 목표 설정의 기적을 증명합니다.",
            source: "YouTube Top Choice", price: "15,000원", category: "경제경영", actionGuide: [{title:"목표 선언문 작성", description:"구체적인 돈의 액수와 시한을 적고 매일 아침저녁 낭독하기"}]
        },
        {
            id: "outliers", section: "SUCCESS", title: "아웃라이어", author: "말콤 글래드웰", 
            cover: "/images/covers/outliers.jpg",
            desc: "성공의 기회를 발견한 사람들의 비밀, 1만 시간의 법칙.",
            review: "천재는 태어나는 것이 아니라 만들어지며, 환경적 요인과 축적된 시간의 놀라운 상관관계를 탐구합니다.",
            source: "YouTube Top Choice", price: "16,000원", category: "자기계발", actionGuide: [{title:"시간 가계부 쓰기", description:"매일 내 전문성 향상에 몇 시간을 쓰고 있는지 추적하기"}]
        },
        {
            id: "7-habits", section: "SUCCESS", title: "성공하는 사람들의 7가지 습관", author: "스티븐 코비", 
            cover: "/images/covers/7-habits.jpg",
            desc: "개인과 조직을 성공으로 이끄는 강력하고 보편적인 영원한 바이블.",
            review: "주도성, 끝을 생각하며 시작하기, 소중한 것을 먼저 하기 등 자기 혁신과 타인과의 상호 의존성을 배웁니다.",
            source: "YouTube Top Choice", price: "19,800원", category: "자기계발", actionGuide: [{title:"주도성 발휘하기", description:"자극과 반응 사이의 공간에서 나의 선택 자각하기"}]
        },
        {
            id: "essentialism", section: "MINDSET", title: "에센셜리즘", author: "그렉 맥커운", 
            cover: "/images/covers/essentialism.jpg",
            desc: "더 적게, 하지만 더 낫게! 본질에 집중하는 힘.",
            review: "모든 것을 하려는 욕심을 버리고 오직 내 삶에서 가장 핵심적인 소수에게만 헌신하는 방법을 가르칩니다.",
            source: "YouTube Top Choice", price: "16,800원", category: "자기계발", actionGuide: [{title:"강력한 '거절' 연습", description:"본질적이지 않은 요청에는 부드럽고 단호하게 'No'라고 말하기"}]
        },
        {
            id: "give-and-take", section: "SUCCESS", title: "기브 앤 테이크", author: "애덤 그랜트", 
            cover: "/images/covers/give-and-take.jpg",
            desc: "승자 독식의 착각을 깨는, 주는 사람이 결국 성공하는 이유.",
            review: "이기적인 테이커가 아닌 전략적인 기버들이 결국 사회의 거대한 성공 사다리 꼭대기에 서는 비밀.",
            source: "YouTube Top Choice", price: "18,000원", category: "자기계발", actionGuide: [{title:"5분 헌신", description:"타인을 위해 아무런 조건 없이 5분간 도움이나 지식 나누기"}]
        },
        {
            id: "the-secret", section: "MINDSET", title: "시크릿", author: "론다 번", 
            cover: "/images/covers/secret.jpg",
            desc: "수 세기 동안 소수만이 알고 있던 '끌어당김의 법칙'의 비밀.",
            review: "우리의 생각은 현실을 창조하며, 긍정적인 생각과 에너지가 어떻게 부, 건강, 행복을 유입시키는가.",
            source: "YouTube Top Choice", price: "15,800원", category: "자기계발", actionGuide: [{title:"감사 일기 쓰기", description:"이미 이룬 것처럼 구체적이고 생생하게 상상하며 감사하기"}]
        },
        {
            id: "4-hour-workweek", section: "WEALTH", title: "나는 4시간만 일한다", author: "팀 페리스", 
            cover: "/images/covers/4hour.jpg",
            desc: "아웃소싱과 자동화를 통한 뉴리치(New Rich)의 시간적, 장소적 자유.",
            review: "시간=돈의 공식을 끊어내고 미니 은퇴를 즐기며 인생의 통제권을 완전히 되찾는 실질적인 가이드.",
            source: "YouTube Top Choice", price: "17,000원", category: "경제경영", actionGuide: [{title:"정보 다이어트", description:"불필요한 뉴스 시청 중단 및 가장 비효율적인 업무 하나 줄이기"}]
        },
        {
            id: "fastlane", section: "WEALTH", title: "부의 추월차선", author: "엠제이 드마코", 
            cover: "/images/covers/fastlane.jpg",
            desc: "휠체어 탄 부자를 거부하고 젊어서 부와 자유를 거머쥐는 법.",
            review: "절약하고 모아서 늙어 부자가 되라는 기존의 상식을 부수고, 사업 시스템을 통해 폭발적인 부를 창출하라는 일침.",
            source: "YouTube Top Choice", price: "16,500원", category: "경제경영", actionGuide: [{title:"생산자 마인드셋", description:"물건을 소비하는 관점에서 그것을 제공하는 관점으로 생각 전환하기"}]
        },
        {
            id: "money-vessel", section: "WEALTH", title: "부자의 그릇", author: "이즈미 마사토", 
            cover: "/images/covers/money-vessel.jpg",
            desc: "스토리텔링 형식으로 배우는 돈을 다루는 능력과 마음가짐.",
            review: "돈을 대하는 태도, 빚에 대한 두려움 극복, 그리고 내 돈의 그릇 크기를 늘려야 큰 돈이 담길 수 있다는 철학.",
            source: "YouTube Top Choice", price: "15,000원", category: "경제경영", actionGuide: [{title:"현재 돈의 그릇 파악하기", description:"투자/지출에 대한 나의 불안 지수를 객관적으로 체크하기"}]
        },
        {
            id: "richest-man-in-babylon", section: "WEALTH", title: "바빌론 부자들의 돈 버는 지혜", author: "조지 S. 클레이슨", 
            cover: "/images/covers/babylon.jpg",
            desc: "가장 오래되고 역사적으로 증명된 고대 바빌론 부자들의 법칙.",
            review: "수입의 1할을 먼저 저축하라, 돈이 나를 위해 일하게 하라. 아주 기초적이지만 단 한 번도 변하지 않은 절대 진리.",
            source: "YouTube Top Choice", price: "14,500원", category: "경제경영", actionGuide: [{title:"선저축 후지출", description:"월급이 들어오면 무조건 10%를 떼어 강제로 모으기"}]
        },
        {
            id: "millionaire-next-door", section: "WEALTH", title: "이웃집 백만장자", author: "토머스 J. 스탠리", 
            cover: "/images/covers/millionaire-next-door.jpg",
            desc: "화려한 부자의 이미지를 깨부수는, 진짜 부자들의 검소한 라이프 스타일.",
            review: "진짜 부자들은 화려한 외제차나 명품을 사지 않는다. 축적형 부자들의 자산 관리와 삶의 태도를 낱낱이 파헤친다.",
            source: "YouTube Top Choice", price: "18,000원", category: "경제경영", actionGuide: [{title:"지출 통제하기", description:"내 자산 대비 '부유함 과시 비용'이 얼마나 되는지 점검하기"}]
        },
        {
            id: "secret-of-thought", section: "WEALTH", title: "생각의 비밀", author: "김승호", 
            cover: "/images/covers/secret-thought.jpg",
            desc: "김승호 회장이 말하는 성공할 수밖에 없는 부자들의 생각법.",
            review: "기적을 부르는 생각의 힘, 작은 돈을 소중히 여기는 태도, 그리고 목표를 100일간 100번 쓰는 실천력의 가치.",
            source: "YouTube Top Choice", price: "15,800원", category: "자기계발", actionGuide: [{title:"100번 쓰기", description:"가장 절실한 목표 1개를 정하고 매일 100일 동안 손으로 쓰기"}]
        },
        {
            id: "millionaire-mind", section: "MINDSET", title: "백만장자 시크릿", author: "하브 에커", 
            cover: "/images/covers/millionaire-mind.jpg",
            desc: "부를 끌어당기는 내면의 무의식적 마인드 세팅과 '돈의 청사진'.",
            review: "당신의 경제 상태는 당신 내면의 거울이다. 마음속 깊이 박힌 돈에 대한 부정적 인식을 뜯어고치는 명저.",
            source: "YouTube Top Choice", price: "16,500원", category: "자기계발", actionGuide: [{title:"부자 선언하기", description:"나는 백만장자의 마인드를 가졌다고 긍정적 자기 암시하기"}]
        },
        {
            id: "fire-era", section: "WEALTH", title: "파이어 시대", author: "강환국", 
            cover: "/images/covers/fire.jpg",
            desc: "조기 은퇴를 준비하고 경제적 탈출을 꿈꾸는 한국형 파이어족 메뉴얼.",
            review: "극한의 절약, 자산 배분 투자 추월차선을 통해 남들보다 10년, 20년 일찍 경제적 자유를 이루는 현실적 방법론.",
            source: "YouTube Top Choice", price: "17,000원", category: "경제경영", actionGuide: [{title:"파이어 목표액 산정", description:"연간 생활비의 25배를 계산해 경제적 자유의 구체적 타겟 정하기"}]
        },
        {
            id: "latte-factor", section: "WEALTH", title: "가장 먼저 부자되는 법", author: "데이비드 바흐", 
            cover: "/images/covers/latte-factor.jpg",
            desc: "의식하지도 못하게 새어나가는 푼돈, '라떼 요인'의 기적.",
            review: "자신을 위해 먼저 적은 금액이라도 자동으로 투자되게 설정하라. 작은 행동 하나가 인생 후반의 막대한 자산을 만든다.",
            source: "YouTube Top Choice", price: "14,000원", category: "경제경영", actionGuide: [{title:"자동 이체 투자", description:"급여일 당일, 자동이체를 통해 나를 위한 자산에 우선 투자하기"}]
        },
        {
            id: "capitalism-ebs", section: "ECONOMY", title: "자본주의", author: "EBS 자본주의 제작팀", 
            cover: "/images/covers/capitalism.jpg",
            desc: "우리가 살고 있는 이 자본주의 시스템이 굴러가는 뼈대와 작동 원리.",
            review: "돈은 어떻게 만들어지는가? 빚 없이 자본주의는 유지될 수 없는 구조적 진실과 생존을 위한 금융 지식을 아주 쉽게 설명한다.",
            source: "YouTube Top Choice", price: "18,000원", category: "경제경영", actionGuide: [{title:"금융 맹점 체크", description:"내가 가입한 펀드나 보험의 구조와 수수료를 다시 한번 살펴보기"}]
        },
        // --- 경제 ---
        {
            id: "economy-3years", section: "ECONOMY", title: "앞으로 3년 경제전쟁의 미래", author: "오건영", 
            cover: "/images/covers/economy-3years.jpg",
            desc: "인플레이션, 환율, 금리의 삼각형으로 읽는 거시경제 흐름.",
            review: "각국 중앙은행의 딜레마와 금리의 방향, 환율 변동이 어떻게 우리 주머니에 직격탄을 날리는지 알려주는 필독 경제서.",
            source: "YouTube Top Choice", price: "18,800원", category: "경제경영", actionGuide: [{title:"매일 금리 지표 체크", description:"미국채 금리와 원달러 환율 흐름을 관찰하는 습관 들이기"}]
        },
        {
            id: "history-of-money", section: "HISTORY", title: "돈의 역사", author: "홍춘욱", 
            cover: "/images/covers/history-money.jpg",
            desc: "돈의 관점에서 세계의 패권이 어떻게 이동해왔는가.",
            review: "가장 강력한 국가의 흥망성쇠 뒤에는 경제력과 화폐 권력이 있었다. 세계사를 통해 경제의 미래를 읽어내는 통찰.",
            source: "YouTube Top Choice", price: "17,500원", category: "경제경영", actionGuide: [{title:"역사적 시각 접근", description:"현대의 경제 뉴스 속에서 과거와 비슷한 패턴 찾아보기"}]
        },
        {
            id: "undercover-economist", section: "ECONOMY", title: "경제학 콘서트", author: "팀 하포드", 
            cover: "/images/covers/undercover.jpg",
            desc: "커피 한 잔 가격에 숨겨진 차액지대와 일상 속에 숨겨진 경제학 원리.",
            review: "할인 마트의 가격 정책부터 주택 난까지, 일상을 움직이는 수요와 공급, 정보의 비대칭성을 유쾌하게 풀어낸다.",
            source: "YouTube Top Choice", price: "16,000원", category: "경제경영", actionGuide: [{title:"가격 차별 구조 찾기", description:"스타벅스나 영화관에서 소비자 잉여를 착취하는 가격 구조 관전하기"}]
        },
        {
            id: "wealth-humanities", section: "ECONOMY", title: "부의 인문학", author: "브라운스톤", 
            cover: "/images/covers/wealth-humanities.jpg",
            desc: "위대한 투자 거인들과 철학자들의 시선으로 현대 시장을 꿰뚫기.",
            review: "직관에 의존하는 투자가 아닌, 인문학과 역사가 검증한 거시적인 관점에서 입지와 가치 평가를 내리는 법.",
            source: "YouTube Top Choice", price: "16,800원", category: "경제경영", actionGuide: [{title:"거인의 어깨 빌리기", description:"거시적 파도에 맞서지 말고 기본 가치 위에 머문다는 철학 새기기"}]
        },
        {
            id: "nudge", section: "ECONOMY", title: "넛지", author: "리처드 탈러", 
            cover: "/images/covers/nudge.jpg",
            desc: "타인의 선택을 유도하는 똑똑하고 부드러운 개입, 행동경제학의 정수.",
            review: "인간의 심리와 휴리스틱 오류를 이용해 강압 없이 사람들을 더 나은 선택으로 유도하는 놀라운 메커니즘.",
            source: "YouTube Top Choice", price: "19,800원", category: "경제/비즈니스", actionGuide: [{title:"넛지 디자인하기", description:"내 삶의 좋은 습관을 위해 넛지 요소(알람, 배치)를 주변에 설정하기"}]
        },
        {
            id: "wealth-of-nations", section: "ECONOMY", title: "국부론", author: "애덤 스미스", 
            cover: "/images/covers/wealth-of-nations.jpg",
            desc: "보이지 않는 손과 분업, 자본주의의 근간을 세운 고전 중의 고전.",
            review: "인간의 이기심이 어떻게 사회 전체의 부를 창출하는지, 원초적 경제 원형과 자본주의 뿌리를 살핀다.",
            source: "YouTube Top Choice", price: "25,000원", category: "인문/경제", actionGuide: [{title:"시장 원리 이해", description:"개인의 이익 추구가 공공의 이익이 되는 현상을 일상에서 통찰하기"}]
        },
        {
            id: "financial-scenario", section: "ECONOMY", title: "부의 시나리오", author: "오건영", 
            cover: "/images/covers/scenario.jpg",
            desc: "금리와 환율을 통해 앞으로 다가올 충격과 기회라는 징후를 읽다.",
            review: "변동성이 지배하는 글로벌 시장에서 4가지 성장-물가 시나리오를 통해 자산 배분의 나침반을 제공한다.",
            source: "YouTube Top Choice", price: "18,000원", category: "경제경영", actionGuide: [{title:"시나리오 자산 배치", description:"금리/물가 상승락 시나리오에 대비하여 내 자산을 사분면으로 분산하기"}]
        },
        {
            id: "behavioral-econ", section: "ECONOMY", title: "행동경제학", author: "리처드 탈러", 
            cover: "/images/covers/behavioral.jpg",
            desc: "인간은 결코 합리적이지 않다, 비합리적 선택을 분석하는 새로운 경제 모형.",
            review: "기존 주류 경제학의 호모 에코노미쿠스 가정을 박살내고, 편향으로 가득 찬 인간의 민낯을 드러낸다.",
            source: "YouTube Top Choice", price: "17,500원", category: "경제경영", actionGuide: [{title:"프레이밍 효과 역이용", description:"물건 구매 전, 할인율의 착시에서 벗어나 절대 금액을 따져보기"}]
        },
        // --- 경영 ---
        {
            id: "lean-startup", section: "BUSINESS", title: "린 스타트업", author: "에릭 리스", 
            cover: "/images/covers/lean.jpg",
            desc: "낭비를 없애고 혁신적 비즈니스를 개척하는 실리콘밸리의 궁극적 방법론.",
            review: "최소 기능 제품(MVP)을 출시하고 측정과 학습(Build-Measure-Learn)의 피드백 루프를 가장 빠르게 돌려 성장하는 법.",
            source: "YouTube Top Choice", price: "18,000원", category: "경영/비즈니스", actionGuide: [{title:"가설 시뮬레이션", description:"아이디어를 처음부터 완벽하게 만들지 말고 최소 시간만 들여 테스트해보기"}]
        },
        {
            id: "principles", section: "BUSINESS", title: "원칙 (Principles)", author: "레이 달리오", 
            cover: "/images/covers/principles.jpg",
            desc: "세계 최고 헤지펀드 매니저의 투명성에 기반한 삶과 경영 철학.",
            review: "실패에서 찾은 원칙들을 알고리즘화하여 무자비한 현실 직시와 극단적 투명성을 조직에 적용시킨 궤적.",
            source: "YouTube Top Choice", price: "24,000원", category: "경영/경제", actionGuide: [{title:"나만의 원칙 리스트화", description:"실패하거나 실수했을 때 얻은 교훈을 기록하고 나만의 프로토콜 만들기"}]
        },
        {
            id: "drucker-manager", section: "BUSINESS", title: "피터 드러커의 훌륭한 관리자", author: "피터 드러커", 
            cover: "/images/covers/drucker.jpg",
            desc: "경영학의 아버지가 말하는 매니지먼트의 본질과 인간 존중의 철학.",
            review: "목표 관리와 자기 통제, 조직 구성원이 회사 안에서 어떻게 공헌해야 하는지 방향을 제시해주는 영원한 지침서.",
            source: "YouTube Top Choice", price: "16,800원", category: "경영", actionGuide: [{title:"강점에 집중하기", description:"내 팀원의 약점을 메우기보다는 강점을 극대화시킬 기회 부여하기"}]
        },
        {
            id: "steve-jobs", section: "BUSINESS", title: "스티브 잡스", author: "월터 아이작슨", 
            cover: "/images/covers/jobs.jpg",
            desc: "실리콘밸리 경영의 정수이자 혁신의 아이콘, 완벽주의자의 찬란하고 어두운 이면.",
            review: "단순함의 미학과 현실 왜곡장 콤플렉스 속에서 기술과 인문학의 교차점을 찾아낸 잡스의 공식 전기.",
            source: "YouTube Top Choice", price: "28,000원", category: "인물/경영", actionGuide: [{title:"단순함 추구하기", description:"진행 중인 기획안이나 제품에서 불필요한 기능 한 가지 과감히 쳐내기"}]
        },
        {
            id: "blue-ocean", section: "BUSINESS", title: "블루오션 전략", author: "위찬김", 
            cover: "/images/covers/blue-ocean.jpg",
            desc: "피 터지는 경쟁의 룰을 부수고 나만의 비경쟁 시장을 창출하라.",
            review: "가치 혁신을 통해 시장의 경계를 재구축하고 경쟁자를 무의미하게 만드는 뻔하지 않은 파괴적 생각.",
            source: "YouTube Top Choice", price: "18,000원", category: "경영", actionGuide: [{title:"가치 곡선 그려보기", description:"내 아이템이나 나 자신의 핵심 요소(감소/제거/증가/창출) 분석해 보기"}]
        },
        {
            id: "amoeba-mgmt", section: "BUSINESS", title: "아메바 경영", author: "이나모리 가즈오", 
            cover: "/images/covers/amoeba.jpg",
            desc: "전 직원이 스스로 경영자가 되는 기업을 살려낸 전설적 기법.",
            review: "교세라 그룹을 세계적 기업으로 만든 바탕이자 조직을 세분화하여 각자 채산성을 따지게 만드는 현장 밀착형 지혜.",
            source: "YouTube Top Choice", price: "15,000원", category: "비즈니스", actionGuide: [{title:"오너십 장착", description:"내 업무 파트를 작은 회사라고 생각하고 일일 손익 따져보기"}]
        },
        {
            id: "flywheel", section: "BUSINESS", title: "플라이휠을 돌려라", author: "짐 콜린스", 
            cover: "/images/covers/flywheel.jpg",
            desc: "아마존의 성공 비결로 불리는 '플라이휠' 모멘텀의 위대함.",
            review: "한 번에 빵 터지는 기적은 없다. 선순환의 고리를 찾아 무거운 금속 바퀴를 서서히 돌리는 자만이 위대한 돌파에 이른다.",
            source: "YouTube Top Choice", price: "16,000원", category: "경영", actionGuide: [{title:"플라이휠 설계", description:"나의 브랜딩이 작동하기 위한 순환 톱니바퀴 3단계 그려보기"}]
        },
        // --- 인문 ---
        {
            id: "jidawel", section: "PHILOSOPHY", title: "지적 대화를 위한 넓고 얕은 지식", author: "채사장", 
            cover: "/images/covers/jidawel.jpg",
            desc: "역사, 경제, 정치, 사회, 윤리를 하나의 맥락으로 관통하는 현대인의 인문학 필독서.",
            review: "방대한 인문사회 지식을 이분법의 프레임으로 직관적으로 이해시켜 세상을 바라보는 해상도를 획기적으로 높인다.",
            source: "YouTube Top Choice", price: "17,000원", category: "인문", actionGuide: [{title:"지식 융합하기", description:"정치 이슈 이면에 있는 경제적 이해관계 유추해보기"}]
        },
        {
            id: "cosmos", section: "SCIENCE", title: "코스모스", author: "칼 세이건", 
            cover: "/images/covers/cosmos.jpg",
            desc: "우주와 생명, 그리고 모래알 같은 인간의 존재를 돌아보는 위대한 과학 인문서.",
            review: "광활한 138억 년의 우주 속에서 지구라는 '창백한 푸른 점'을 아끼고, 무지에서 벗어나 경이로움으로 나아가는 안내서.",
            source: "YouTube Top Choice", price: "22,000원", category: "인문과학", actionGuide: [{title:"창백한 푸른 점 떠올리기", description:"삶이 스트레스로 다가올 때 우주적 관점에서 얼마나 사소한 일인지 환기하기"}]
        },
        {
            id: "justice", section: "PHILOSOPHY", title: "정의란 무엇인가", author: "마이클 샌델", 
            cover: "/images/covers/justice.jpg",
            desc: "전 세계를 강타한 마이클 샌델의 정의와 공동선에 대한 뜨거운 딜레마.",
            review: "공리주의, 자유지상주의, 목적론적 윤리를 오가며 과연 무엇이 옳은 가치 판단인가를 파고드는 지적 충격의 향연.",
            source: "YouTube Top Choice", price: "17,500원", category: "인문사회", actionGuide: [{title:"트롤리 딜레마 던지기", description:"내 행동의 윤리적 기준이 다수의 행복인지 절차의 공정함인지 고민하기"}]
        },
        {
            id: "selfish-gene", section: "SCIENCE", title: "이기적 유전자", author: "리처드 도킨스", 
            cover: "/images/covers/selfish-gene.jpg",
            desc: "진화론의 시각에서 인간은 유전자의 생존 기계에 불과하다.",
            review: "이기적 유전자의 무자비함 속에서도 이타성이 왜 나타나는지, 그리고 문화적 전달자 '밈(Meme)'의 개념까지 제시한 역작.",
            source: "YouTube Top Choice", price: "18,000원", category: "인문과학", actionGuide: [{title:"밈 생성기", description:"나의 생각과 이념이 유전자 너머 후대에게 전달될 가치가 있는지 돌아보기"}]
        },
        {
            id: "zarathustra", section: "PHILOSOPHY", title: "짜라투스트라는 이렇게 말했다", author: "프리드리히 니체", 
            cover: "/images/covers/zarathustra.jpg",
            desc: "신은 죽었다. 위버맨쉬와 아모르파티 철학이 춤추는 니체의 모든 것.",
            review: "구시대적 가치를 부수고 사자와 같이 자유로우며 어린아이처럼 스스로 창조하는 '극복하는 인간'을 향한 위대한 찬가.",
            source: "YouTube Top Choice", price: "16,000원", category: "철학", actionGuide: [{title:"현재 고통 사랑하기", description:"도망치지 않고 이 시련이 영원히 반복되어도 좋다고 선언할 용기 갖기"}]
        },
        {
            id: "what-is-history", section: "HISTORY", title: "역사란 무엇인가", author: "E.H. 카", 
            cover: "/images/covers/eh-carr.jpg",
            desc: "\"역사는 과거와 현재의 끊임없는 대화이다.\" 역사 인식의 기본을 세우는 고전.",
            review: "단순한 사실 관계의 나열이 아닌 사가의 주관과 시대정신이 개입된다는 것을 증명하며 판단 중심의 역사를 갈파.",
            source: "YouTube Top Choice", price: "14,000원", category: "역사철학", actionGuide: [{title:"기사의 프레임 생각하기", description:"오늘 본 뉴스를 누가 어떤 의도로 작성하였는지 비판적으로 의심해보기"}]
        },
        {
            id: "prince-machiavelli", section: "HISTORY", title: "군주론", author: "마키아벨리", 
            cover: "/images/covers/prince.jpg",
            desc: "권력의 창출과 유지에 대한 가장 현실적이고 냉철하며 비정한 처방.",
            review: "사자가 주는 공포와 여우가 주는 교활함을 동시에 지녀야 피비린내 나는 정치판에서 살아남는다는 인간 본성의 해부학.",
            source: "YouTube Top Choice", price: "13,000원", category: "정치철학", actionGuide: [{title:"여우와 사자 모드 전환", description:"직장과 협상에서 따뜻함과 동시에 단호함을 분리해서 취해보기"}]
        },
        {
            id: "on-liberty", section: "PHILOSOPHY", title: "자유론", author: "존 스튜어트 밀", 
            cover: "/images/covers/liberty.jpg",
            desc: "단 한 사람의 의견이라도 그것을 묵살할 권리는 누구에게도 없다.",
            review: "타인에게 해를 끼치지 않는 한 인간의 사상과 표현, 삶의 방식의 자유를 목숨처럼 치열하게 지킨 지성적 옹호.",
            source: "YouTube Top Choice", price: "13,500원", category: "철학", actionGuide: [{title:"반대 의견 경청", description:"나와 완전히 엇갈리는 입장의 글을 끝까지 인내를 가지고 읽어보기"}]
        },
        {
            id: "eichmann-jerusalem", section: "PHILOSOPHY", title: "예루살렘의 아이히만", author: "한나 아렌트", 
            cover: "/images/covers/eichmann.jpg",
            desc: "상관의 명령만 따랐을 뿐이라는 '악의 평범성', 생각하지 않는 것이 죄다.",
            review: "홀로코스트 전범 아이히만이 지극히 평범한 이웃이라는 충격 속에서, 비판적 사유의 부재가 괴물을 만든다는 경고.",
            source: "YouTube Top Choice", price: "16,000원", category: "철학", actionGuide: [{title:"왜 해야 하는가 묻기", description:"관행처럼 내려온 일상의 지시에 대해 '과연 옳은가' 한번 더 생각하기"}]
        },
        // --- 심리 ---
        {
            id: "courage-to-disliked", section: "MINDSET", title: "미움받을 용기", author: "기시미 이치로", 
            cover: "/images/covers/courage.jpg",
            desc: "아들러 심리학이 알려주는, 타인의 불편한 시선에서 완벽하게 해방되는 법.",
            review: "트라우마를 부정하고 과제의 분리를 통해 지금 당장 내 삶의 만족과 온전한 행복을 선언하는 위대한 용기.",
            source: "YouTube Top Choice", price: "15,800원", category: "심리", actionGuide: [{title:"과제의 분리", description:"타인이 나를 어떻게 평가할지는 타인의 과제라고 선을 긋기"}]
        },
        {
            id: "frame-psychology", section: "MINDSET", title: "프레임", author: "최인철", 
            cover: "/images/covers/frame.jpg",
            desc: "세상을 바라보는 창, 내 창을 어떻게 바꾸느냐가 삶을 결정한다.",
            review: "상황 프레임, 이름 짓기 프레임의 놀라운 힘을 파헤치며 지혜로운 삶을 살기 위해 어떤 관점 혁명이 필요한가.",
            source: "YouTube Top Choice", price: "16,000원", category: "심리", actionGuide: [{title:"접근 프레임 장착", description:"문제 발생 시 회피보다는 성장의 기회라는 이름으로 프레임 리셋하기"}]
        },
        {
            id: "influence", section: "MINDSET", title: "설득의 심리학", author: "로버트 치알디니", 
            cover: "/images/covers/influence.jpg",
            desc: "내가 원하지 않아도 스피커를 사게 되는 6가지 불변의 법칙.",
            review: "상호성, 권위, 희귀성, 호감 등 상대방을 내 편으로 엮고 예스(YES)를 이끌어내는 압도적인 인간 심리 트릭 해부.",
            source: "YouTube Top Choice", price: "18,000원", category: "심리", actionGuide: [{title:"'왜냐하면' 법칙 적용", description:"누군가에게 부탁할 때 사소하더라도 구체적으로 이유를 갖다붙이기"}]
        },
        {
            id: "thinking-fast-slow", section: "MINDSET", title: "생각, 빠르고 느리게", author: "대니얼 카너먼", 
            cover: "/images/covers/fast-slow.jpg",
            desc: "직관적 시스템1 구조와 이성적 시스템2 사고가 벌이는 치열한 두뇌 게임.",
            review: "노벨경제학상 수상자의 평생의 통찰. 직관의 맹점을 깨닫고 언제 충동을 잠재우고 논리를 켜야 하는지에 관한 해법.",
            source: "YouTube Top Choice", price: "24,000원", category: "행동심리학", actionGuide: [{title:"시스템 2 강제 개입", description:"중요한 결정 전, 하룻밤 묵히고 천천히 이성적으로 두 가지 손익계산 해보기"}]
        },
        {
            id: "resilience", section: "HEALING", title: "회복탄력성", author: "김주환", 
            cover: "/images/covers/resilience.jpg",
            desc: "바닥까지 떨어진 시련을 행운과 성장의 밑거름으로 바꾸는 유쾌한 내면 훈련.",
            review: "고난은 벽이 아니라 도약의 발판이다. 자기 조절 능력과 대인관계 능력으로 상처를 웃으며 튕겨내는 마음 근력.",
            source: "YouTube Top Choice", price: "16,000원", category: "심리", actionGuide: [{title:"장점 재발견", description:"내 약점을 집요하게 파는 대신 나의 가장 강력한 장점 한 가지를 발휘하기"}]
        },
        {
            id: "you-are-right", section: "HEALING", title: "당신이 옳다", author: "정혜신", 
            cover: "/images/covers/you-are-right.jpg",
            desc: "모든 마음의 상처를 치유하는 한 마디, 온전하고 전폭적인 공감의 힘.",
            review: "충고, 기만, 분석은 접어라. 사람을 살리는 건 조건 지우지 않은 심리적 CPR, '당신이 무슨 일을 했든 옳다'는 공감뿐이다.",
            source: "YouTube Top Choice", price: "15,000원", category: "심리/상담", actionGuide: [{title:"존재 자체에 공감", description:"가족이나 친구가 화낼 때 '너는 틀렸어'가 아니라 '감정과 마음'을 먼저 수용해주기"}]
        },
        {
            id: "laws-of-nature", section: "MINDSET", title: "인간 본성의 법칙", author: "로버트 그린", 
            cover: "/images/covers/human-nature.jpg",
            desc: "타인과 나의 본성을 꿰뚫어보는 심층 심리, 인간관계 게임의 궁극적 무기.",
            review: "역사적 인물들을 해부하여 시기심, 분노, 자기도취 등 우리 안에 똬리 튼 어두운 본질을 인정하고 통제하는 위대한 전략.",
            source: "YouTube Top Choice", price: "32,000원", category: "심리/처세", actionGuide: [{title:"감정의 분리", description:"누군가의 비난에 즉각 반응하지 말고, 그 이면의 열등감과 본성을 한 걸음 물러나 관찰하기"}]
        },
        {
            id: "inner-comms", section: "HEALING", title: "내면소통", author: "김주환", 
            cover: "/images/covers/inner.jpg",
            desc: "명상과 뇌과학을 기반으로 철저하게 과학적으로 내면을 단련하는 최강의 훈련법.",
            review: "결국 모든 문제는 나와의 소통 단절이다. 전두엽을 일깨우고 편도체를 안정시켜 두려움으로부터 승리하는 마음 컨트롤.",
            source: "YouTube Top Choice", price: "24,000원", category: "심리", actionGuide: [{title:"편도체 리셋", description:"극도의 스트레스 순간에 심호흡을 3회 반복하며 신체적 긴장 먼저 오프시키기"}]
        },
        {
            id: "kluge", section: "MINDSET", title: "클루지", author: "개리 마커스", 
            cover: "/images/covers/kluge.jpg",
            desc: "진화가 남긴 설계의 부산물, 우리 뇌의 치명적인 오류를 극복하는 구체적 방법.",
            review: "완벽하지 않은 뇌의 오류인 클루지를 인지하는 것만으로 잘못된 선택과 충동을 억제하고 합리성으로 가는 길을 엽니다.",
            source: "YouTube Top Choice", price: "16,000원", category: "심리/진화론", actionGuide: [{title:"의식적 지연", description:"큰 결정 앞에서는 반드시 산책 등 거리를 두는 시간을 가지며 인지적 오류 벗어나기"}]
        },
        {
            id: "live-again", section: "HEALING", title: "만일 내가 인생을 다시 산다면", author: "김혜남", 
            cover: "/images/covers/live-again.jpg",
            desc: "파킨슨병을 안고 30년 간 정신분석의로 살아온 저자가 무거운 짐을 진 현대인들에게 주는 따스한 위로 깊은 이야기.",
            review: "완벽하려 애쓰지 마라, 조금 상처받고 삐걱거리더라도 내 삶을 온전히 향유하는 것이 인생의 유일무이한 답임을 증명합니다.",
            source: "YouTube Top Choice", price: "15,800원", category: "심리에세이", actionGuide: [{title:"결점 환대하기", description:"나의 모자란 부분을 부끄러워하지 말고 나의 매력으로 담담하게 긍정해보기"}]
        }
    ]
};

// Insert before the last closing bracket `];`
const updatedData = existingData.replace(/\];\s*$/, ',\n' + JSON.stringify(newCelebrity, null, 4) + '\n];\n');

fs.writeFileSync('c:/Users/admin/Desktop/book/the-archive/src/data/celebrities.js', updatedData, 'utf8');

console.log("Successfully appended new celebrities curation with 50+ books!");
