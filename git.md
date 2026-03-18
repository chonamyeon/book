# The Archiview — 프로젝트 현황 정리

> 최종 업데이트: 2026-03-18 (TTS 최적화 파이프라인 + 배치 모드 3종)
> 배포: https://book-site-123.web.app
> 저장소: https://github.com/chonamyeon/book

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React 19, React Router 7, Vite 7 |
| 스타일 | Tailwind CSS 3, Framer Motion |
| 백엔드 | Firebase (Auth, Firestore, Storage), Firebase Hosting |
| AI | Claude Sonnet 4.6 (대본 생성), Claude Haiku (맞춤법), Gemini 2.5 Flash (TTS 최적화), Gemini 2.5 Pro/Flash TTS |
| 결제 | Toss Payments (예정) |
| 국제화 | i18next |

---

## 주요 페이지

| 경로 | 페이지 | 인증 |
|------|--------|------|
| `/` | 홈 | X |
| `/editorial` | 에디토리얼 | X |
| `/celebrity/:id` | 셀럽 프로필 | X |
| `/quiz` | 독서 성향 퀴즈 | X |
| `/result` | 퀴즈 결과 | ✅ |
| `/library` | 나의 서재 | ✅ |
| `/profile` | 프로필 | ✅ |
| `/membership` | 멤버십 | X |
| `/reading-notes` | 독서 노트 | ✅ |
| `/admin` | 관리자 대시보드 | 비밀번호 |

---

## 핵심 파일 구조

```
src/
├── App.jsx                   # 라우팅 (모든 페이지 lazy loading)
├── firebase.js               # Firebase 초기화 (API 키 → .env)
├── contexts/
│   └── AudioContext.jsx      # 오디오 재생 전역 상태
├── components/
│   ├── MiniPlayer.jsx        # 팟캐스트 미니 플레이어
│   ├── PodcastScriptModal.jsx # 대본 모달
│   ├── BottomNavigation.jsx  # 하단 네비
│   └── TopNavigation.jsx     # 상단 네비
├── data/
│   ├── bookScripts.js        # 팟캐스트 대본 (221KB)
│   ├── celebrities.js        # 셀럽 프로필 50+ (289KB)
│   ├── availableAudio.js     # 오디오 파일 목록
│   └── resultData.js         # 퀴즈 결과 데이터
├── hooks/
│   └── useBookData.js        # Firestore 데이터 훅
└── pages/
    ├── AdminDashboard.jsx    # 관리자 (AI 대본 생성, TTS, 팟캐스트 등록)
    ├── Home.jsx
    ├── Editorial.jsx
    ├── Celebrity.jsx
    ├── Quiz.jsx / Result.jsx
    ├── Library.jsx
    ├── Profile.jsx
    ├── ReadingNotes.jsx
    └── Membership.jsx
```

---

## AdminDashboard — AI 대본 생성 파이프라인

```
1. 책 정보 입력 (제목, 저자, 테마)
2. Claude Sonnet 4.6 → 45턴 대본 생성 (JSON 배열)
3. Claude Haiku → 맞춤법 검사 (자동)
4. 대본 미리보기 + 인라인 편집
5. Gemini 2.5 Flash → TTS 최적화 (문장 분리·숫자 한글화·불필요 표기 제거)
6. Gemini 2.5 Pro/Flash TTS → WAV 변환
7. 인트로/아웃트로 병합 → MP3
8. Firestore 저장 + 팟캐스트 활성화
```

### TTS 최적화 단계 (optimizeScriptForTts)

TTS 직전 자동 실행. 실패 시 원본 그대로 진행.

| 규칙 | 내용 |
|------|------|
| 문장 분리 | 쉼표 없이 30자 이상이면 의미 단위로 끊음 |
| 숫자 한글화 | 3만→삼만, 1천→천, CEO→씨이오, SNS→에스엔에스 |
| 표기 제거 | ㅋㅋㅋ/ㅎㅎ 삭제, ...→마침표, ~→삭제, !!→! |
| 금지 | 괄호 지시문 추가 금지, 내용·턴 수 변경 금지 |

### 대본 구조 (45턴 고정)

| 구간 | 내용 |
|------|------|
| 턴 1~3 | 상황 설명 (책 언급 금지) |
| 턴 4~8 | 책 소개 + 스텔라 첫 질문 |
| 턴 9~37 | 핵심 인사이트 + 현실 사례 + 행동 인사이트 (턴 제한 없음, 내용 중심) |
| ~턴 39 | 구매 유도 멘트 1회 (수렴 직전 필수) |
| 턴 40~42 | 수렴 (3턴, 에너지 낮추며 마무리) |
| 턴 43~45 | 여운 있는 클로징 (3턴, 별도 생성) |

### AI 대본 생성 프롬프트 주요 규칙
- **화자 역할**: 제임스(책 소개) ↔ 스텔라(질문·반응) — 역할 교체 금지
- **구매 유도**: 수렴 직전 반드시 1회 삽입 (생략 시 실패)
- **저작권**: 핵심 개념 맛보기만, 원문 인용·수치 금지
- **max_tokens**: 5000
- **클로징**: 제임스는 쿨하게 행동으로 마무리, 스텔라가 따뜻한 감사 멘트 담당

---

## AdminDashboard — 일괄 자동화 (automation 탭)

### 개요
단일 1:1:1 모드(AI 대본 생성 탭)는 절대 건드리지 않고, 배치 전용 함수/상태를 완전 분리하여 구현.

