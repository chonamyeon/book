// 동적 결과 생성기: 4차원 연속 점수(0~100)를 기반으로 매번 고유한 결과를 생성
// 더 이상 고정된 4가지 유형이 아닌, 점수 비율에 따른 개인화된 분석

// === 페르소나 정의 풀 (주/부 유형 조합별) ===
const personaPool = {
    growth: {
        primary: [
            { persona: "전략적 비저너리", subtitle: "성장 지향적 리더 유형" },
            { persona: "실행하는 전략가", subtitle: "목표 달성형 실용주의자" },
            { persona: "미래 설계자", subtitle: "비전 중심 자기혁신가" },
            { persona: "효율의 마에스트로", subtitle: "시스템 사고 최적화 유형" },
        ],
        images: [
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
        ]
    },
    entertainment: {
        primary: [
            { persona: "상상력 탐험가", subtitle: "창의적 스토리텔러 유형" },
            { persona: "몰입의 항해사", subtitle: "서사 중독 모험가 유형" },
            { persona: "세계관 건축가", subtitle: "스토리 메이커 유형" },
            { persona: "판타지 오디세이", subtitle: "무한상상 탐험가 유형" },
        ],
        images: [
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
            "https://images.unsplash.com/photo-1535930749574-1399327ce78f?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
            "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
        ]
    },
    empathy: {
        primary: [
            { persona: "따뜻한 공감자", subtitle: "감성적 치유자 유형" },
            { persona: "마음의 번역가", subtitle: "정서 감응형 리더 유형" },
            { persona: "감정의 고고학자", subtitle: "내면 탐험 감수성 유형" },
            { persona: "영혼의 간호사", subtitle: "치유적 독서가 유형" },
        ],
        images: [
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
        ]
    },
    mindfulness: {
        primary: [
            { persona: "깊은 사색가", subtitle: "철학적 탐구자 유형" },
            { persona: "지혜의 수집가", subtitle: "본질 추구 명상가 유형" },
            { persona: "침묵의 관찰자", subtitle: "메타인지 사유가 유형" },
            { persona: "시간의 철학자", subtitle: "존재론적 독서가 유형" },
        ],
        images: [
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
            "https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
        ]
    }
};

// === 요약 문구 풀 (주유형별 여러 버전) ===
const summaryPool = {
    growth: [
        "당신은 책을 단순한 읽을거리가 아닌, 삶을 변화시키는 도구로 활용합니다. 핵심 정보를 빠르게 추출하고 이를 실제 행동으로 옮기는 데 탁월한 능력을 발휘합니다.",
        "정보를 수집하고 구조화하는 데 있어서 남다른 체계를 가진 당신은, 독서를 통해 전략적 사고력을 끊임없이 연마합니다. 읽은 책의 수보다 적용한 인사이트의 수가 더 중요합니다.",
        "미래를 설계하는 비전과 이를 실행으로 옮기는 추진력을 겸비한 당신에게 독서는 최고의 투자입니다. 한 권의 책에서도 삶을 바꿀 하나의 핵심을 찾아내는 능력이 돋보입니다.",
    ],
    entertainment: [
        "당신에게 독서는 새로운 세계로 떠나는 모험입니다. 텍스트를 읽는 순간 머릿속에 생생한 영상이 펼쳐지며, 이야기의 흐름을 타는 능력이 매우 뛰어납니다.",
        "이야기에 한번 빠져들면 시간의 흐름을 잊는 당신은, 캐릭터와 함께 울고 웃으며 셀 수 없이 많은 삶을 경험합니다. 상상력의 불꽃이 끊이지 않는 타고난 모험가입니다.",
        "텍스트를 통해 시공간을 뛰어넘는 당신의 상상력은 일상에서도 빛을 발합니다. 독서는 당신에게 무한한 가능성의 세계로 통하는 문이며, 그 문을 여는 열쇠는 호기심입니다.",
    ],
    empathy: [
        "당신은 책 속의 인물들과 깊게 교감하며, 문장 하나하나에 담긴 감정을 섬세하게 읽어냅니다. 독서를 통해 위로를 받고 타인을 이해하는 폭을 넓혀갑니다.",
        "타인의 아픔에 민감하게 반응하고 그 감정을 온전히 받아들이는 당신은, 독서를 통해 세상의 다양한 삶을 경험하며 더 넓은 마음을 만들어갑니다.",
        "문장 사이에 숨겨진 감정을 읽어내는 당신의 직관은, 작가조차 의도하지 않았던 메시지를 발견하게 합니다. 독서는 당신에게 감정의 렌즈를 닦는 과정입니다.",
    ],
    mindfulness: [
        "당신은 본질을 탐구하고 삶의 의미를 묻는 독서를 즐깁니다. 깊이 있는 사색을 통해 지식을 지혜로 승화시키는 능력을 가지고 있습니다.",
        "한 문장을 만나도 그 이면의 세계를 들여다보는 당신은, 독서를 통해 인류가 쌓아온 지혜의 계보에 참여합니다. 깊이 있는 사유야말로 당신의 가장 강력한 무기입니다.",
        "세상이 빠르게 변해도 당신은 불변의 질문을 던지며 사유의 깊이를 지킵니다. 독서는 단순한 정보 습득이 아닌, 존재 자체를 성찰하는 철학적 수련입니다.",
    ]
};

