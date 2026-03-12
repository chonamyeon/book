# The Archiview — 프로젝트 현황 정리

> 최종 업데이트: 2026-03-12
> 배포: https://book-site-123.web.app
> 저장소: https://github.com/chonamyeon/book

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React 19, React Router 7, Vite 7 |
| 스타일 | Tailwind CSS 3, Framer Motion |
| 백엔드 | Firebase (Auth, Firestore, Storage), Firebase Hosting |
| AI | Claude Sonnet 4.6 (대본 생성), Claude Haiku (맞춤법), Gemini 2.5 Pro/Flash TTS |
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
5. Gemini 2.5 Pro/Flash TTS → WAV 변환
6. 인트로/아웃트로 병합 → MP3
7. Firestore 저장 + 팟캐스트 활성화
```

### 대본 구조 (45턴 고정)

| 구간 | 내용 |
|------|------|
| 턴 1~3 | 상황 설명 (책 언급 금지) |
| 턴 4~8 | 책 소개 + 스텔라 첫 질문 |
| 턴 9~25 | 핵심 인사이트 탐구 |
| 턴 26~35 | 현실 사례 연결 (최소 2개) |
| 턴 36~40 | 행동 인사이트 + 구매 유도 멘트 1회 |
| 턴 41~45 | 여운 있는 클로징 (5턴) |

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