### 배치 모드 3가지

| 모드 | 색상 | 동작 |
|------|------|------|
| **풀 배치** | 보라 | 대본 생성(Claude) → Flash 최적화 → Firestore 저장 → TTS → WAV |
| **TTS 전용** | 초록 | Firestore 대본 → Flash 최적화 → TTS → WAV (대본 없으면 스킵) |
| **대본 최적화** | 노랑 | Firestore 대본 → Flash 교정 → Firestore 저장 → TTS → WAV |

### 추가된 상태 (배치 전용)

```js
const [batchLogs, setBatchLogs] = useState([]);
const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
const [batchMode, setBatchMode] = useState('full'); // 'full' | 'tts-only'
const [batchBookStatuses, setBatchBookStatuses] = useState({});
// { [bookId]: 'pending' | 'generating' | 'tts' | 'done' | 'error' }
const [batchScriptStatuses, setBatchScriptStatuses] = useState({});
// { [bookId]: true(스크립트 있음) | false(없음) }
const [batchScriptPreview, setBatchScriptPreview] = useState(null);
// { bookId, title, script: [{speaker, text}] } | null
```

### 추가된 함수

#### `runTtsForBook(script, bookId, addBatchLog)`
- 단일 모드 상태(isTtsRunning 등) 일절 건드리지 않는 독립 TTS 헬퍼
- `ttsModel`, `voiceA`, `voiceB` 공유 상태 읽기만 참조
- Gemini 멀티키 로테이션 + 자동 재시도
- 경과 시간 타이머(`setInterval`) — 매 1초 배치 로그 갱신
- 완료 시 `{bookId}_tts.wav` 자동 다운로드

```js
const runTtsForBook = async (script, bookId, addBatchLog) => {
    // BATCH=100 (45턴 대본은 항상 1번 호출로 처리)
    // 경과 타이머
    let elapsed = 0;
    const timerInterval = setInterval(() => {
        elapsed++;
        setBatchLogs(prev => {
            const filtered = prev.filter(l => !l.includes(`⏳ [${bookId}]`));
            return [...filtered, `[...] ⏳ [${bookId}] 배치 ${b+1}/${batches.length} 생성 중... ${elapsed}초 경과`];
        });
    }, 1000);
    // fetch → clearInterval(timerInterval) on success or catch
};
```

#### `optimizeScriptForTts(script, logFn)`
- Gemini 2.5 Flash (`gemini-2.5-flash`) 텍스트 API 호출
- 단일 모드(`handleRunTts`) + 배치 모드(`runTtsForBook`) TTS 직전 공통 실행
- 실패 시 원본 script 그대로 반환 (TTS는 계속 진행)

#### `handleBatchRun(mode)`
- `mode='full'`: 대본 생성(Claude) → 최적화 → TTS
- `mode='tts-only'`: Firestore 대본 → 최적화 → TTS (없으면 스킵)
- `mode='optimize-only'`: Firestore 대본 → 최적화 → Firestore 저장 → TTS
- 기존 `handleGenerateScript({ isBatch: true })` 호출 (단일 모드 UI 상태 우회)

### UI 구성 (automation 탭)

- **작업 현황 4카드**: 전체 / 완료(대본+TTS) / 대본만 / 미시작
- **도서 목록**: 체크박스 + 상태 뱃지 (✅완료 / 📝대본만 / ⬜미시작)
  - 뱃지 클릭 → 스크립트 미리보기 모달
- **스크립트 미리보기 모달**: 턴별 인라인 편집 → Firestore 저장 → "이 도서 TTS 실행" 버튼
- **진행 상황**: 전체 진행바 + 도서별 상태 요약 + 배치 로그 패널

### TTS 발화 속도 지시 (배치·단일 모두 적용)

```
전체 발화 속도를 평소보다 20~25% 느리게 유지할 것.
쉼표(,)에서 0.5초, 마침표(.)에서 1초 이상 반드시 쉬어 읽을 것.
```

### Firestore 스크립트 상태 조회 (탭 진입 시 자동)

```js
useEffect(() => {
    if (activeTab !== 'automation' || !realBooks.length) return;
    // 전체 도서 Firestore scripts/{id} 존재 여부 일괄 조회
    // → setBatchScriptStatuses({ [bookId]: boolean })
}, [activeTab, realBooks.length]);
```

---

## 환경 변수 (.env — gitignore 처리됨)

```
VITE_GEMINI_API_KEY=...        # Gemini TTS API
VITE_FIREBASE_API_KEY=...      # Firebase 웹 API 키
ANTHROPIC_API_KEY=...          # Claude API
```

> ⚠️ `.env` 파일은 절대 커밋하지 않음

---

## 배포

```bash
npm run build          # build_output/ 생성
firebase deploy --only hosting
```

- Firebase Hosting: `book-site-123.web.app`
- Vercel (auth domain): `book-psi-sage.vercel.app`
- 오디오 파일: `public/audio/` → Firebase Hosting

---

## 알려진 이슈 / TODO

- [ ] Kakao 로그인 미완성 (현재 가짜 성공 처리)
- [ ] Toss Payments 실제 연동 (현재 window.confirm)
- [ ] Admin 비밀번호 소스코드 노출 (환경변수 이동 필요)
- [ ] celebrities.js / bookScripts.js 초기 로드 성능 최적화