// === 빅데이터 해석 풀 ===
const bigDataDescPool = {
    load: {
        growth: [
            "목표 지향적인 독서 패턴으로 인해 필요한 정보를 선별적으로 처리하는 효율성이 극대화되어 있습니다. 불필요한 정보는 과감히 건너뛰는 '선택적 집중' 능력이 탁월합니다.",
            "비구조적 텍스트에서도 핵심 키워드를 자동으로 탐지하는 스캐닝 능력이 발달해 있습니다. 학습 효율 면에서 상위 독서가 그룹에 속합니다.",
        ],
        entertainment: [
            "즐거움을 추구할 때 뇌의 활성도가 급격히 상승합니다. 흥미로운 스토리텔링이 동반될 때 훨씬 더 긴 텍스트도 지루함 없이 소화해내는 지속적 몰입 능력이 돋보입니다.",
            "서사 구조를 따라가는 패턴 인식 능력이 강합니다. 몰입 상태에 진입하면 외부 자극에 대한 반응이 현저히 감소하는 '플로우(Flow)' 상태를 자주 경험합니다.",
        ],
        empathy: [
            "속도보다는 깊이를 추구합니다. 빠르게 읽을 때보다 천천히 음미하며 읽을 때 인지 부하가 감소하며, 정서적 안정감이 극대화되는 패턴을 보입니다.",
            "감정적 텍스트를 처리할 때 뇌의 미러뉴런 활성도가 높아집니다. 공감 기반 정보 처리 방식은 정보를 장기 기억으로 전환하는 효율이 현저히 높습니다.",
        ],
        mindfulness: [
            "일반적인 독자보다 훨씬 오랜 시간 고도 집중력을 유지합니다. 복잡한 추상적 개념을 장시간 처리해도 뇌의 피로도가 현저히 낮은 깊은 사색형 패턴을 보입니다.",
            "선형적 정보 처리가 아닌 네트워크형 사고를 통해 텍스트의 다층적 의미를 동시에 파악합니다. 인지 부하 내성이 매우 높은 수준으로, 깊이 있는 독서에 최적화되어 있습니다.",
        ]
    },
    inference: {
        growth: [
            "텍스트 이면의 의도와 전략적 함의를 파악하는 속도가 타의 추종을 불허합니다. 저자의 논리를 빠르게 분해하고 재조립하여 자신만의 인사이트로 전환합니다.",
            "인과관계 추론에서 특히 뛰어난 성과를 보입니다. 주어진 데이터에서 행동 가능한 결론을 도출하는 '실행적 추론' 능력이 발달해 있습니다.",
        ],
        entertainment: [
            "행간을 읽어내는 감각적 추론 능력이 뛰어납니다. 논리적 연결고리가 부족해도 직관적인 상상력으로 빈 공간을 채워 완벽한 서사를 만들어냅니다.",
            "복선과 암시를 감지하는 패턴 매칭 능력이 탁월합니다. 스토리 전개를 예측하면서도 반전에 열려 있는 유연한 추론 구조를 보입니다.",
        ],
        empathy: [
            "타인의 감정과 상황을 시뮬레이션하는 '거울 뉴런'의 활성도가 매우 높습니다. 텍스트 속 인물의 심리를 마치 자신의 것처럼 생생하게 느껴내는 능력이 탁월합니다.",
            "비언어적 단서(상황 묘사, 행동 패턴)로부터 인물의 내면 상태를 추론하는 정서적 추론 능력이 발달해 있습니다. 타인의 감정을 정확하게 읽어내는 능력이 매우 높습니다.",
        ],
        mindfulness: [
            "문맥 사이의 숨겨진 철학적 함의를 파악하는 속도가 타의 추종을 불허합니다. 텍스트를 키워드 중심의 네트워크 방식으로 처리하여 본질을 꿰뚫습니다.",
            "추상적 개념 간의 연결고리를 발견하는 '메타 추론' 능력이 발달해 있습니다. 표면적 의미 너머의 구조적 패턴을 감지하는 사고 깊이가 특출합니다.",
        ]
    },
    vocabulary: {
        growth: [
            "실용적이고 비즈니스 친화적인 어휘 구사력이 돋보입니다. 추상적인 개념보다는 구체적이고 행동 유발적인 언어 처리에 강점을 보입니다.",
            "전문 용어를 빠르게 습득하고 맥락에 맞게 재활용하는 어휘 적응력이 뛰어납니다. 커뮤니케이션 효율성이 상위 그룹에 속합니다.",
        ],
        entertainment: [
            "감각적이고 묘사적인 어휘에 대한 반응 속도가 매우 빠릅니다. 문학적 표현과 은유를 이해하는 능력이 발달하여 텍스트의 맛을 누구보다 잘 느낍니다.",
            "서사적 어휘와 공간 묘사에 대한 감수성이 탁월합니다. 언어를 통해 시각적 이미지를 구축하는 '내적 시각화' 능력이 매우 뛰어납니다.",
        ],
        empathy: [
            "감정 형용사와 관계 중심적인 어휘에 민감하게 반응합니다. 사람 사이의 미묘한 관계를 설명하는 텍스트에서 높은 이해도를 보입니다.",
            "정서적 뉘앙스를 구별하는 어휘 해상도가 매우 높습니다. '슬프다'와 '먹먹하다'의 차이를 정확히 구별하는 감정 어휘 스펙트럼이 넓습니다.",
        ],
        mindfulness: [
            "귀하가 구사하는 어휘의 범위와 깊이는 전문 철학자 수준입니다. 추상적이고 관념적인 어휘의 미묘한 차이를 정확히 구분해내는 고해상도 사고력을 가졌습니다.",
            "개념적 어휘 간의 위계와 관계를 구조적으로 이해합니다. 단어의 표면적 의미뿐 아니라 역사적, 철학적 맥락까지 통합 처리하는 어휘 심도가 탁월합니다.",
        ]
    },
    comment: {
        growth: [
            "데이터는 귀하를 **'실행하는 지식인(Actionable Intellectual)'**으로 정의합니다. 지식을 습득하는 것에 그치지 않고, 현실 세계의 문제를 해결하는 솔루션으로 치환하는 능력이 압도적입니다.",
            "귀하의 인지 프로필은 **'전략적 최적화자(Strategic Optimizer)'**에 가깝습니다. 정보를 선별하고 구조화하는 능력이 탁월하며, 이를 실행으로 연결하는 속도가 상위 그룹입니다.",
        ],
        entertainment: [
            "귀하는 **'꿈꾸는 여행자(Dreaming Voyager)'**입니다. 데이터상으로 귀하의 뇌는 텍스트를 정보가 아닌 '경험'으로 받아들입니다.",
            "분석 결과 귀하는 **'서사의 연금술사(Narrative Alchemist)'**입니다. 텍스트를 생생한 경험으로 변환하는 뇌의 시각화 능력이 최상위 그룹에 해당합니다.",
        ],
        empathy: [
            "데이터는 귀하를 **'우리의 마음을 읽는 자(Heart Reader)'**로 분류합니다. 귀하의 독서는 단순한 취미를 넘어선 '치유'의 과정입니다.",
            "귀하는 **'감성의 번역가(Emotional Translator)'**입니다. 타인의 감정을 정확히 감지하고 언어로 표현하는 탁월한 감수성이 귀하의 가장 강력한 무기입니다.",
        ],
        mindfulness: [
            "데이터 분포상 귀하는 **'극소수의 현자(Modern Sage)'** 그룹에 속합니다. 남들이 어려워 포기하는 고전과 철학서에서 도파민이 생성되는 희귀한 유형입니다.",
            "귀하는 **'사유의 건축가(Architect of Thought)'**입니다. 개념과 개념 사이에 새로운 연결을 만들어내는 메타인지 능력이 최상위 수준입니다.",
        ]
    }
};

