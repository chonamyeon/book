import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 스토리보드 스케치 SVG 컴포넌트
const SketchFrame = ({ cut, color }) => {
    const c = cut.character;
    const isBoth = c === 'both' || c === 'group';
    const isWoman = c === 'woman';
    const isNight = (cut.scene || '').includes('밤') || (cut.scene || '').includes('새벽') || (cut.scene || '').includes('야간');
    const isPhone = (cut.scene || '').includes('스마트폰') || (cut.scene || '').includes('앱') || (cut.scene || '').includes('아카이뷰');
    const isSplit = isBoth && cut.cut >= 5;
    const isCTA = cut.cut === 6;
    const bg = isNight ? '#0d1117' : '#1a1f2e';
    const lineColor = color + '80';

    // 인물 실루엣 (SVG path)
    const PersonSilhouette = ({ x, y, scale = 1, facing = 1 }) => (
        <g transform={`translate(${x},${y}) scale(${scale * facing},${scale})`}>
            {/* 머리 */}
            <circle cx="0" cy="-22" r="7" fill={color + 'cc'} />
            {/* 몸 */}
            <rect x="-6" y="-15" width="12" height="18" rx="3" fill={color + 'aa'} />
            {/* 다리 */}
            <rect x="-5" y="3" width="4" height="12" rx="2" fill={color + '88'} />
            <rect x="1" y="3" width="4" height="12" rx="2" fill={color + '88'} />
        </g>
    );

    // 헤드폰
    const Headphones = ({ x, y }) => (
        <g transform={`translate(${x},${y})`}>
            <path d={`M-8,-22 Q-12,-30 0,-32 Q12,-30 8,-22`} fill="none" stroke="#60a5fa" strokeWidth="2" />
            <rect x="-10" y="-26" width="5" height="7" rx="2" fill="#60a5fa" />
            <rect x="5" y="-26" width="5" height="7" rx="2" fill="#60a5fa" />
        </g>
    );

    // 이어폰 점
    const Earbuds = ({ x, y }) => (
        <circle cx={x + 6} cy={y - 22} r="2.5" fill="#ffffff" />
    );

    // 스마트폰
    const Phone = ({ x, y }) => (
        <g transform={`translate(${x},${y})`}>
            <rect x="-5" y="-8" width="10" height="17" rx="2" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.5" />
            <rect x="-3" y="-6" width="6" height="11" rx="1" fill="#f97316" opacity="0.7" />
        </g>
    );

    // 지하철 배경
    const SubwayBg = () => (
        <>
            <rect x="0" y="60" width="160" height="40" fill="#0f172a" />
            <rect x="10" y="65" width="30" height="25" rx="2" fill={isNight ? '#1e293b' : '#334155'} stroke="#475569" strokeWidth="1" />
            <rect x="50" y="65" width="30" height="25" rx="2" fill={isNight ? '#1e293b' : '#334155'} stroke="#475569" strokeWidth="1" />
            <rect x="100" y="65" width="30" height="25" rx="2" fill={isNight ? '#1e293b' : '#334155'} stroke="#475569" strokeWidth="1" />
            {isNight && <>
                <circle cx="20" cy="40" r="3" fill="#fbbf24" opacity="0.6" />
                <circle cx="80" cy="35" r="2" fill="#fbbf24" opacity="0.5" />
                <circle cx="130" cy="42" r="2.5" fill="#fbbf24" opacity="0.4" />
            </>}
        </>
    );

    return (
        <svg viewBox="0 0 160 100" width="100%" style={{ background: bg, borderRadius: '8px', border: `1px solid ${color}30` }}>
            {/* 배경 */}
            <SubwayBg />
            {/* 수평선 (바닥) */}
            <line x1="0" y1="88" x2="160" y2="88" stroke={lineColor} strokeWidth="0.5" strokeDasharray="3,3" />

            {isCTA ? (
                // CTA 컷: 로고 + 텍스트
                <>
                    <rect x="0" y="0" width="160" height="100" fill="#0a0a0a" />
                    <text x="80" y="38" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#f97316" fontFamily="serif">ArchiView</text>
                    <line x1="40" y1="45" x2="120" y2="45" stroke="#f97316" strokeWidth="0.8" />
                    <text x="80" y="58" textAnchor="middle" fontSize="6.5" fill="#ffffff99" fontFamily="sans-serif">출퇴근 15분,</text>
                    <text x="80" y="67" textAnchor="middle" fontSize="6.5" fill="#ffffff99" fontFamily="sans-serif">성공한 사람들의 인사이트</text>
                    <rect x="30" y="74" width="100" height="14" rx="7" fill="#f97316" />
                    <text x="80" y="84" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="bold" fontFamily="sans-serif">지금 무료로 시작하기 →</text>
                </>
            ) : isSplit ? (
                // 분할 화면
                <>
                    <line x1="80" y1="0" x2="80" y2="100" stroke={color} strokeWidth="1" strokeDasharray="4,2" />
                    <PersonSilhouette x={42} y={72} scale={1.2} />
                    <Headphones x={42} y={72} />
                    <PersonSilhouette x={118} y={72} scale={1.2} facing={-1} />
                    <Earbuds x={112} y={72} />
                    <rect x="5" y="5" width="35" height="18" rx="2" fill="#1e3a5f" opacity="0.8" />
                    <text x="22" y="17" textAnchor="middle" fontSize="5" fill="#93c5fd" fontFamily="sans-serif">오전 8시</text>
                    <rect x="88" y="5" width="35" height="18" rx="2" fill="#1e1e3f" opacity="0.8" />
                    <text x="105" y="17" textAnchor="middle" fontSize="5" fill="#c4b5fd" fontFamily="sans-serif">오후 11시</text>
                </>
            ) : (
                // 단독 인물
                <>
                    <PersonSilhouette x={isPhone ? 55 : 80} y={72} scale={1.3} />
                    {!isWoman && !isPhone && <Headphones x={80} y={72} />}
                    {isWoman && <Earbuds x={74} y={72} />}
                    {isPhone && <Phone x={75} y={62} />}
                    {isPhone && <PersonSilhouette x={55} y={72} scale={1.3} />}
                    {isPhone && (isWoman ? <Earbuds x={49} y={72} /> : <Headphones x={55} y={72} />)}
                </>
            )}

            {/* 카메라 앵글 표시 */}
            <text x="4" y="10" fontSize="5" fill={color} opacity="0.8" fontFamily="monospace">
                {(cut.camera || '').includes('close') ? 'CU' : (cut.camera || '').includes('wide') ? 'WS' : (cut.camera || '').includes('medium') ? 'MS' : 'MS'}
            </text>

            {/* 컷 번호 */}
            <rect x="140" y="4" width="16" height="12" rx="3" fill={color} opacity="0.9" />
            <text x="148" y="13" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="bold" fontFamily="sans-serif">C{cut.cut}</text>

            {/* 감정 바 */}
            <rect x="4" y="92" width="152" height="4" rx="2" fill="#1a1a1a" />
            <rect x="4" y="92" width={`${(cut.cut / 6) * 152}`} height="4" rx="2" fill={color} opacity="0.7" />
        </svg>
    );
};

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 고정 인물 설명 (모든 스토리 공통)
const CHAR_MAN = 'East Asian Korean male, age 32, monolid eyes, black straight hair, slim face, wearing dark navy slim-fit business suit, white dress shirt, no tie, large black over-ear headphones around neck, slim athletic build, photorealistic, sharp focus, Canon EOS R5';
const CHAR_WOMAN = 'East Asian Korean female, age 28, monolid eyes, straight black chin-length hair, wearing light beige trench coat over dark blouse, small white wireless earbuds in ears, tired expression with dark circles, slim build, photorealistic, sharp focus, Canon EOS R5';

