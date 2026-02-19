export const resultData = {
    growth: {
        persona: "전략적 비저너리",
        subtitle: "성장 지향적 리더 유형",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80", // Professional male
        metrics: {
            wpm: { value: 450, change: "+25%", label: "분당 단어 수" },
            accuracy: { value: "92%", rank: "상위 8%", label: "정확도" },
            retention: { value: "High", rank: "우수", label: "적용력" }
        },
        summary: "당신은 책을 단순한 읽을거리가 아닌, 삶을 변화시키는 도구로 활용합니다. 핵심 정보를 빠르게 추출하고 이를 실제 행동으로 옮기는 데 탁월한 능력을 발휘합니다.",
        radarChart: {
            // Points for SVG polygon (approximate)
            points: "50,10 90,30 85,70 50,85 15,65 20,35" // Balanced High
        },
        bigData: {
            load: {
                percentile: "상위 3.5%",
                rank: "Rank: 1,752 / 50,214",
                score: "92.4",
                avg: "45.2",
                desc: "해석: 목표 지향적인 독서 패턴으로 인해 필요한 정보를 선별적으로 처리하는 효율성이 극대화되어 있습니다. 불필요한 정보는 과감히 건너뛰는 '선택적 집중' 능력이 탁월합니다."
            },
            inference: {
                percentile: "상위 1.2%",
                rank: "Rank: 602 / 50,214",
                score: "98.8",
                avg: "52.0",
                desc: "해석: 텍스트 이면의 의도와 전략적 함의를 파악하는 속도가 타의 추종을 불허합니다. 저자의 논리를 빠르게 분해하고 재조립하여 자신만의 인사이트로 전환합니다."
            },
            vocabulary: {
                percentile: "상위 12%",
                rank: "Rank: 6,021 / 50,214",
                score: "85.2",
                avg: "38.4",
                desc: "해석: 실용적이고 비즈니스 친화적인 어휘 구사력이 돋보입니다. 추상적인 개념보다는 구체적이고 행동 유발적인 언어 처리에 강점을 보입니다."
            },
            comment: "데이터는 귀하를 **'실행하는 지식인(Actionable Intellectual)'**으로 정의합니다. 지식을 습득하는 것에 그치지 않고, 현실 세계의 문제를 해결하는 솔루션으로 치환하는 능력이 압도적입니다. 추천드리는 '성공학' 및 '경제경영' 서적들이 귀하의 잠재력을 폭발시키는 촉매제가 될 것입니다."
        }
    },
    entertainment: {
        persona: "상상력 탐험가",
        subtitle: "창의적 스토리텔러 유형",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80", // Creative female
        metrics: {
            wpm: { value: 380, change: "+10%", label: "분당 단어 수" },
            accuracy: { value: "95%", rank: "상위 5%", label: "몰입도" },
            retention: { value: "Max", rank: "최상", label: "상상력" }
        },
        summary: "당신에게 독서는 새로운 세계로 떠나는 모험입니다. 텍스트를 읽는 순간 머릿속에 생생한 영상이 펼쳐지며, 이야기의 흐름을 타는 능력이 매우 뛰어납니다.",
        radarChart: {
            points: "50,20 80,40 95,80 50,90 5,80 20,40" // High Empathy/Imagination areas
        },
        bigData: {
            load: {
                percentile: "상위 15%",
                rank: "Rank: 7,532 / 50,214",
                score: "82.1",
                avg: "45.2",
                desc: "해석: 즐거움을 추구할 때 뇌의 활성도가 급격히 상승합니다. 흥미로운 스토리텔링이 동반될 때 평소보다 3배 이상의 긴 텍스트도 지루함 없이 소화해냅니다."
            },
            inference: {
                percentile: "상위 8.4%",
                rank: "Rank: 4,215 / 50,214",
                score: "89.5",
                avg: "52.0",
                desc: "해석: 행간을 읽어내는 감각적 추론 능력이 뛰어납니다. 논리적 연결고리가 부족해도 직관적인 상상력으로 빈 공간을 채워 완벽한 서사를 만들어냅니다."
            },
            vocabulary: {
                percentile: "상위 5.5%",
                rank: "Rank: 2,741 / 50,214",
                score: "93.2",
                avg: "38.4",
                desc: "해석: 감각적이고 묘사적인 어휘에 대한 반응 속도가 매우 빠릅니다. 문학적 표현과 은유를 이해하는 능력이 발달하여 텍스트의 맛을 누구보다 잘 느낍니다."
            },
            comment: "귀하는 **'꿈꾸는 여행자(Dreaming Voyager)'**입니다. 데이터상으로 귀하의 뇌는 텍스트를 정보가 아닌 '경험'으로 받아들입니다. 소설이나 에세이와 같은 내러티브 중심의 독서가 창의적인 영감을 끊임없이 공급할 것입니다."
        }
    },
    empathy: {
        persona: "따뜻한 공감자",
        subtitle: "감성적 치유자 유형",
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80", // Gentle portrait
        metrics: {
            wpm: { value: 250, change: "정독", label: "분당 단어 수" },
            accuracy: { value: "99%", rank: "상위 1%", label: "감정 이해" },
            retention: { value: "Deep", rank: "깊음", label: "공감력" }
        },
        summary: "당신은 책 속의 인물들과 깊게 교감하며, 문장 하나하나에 담긴 감정을 섬세하게 읽어냅니다. 독서를 통해 위로를 받고 타인을 이해하는 폭을 넓혀갑니다.",
        radarChart: {
            points: "50,30 70,50 60,80 50,95 20,90 30,50" // High Empathy areas
        },
        bigData: {
            load: {
                percentile: "상위 25%",
                rank: "Rank: 12,500 / 50,214",
                score: "72.4",
                avg: "45.2",
                desc: "해석: 속도보다는 깊이를 추구합니다. 빠르게 읽을 때보다 천천히 음미하며 읽을 때 인지 부하가 감소하며, 정서적 안정감이 극대화되는 패턴을 보입니다."
            },
            inference: {
                percentile: "상위 2.1%",
                rank: "Rank: 1,054 / 50,214",
                score: "96.8",
                avg: "52.0",
                desc: "해석: 타인의 감정과 상황을 시뮬레이션하는 '거울 뉴런'의 활성도가 매우 높습니다. 텍스트 속 인물의 심리를 마치 자신의 것처럼 생생하게 느껴내는 능력이 탁월합니다."
            },
            vocabulary: {
                percentile: "상위 9.8%",
                rank: "Rank: 4,921 / 50,214",
                score: "88.7",
                avg: "38.4",
                desc: "해석: 감정 형용사와 관계 중심적인 어휘에 민감하게 반응합니다. 사람 사이의 미묘한 관계를 설명하는 텍스트에서 높은 이해도를 보입니다."
            },
            comment: "데이터는 귀하를 **'우리의 마음을 읽는 자(Heart Reader)'**로 분류합니다. 귀하의 독서는 단순한 취미를 넘어선 '치유'의 과정입니다. 에세이와 심리학 서적은 귀하가 가진 타고난 공감 능력을 더욱 세련되게 다듬어 줄 것입니다."
        }
    },
    mindfulness: {
        persona: "깊은 사색가",
        subtitle: "철학적 탐구자 유형",
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80", // Thoughtful male
        metrics: {
            wpm: { value: 280, change: "+5%", label: "분당 단어 수" },
            accuracy: { value: "97%", rank: "상위 3%", label: "논리력" },
            retention: { value: "Forever", rank: "영구", label: "기억력" }
        },
        summary: "당신은 본질을 탐구하고 삶의 의미를 묻는 독서를 즐깁니다. 깊이 있는 사색을 통해 지식을 지혜로 승화시키는 능력을 가지고 있습니다.",
        radarChart: {
            points: "50,5 95,25 90,75 50,90 10,75 5,25" // Balanced all around, Hexagon
        },
        bigData: {
            load: {
                percentile: "상위 1.2%",
                rank: "Rank: 602 / 50,214",
                score: "98.8",
                avg: "45.2",
                desc: "해석: 일반 독자가 25분 후 지치는 반면, 귀하는 최대 90분까지 고도 집중력을 유지합니다. 복잡한 추상적 개념을 장시간 처리해도 뇌의 피로도가 현저히 낮습니다."
            },
            inference: {
                percentile: "상위 4.8%",
                rank: "Rank: 2,410 / 50,214",
                score: "95.2",
                avg: "52.0",
                desc: "해석: 문맥 사이의 숨겨진 철학적 함의를 파악하는 속도가 타의 추종을 불허합니다. 텍스트를 키워드 중심의 네트워크 방식으로 처리하여 본질을 꿰뚫습니다."
            },
            vocabulary: {
                percentile: "상위 0.5%",
                rank: "Rank: 251 / 50,214",
                score: "99.5",
                avg: "38.4",
                desc: "해석: 귀하가 구사하는 어휘의 범위와 깊이는 전문 철학자 수준입니다. 추상적이고 관념적인 어휘의 미묘한 차이를 정확히 구분해내는 고해상도 사고력을 가졌습니다."
            },
            comment: "데이터 분포상 귀하는 **'극소수의 현자(Modern Sage)'** 그룹에 속합니다. 남들이 어려워 포기하는 고전과 철학서에서 도파민이 생성되는 희귀한 유형입니다. 인문학과 철학의 바다에서 귀하의 지적 잠재력은 만개할 것입니다."
        }
    }
};