// === Seeded random number generator (자바스크립트용) ===
function seededRandom(seed) {
    let s = seed;
    return function() {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

// === 해시 함수: 점수 배열에서 seed 생성 ===
function hashScores(scores) {
    const str = JSON.stringify(scores);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash);
}

// === 점수 기반 동적 메트릭 생성 ===
function generateMetrics(scores, primaryType, rng) {
    const total = scores.A + scores.B + scores.C + scores.D;
    const primaryScore = scores[{ growth: 'A', entertainment: 'B', empathy: 'C', mindfulness: 'D' }[primaryType]];
    const ratio = total > 0 ? primaryScore / total : 0.25;

    // 노이즈: rng 기반 ±variation
    const noise = () => (rng() - 0.5) * 0.1;

    // WPM: 성장/사색 = 높은 처리속도, 공감 = 느린 정독, 엔터 = 중간
    const wpmBase = {
        growth: 380 + Math.round(ratio * 120),
        entertainment: 320 + Math.round(ratio * 100),
        empathy: 200 + Math.round(ratio * 80),
        mindfulness: 240 + Math.round(ratio * 90),
    };
    const wpm = wpmBase[primaryType] + Math.round((noise()) * 50);

    // 정확도/논리력
    const accBase = 0.78 + (ratio * 0.18) + noise() * 0.05;
    const accuracy = Math.min(99, Math.max(75, Math.round(accBase * 100)));

    // 상위 퍼센트 계산
    const topPercent = Math.max(1, Math.round((1 - ratio) * 20 + rng() * 5));

    // 적용력/기억력
    const retentionLabels = {
        growth: ['매우 높음', '높음', '우수', '탁월'],
        entertainment: ['최상', '높음', '우수', '뛰어남'],
        empathy: ['깊음', '매우 깊음', '심층', '내면화'],
        mindfulness: ['영구', '반영구', '심층 각인', '본질 체화'],
    };
    const retIdx = Math.min(3, Math.floor(ratio * 4));

    const metricLabels = {
        growth: { acc: "정확도", ret: "적용력" },
        entertainment: { acc: "몰입도", ret: "상상력" },
        empathy: { acc: "감정 이해", ret: "공감력" },
        mindfulness: { acc: "논리력", ret: "기억력" },
    };

    return {
        wpm: { value: wpm, change: `+${Math.round(ratio * 30 + rng() * 10)}%`, label: "분당 단어 수" },
        accuracy: { value: `${accuracy}%`, rank: `상위 ${topPercent}%`, label: metricLabels[primaryType].acc },
        retention: { value: retentionLabels[primaryType][retIdx], rank: retentionLabels[primaryType][Math.max(0, retIdx - 1)], label: metricLabels[primaryType].ret }
    };
}

// === 레이더 차트 포인트: 연속 점수 기반 ===
function generateRadarPoints(scores, rng) {
    const total = scores.A + scores.B + scores.C + scores.D + 0.01;
    // 6축: 집중력, 논리성, 속독력, 기억력, 공감력, 어휘력
    // 각 축은 4차원 점수의 가중 합산
    const axes = [
        /* 집중력 */ (scores.A * 0.35 + scores.D * 0.35 + scores.B * 0.15 + scores.C * 0.15) / total,
        /* 논리성 */ (scores.A * 0.40 + scores.D * 0.30 + scores.B * 0.10 + scores.C * 0.20) / total,
        /* 속독력 */ (scores.A * 0.30 + scores.B * 0.40 + scores.C * 0.10 + scores.D * 0.20) / total,
        /* 기억력 */ (scores.D * 0.40 + scores.C * 0.25 + scores.A * 0.20 + scores.B * 0.15) / total,
        /* 공감력 */ (scores.C * 0.50 + scores.B * 0.20 + scores.D * 0.15 + scores.A * 0.15) / total,
        /* 어휘력 */ (scores.D * 0.35 + scores.A * 0.25 + scores.C * 0.20 + scores.B * 0.20) / total,
    ];

    // SVG 좌표: 중심 (50,50), 6각형
    const centers = [
        [50, 5],   // 집중력 (top)
        [95, 30],  // 논리성 (top-right)
        [95, 75],  // 속독력 (bottom-right)
        [50, 95],  // 기억력 (bottom)
        [5, 75],   // 공감력 (bottom-left)
        [5, 30],   // 어휘력 (top-left)
    ];

    const points = axes.map((val, i) => {
        const scale = 0.3 + val * 2.5 + (rng() - 0.5) * 0.15; // 0.3~1.0 + noise
        const clampedScale = Math.min(1, Math.max(0.2, scale));
        const x = 50 + (centers[i][0] - 50) * clampedScale;
        const y = 50 + (centers[i][1] - 50) * clampedScale;
        return `${Math.round(x)},${Math.round(y)}`;
    });

    return points.join(' ');
}

// === 빅데이터 분석 섹션 동적 생성 ===
function generateBigData(scores, primaryType, rng) {
    const total = scores.A + scores.B + scores.C + scores.D + 0.01;
    const primaryKey = { growth: 'A', entertainment: 'B', empathy: 'C', mindfulness: 'D' }[primaryType];
    const ratio = scores[primaryKey] / total;

    const genSection = (pool, baseScore, basePercentile) => {
        const score = Math.min(99.5, Math.max(60, baseScore + (rng() - 0.3) * 15));
        const percentile = Math.max(0.3, basePercentile - rng() * 3);
        const rank = Math.max(100, Math.round(50214 * (percentile / 100)));
        const descArr = pool[primaryType];
        const desc = descArr[Math.floor(rng() * descArr.length)];
        const avgBase = { load: 45.2, inference: 52.0, vocabulary: 38.4 };

        return {
            percentile: `상위 ${percentile.toFixed(1)}%`,
            rank: `Rank: ${rank.toLocaleString()} / 50,214`,
            score: score.toFixed(1),
            avg: avgBase,
            desc: `해석: ${desc}`
        };
    };

    const loadScore = 60 + ratio * 35 + rng() * 8;
    const loadPercentile = Math.max(0.5, 30 - ratio * 28 - rng() * 5);
    const load = genSection(bigDataDescPool.load, loadScore, loadPercentile);
    load.avg = "45.2";

    const infScore = 65 + ratio * 30 + rng() * 10;
    const infPercentile = Math.max(0.5, 25 - ratio * 22 - rng() * 5);
    const inference = genSection(bigDataDescPool.inference, infScore, infPercentile);
    inference.avg = "52.0";

    const vocScore = 55 + ratio * 40 + rng() * 10;
    const vocPercentile = Math.max(0.3, 28 - ratio * 26 - rng() * 5);
    const vocabulary = genSection(bigDataDescPool.vocabulary, vocScore, vocPercentile);
    vocabulary.avg = "38.4";

    const commentArr = bigDataDescPool.comment[primaryType];
    const comment = commentArr[Math.floor(rng() * commentArr.length)];

    return { load, inference, vocabulary, comment };
}

// === 메인 동적 결과 생성 함수 ===
export function generateResultData(scores) {
    // scores = { A: number, B: number, C: number, D: number }
    const seed = hashScores(scores);
    const rng = seededRandom(seed);

    // 주 유형 결정
    const typeMap = { A: 'growth', B: 'entertainment', C: 'empathy', D: 'mindfulness' };
    let maxKey = 'A';
    for (const key of ['B', 'C', 'D']) {
        if (scores[key] > scores[maxKey]) maxKey = key;
    }
    const primaryType = typeMap[maxKey];

    // 부 유형 결정 (2등)
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const secondaryType = typeMap[sorted[1][0]];

    // 페르소나 선택 (주/부 유형 점수 비율 기반)
    const pool = personaPool[primaryType];
    const personaIdx = Math.floor(rng() * pool.primary.length);
    const { persona, subtitle } = pool.primary[personaIdx];
    const image = pool.images[Math.floor(rng() * pool.images.length)];

    // 메트릭 생성
    const metrics = generateMetrics(scores, primaryType, rng);

    // 요약 생성
    const summaries = summaryPool[primaryType];
    const summary = summaries[Math.floor(rng() * summaries.length)];

    // 레이더 차트
    const radarChart = { points: generateRadarPoints(scores, rng) };

    // 빅데이터 섹션
    const bigData = generateBigData(scores, primaryType, rng);

    return {
        primaryType,
        secondaryType,
        persona,
        subtitle,
        image,
        metrics,
        summary,
        radarChart,
        bigData,
        scores, // 원본 점수도 포함
    };
}

// === 1년/5년/10년 후 미래 모습 ===
export const futureVision = {
    growth: [
        {
            year: '1년 후',
            icon: '🌱',
            title: '주변이 먼저 알아본다',
            desc: '매일 출퇴근길 15분이 1년이면 핵심 아이디어 50권 분량으로 쌓입니다. "어떻게 그런 걸 알아?"라는 질문을 받기 시작하고, 회의에서 근거 있는 발언이 늘면서 존재감이 달라집니다.',
            details: [
                '회의에서 핵심을 짚는 발언이 늘고, 팀의 시선이 달라진다',
                '읽은 내용을 실제 업무에 적용해 첫 번째 가시적 성과를 경험한다',
                '정보를 빠르게 소화하고 요약하는 능력이 눈에 띄게 향상된다',
                '아침 출근길 15분 → 에피소드 1개 완청 → 핵심 메모 1줄 습관을 완성한다',
            ],
            highlight: '연간 핵심 인사이트 50권분 축적',
        },
        {
            year: '5년 후',
            icon: '🚀',
            title: '전략이 본능이 된다',
            desc: '5년간 250권 분량의 지식이 단순한 정보를 넘어 "판단의 기준"이 됩니다. 문제 앞에 서면 자연스럽게 해결책이 보이고, 팀을 이끄는 언어가 명확해집니다.',
            details: [
                '의사결정 속도와 정확도가 높아져 리더 포지션으로 자연스럽게 이동한다',
                '업계 전문가들과 대등한 시각으로 대화할 수 있는 전문성을 갖춘다',
                '복잡한 문제를 여러 관점에서 분석하고 구조화하는 능력이 탁월해진다',
                '"왜 저 사람은 항상 해결책을 갖고 오지?"라는 평가가 일상이 된다',
            ],
            highlight: '250권+ 누적 · 전문가급 판단력',
        },
        {
            year: '10년 후',
            icon: '👑',
            title: '당신이 기준점이 된다',
            desc: '지식의 깊이와 넓이를 갖춘 10년 후, 당신의 말은 단순한 의견이 아닌 검증된 관점으로 받아들여집니다. 커리어와 삶 모두에서 당신 자신이 기준이 됩니다.',
            details: [
                '조직 안팎에서 멘토이자 의사결정 기준자로 인정받는다',
                '분야를 넘나드는 연결 사고로 아무도 생각 못 한 솔루션을 만들어낸다',
                '독서가 습관을 넘어 정체성이 되고, 그 정체성이 커리어와 삶을 설계한다',
                '후배와 동료들이 중요한 결정 앞에서 가장 먼저 당신을 찾는다',
            ],
            highlight: '500권+ · 분야를 넘나드는 연결 사고',
        },
    ],
    entertainment: [
        {
            year: '1년 후',
            icon: '🌱',
            title: '대화의 깊이가 달라진다',
            desc: '다양한 이야기를 접하면서 사람을 보는 눈이 생깁니다. "왜 저 사람이 저렇게 행동할까"를 이해하는 감각이 발달하고, 당신과의 대화가 특별하다는 인상을 주기 시작합니다.',
            details: [
                '상대방의 감정과 의도를 더 빠르게 읽는 직관이 생긴다',
                '어떤 상황에서도 분위기를 읽고 적절한 이야기를 꺼낼 수 있게 된다',
                '프레젠테이션과 발표에서 스토리텔링으로 청중을 집중시키는 능력이 생긴다',
                '새로운 세계관을 상상하며 창의적 아이디어를 자연스럽게 생산한다',
            ],
            highlight: '스토리 감수성 · 공감 능력 급성장',
        },
        {
            year: '5년 후',
            icon: '🎭',
            title: '창의력이 무기가 된다',
            desc: '수백 개의 이야기가 뇌 속에 축적되면서 기획, 글쓰기, 프레젠테이션에서 "어떻게 저런 아이디어를?"이라는 평가를 받게 됩니다. 상상력이 경쟁력으로 전환됩니다.',
            details: [
                '콘텐츠 창작·기획·강연 등에서 타인과 차별되는 독창적 관점을 보여준다',
                '복잡한 개념을 누구나 이해할 수 있는 이야기로 풀어내는 능력이 생긴다',
                '"이 사람의 발표는 다르다"는 인상을 통해 직업적 신뢰를 얻는다',
                '광범위한 이야기 레퍼런스로 어떤 분야의 전문가와도 대화가 가능해진다',
            ],
            highlight: '스토리텔링 능력이 직업적 강점으로 정착',
        },
        {
            year: '10년 후',
            icon: '✨',
            title: '나만의 이야기를 세상에 쓴다',
            desc: '읽어온 모든 이야기들이 당신만의 목소리를 만들어냅니다. 글쓰기, 강연, 콘텐츠 창작으로 세상에 기여하며, 당신의 이름을 기억하는 사람들이 생겨납니다.',
            details: [
                '나만의 서사와 철학을 담은 콘텐츠로 커뮤니티와 팬을 만들어낸다',
                '책, 강연, 팟캐스트 등 다양한 형태로 축적된 지식을 세상에 환원한다',
                '많은 사람들의 삶에 긍정적 영향을 미치는 창작자·이야기꾼이 된다',
                '삶 자체가 하나의 풍요롭고 의미 있는 이야기가 된다',
            ],
            highlight: '삶을 서사로 만드는 창작자',
        },
    ],
    empathy: [
        {
            year: '1년 후',
            icon: '🌱',
            title: '관계의 온도가 달라진다',
            desc: '다양한 삶의 이야기를 간접 경험하면서 타인을 이해하는 폭이 넓어집니다. 판단 대신 이해를 먼저 선택하는 태도가 생기고, "저 사람과 이야기하면 편해"라는 말을 듣기 시작합니다.',
            details: [
                '갈등 상황에서 상대의 입장을 먼저 이해하려는 태도가 자연스러워진다',
                '신뢰받는 사람이라는 인상이 주변에 조용히 퍼져나간다',
                '가까운 관계에서 더 깊고 솔직한 대화를 나눌 수 있게 된다',
                '상대방이 필요한 것을 말로 표현하기 전에 알아채는 감각이 생긴다',
            ],
            highlight: '신뢰받는 존재로의 첫 걸음',
        },
        {
            year: '5년 후',
            icon: '🤝',
            title: '사람을 이끄는 힘이 생긴다',
            desc: '깊은 공감력이 리더십의 핵심 무기로 작동합니다. 팀원이 무엇을 필요로 하는지 먼저 알아채고, 갈등을 지혜롭게 풀어내는 역할을 자연스럽게 맡게 됩니다.',
            details: [
                '조직에서 "없어서는 안 될 사람"이라는 평가를 자연스럽게 얻는다',
                '갈등 상황에서 양쪽을 이해하고 중재하는 핵심 역할을 담당한다',
                '리더십이 강압이 아닌 신뢰로 작동해 팀 전체의 성과를 끌어올린다',
                '멘토링과 코칭을 통해 주변 사람들의 성장을 이끄는 사람이 된다',
            ],
            highlight: '팀과 조직의 감성 리더',
        },
        {
            year: '10년 후',
            icon: '💎',
            title: '치유하는 존재가 된다',
            desc: '수많은 이야기를 통해 쌓인 이해의 깊이가 주변 사람들에게 위로와 방향을 줍니다. 멘토로, 상담자로, 혹은 단순히 "옆에 있어서 다행인 사람"으로 오래 기억됩니다.',
            details: [
                '어려움에 처한 사람들이 가장 먼저 연락하는 사람이 된다',
                '공감을 기반으로 한 리더십으로 지속 가능한 팀과 커뮤니티를 만든다',
                '삶으로 타인에게 영향을 미치는 진정한 멘토이자 인생의 등대가 된다',
                '세대를 넘어 전달되는 따뜻하고 깊은 인간적 유산을 남긴다',
            ],
            highlight: '삶으로 영향력을 행사하는 사람',
        },
    ],
    mindfulness: [
        {
            year: '1년 후',
            icon: '🌱',
            title: '흔들리지 않는 중심이 생긴다',
            desc: '깊이 읽는 습관이 생각의 밀도를 높입니다. 빠르게 변하는 세상에서도 "나는 어떻게 살고 싶은가"라는 질문에 조금씩 답할 수 있게 되고, 일상의 소음에 덜 흔들리게 됩니다.',
            details: [
                '충동적인 결정이 줄고, 중요한 순간마다 자신만의 기준이 생기기 시작한다',
                '쏟아지는 정보 속에서 본질적인 것과 아닌 것을 가려내는 눈이 생긴다',
                '일상에서 더 깊은 만족감과 의미를 발견하는 순간이 늘어난다',
                '명상과 독서를 접목해 하루 15분을 온전히 자신을 위한 시간으로 만든다',
            ],
            highlight: '내면의 기준점 · 정서 안정감',
        },
        {
            year: '5년 후',
            icon: '🧭',
            title: '지혜가 지식을 이긴다',
            desc: '수백 편의 사유가 쌓이면서 단순한 지식을 넘어 지혜로 승화됩니다. 어떤 선택 앞에서도 흔들리지 않는 자신만의 철학이 구체적으로 형성되기 시작합니다.',
            details: [
                '자신만의 가치관과 철학이 구체적으로 정립되어 일관된 삶의 기준이 생긴다',
                '"왜 그런 선택을 했어?"라는 질문에 명확하고 설득력 있게 답할 수 있다',
                '주변 사람들이 중요한 결정 앞에서 조언을 구하러 찾아온다',
                '빠른 변화 속에서도 본질을 붙잡는 능력으로 평정심을 유지한다',
            ],
            highlight: '자신만의 철학과 세계관 정립',
        },
        {
            year: '10년 후',
            icon: '🌌',
            title: '삶의 본질을 꿰뚫는다',
            desc: '수천 시간의 사색이 만들어낸 깊이는 어떤 상황에서도 본질을 꿰뚫어 보는 눈을 줍니다. 나이가 들수록 더 빛나는 지적 영향력을 갖게 되며, 당신의 말이 오래 기억됩니다.',
            details: [
                '나이가 들수록 더욱 빛나는 지적 깊이와 인간적 품격을 갖추게 된다',
                '세대를 넘어 전달되는 통찰과 지혜로 진정한 어른으로 존경받는다',
                '삶의 모든 경험이 하나의 일관된 철학으로 통합되어 흔들림이 없어진다',
                '존재 자체가 주변 사람들에게 정신적 안정과 영감을 주는 사람이 된다',
            ],
            highlight: '시간이 지날수록 빛나는 사람',
        },
    ],
};

// 레거시 호환용 (직접 접속 시)
export const resultData = {
    growth: generateResultData({ A: 8, B: 2, C: 1, D: 1 }),
    entertainment: generateResultData({ A: 1, B: 8, C: 2, D: 1 }),
    empathy: generateResultData({ A: 1, B: 2, C: 8, D: 1 }),
    mindfulness: generateResultData({ A: 1, B: 1, C: 2, D: 8 }),
};