// 10가지 스토리 컨셉
const STORIES = [
    {
        id: 1,
        emoji: '🚇',
        title: '출퇴근 변화',
        tagline: '같은 지하철, 다른 하루',
        characters: '남자 + 여자',
        setting: '아침 출근 지하철 / 밤 퇴근 지하철',
        arc: '두 직장인이 각자 출퇴근길에 아카이뷰를 발견하고, 피곤하고 무감각했던 일상이 희망과 에너지로 변한다',
        color: '#3b82f6',
        mood: '공감 → 희망',
    },
    {
        id: 2,
        emoji: '🌙',
        title: '야근 후 새벽 버스',
        tagline: '가장 힘든 순간, 가장 좋은 인사이트',
        characters: '여자 단독',
        setting: '새벽 1시 텅 빈 버스 안',
        arc: '야근 후 새벽 버스에 홀로 탄 여자. 극도로 지쳐 창문에 기댄 채 이어폰을 꽂는다. 팟캐스트를 들으며 표정이 서서히 부드러워지고 눈빛에 빛이 돌아온다',
        color: '#8b5cf6',
        mood: '번아웃 → 회복',
    },
    {
        id: 3,
        emoji: '😩',
        title: '월요일 아침',
        tagline: '월요일도 달라질 수 있다',
        characters: '남자 단독',
        setting: '침대 → 출근길 지하철',
        arc: '알람을 5번 끄는 남자. 무기력하게 출근 준비. 지하철에서 헤드폰을 끼고 아카이뷰를 켜는 순간부터 표정이 달라지고 걸음걸이가 달라진다',
        color: '#f97316',
        mood: '무기력 → 각성',
    },
    {
        id: 4,
        emoji: '☀️',
        title: '점심시간 옥상',
        tagline: '12시 30분의 인사이트',
        characters: '남자 + 여자 (모르는 사이)',
        setting: '회사 옥상 / 점심 시간',
        arc: '점심을 혼자 먹으러 옥상에 온 두 사람. 각자 이어폰을 끼고 아카이뷰를 듣는다. 같은 공간에서 각자 성장하는 장면. 마지막에 눈이 마주치며 미소',
        color: '#f59e0b',
        mood: '일상 → 성장의 순간',
    },
    {
        id: 5,
        emoji: '💻',
        title: '카페 야근',
        tagline: '지친 밤, 카페에서 찾은 인사이트',
        characters: '여자 단독',
        setting: '밤 11시 카페, 노트북 앞',
        arc: '마감에 지쳐 카페에서 혼자 야근 중인 여자. 노트북 앞에서 멍하니 있다가 이어폰을 꽂고 아카이뷰를 켠다. 집중력이 돌아오고 손이 다시 키보드를 두드리기 시작한다',
        color: '#ec4899',
        mood: '번아웃 → 집중력 회복',
    },
    {
        id: 6,
        emoji: '🌧️',
        title: '비오는 퇴근길',
        tagline: '빗속에서도 귀는 성장한다',
        characters: '남자 단독',
        setting: '비오는 저녁, 거리 + 지하철',
        arc: '비가 쏟아지는 퇴근길. 우산을 들고 터덜터덜 걷는 남자. 지하철 들어가며 헤드폰을 쓰고 아카이뷰를 켠다. 빗소리가 배경이 되고 그의 세계가 달라진다',
        color: '#06b6d4',
        mood: '우울 → 감성적 충전',
    },
    {
        id: 7,
        emoji: '🏃',
        title: '주말 아침 러닝',
        tagline: '몸도 마음도 함께 달린다',
        characters: '남자 단독',
        setting: '주말 이른 아침, 한강 러닝코스',
        arc: '주말 아침 침대에서 억지로 일어나는 남자. 러닝 나가서 헤드폰 끼고 아카이뷰를 켠다. 달리면서 인사이트를 듣고 눈빛이 살아난다. 마지막엔 뛰는 속도가 빨라진다',
        color: '#22c55e',
        mood: '게으름 → 활력',
    },
    {
        id: 8,
        emoji: '🤔',
        title: '승진 고민',
        tagline: '답은 이미 존재한다',
        characters: '남자 + 여자 (동료)',
        setting: '회사 복도 / 엘리베이터 앞',
        arc: '각자 승진 문제로 고민하며 복도를 걷는 두 사람. 각자 이어폰을 꽂고 아카이뷰를 듣는다. 같은 고민을 하던 두 사람이 각자 작은 확신을 얻은 표정으로 마무리',
        color: '#a855f7',
        mood: '고민 → 확신',
    },
    {
        id: 9,
        emoji: '📈',
        title: '1달 전 vs 지금',
        tagline: '10분이 쌓이면 사람이 달라진다',
        characters: '남자 단독',
        setting: '같은 지하철 / 1달 간격 비교',
        arc: '1달 전: 멍하니 폰만 보는 무기력한 남자. 지금: 헤드폰 끼고 아카이뷰 들으며 노트 앱에 메모하는 남자. 분할화면으로 두 모습을 대비. 마지막에 "10분이 달랐다"',
        color: '#f97316',
        mood: '대비 → 동기부여',
    },
    {
        id: 10,
        emoji: '👥',
        title: '모두 흘려보낼 때',
        tagline: '다들 볼 때, 당신은 채운다',
        characters: '여러 사람 + 여자 단독',
        setting: '지하철 안 / 여러 사람들',
        arc: '지하철 안 모두가 숏폼 영상을 보고 있다. 카메라가 한 명씩 스캔. 한 여자만 이어폰 끼고 아카이뷰를 듣고 있다. 그녀의 표정만 다르다. "모두 흘려보낼 때, 당신은 채워갑니다"',
        color: '#64748b',
        mood: '대조 → 각성',
    },
];

