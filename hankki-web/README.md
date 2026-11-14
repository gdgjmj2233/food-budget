# 한끼예산

주간/월간 식비 예산을 정하면 학교 주변 식당 중 예산에 맞는 곳을 추천하고,
먹은 만큼 하루 단위로 기록하고, 남은 예산을 남은 날로 나눠 오늘 쓸 수 있는 금액을 계산하는 웹앱.

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
npm run update:cafeteria   # 학생식당 이번 주 메뉴 받아 오기
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
    page.tsx              홈 /           : 오늘 남은 금액, 오늘 쓴 금액, 최근 기록
    recommend/page.tsx    주변 식당 /recommend : 카테고리/위치/검색/정렬
    cafeteria/page.tsx    학식 /cafeteria : 학생식당 요일별 메뉴·가격·운영 시간, 오늘 메뉴를 눌러 담고 한 번에 기록
    history/page.tsx      기록 /history   : 월간 달력, 날짜별 기록 고치기·지우기
    budget/page.tsx       예산 /budget    : 기간·금액·예산 편성 요일
  components/
    app-shell.tsx         상태 저장소 + 토스트 + 하단 탭
    place-item.tsx        식당 카드 (펼치면 메뉴 + 별점 + 여기서 밥먹기)
    eat-here.tsx          여기서 밥먹기: 메뉴 눌러 추가 + 직접 입력 → 한 번에 기록 (담기 상태 useTray 도 여기)
    cafeteria-tray.tsx    학식 탭 아래에 뜨는 "추가한 메뉴" 바
    toast.tsx, ui.tsx     공용 UI
  store/budget-store.tsx  설정·기록 상태와 브라우저 저장
  hooks/use-eat.ts        직접 입력·여기서 밥먹기 기록 + 알림
  lib/budget.ts           예산 계산 (순수 함수, UI와 분리)
  data/places.ts          식당 예시 데이터
  data/cafeteria-menu.json  학생식당 주간 메뉴 (scripts/update-cafeteria.mjs 가 만듦)
  theme.ts                색상
```

기록이 브라우저에만 있어서, 서버는 빈 틀(하단 탭)만 보내고 화면 내용은 브라우저에서 기록을 불러온 뒤에 그린다 (`BudgetProvider`).

## 예산 계산 규칙 (`src/lib/budget.ts`)

- 기간: 주간은 시작일부터 7일, 월간은 다음 달 같은 날 전까지
- 기간이 끝나면 같은 기간 종류·같은 예산으로 다음 기간이 끝난 다음 날부터 자동으로 이어진다 (`rollPeriod`). 직접 설정 기간은 같은 길이로 이어진다
- 남은 일수: 오늘부터 기간 끝까지 중 예산 편성 요일의 수 (설정에서 일~토 중 고름. 예전 "주말 제외" 설정은 월~금으로 읽음)
- 편성 요일이 아닌 날은 오늘 남은 금액을 "-"로 보여 주고, 그날 쓴 돈은 남은 예산에서 빠진다
- **하루 권장 = 오늘 쓰기 전 남은 예산 ÷ 남은 일수** (100원 단위 내림). 오늘 기록을 더해도 오늘 안에서는 그대로다
- **오늘 남은 금액 = 하루 권장 − 오늘 쓴 금액** (0원 아래로 내려가지 않음). 식당 추천도 이 금액을 기준으로 한다
- 기록 횟수에는 제한이 없다. 하루에 입력한 금액을 모두 더해서 계산한다
- 상태: 남은 예산이 마이너스면 "초과", 전체 예산의 30% 미만이면 "임박"
- 남은 편성 요일이 없는데 기간이 남았으면(예: 월~금만 편성인데 마지막 주말) 남은 예산 전체를 쓸 수 있는 금액으로 표시

## 식당 데이터 (`src/data/places.ts`)

- 인하대(용현캠퍼스) 정문·후문·인하대역 주변 식당 101곳, 메뉴 약 430개
- 출처: 다이닝코드 식당 정보, 2026년 10월 수집. 가격은 바뀔 수 있음
- 술집·카페·고깃집처럼 혼자 한 끼 먹기 어려운 곳은 제외
- 도보 시간은 정문·후문 중 가까운 쪽에서의 직선거리로 계산한 대략값
- 가격이 바뀌면 해당 식당의 `menus` 배열만 고치면 됨

## 학식 메뉴 (`src/data/cafeteria-menu.json`)

- 인하대 홈페이지의 학생식당 주간 메뉴를 `npm run update:cafeteria`로 받아 저장한다
- 브라우저가 학교 사이트를 직접 읽지 못해서 미리 받아 두는 방식이다
- 배포할 때마다 메뉴를 새로 받고, `deploy-web.yml`이 매일 오전 6시(한국 시간)에 다시 배포한다. 예약 실행은 `main`에 있어야 동작한다
- 메뉴를 못 받으면 Actions 실행 화면에 경고를 남기고 저장소에 있는 메뉴로 배포한다. 오늘 날짜의 메뉴가 없으면 화면에 안내가 나온다
- 자동으로 받은 메뉴는 저장소에 커밋되지 않는다. 로컬에서 최신 메뉴를 보려면 위 명령을 직접 실행한다
- GitHub는 저장소에 60일 동안 활동이 없으면 예약 실행을 멈춘다. 멈추면 Actions 화면에서 다시 켠다

## 다음 단계

1. 지출 직접 입력 (추천 목록에 없는 곳)
2. 식당·메뉴 직접 등록/수정
3. 카카오 로컬 API로 주변 식당 검색 (API 키를 숨기려면 서버가 필요해서 GitHub Pages 대신 다른 호스팅 필요)
