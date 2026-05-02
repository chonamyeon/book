# Whiteboard (이카이뷰)

프리미엄 디지털 도서관 플랫폼 — 독서 성향 분석 + 맞춤 도서 추천 + 팟캐스트 요약 서비스

- **배포**: https://book-site-123.web.app
- **스택**: React 19 + Vite 7 + Vercel 12 + Tailwind CSS 3
- **Vercel Project**: book-site-123

---

## 커밋 이력

| 날짜 | 커밋 해시 | 내용 |
|------|-----------|------|
| 2026-03-24 | `02cc420` | AdminDashboard TDZ 버그 수정, AssemblyAI 일괄 타임스탬프 생성, iOS 모바일 최적화 |
| 이전 | `e729f14` | ebook.md 가이드 추가 및 이북 생성 프롬프트 개선 |
| 이전 | `1a30531` | 팟캐스트 대본 생성 파이프라인 전면 개선 |
| 이전 | `32f1d33` | 전체 소스 동기화 |

---

## 2026-03-24 작업 내용 (`02cc420`)

### 버그 수정
- **AdminDashboard TDZ 크래시**: `Cannot access 'B' before initialization` — `useEffect`가 `verifyBookId` 선언 전에 의존성 배열로 참조하는 문제 → 중복 `useEffect` 제거
- **AssemblyAI 타임스탬프 중복**: 전사 단어 소진 후 마지막 턴들이 동일 타임스탬프 → 남은 시간을 균등 분배하도록 수정
- **인트로 5초 오프셋**: 일부 파일 0초 시작 문제 → 첫 턴이 5초 미만이면 자동 보정

### 신규 기능
- **AssemblyAI 일괄 타임스탬프 생성**: TTS 검증 탭에 배치 UI 추가 (WAV 폴더 선택 → 다중 도서 순차 처리 → static data 자동 저장)

### iOS 모바일 최적화
- 채팅 말풍선 폰트 +3px (모바일 전용: 13.5→16.5px)
- Vercel 도메인 `preconnect` 추가
- Microsoft Clarity `window.load` 이후 defer
- Google Fonts / Material Symbols 비동기 로드 (렌더 블로킹 제거)
- 이북 파싱 `requestIdleCallback` defer
- iOS `-webkit-overflow-scrolling: touch` + GPU 하드웨어 가속
