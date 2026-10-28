# 한끼예산

주간/월간 식비 예산을 정하면 학교 주변 식당 중 예산에 맞는 곳을 추천하고,
먹은 걸 기록할 때마다 남은 예산을 남은 끼니로 다시 나눠 다음 한 끼 금액을 계산하는 웹앱.

- Next.js 16 (App Router) · TypeScript · CSS Modules
- 기록과 설정은 브라우저에 저장 (localStorage, 키 `hankki/v1`)
- 처음에는 Expo 앱으로 만들었다가 Next.js로 옮겼다. Expo 버전은 git 기록에 남아 있다.

## 실행

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 배포용 빌드
npm start       # 빌드한 결과 실행
npm run lint
```

Windows PowerShell에서 `npm`이 막히면 `npm.cmd run dev`처럼 `.cmd`를 붙인다.

### `--webpack`을 쓰는 이유

`dev`, `build` 스크립트에 `--webpack`이 붙어 있다. Next.js 16 기본 번들러(Turbopack)는
32비트 Node.js(win32/ia32)에서 돌지 않기 때문이다. 64비트 Node.js를 쓰면 `--webpack`을 지워도 된다.

## 배포 (GitHub Pages)

`main`에 push하면 `.github/workflows/deploy-web.yml`이 정적 파일로 빌드해서 GitHub Pages에 올린다.
이때만 `PAGES_BASE_PATH=/저장소이름`이 지정되어 `out/` 폴더로 내보낸다 (`next.config.ts`).
정적 호스팅이라 서버 기능(Route Handler, Server Action, Cache Components)은 쓸 수 없다.

## 폴더 구조

```
src/
  app/                    화면 (폴더 하나 = 주소 하나)
    layout.tsx            공통 틀 (html, 메타데이터)
    page.tsx              홈 /           : 다음 한 끼 권장 금액, 추천 3곳
    recommend/page.tsx    추천 /recommend : 카테고리/위치/검색/정렬
    history/page.tsx      기록 /history   : 월간 달력, 되돌리기
    budget/page.tsx       예산 /budget    : 기간·금액·끼니·주말 제외
  components/
    app-shell.tsx         상태 저장소 + 토스트 + 하단 탭
    place-item.tsx        식당 카드 (펼치면 메뉴 + 먹기)
    toast.tsx, ui.tsx     공용 UI
  store/budget-store.tsx  설정·기록 상태와 브라우저 저장
  hooks/use-eat.ts        식당 선택·자동 선택 + 알림
  lib/budget.ts           예산 계산 (순수 함수, UI와 분리)
  data/places.ts          식당 예시 데이터
  theme.ts                색상
```

기록이 브라우저에만 있어서, 서버는 빈 틀(하단 탭)만 보내고 화면 내용은 브라우저에서 기록을 불러온 뒤에 그린다 (`BudgetProvider`).

## 예산 계산 규칙 (`src/lib/budget.ts`)

- 기간: 주간은 시작일부터 7일, 월간은 다음 달 같은 날 전까지
- 남은 일수: 오늘부터 기간 끝까지 (주말 제외 옵션 반영)
- 남은 끼니: 남은 일수 × 하루 끼니 − 오늘 이미 먹은 끼니
- **다음 한 끼 권장 = 남은 예산 ÷ 남은 끼니** (100원 단위 내림)
- 하루 권장 = 남은 예산 ÷ 남은 일수
- 상태: 남은 예산이 마이너스면 "초과", 한 끼 권장이 처음 기준의 85% 미만이면 "주의"
- 계획한 끼니를 다 먹었는데 기간이 남았으면(예: 주말 제외인데 주말) 남은 예산 전체를 쓸 수 있는 금액으로 표시

## 식당 데이터 (`src/data/places.ts`)

- 인하대(용현캠퍼스) 정문·후문·인하대역 주변 식당 101곳, 메뉴 약 430개
- 출처: 다이닝코드 식당 정보, 2026년 10월 수집. 가격은 바뀔 수 있음
- 술집·카페·고깃집처럼 혼자 한 끼 먹기 어려운 곳은 제외
- 도보 시간은 정문·후문 중 가까운 쪽에서의 직선거리로 계산한 대략값
- 가격이 바뀌면 해당 식당의 `menus` 배열만 고치면 됨

## 다음 단계

1. 지출 직접 입력 (추천 목록에 없는 곳)
2. 식당·메뉴 직접 등록/수정
3. 카카오 로컬 API로 주변 식당 검색 (API 키를 숨기려면 서버가 필요해서 GitHub Pages 대신 다른 호스팅 필요)