const STEP = { SELECT: 1, STORYBOARD: 2, PROMPTS: 3 };

export default function Test5() {
    const [step, setStep] = useState(STEP.SELECT);
    const [selected, setSelected] = useState(null);
    const [storyboard, setStoryboard] = useState(null);
    const [prompts, setPrompts] = useState(null);
    const [loadingSB, setLoadingSB] = useState(false);
    const [loadingPR, setLoadingPR] = useState(false);
    const [copied, setCopied] = useState('');

    const copyText = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(''), 2000);
    };

    const CopyBtn = ({ text, id, label = '복사' }) => (
        <button
            onClick={() => copyText(text, id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0"
            style={{
                background: copied === id ? '#22c55e20' : '#ffffff10',
                color: copied === id ? '#22c55e' : '#9ca3af',
                border: `1px solid ${copied === id ? '#22c55e40' : '#ffffff10'}`,
            }}
        >
            <span className="material-symbols-outlined text-[13px]">
                {copied === id ? 'check' : 'content_copy'}
            </span>
            {copied === id ? '복사됨!' : label}
        </button>
    );

    // JSON 수리 함수
    const safeParseJson = (raw) => {
        // 마크다운 코드블록 제거
        let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        // 문자열 안의 제어 문자(줄바꿈, 탭 등) → 공백으로 치환
        text = text.replace(/"((?:[^"\\]|\\.)*)"/g, (match) =>
            match.replace(/[\x00-\x1F\x7F]/g, ' ')
        );
        try { return JSON.parse(text); } catch {}
        // { } 사이 추출 후 재시도
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            try { return JSON.parse(text.slice(start, end + 1)); } catch {}
        }
        return null;
    };

    // 스토리보드 생성
    const generateStoryboard = async (story) => {
        setLoadingSB(true);
        setStoryboard(null);
        setPrompts(null);

        const prompt = `You are an Instagram Reels CF director. Create a 6-cut storyboard based on the story concept below.

Story: ${story.title} - ${story.tagline}
Characters: ${story.characters}
Setting: ${story.setting}
Arc: ${story.arc}
Mood: ${story.mood}
Format: Vertical 9:16, 15-30 seconds Instagram Reels

Male character: ${CHAR_MAN}
Female character: ${CHAR_WOMAN}

Rules:
- 6 cuts total (3-5 seconds each)
- Emotion flow: problem/empathy -> turning point -> change/hope -> CTA
- Cuts 1-2: empathy scenes (tired, struggling reality)
- Cuts 3-4: discovering and starting Archiview app
- Cut 5: transformation (expression/emotion change)
- Cut 6: logo + CTA

IMPORTANT: Output ONLY valid JSON. No markdown, no explanation. Use double quotes. No newlines inside string values.

{"cuts":[{"cut":1,"title":"cut title in Korean","character":"man","scene":"scene description in Korean","emotion":"emotion in Korean","camera":"camera angle and movement in English","color":"color and lighting in English","sound":"music and sfx in Korean","transition":"transition in Korean","duration":"3sec"}]}`;

        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
                    }),
                }
            );
            const data = await res.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log('[SB raw]', rawText.slice(0, 300));

            const parsed = safeParseJson(rawText);
            if (!parsed?.cuts?.length) {
                console.error('[SB full]', rawText);
                alert('스토리보드 생성 실패. 다시 시도해주세요.');
                return;
            }

            setStoryboard(parsed);
            setStep(STEP.STORYBOARD);
        } catch (e) {
            console.error(e);
            alert('스토리보드 생성 오류: ' + e.message);
        } finally {
            setLoadingSB(false);
        }
    };

    // ImageFX + Flow 프롬프트 생성
    const generatePrompts = async () => {
        if (!storyboard?.cuts || storyboard.cuts.length === 0) {
            alert('스토리보드 데이터가 없습니다. 다시 생성해주세요.');
            return;
        }
        setLoadingPR(true);
        setPrompts(null);

        const cutsText = storyboard.cuts.map(c =>
            `컷${c.cut} [${c.title}] 인물:${c.character} / 장면:${c.scene} / 카메라:${c.camera} / 색감:${c.color} / 사운드:${c.sound}`
        ).join('\n');

        const prompt = `You are an AI image and video prompt expert for Instagram Reels ads.
Generate ImageFX (image generation) and Flow AI (img2video) prompts for each of the 6 cuts below.

Male character (use in every cut with male): ${CHAR_MAN}
Female character (use in every cut with female): ${CHAR_WOMAN}

Storyboard:
${cutsText}

--- IMAGEFX PROMPT (static photo, English, 80-120 words) ---
Must include: character description + exact pose + facial expression + background + camera lens + lighting + color grade.
End with: photorealistic, Canon EOS R5, 85mm f/1.4, shallow depth of field.
NO motion words (no zoom, move, transition).

--- FLOW AI PROMPT (Gemini Image-to-Video, Korean, 50-80 chars) ---
Format: "이미지에서 [피사체 행동]. 카메라가 [카메라 움직임]. [스타일/조명] 분위기."
4 elements required:
1. 피사체(Subject): who/what is doing something
2. 행동/배경(Action&Setting): what action, where
3. 카메라 움직임(Camera): 천천히 줌인 / 트래킹 샷 / 슬로우모션 / 드론뷰 etc
4. 스타일/조명(Style): 시네마틱 / 따뜻한 자연광 / 차가운 형광등 / 감성적 etc
Example: "이미지에서 지친 표정의 남성이 눈을 감고 헤드폰을 천천히 귀에 올린다. 카메라가 얼굴로 서서히 줌인. 따뜻한 오렌지 빛이 얼굴을 감싸는 시네마틱 분위기."

If cut character is "both" or "group": imagefx_b = second character ImageFX prompt. Otherwise null.
editing_guide and music_guide: Korean. caption: Korean with hashtags.

IMPORTANT: Output ONLY valid JSON. No markdown. No newlines inside strings. Double quotes only.

{"cuts":[{"cut":1,"imagefx":"...","imagefx_b":null,"flow":"..."}],"editing_guide":"...","music_guide":"...","caption":"..."}`;

        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
                    }),
                }
            );
            const data = await res.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log('[PR raw]', rawText.slice(0, 300));

            const parsed = safeParseJson(rawText);
            if (!parsed?.cuts?.length) {
                console.error('[PR full]', rawText);
                alert('프롬프트 생성 실패. 다시 시도해주세요.');
                return;
            }
            setPrompts(parsed);
            setStep(STEP.PROMPTS);
        } catch (e) {
            console.error(e);
            alert('프롬프트 생성 오류: ' + e.message);
        } finally {
            setLoadingPR(false);
        }
    };

    const charColor = (c) => ({ man: '#3b82f6', woman: '#ec4899', both: '#f97316', group: '#64748b' }[c] || '#888');
    const charLabel = (c) => ({ man: '👔 남자', woman: '👩 여자', both: '👥 두 사람', group: '👥 여러 사람' }[c] || c);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pb-24" style={{ fontFamily: "'Pretendard', sans-serif" }}>

            {/* 헤더 */}
            <div className="sticky top-0 z-50 px-5 py-4 border-b border-white/5" style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)' }}>
                        <span className="material-symbols-outlined text-[18px]">movie</span>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-[15px] font-black">CF 광고 제작 도우미</h1>
                        <p className="text-[11px] text-white/40">스토리 선택 → 스토리보드 → ImageFX + Flow AI</p>
                    </div>
                </div>

                {/* 스텝 인디케이터 */}
                <div className="flex items-center gap-1.5 mt-3">
                    {[{ n: 1, label: '스토리 선택' }, { n: 2, label: '스토리보드' }, { n: 3, label: 'AI 프롬프트' }].map((s, i) => (
                        <div key={s.n} className="flex items-center gap-1.5">
                            <button
                                onClick={() => step >= s.n && setStep(s.n)}
                                className="flex items-center gap-1"
                            >
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all"
                                    style={{ background: step > s.n ? '#22c55e' : step === s.n ? '#f97316' : '#ffffff15', color: step >= s.n ? '#fff' : '#555' }}>
                                    {step > s.n ? '✓' : s.n}
                                </div>
                                <span className="text-[10px] font-bold" style={{ color: step === s.n ? '#f97316' : '#555' }}>{s.label}</span>
                            </button>
                            {i < 2 && <div className="w-3 h-px" style={{ background: step > s.n ? '#22c55e50' : '#ffffff15' }} />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="px-5 pt-5">

                {/* STEP 1: 스토리 선택 */}
                {step === STEP.SELECT && (
                    <div>
                        <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-4">10가지 광고 스토리 — 하나를 선택하세요</p>
                        <div className="space-y-3">
                            {STORIES.map(story => (
                                <motion.button
                                    key={story.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => { setSelected(story); generateStoryboard(story); }}
                                    disabled={loadingSB}
                                    className="w-full text-left p-4 rounded-2xl transition-all"
                                    style={{ background: '#111', border: `1px solid ${story.color}30` }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${story.color}20` }}>
                                            {story.emoji}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[13px] font-black">{story.title}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0" style={{ background: `${story.color}25`, color: story.color }}>
                                                    {story.characters}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold mb-1" style={{ color: story.color }}>"{story.tagline}"</p>
                                            <p className="text-[11px] text-white/40 leading-relaxed">{story.arc.slice(0, 60)}...</p>
                                            <div className="flex items-center gap-1 mt-1.5">
                                                <span className="text-[9px] text-white/30">📍 {story.setting}</span>
                                                <span className="mx-1 text-white/20">·</span>
                                                <span className="text-[9px] text-white/30">😮 {story.mood}</span>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-white/20 text-[20px] shrink-0">chevron_right</span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* 로딩 */}
                        {loadingSB && selected && (
                            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
                                <div className="w-12 h-12 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin mb-4" />
                                <p className="text-[15px] font-black mb-1">{selected.emoji} {selected.title}</p>
                                <p className="text-[12px] text-white/50">스토리보드 6컷 생성 중...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2: 스토리보드 */}
                {step === STEP.STORYBOARD && storyboard && selected && (
                    <div>
                        {/* 선택된 스토리 요약 */}
                        <div className="p-4 rounded-2xl mb-4" style={{ background: `${selected.color}15`, border: `1px solid ${selected.color}40` }}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">{selected.emoji}</span>
                                <div>
                                    <p className="text-[13px] font-black">{selected.title}</p>
                                    <p className="text-[11px] font-bold" style={{ color: selected.color }}>"{selected.tagline}"</p>
                                </div>
                                <button onClick={() => { setStep(STEP.SELECT); setSelected(null); setStoryboard(null); setPrompts(null); }}
                                    className="ml-auto text-[10px] text-white/30 px-2 py-1 rounded-lg" style={{ background: '#ffffff10' }}>
                                    다시 선택
                                </button>
                            </div>
                        </div>

                        <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-3">6컷 스토리보드</p>

                        <div className="space-y-3 mb-5">
                            {storyboard.cuts?.map((cut) => (
                                <div key={cut.cut} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${charColor(cut.character)}25` }}>
                                    <div className="px-4 py-3 flex items-center gap-3" style={{ background: `${charColor(cut.character)}15` }}>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[13px] shrink-0" style={{ background: charColor(cut.character) }}>
                                            {cut.cut}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-black">{cut.title}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold" style={{ color: charColor(cut.character) }}>{charLabel(cut.character)}</span>
                                                <span className="text-[10px] text-white/30">· {cut.duration}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3" style={{ background: '#0d0d0d' }}>
                                        {/* 스케치 썸네일 */}
                                        <div className="w-full" style={{ maxWidth: '260px' }}>
                                            <SketchFrame cut={cut} color={charColor(cut.character)} />
                                        </div>
                                        <p className="text-[12px] text-white/80 leading-relaxed">{cut.scene}</p>
                                        <div className="flex flex-wrap gap-1">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#1a1a1a', color: '#f97316' }}>
                                                {cut.emotion}
                                            </span>
                                        </div>
                                        <div className="space-y-1 pt-1">
                                            {[
                                                { icon: '📷', color: '#fbbf24', val: cut.camera },
                                                { icon: '🎨', color: '#a855f7', val: cut.color },
                                                { icon: '🎵', color: '#60a5fa', val: cut.sound },
                                                { icon: '✂️', color: '#34d399', val: cut.transition },
                                            ].map(({ icon, color, val }) => val && (
                                                <div key={icon} className="flex items-start gap-2">
                                                    <span className="text-[11px] shrink-0" style={{ color }}>{icon}</span>
                                                    <span className="text-[11px] text-white/40 leading-relaxed">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 인물 일관성 안내 */}
                        <div className="p-4 rounded-2xl mb-5" style={{ background: '#111', border: '1px solid #f9731625' }}>
                            <p className="text-[11px] font-black text-orange-400 mb-2">💡 인물 일관성 유지 방법</p>
                            <ul className="space-y-1">
                                {['ImageFX에서 각 컷 생성 시 인물 설명을 그대로 복붙', '마음에 드는 이미지 1장 선택 후 Flow AI에 업로드', 'Flow AI img2video로 해당 이미지를 영상으로 변환', 'CapCut에서 6개 클립 순서대로 편집 + 자막 추가'].map((t, i) => (
                                    <li key={i} className="flex items-start gap-2 text-[11px] text-white/50">
                                        <span className="text-orange-400 font-black shrink-0">{i + 1}.</span>{t}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 프롬프트 생성 버튼 */}
                        <motion.button
                            onClick={generatePrompts}
                            disabled={loadingPR}
                            whileTap={{ scale: 0.97 }}
                            className="w-full py-4 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2"
                            style={{ background: loadingPR ? '#333' : 'linear-gradient(135deg, #f97316, #dc2626)', opacity: loadingPR ? 0.7 : 1 }}
                        >
                            {loadingPR ? (
                                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />ImageFX + Flow 프롬프트 생성 중...</>
                            ) : (
                                <><span className="material-symbols-outlined text-[20px]">auto_awesome</span>ImageFX + Flow AI 프롬프트 생성하기</>
                            )}
                        </motion.button>
                    </div>
                )}

                {/* STEP 3: AI 프롬프트 */}
                {step === STEP.PROMPTS && prompts && (
                    <div>
                        {/* 사용 순서 안내 */}
                        <div className="mb-4 p-4 rounded-2xl" style={{ background: '#0d1f0d', border: '1px solid #22c55e30' }}>
                            <p className="text-[11px] font-black text-green-400 mb-2">📋 제미나이 영상 제작 순서</p>
                            <div className="space-y-2">
                                {[
                                    { step: '1', color: '#a855f7', icon: '🖼️', title: 'ImageFX에서 이미지 생성', desc: '아래 보라색 프롬프트 복사 → ImageFX 붙여넣기 → 이미지 생성 후 다운로드' },
                                    { step: '2', color: '#3b82f6', icon: '🎬', title: 'Gemini에 이미지 업로드', desc: '다운받은 이미지를 Gemini 채팅에 업로드 (최대 3장) → 아래 파란색 프롬프트 붙여넣기' },
                                    { step: '3', color: '#f97316', icon: '✂️', title: 'CapCut에서 편집', desc: '6개 영상 클립을 순서대로 이어붙이기 → 자막 → 음악' },
                                ].map(s => (
                                    <div key={s.step} className="flex items-start gap-2.5">
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5" style={{ background: s.color }}>
                                            {s.step}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-white/80">{s.icon} {s.title}</p>
                                            <p className="text-[10px] text-white/40 leading-relaxed">{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 인물 설명 카드 */}
                        <div className="mb-4 p-4 rounded-2xl" style={{ background: '#111', border: '1px solid #ffffff10' }}>
                            <p className="text-[11px] font-black text-white/40 mb-3">👤 인물 고정 설명 (ImageFX 매 컷 앞에 붙여넣기)</p>
                            <div className="space-y-2">
                                {[{ label: '👔 남자', text: CHAR_MAN, id: 'char-man', color: '#3b82f6' }, { label: '👩 여자', text: CHAR_WOMAN, id: 'char-woman', color: '#ec4899' }].map(c => (
                                    <div key={c.id}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-black" style={{ color: c.color }}>{c.label}</span>
                                            <CopyBtn text={c.text} id={c.id} />
                                        </div>
                                        <div className="p-2.5 rounded-lg" style={{ background: '#0a0a0a' }}>
                                            <p className="text-[10px] text-white/40 font-mono leading-relaxed">{c.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-3">컷별 AI 프롬프트</p>

                        {/* 컷별 프롬프트 */}
                        <div className="space-y-4 mb-4">
                            {prompts.cuts?.map((cut, i) => {
                                const sb = storyboard?.cuts?.[i];
                                return (
                                    <div key={cut.cut} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${charColor(sb?.character)}20` }}>
                                        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: `${charColor(sb?.character)}12` }}>
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] shrink-0" style={{ background: charColor(sb?.character) }}>
                                                {cut.cut}
                                            </div>
                                            <p className="text-[12px] font-black">{sb?.title}</p>
                                            <span className="text-[10px] text-white/30 ml-auto">{sb?.duration}</span>
                                        </div>
                                        <div className="p-4 space-y-3" style={{ background: '#0d0d0d' }}>
                                            {/* ImageFX */}
                                            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #7c3aed40' }}>
                                                <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#7c3aed20' }}>
                                                    <div>
                                                        <p className="text-[11px] font-black text-purple-400">🖼️ STEP 1 — ImageFX {cut.imagefx_b ? '(남자)' : ''}</p>
                                                        <p className="text-[9px] text-white/30">이미지 생성용 · 정지 사진 프롬프트</p>
                                                    </div>
                                                    <CopyBtn text={cut.imagefx} id={`ifx-${cut.cut}`} />
                                                </div>
                                                <div className="p-3" style={{ background: '#0a0a0a' }}>
                                                    <p className="text-[11px] text-purple-200 font-mono leading-relaxed">{cut.imagefx}</p>
                                                </div>
                                            </div>
                                            {/* ImageFX B */}
                                            {cut.imagefx_b && (
                                                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #db277740' }}>
                                                    <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#db277720' }}>
                                                        <div>
                                                            <p className="text-[11px] font-black text-pink-400">🖼️ STEP 1 — ImageFX (여자)</p>
                                                            <p className="text-[9px] text-white/30">이미지 생성용 · 정지 사진 프롬프트</p>
                                                        </div>
                                                        <CopyBtn text={cut.imagefx_b} id={`ifx-b-${cut.cut}`} />
                                                    </div>
                                                    <div className="p-3" style={{ background: '#0a0a0a' }}>
                                                        <p className="text-[11px] text-pink-200 font-mono leading-relaxed">{cut.imagefx_b}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Flow AI */}
                                            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1d4ed840' }}>
                                                <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#1d4ed820' }}>
                                                    <div>
                                                        <p className="text-[11px] font-black text-blue-400">🎬 STEP 2 — Flow AI (img→video)</p>
                                                        <p className="text-[9px] text-white/30">이미지 업로드 후 영상 변환용 · 카메라 무브먼트 프롬프트</p>
                                                    </div>
                                                    <CopyBtn text={cut.flow} id={`flow-${cut.cut}`} />
                                                </div>
                                                <div className="p-3" style={{ background: '#0a0a0a' }}>
                                                    <p className="text-[11px] text-blue-200 font-mono leading-relaxed">{cut.flow}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 편집 가이드 */}
                        {prompts.editing_guide && (
                            <div className="p-4 rounded-2xl mb-3" style={{ background: '#111', border: '1px solid #22c55e20' }}>
                                <p className="text-[12px] font-black text-green-400 mb-2">✂️ CapCut 편집 가이드</p>
                                <p className="text-[12px] text-white/60 leading-relaxed whitespace-pre-wrap">{prompts.editing_guide}</p>
                            </div>
                        )}

                        {/* 음악 가이드 */}
                        {prompts.music_guide && (
                            <div className="p-4 rounded-2xl mb-3" style={{ background: '#111', border: '1px solid #8b5cf620' }}>
                                <p className="text-[12px] font-black text-purple-400 mb-2">🎵 음악 가이드</p>
                                <p className="text-[12px] text-white/60 leading-relaxed whitespace-pre-wrap">{prompts.music_guide}</p>
                            </div>
                        )}

                        {/* 인스타 캡션 */}
                        {prompts.caption && (
                            <div className="p-4 rounded-2xl mb-4" style={{ background: '#111', border: '1px solid #f9731620' }}>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[12px] font-black text-orange-400">📱 인스타그램 캡션</p>
                                    <CopyBtn text={prompts.caption} id="caption" />
                                </div>
                                <p className="text-[12px] text-white/60 leading-relaxed whitespace-pre-wrap">{prompts.caption}</p>
                            </div>
                        )}

                        {/* 하단 버튼 */}
                        <div className="flex gap-2">
                            <button onClick={() => setStep(STEP.STORYBOARD)}
                                className="flex-1 py-3 rounded-xl text-[12px] font-bold text-white/40"
                                style={{ background: '#1a1a1a', border: '1px solid #ffffff10' }}>
                                ← 스토리보드
                            </button>
                            <button onClick={() => { setStep(STEP.SELECT); setSelected(null); setStoryboard(null); setPrompts(null); }}
                                className="flex-1 py-3 rounded-xl text-[12px] font-bold text-white/40"
                                style={{ background: '#1a1a1a', border: '1px solid #ffffff10' }}>
                                처음부터
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
