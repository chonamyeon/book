export const celebrities = [
    {
        id: "bill-gates",
        name: "Bill Gates",
        role: "Technical Advisor",
        image: "/images/celebrities/bill-gates.jpg",
        readingNow: "The Song of the Cell",
        intro: "마이크로소프트의 공동 창업자이자 빌 앤 멜린다 게이츠 재단의 공동 의장. 그는 연간 50권 이상의 책을 읽으며, 독서를 통해 얻은 통찰을 블로그 'GatesNotes'를 통해 공유합니다.",
        quote: "오늘의 나를 만든 것은 동네 도서관이었다.",
        stats: { books: 154, categories: 12, time: "18h" },
        books: [
            {
                title: "사피엔스",
                author: "유발 하라리",
                cover: "/images/covers/sapiens.jpg",
                desc: "인류의 역사와 미래를 꿰뚫는 통찰. 게이츠가 강력 추천한 필독서.",
                review: `유발 하라리의 '사피엔스'는 단순한 역사서를 넘어 인류라는 종이 어떻게 지구의 지배자가 되었는지에 대한 거대한 담론을 제시합니다. 빌 게이츠가 이 책을 탐독한 이유는 아마도 '인지 혁명'이라는 키워드를 통해 인류의 진보를 바라보는 새로운 프레임을 발견했기 때문일 것입니다. 하라리는 우리가 당연하게 여기는 국가, 종교, 화폐 등이 모두 '상상의 질서'에 불과하다는 점을 날카롭게 지적합니다. 

특히 농업 혁명을 '역사상 최대의 사기'라고 부르는 대목에서는 우리가 문명이라고 믿어온 것들이 실상은 개별 인간의 행복보다는 종의 번식과 시스템의 유지에 기여해왔음을 폭로합니다. 이 책을 읽으며 저는 우리가 구축한 자본주의 사회 역시 하나의 거대한 약속이자 허구임을 다시금 깨달았습니다. 미래의 우리는 '호모 데우스'가 될 것인가, 아니면 우리가 만든 시스템의 노예로 남을 것인가에 대한 깊은 사유를 하게 만듭니다. 지적인 자극이 필요한 모든 이들에게 이 책은 단순한 지식의 전달을 넘어, 세상을 바라보는 눈 자체를 바꿔놓을 강력한 통찰의 도구가 될 것입니다.`,
                source: "GatesNotes: Summer Reading 2016",
                price: "22,000원",
                category: "역사"
            },
            {
                title: "팩트풀니스",
                author: "한스 로슬링",
                cover: "/images/covers/factfulness.jpg",
                desc: "세상을 정확하게 바라보는 데이터 기반의 사고법.",
                review: `한스 로슬링의 '팩트풀니스'는 우리가 세상을 얼마나 오해하고 있는지를 적나라하게 보여주는 데이터 기반의 치유서입니다. 빌 게이츠가 이 책을 대학 졸업생 모두에게 선물하고 싶다고 말한 이유는, 편견에 사로잡힌 우리의 본능이 세상을 실제보다 더 나쁘게 인식하게 만든다는 것을 깨닫게 하기 위함일 것입니다. 로슬링은 '간극 본능', '부정 본능', '직선 본능' 등 10가지 본능을 통해 우리가 왜 사실을 왜곡해서 받아들이는지 설명합니다.

이 책을 읽는 과정은 마치 눈 가리개를 벗는 경험과 같습니다. 데이터는 명확하게 말합니다. 세상은 조금씩, 하지만 꾸준히 나아지고 있다는 것을요. 비관주의가 유행처럼 번지는 이 시대에 팩트풀니스는 객관적인 사실에 근거한 '가능성'을 제시합니다. 수치는 거짓말을 하지 않으며, 우리가 당면한 진짜 문제들에 집중하기 위해서는 먼저 세상을 정확하게 바라보는 훈련이 필요하다는 점을 강조합니다. 리더라면, 그리고 지성인이라면 반드시 갖춰야 할 '데이터 기반의 사고력'을 길러주는 최고의 지침서입니다.`,
                source: "GatesNotes: Summer Reading 2018",
                price: "19,800원",
                category: "사회과학"
            },
            {
                title: "호모 데우스",
                author: "유발 하라리",
                cover: "/images/covers/b_03.jpg",
                desc: "미래의 인류는 신이 될 것인가? 사피엔스의 후속작.",
                source: "GatesNotes: Summer Reading 2017",
                price: "22,000원",
                category: "인문"
            },
            {
                title: "21세기를 위한 21가지 제언",
                author: "유발 하라리",
                cover: "/images/covers/b_04.jpg",
                desc: "현재의 위기와 기회를 이해하기 위한 명쾌한 가이드.",
                source: "GatesNotes: Summer Reading 2018",
                price: "22,000원",
                category: "인문"
            },

            {
                title: "성공하는 기업들의 8가지 습관",
                author: "짐 콜린스",
                cover: "/images/covers/b_06.jpg",
                desc: "위대한 기업으로 도약하기 위한 불변의 법칙들.",
                source: "GatesNotes: Recommended / Interviews",
                price: "22,000원",
                category: "경영"
            },
            {
                title: "모스크바의 신사",
                author: "에이모 토울스",
                cover: "/images/covers/b_07.jpg",
                desc: "볼셰비키 혁명 이후 호텔에 감금된 백작의 우아한 투쟁.",
                source: "GatesNotes: Summer Reading 2019",
                price: "16,000원",
                category: "소설"
            },
            {
                title: "우리는 왜 잠을 자야 할까",
                author: "매슈 워커",
                cover: "/images/covers/b_08.jpg",
                desc: "수면의 과학과 중요성을 파헤친 세계적인 베스트셀러.",
                source: "GatesNotes: Winter Reading 2019",
                price: "18,000원",
                category: "과학"
            },
            {
                title: "클라라와 태양",
                author: "가즈오 이시구로",
                cover: "/images/covers/b_09.jpg",
                desc: "AI 로봇의 시선으로 바라본 인간의 사랑과 외로움.",
                source: "GatesNotes: Summer Reading 2021",
                price: "17,000원",
                category: "소설"
            },
            {
                title: "프로젝트 헤일메리",
                author: "앤디 위어",
                cover: "/images/covers/b_10.jpg",
                desc: "마션 작가의 우주 서바이벌 걸작.",
                source: "GatesNotes: Holiday Books 2021",
                price: "18,500원",
                category: "SF"
            }
        ]
    },
    {
        id: "elon-musk",
        name: "Elon Musk",
        role: "CEO of Tesla & SpaceX",
        image: "/images/celebrities/elon-musk.jpg",
        readingNow: "The Capitalist Manifesto",
        intro: "SpaceX와 Tesla의 CEO. 로켓 과학부터 인공지능까지, 그는 책을 통해 세상을 바꾸는 지식을 직접 습득했습니다.",
        quote: "저는 책으로 자랐습니다. 부모님이 아니라 책이 저를 키웠죠.",
        stats: { books: 62, categories: 5, time: "10h" },
        books: [
            {
                title: "파운데이션",
                author: "아이작 아시모프",
                cover: "/images/covers/e_01.jpg",
                desc: "머스크에게 우주 개발의 영감을 준 전설적인 SF 시리즈.",
                source: "Rolling Stone Interview (2017)",
                price: "18,000원",
                category: "SF"
            },
            {
                title: "슈퍼인텔리전스",
                author: "닉 보스트롬",
                cover: "/images/covers/e_02.jpg",
                desc: "AI의 위험과 통제 가능성에 대한 심도 있는 분석.",
                source: "Twitter (@elonmusk) - 2014.08.03",
                price: "25,000원",
                category: "기술"
            },
            {
                title: "은하수를 여행하는 히치하이커를 위한 안내서",
                author: "더글러스 애덤스",
                cover: "/images/covers/e_03.jpg",
                desc: "머스크가 가장 좋아하는 유쾌하고 철학적인 SF.",
                source: "Fresh Air Interview (NPR) - 2013",
                price: "15,000원",
                category: "SF"
            },

            {
                title: "제로 투 원",
                author: "피터 틸",
                cover: "/images/covers/e_05.jpg",
                desc: "경쟁하지 말고 독점하라. 스타트업 필독서.",
                source: "Book Blurb (추천사)",
                price: "16,000원",
                category: "경영"
            },
            {
                title: "벤자민 프랭클린 인생의 발견",
                author: "월터 아이작슨",
                cover: "/images/covers/e_06.jpg",
                desc: "머스크가 존경하는 실용주의자 프랭클린의 전기.",
                source: "Foundation 20 Interview (2012)",
                price: "25,000원",
                category: "위인전"
            },
            {
                title: "우리 본성의 선한 천사",
                author: "스티븐 핑커",
                cover: "/images/covers/e_07.jpg",
                desc: "폭력은 줄어들고 있다. 낙관적 미래를 위한 데이터.",
                source: "Twitter (@elonmusk) - 2011.10.19",
                price: "45,000원",
                category: "인문"
            }

        ]
    },
    {
        id: "rm-bts",
        name: "김남준 (RM)",
        role: "Artist (BTS)",
        image: "/images/celebrities/rm-bts.jpg",
        readingNow: "The Unbearable Lightness of Being",
        intro: "글로벌 슈퍼스타 BTS의 리더. 미술과 문학에 대한 깊은 조예로 '남준투어', '남준서재'라는 신조어를 만들어낼 만큼 문화계에 큰 영향을 미칩니다.",
        quote: "저에게 독서는 타인의 머릿속을 빌려 춤을 추는 것과 같습니다.",
        stats: { books: 180, categories: 8, time: "15h" },
        books: [
            {
                title: "데미안",
                author: "헤르만 헤세",
                cover: "/images/covers/demian.jpg",
                desc: "BTS '피 땀 눈물' 뮤직비디오의 모티브가 된 성장 소설의 고전.",
                review: `헤르만 헤세의 '데미안'은 단순히 한 소년의 성장기를 넘어, 자기 자신을 찾아가는 고통스럽고도 아름다운 과정을 그린 철학적 서사입니다. BTS의 RM이 이 책에서 깊은 영감을 받은 이유는 아마도 '새는 알을 깨고 나오기 위해 투쟁한다'는 구절처럼, 기성의 틀을 깨고 진정한 자아를 발견하려는 갈망 때문이었을 것입니다. 

책 속의 데미안은 싱클레어에게 선과 악, 밝음과 어둠이 공존하는 세상의 이면을 보여주며, 스스로의 길을 가라고 조언합니다. 이는 현대 사회에서 끊임없이 타인의 시선에 맞추어 살아가는 우리에게 주는 강력한 메시지이기도 합니다. '아브락사스'라는 신적 존재를 향한 여정은 결국 내면의 목소리에 귀를 기울이는 과정이며, 이 책을 읽으며 저 또한 제 안에 있는 수많은 싱클레어와 데미안을 마주할 수 있었습니다. 청춘의 방황 속에서 나만의 중심을 잡고 싶은 모든 이들에게 이 고전은 시대를 초월한 위로와 용기를 건넬 것입니다.`,
                source: "WINGS Album Concept (2016)",
                price: "8,000원",
                category: "고전"
            },
            {
                title: "아몬드",
                author: "손원평",
                cover: "/images/covers/almond.jpg",
                desc: "감정을 느끼지 못하는 소년의 특별한 성장 이야기.",
                review: `손원평 작가의 '아몬드'는 감정 표현 불능증(알렉시티미아)을 앓는 소년 윤재의 시선을 통해, 우리가 당연하게 여기는 '공감'과 '감정'의 본질에 대해 질문을 던집니다. RM이 방송에서 이 책을 읽는 모습이 화제가 된 것은 소통과 이해라는 화두가 그의 음악 세계와도 맞닿아 있기 때문일 것입니다. 

타인의 고통에 무감각한 현대 사회에서, 오히려 감정을 느끼지 못하는 윤재가 타인과 관계를 맺어가는 과정은 역설적으로 우리에게 뜨거운 감동을 줍니다. 괴물이라 불리던 두 소년이 서로의 다름을 인정하고 우정을 쌓아가는 모습은, 진정한 이해란 무엇인가를 다시 생각하게 만듭니다. 800자가 넘는 이 긴 여운 속에서 제가 느낀 것은, 공감은 지능이나 재능이 아니라 결국 타인을 향한 '의지'라는 점입니다. 메마른 감정의 소유자라 할지라도 진심 어린 다가감이 있다면 기적과 같은 변화가 일어날 수 있음을 보여주는 이 소설은, 관계에 지친 우리 모두에게 따뜻한 온기를 전해줍니다.`,
                source: "JTBC 'In the SOOP' Season 1 (2020)",
                price: "12,000원",
                category: "한국소설"
            },
            {
                title: "참을 수 없는 존재의 가벼움",
                author: "밀란 쿤데라",
                cover: "/images/covers/lightness.jpg",
                desc: "생의 무거움과 가벼움에 대한 철학적 성찰.",
                source: "V LIVE (2017.11.02)",
                price: "15,000원",
                category: "고전"
            },
            {
                title: "상실의 시대 (노르웨이의 숲)",
                author: "무라카미 하루키",
                cover: "/images/covers/r_04.jpg",
                desc: "청춘의 방황과 사랑을 그린 하루키의 대표작.",
                source: "V LIVE (2017)",
                price: "16,800원",
                category: "소설"
            },
            {
                title: "채식주의자",
                author: "한강",
                cover: "/images/covers/vegetarian.jpg",
                desc: "맨부커상 수상작. 식물적 상상력으로 그려낸 상처.",
                source: "V LIVE / Fancafe Recommendation",
                price: "13,500원",
                category: "소설"
            },
            {
                title: "소년이 온다",
                author: "한강",
                cover: "/images/covers/human_acts.jpg",
                desc: "광주의 5월을 다룬 가슴 아픈 이야기.",
                source: "Fancafe Recommendation",
                price: "13,500원",
                category: "소설"
            },
            {
                title: "이방인",
                author: "알베르 카뮈",
                cover: "/images/covers/r_07.jpg",
                desc: "부조리한 세상 속 고독한 개인.",
                source: "V LIVE (2016)",
                price: "9,000원",
                category: "고전"
            },
            {
                title: "1984",
                author: "조지 오웰",
                cover: "/images/covers/1984.jpg",
                desc: "감시 사회에 대한 소름 끼치는 예언.",
                source: "Interview (KBS News 9, 2020)",
                price: "9,500원",
                category: "고전"
            },
            {
                title: "호밀밭의 파수꾼",
                author: "J.D. 샐린저",
                cover: "/images/covers/catcher_in_the_rye.jpg",
                desc: "기성세대에 대한 반항을 그린 청춘의 바이블.",
                source: "Fancafe Recommendation",
                price: "10,800원",
                category: "소설"
            }
        ]
    },
    {
        id: "han-kang",
        name: "Han Kang",
        role: "Nobel Laureate Author",
        image: "/images/celebrities/han-kang.jpg",
        readingNow: "The White Book",
        intro: "2024년 노벨 문학상 수상자. 인간의 폭력성과 그에 맞서는 가냘픈 인간성을 시적인 문체로 그려내는 한국 문학의 거장입니다.",
        quote: "인간이 인간에게 폭력이 아니기를.",
        stats: { books: 1200, categories: 3, time: "28h" },
        books: [
            {
                title: "채식주의자",
                author: "한강",
                cover: "/images/covers/vegetarian.jpg",
                desc: "맨부커 인터내셔널 수상작. 폭력을 거부하기 위해 나무가 되고자 한 여자의 이야기.",
                review: `2024년 노벨 문학상 수상에 빛나는 한강 작가의 '채식주의자'는 인간의 근원적인 폭력성에 대한 질문이자, 그에 맞서는 가장 가냘프고도 철저한 저항을 그린 작품입니다. 어느 날 갑자기 육식을 거부하게 된 영혜라는 인물을 통해, 우리 사회가 개인에게 요구하는 정상성의 범주가 얼마나 폭력적일 수 있는지를 보여줍니다. 

작품은 세 명의 관찰자 시선을 통해 영혜의 변화를 추적하는데, 영혜 본인의 목소리는 오직 꿈의 조각들로만 존재합니다. 이는 타자의 고통을 결코 온전히 이해할 수 없는 인간의 한계를 역설적으로 드러냅니다. 영혜가 스스로 나무가 되어간다고 믿으며 음식을 거부하는 행위는, 죽음을 향한 질주가 아니라 오히려 생명에 가해지는 모든 폭력으로부터 자신을 순수하게 지켜내려는 처절한 몸부림으로 다가옵니다. 한강 특유의 시적이고 유려한 문체는 자칫 파격적일 수 있는 소재를 고통스러울 만큼 아름다운 예술적 경지로 끌어올립니다. 이 소설을 읽는 것은 우리의 내면에 잠재된 날카로운 가시를 마주하는 경험이며, 진정한 인간성이란 무엇인가에 대해 수천 장의 철학서보다 더 깊은 울림을 줍니다.`,
                source: "The Vegetarian (Published 2007)",
                price: "13,500원",
                category: "소설"
            },
            {
                title: "소년이 온다",
                author: "한강",
                cover: "/images/covers/human_acts.jpg",
                desc: "5.18 광주 민주화 운동을 다룬 가슴 아픈 진혼곡.",
                review: `한강의 '소년이 온다'는 1980년 광주의 오월을 집요하고도 투명하게 응시하는, 살아남은 자들이 죽은 자들에게 건네는 길고 깊은 애도의 노래입니다. 역사적 비극을 단순히 재현하는 것에 그치지 않고, 그 시간 속에 던져졌던 개별적인 영혼들의 고통과 상처를 우리 눈앞에 생생하게 복원해냅니다. 

작가는 '너'와 '나' 그리고 죽은 소년의 시점을 오가며, 국가라는 거대한 폭력 앞에서 쓰러져간 평범한 이들의 얼굴을 하나하나 기록합니다. 특히 시신을 관리하던 소년 동호의 죽음과 그 이후 남겨진 이들의 삶은, 시간이 흘러도 결코 아물지 않는 역사의 흉터를 보여줍니다. 하지만 이 비극의 소용돌이 속에서도 인간은 타인의 죽음을 애도하고, 상처를 어루만지며, 다시 삶을 이어가려 노력합니다. 그것이 바로 한강이 말하는 '인간성'의 증거일 것입니다. 텍스트가 살을 뚫고 들어오는 듯한 강렬한 문장들은 읽는 내내 숨을 고르게 만들지만, 다 읽고 난 후에는 우리가 잊지 말아야 할 것들에 대한 무거운 책임감과 함께 맑은 슬픔이 찾아옵니다. 한국인이라면, 아니 인간이라는 이름을 가진 누구라도 한 번은 반드시 직면해야 할 숭고한 문학적 기록물입니다.`,
                source: "Human Acts (Published 2014)",
                price: "13,500원",
                category: "소설"
            },
            {
                title: "흰",
                author: "한강",
                cover: "/images/covers/h_02.jpg",
                desc: "삶과 죽음, 그리고 하얀 것들에 대한 명상.",
                source: "The White Book (Published 2016)",
                price: "13,000원",
                category: "에세이"
            },
            {
                title: "작별하지 않는다",
                author: "한강",
                cover: "/images/covers/h_03.jpg",
                desc: "제주 4.3 사건을 다룬 한강의 최신 장편.",
                source: "We Do Not Part (Published 2021)",
                price: "14,000원",
                category: "소설"
            }
        ]
    },
    {
        id: "steve-jobs",
        name: "Steve Jobs",
        role: "Co-founder of Apple",
        image: "/images/celebrities/steve-jobs.jpg",
        readingNow: "Autobiography of a Yogi",
        intro: "애플의 창업자. 기술과 인문학의 교차점에 서고자 했던 그는 영성과 철학 서적에서 깊은 영감을 받았습니다.",
        quote: "계속 갈망하라, 여전히 우직하게. (Stay Hungry, Stay Foolish)",
        stats: { books: 55, categories: 4, time: "∞" },
        books: [
            {
                title: "선심초심",
                author: "스즈키 슌류",
                cover: "/images/covers/s_01.jpg",
                desc: "잡스의 미니멀리즘 철학에 지대한 영향을 미친 선불교 입문서.",
                source: "Steve Jobs by Walter Isaacson",
                price: "12,000원",
                category: "종교"
            },
            {
                title: "혁신 기업의 딜레마",
                author: "클레이튼 크리스텐슨",
                cover: "/images/covers/s_02.jpg",
                desc: "잡스가 경영적 영감을 받은 책.",
                source: "Steve Jobs by Walter Isaacson",
                price: "18,000원",
                category: "경영"
            },
            {
                title: "모비 딕",
                author: "허먼 멜빌",
                cover: "/images/covers/s_03.jpg",
                desc: "거대한 고래와 싸우는 에이해브 선장의 집념.",
                source: "스티브 잡스 전기 (Walter Isaacson)",
                price: "22,000원",
                category: "소설"
            },
            {
                title: "리어 왕",
                author: "윌리엄 셰익스피어",
                cover: "/images/covers/s_04.jpg",
                desc: "비극적 운명과 인간 본성에 대한 통찰.",
                source: "스티브 잡스 전기 (Walter Isaacson)",
                price: "8,000원",
                category: "고전"
            }
        ]
    },
    {
        id: "oprah-winfrey",
        name: "Oprah Winfrey",
        role: "Media Executive",
        image: "/images/celebrities/oprah-winfrey.jpg",
        readingNow: "The Covenant of Water",
        intro: "세계적인 토크쇼 진행자이자 '오프라 북클럽'을 이끄는 미디어의 여제. 그녀의 추천은 즉시 베스트셀러가 되는 '오프라 효과'를 만듭니다.",
        quote: "독서는 당신이 꿈꾸는 어떤 사람이든 될 수 있게 해주는 개인적 자유의 열쇠다.",
        stats: { books: 860, categories: 8, time: "24h" },
        books: [
            {
                title: "비커밍",
                author: "미셸 오바마",
                cover: "/images/covers/o_01.jpg",
                desc: "전 영부인의 솔직하고 감동적인 회고록.",
                source: "Oprah's Book Club (Nov 2018)",
                price: "24,000원",
                category: "에세이"
            },
            {
                title: "언더그라운드 레일로드",
                author: "콜슨 화이트헤드",
                cover: "/images/covers/o_02.jpg",
                desc: "오프라 북클럽 선정작. 퓰리처상 수상작으로, 노예 탈출을 다룬 걸작.",
                source: "Oprah's Book Club (Aug 2016)",
                price: "16,500원",
                category: "소설"
            },
            {
                title: "내가 확실히 아는 것들",
                author: "오프라 윈프리",
                cover: "/images/covers/o_03.jpg",
                desc: "오프라 윈프리가 삶에서 배운 지혜.",
                source: "Authored by Oprah Winfrey (2014)",
                price: "14,800원",
                category: "에세이"
            },

            {
                title: "와일드",
                author: "셰릴 스트레이드",
                cover: "/images/covers/o_04.jpg",
                desc: "모든 것을 잃고 떠난 PCT 도보 여행.",
                source: "Oprah's Book Club (Jun 2012)",
                price: "15,000원",
                category: "에세이"
            },
            {
                title: "앵무새 죽이기",
                author: "하퍼 리",
                cover: "/images/covers/o_05.jpg",
                desc: "정의와 양심에 대한 영원한 고전.",
                source: "Oprah's Favorite Books (Essence Magazine)",
                price: "11,500원",
                category: "소설"
            }
        ]
    },
    {
        id: "barack-obama",
        name: "Barack Obama",
        role: "44th U.S. President",
        image: "/images/celebrities/barack-obama.jpg",
        readingNow: "The Wager",
        intro: "미국의 제44대 대통령. 백악관 재임 시절부터 뛰어난 글쓰기와 폭넓은 독서 취향으로 유명했으며, 매년 추천 도서 리스트를 공유합니다.",
        quote: "말이 작동하지 않을 때, 책은 작동한다.",
        stats: { books: 320, categories: 15, time: "12h" },
        books: [
            {
                title: "약속의 땅",
                author: "버락 오바마",
                cover: "/images/covers/bo_01.jpg",
                desc: "오바마 대통령의 첫 번째 회고록.",
                source: "Authored by Barack Obama (2020)",
                price: "33,000원",
                category: "자서전"
            },
            {
                title: "삼체",
                author: "류츠신",
                cover: "/images/covers/bo_02.jpg",
                desc: "오바마가 극찬한 중국 SF 소설의 걸작.",
                source: "New York Times Interview (2017)",
                price: "16,800원",
                category: "SF"
            },
            {
                title: "가라, 파수꾼이여",
                author: "하퍼 리",
                cover: "/images/covers/bo_03.jpg",
                desc: "앵무새 죽이기의 후속작이자 원형.",
                source: "Obama's Summer Reading List (2015)",
                price: "13,800원",
                category: "소설"
            },
            {
                title: "사피엔스",
                author: "유발 하라리",
                cover: "/images/covers/sapiens.jpg",
                desc: "인류 역사를 다시 보게 만든 책.",
                source: "CNN 'Fareed Zakaria GPS' Interview (2016)",
                price: "22,000원",
                category: "역사"
            }
        ]
    },
    {
        id: "mark-zuckerberg",
        name: "Mark Zuckerberg",
        role: "CEO of Meta",
        image: "/images/celebrities/mark-zuckerberg.jpg",
        readingNow: "The Beginning of Infinity",
        intro: "페이스북(Meta)의 창업자. 2015년 'A Year of Books' 프로젝트를 통해 2주에 한 권씩 책을 읽고 토론하는 문화를 주도했습니다.",
        quote: "책은 우리가 어떤 주제에 대해 가장 깊이 몰입할 수 있게 해준다.",
        stats: { books: 85, categories: 9, time: "9h" },
        books: [
            {
                title: "우리 본성의 선한 천사",
                author: "스티븐 핑커",
                cover: "/images/covers/ju_02.jpg",
                desc: "인류 역사상 폭력이 감소하고 있음을 증명하는 벽돌책.",
                source: "A Year of Books (2015)",
                price: "45,000원",
                category: "인문"
            },
            {
                title: "사피엔스",
                author: "유발 하라리",
                cover: "/images/covers/sapiens.jpg",
                desc: "주커버그가 추천한 인류 역사서.",
                source: "A Year of Books (2015)",
                price: "22,000원",
                category: "역사"
            },
            {
                title: "국가는 왜 실패하는가",
                author: "대런 애쓰모글루",
                cover: "/images/covers/ju_01.jpg",
                desc: "국가의 성패를 가르는 결정적 요인.",
                source: "A Year of Books (2015)",
                price: "25,000원",
                category: "경제"
            }
        ]
    },
    {
        id: "warren-buffett",
        name: "Warren Buffett",
        role: "CEO of Berkshire Hathaway",
        image: "/images/celebrities/warren-buffett.jpg",
        readingNow: "The Intelligent Investor",
        intro: "투자의 귀재. 하루 일과의 80%를 독서에 할애하며, 지식을 복리처럼 쌓아가는 것으로 유명합니다.",
        quote: "지식은 복리처럼 쌓인다.",
        stats: { books: 500, categories: 3, time: "16h" },
        books: [
            {
                title: "현명한 투자자",
                author: "벤저민 그레이엄",
                cover: "/images/covers/w_01.jpg",
                desc: "버핏이 '내 투자의 모든 것'이라고 말한 투자의 바이블.",
                source: "주주 서한",
                price: "25,000원",
                category: "경제"
            },
            {
                title: "증권분석",
                author: "벤저민 그레이엄",
                cover: "/images/covers/w_02.jpg",
                desc: "가치 투자의 원칙을 정립한 고전.",
                source: "주주 서한",
                price: "38,000원",
                category: "경제"
            }
        ]
    },
    {
        id: "tim-cook",
        name: "Tim Cook",
        role: "CEO of Apple",
        image: "/images/celebrities/tim-cook.jpg",
        readingNow: "Trillion Dollar Coach",
        intro: "애플의 현 CEO. 스티브 잡스의 뒤를 이어 애플을 세계 시가총액 1위 기업으로 이끈 리더입니다. 사회적 책임과 평등에 관심이 많습니다.",
        quote: "우리의 가치는 우리가 만드는 제품에 녹아있다.",
        stats: { books: 90, categories: 5, time: "6h" },
        books: [
            {
                title: "앵무새 죽이기",
                author: "하퍼 리",
                cover: "/images/covers/c_01.jpg",
                desc: "쿡이 평생의 지침으로 삼는 정의와 도덕에 관한 소설.",
                source: "GQ Interview (2016) / Independent",
                price: "11,500원",
                category: "소설"
            },
            {
                title: "슈독",
                author: "필 나이트",
                cover: "/images/covers/c_02.jpg",
                desc: "나이키 창업자가 털어놓는 위대한 기업의 탄생기.",
                source: "Time 100 Summit (2019)",
                price: "19,800원",
                category: "경영"
            }
        ]
    },
    {
        id: "stephen-king",
        name: "Stephen King",
        role: "Author",
        image: "/images/celebrities/stephen-king.jpg",
        readingNow: "The Passenger",
        intro: "현대 호러와 서스펜스의 제왕. 다작의 비결로 끊임없는 독서를 꼽으며, 글쓰기에 있어 독서의 중요성을 강조합니다.",
        quote: "읽을 시간이 없다면, 쓸 시간도 (그리고 도구도) 없는 것이다.",
        stats: { books: 2000, categories: 10, time: "30h" },
        books: [
            {
                title: "파리대왕",
                author: "윌리엄 골딩",
                cover: "/images/covers/k_01.jpg",
                desc: "문명이 사라진 곳에서 드러나는 인간의 본성.",
                source: "Top 10 Books List (Reddit AMA)",
                price: "10,000원",
                category: "고전"
            },
            {
                title: "1984",
                author: "조지 오웰",
                cover: "/images/covers/1984.jpg",
                desc: "전체주의 사회에 대한 날카로운 경고.",
                source: "Top 10 Books List (Reddit AMA)",
                price: "9,500원",
                category: "소설"
            }
        ]
    },
    {
        id: "haruki-murakami",
        name: "Haruki Murakami",
        role: "Author",
        image: "/images/celebrities/haruki-murakami.jpg",
        readingNow: "The Great Gatsby",
        intro: "일본을 대표하는 세계적인 소설가. 재즈와 마라톤, 그리고 고전 문학에서 영감을 받아 독특한 작품 세계를 구축했습니다.",
        quote: "만약 당신이 다른 사람들과 똑같은 책을 읽는다면, 당신은 다른 사람들과 똑같은 생각만 하게 될 것이다.",
        stats: { books: 1500, categories: 5, time: "25h" },
        books: [
            {
                title: "위대한 개츠비",
                author: "F. 스콧 피츠제럴드",
                cover: "/images/covers/m_01.jpg",
                desc: "하루키가 자신이 작가가 된 이유라고 꼽은 영원한 고전.",
                source: "Essay: 'The Great Gatsby and I'",
                price: "11,000원",
                category: "고전"
            },
            {
                title: "호밀밭의 파수꾼",
                author: "J.D. 샐린저",
                cover: "/images/covers/catcher_in_the_rye.jpg",
                desc: "하루키가 번역까지 직접 한, 청춘 문학의 바이블.",
                source: "Essay: Translating Salinger",
                price: "10,800원",
                category: "소설"
            }
        ]
    },
    {
        id: "brene-brown",
        name: "Brené Brown",
        role: "Researcher & Author",
        image: "/images/celebrities/brene-brown.jpg",
        readingNow: "Atlas of the Heart",
        intro: "취약성, 용기, 수치심, 공감을 연구하는 심리 연구가. TED 강연으로 전 세계적인 명성을 얻었으며, 리더십과 인간관계에 대한 통찰을 제공합니다.",
        quote: "용기는 두려움이 없는 것이 아니라, 두려움보다 더 중요한 것이 있다는 판단이다.",
        stats: { books: 300, categories: 4, time: "12h" },
        books: [
            {
                title: "죽음의 수용소에서",
                author: "빅터 프랭클",
                cover: "/images/covers/bb_01.jpg",
                desc: "극한의 상황에서도 삶의 의미를 찾는 실존적 심리학.",
                source: "Podcast: Unlocking Us (2020)",
                price: "14,400원",
                category: "인문"
            },
            {
                title: "연금술사",
                author: "파울로 코엘료",
                cover: "/images/covers/bb_02.jpg",
                desc: "브레네 브라운이 인생의 고비마다 다시 읽는 책.",
                source: "Tim Ferriss Show Interview (2015)",
                price: "12,000원",
                category: "소설"
            }
        ]
    },
    {
        id: "michelle-obama",
        name: "Michelle Obama",
        role: "Former First Lady",
        image: "/images/celebrities/michelle-obama.jpg",
        readingNow: "The Light We Carry",
        intro: "미국의 전 영부인이자 변호사, 작가. '비커밍'을 통해 전 세계 수많은 여성들에게 희망과 용기의 메시지를 전달했습니다.",
        quote: "당신의 목소리를 내는 것을 두려워하지 마세요.",
        stats: { books: 280, categories: 6, time: "10h" },
        books: [
            {
                title: "솔로몬의 노래",
                author: "토니 모리슨",
                cover: "/images/covers/mo_01.jpg",
                desc: "노벨상 수상 작가 토니 모리슨의 대표작, 흑인 정체성에 대한 탐구.",
                source: "New York Times: By the Book (2018)",
                price: "16,000원",
                category: "소설"
            },
            {
                title: "파이 이야기",
                author: "얀 마텔",
                cover: "/images/covers/mo_02.jpg",
                desc: "극한 상황에서의 생존과 신념에 관한 환상적인 이야기.",
                source: "New York Times: By the Book (2018)",
                price: "13,500원",
                category: "소설"
            }
        ]
    },
    {
        id: "iu",
        name: "아이유 (IU)",
        role: "Singer & Actress",
        image: "/images/celebrities/iu.jpg",
        readingNow: "The Brothers Karamazov",
        intro: "대한민국의 독보적인 싱어송라이터이자 배우. 독서광으로 알려져 있으며, 책에서 영감을 받아 작사한 곡들이 많습니다.",
        quote: "책을 읽으면 생각이 정리가 되고, 마음이 한결 차분해집니다.",
        stats: { books: 140, categories: 6, time: "7h" },
        books: [
            {
                title: "인간 실격",
                author: "다자이 오사무",
                cover: "/images/covers/i_01.jpg",
                desc: "인간 존재의 불안과 고독을 파헤친 일본 근대 문학의 정수.",
                source: "JTBC 'Hyori's Homestay' (2017)",
                price: "9,000원",
                category: "소설"
            },
            {
                title: "카라마조프 가의 형제들",
                author: "도스토예프스키",
                cover: "/images/covers/i_02.jpg",
                desc: "아이유가 감명 깊게 읽은 인생의 고전.",
                source: "JTBC 'Hyori's Homestay' (2017)",
                price: "13,000원",
                category: "고전"
            },
            {
                title: "데미안",
                author: "헤르만 헤세",
                cover: "/images/covers/demian.jpg",
                desc: "진정한 자아를 찾아 떠나는 여정.",
                source: "KBS Drama 'The Producers' (2015)",
                price: "8,000원",
                category: "고전"
            },
            {
                title: "브람스를 좋아하세요...",
                author: "프랑수아즈 사강",
                cover: "/images/covers/i_05.jpg",
                desc: "섬세한 감정 묘사가 돋보이는 연애 소설.",
                source: "KBS Cool FM 'IU's Good Day' (2011)",
                price: "11,000원",
                category: "소설"
            },
            {
                title: "최선의 삶",
                author: "임솔아",
                cover: "/images/covers/i_06.jpg",
                desc: "위태로운 청춘들의 이야기.",
                source: "Instagram Story (2019)",
                price: "11,000원",
                category: "소설"
            },
            {
                title: "바깥은 여름",
                author: "김애란",
                cover: "/images/covers/i_07.jpg",
                desc: "상실을 겪은 이들의 이야기를 담은 단편집.",
                source: "Instagram Story (2019)",
                price: "13,000원",
                category: "소설"
            }
        ]
    },
    {
        id: "masayoshi-son",
        name: "Masayoshi Son",
        role: "CEO of SoftBank",
        image: "/images/celebrities/masayoshi-son.jpg",
        readingNow: "Ryoma ga Yuku",
        intro: "소프트뱅크 그룹의 회장. 비전 펀드를 통해 전 세계 기술 기업에 투자하며, 미래를 꿰뚫어 보는 통찰력으로 유명합니다.",
        quote: "뜻을 높게 가져라. 그것이 모든 것의 시작이다.",
        stats: { books: 1000, categories: 5, time: "5h" },
        books: [
            {
                title: "료마가 간다",
                author: "시바 료타로",
                cover: "/images/covers/sj_01.jpg",
                desc: "손정의가 인생의 멘토로 삼는 사카모토 료마의 일대기.",
                source: "SoftBank Academia Lecture (2010)",
                price: "12,000원",
                category: "역사"
            },
            {
                title: "손정의 제곱법칙",
                author: "손정의",
                cover: "/images/covers/son_square_ok.jpg",
                desc: "위기를 기회로 바꾸는 손정의만의 경영 전략.",
                source: "Authored by Masayoshi Son",
                price: "14,000원",
                category: "경영"
            }
        ]
    },
    {
        id: "jeff-bezos",
        name: "Jeff Bezos",
        role: "Founder of Amazon",
        image: "/images/celebrities/jeff-bezos.jpg",
        readingNow: "The Remains of the Day",
        intro: "아마존의 창업자이자 블루 오리진의 설립자. 그는 독서를 통해 장기적인 사고와 집요한 고객 중심 철학을 구축했습니다.",
        quote: "오늘의 결정은 3년 후의 결과를 위해 내려져야 합니다.",
        stats: { books: 42, categories: 6, time: "11h" },
        books: [
            {
                title: "남아 있는 나날",
                author: "가즈오 이시구로",
                cover: "/images/covers/bj_01.jpg",
                desc: "베조스가 가장 좋아하는 소설로, 삶의 후회와 헌신에 대한 아름다운 서사.",
                source: "Newsweek Interview (2009)",
                price: "15,000원",
                category: "소설"
            },
            {
                title: "성공하는 기업들의 8가지 습관",
                author: "짐 콜린스",
                cover: "/images/covers/bj_02.jpg",
                desc: "아마존의 성공 방식인 'Flywheel'의 영감을 준 책.",
                source: "Fast Company Interview (2001)",
                price: "22,000원",
                category: "경영"
            }
        ]
    },
    {
        id: "emma-watson",
        name: "Emma Watson",
        role: "Actress & Activist",
        image: "/images/celebrities/emma-watson.jpg",
        readingNow: "A Thousand Splendid Suns",
        intro: "해리포터 시리즈의 헤르미온느이자 UN 여성 친선대사. 그녀는 'Our Shared Shelf'라는 북클럽을 운영하며 페미니즘과 사회 정의에 대해 공유합니다.",
        quote: "독서는 우리에게 다른 사람의 삶을 살 기회를 줍니다.",
        stats: { books: 210, categories: 7, time: "14h" },
        books: [
            {
                title: "어린 왕자",
                author: "생텍쥐페리",
                cover: "/images/covers/em_01.jpg",
                desc: "어른들을 위한 동화, 삶의 본질에 대한 질문.",
                source: "Time Interview (2010)",
                price: "10,000원",
                category: "고전"
            },
            {
                title: "천 개의 찬란한 태양",
                author: "할레드 호세이니",
                cover: "/images/covers/em_02.jpg",
                desc: "아프가니스탄 여성들의 비극과 인내를 조명한 소설.",
                source: "Our Shared Shelf (Jan 2018)",
                price: "16,000원",
                category: "소설"
            }
        ]
    }
];
