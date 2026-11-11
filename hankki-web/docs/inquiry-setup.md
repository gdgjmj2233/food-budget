# 문의하기 연결하기 (Google 스프레드시트)

앱의 **문의하기**에서 보낸 글이 우리 Google 스프레드시트에 한 줄씩 쌓이게 하는 방법이에요.
서버를 따로 만들 필요 없이 Google Apps Script(무료)를 쓰고, 스프레드시트는 언제든 엑셀 파일로 받을 수 있어요.

## 1. 스프레드시트 만들기

1. https://sheets.google.com 에서 **빈 스프레드시트**를 만들고 이름을 `한끼예산 문의`로 정해요.
2. 이 스프레드시트는 **공유하지 않아요.** 문의에는 연락처가 들어 있을 수 있어서, 보여 줄 사람에게만 따로 공유해요.

## 2. 받는 코드 붙이기

1. 스프레드시트 위쪽 메뉴에서 **확장 프로그램 → Apps Script**를 열어요.
2. 기본으로 들어 있는 코드를 모두 지우고 아래 코드를 붙여 넣은 뒤 저장(💾)해요.

```javascript
// 한끼예산 문의 받기. 앱이 보낸 글을 "문의" 시트에 한 줄씩 쌓는다.
const SHEET_NAME = '문의';
const MAX_BODY = 500;
const MAX_FIELD = 200;
const KINDS = ['버그 신고', '건의', '식당 정보 수정', '기타'];

function doPost(e) {
  const p = (e && e.parameter) || {};

  // 스팸 함정 칸이 채워져 있으면 자동 프로그램이 보낸 것이니 받지 않는다
  if (p.website) return ok();

  const body = clean(p.body, MAX_BODY);
  if (body.length < 5) return ok();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['접수 시각', '종류', '내용', '연락처', '보던 화면', '기기', '처리 상태', '메모']);
      sheet.setFrozenRows(1);
    }
    const kind = KINDS.indexOf(p.kind) >= 0 ? p.kind : '기타';
    sheet.appendRow([new Date(), kind, body, clean(p.contact, MAX_FIELD), clean(p.page, MAX_FIELD), clean(p.ua, MAX_FIELD), '접수', '']);
  } finally {
    lock.releaseLock();
  }
  return ok();
}

// 엑셀·스프레드시트가 글자를 수식으로 읽어 실행하지 못하게, = + - @ 로 시작하면 앞에 ' 를 붙인다
function clean(value, max) {
  const text = String(value || '').slice(0, max).trim();
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function ok() {
  return ContentService.createTextOutput('ok');
}
```

## 3. 웹 앱으로 배포하기

1. Apps Script 오른쪽 위 **배포 → 새 배포**를 눌러요.
2. 톱니바퀴(⚙) → **웹 앱**을 골라요.
3. 설정은 이렇게 해요.
   - **다음 사용자로 실행**: `나`
   - **액세스 권한이 있는 사용자**: `모든 사용자`
4. **배포**를 눌러요. 처음에는 Google이 권한을 물어요. 본인 계정으로 **허용**해 주세요.
   (이 코드는 **이 스프레드시트에만** 글을 쓰고, 다른 것은 읽거나 바꾸지 않아요.)
5. 나오는 **웹 앱 URL**(`https://script.google.com/macros/s/.../exec`)을 복사해요.

## 4. 앱에 연결하기

`src/lib/inquiry.ts`의 `INQUIRY_URL`에 위에서 복사한 주소를 넣어요.

```ts
export const INQUIRY_URL = 'https://script.google.com/macros/s/.../exec';
```

주소가 들어가면 **예산 탭 맨 아래에 "문의하기" 버튼이 나타나요.** 주소가 비어 있으면 버튼이 나오지 않아요.

## 5. 잘 되는지 확인하기

1. 앱의 문의하기에서 글을 하나 보내요.
2. 스프레드시트의 `문의` 시트에 한 줄이 생기는지 봐요(몇 초 걸려요).

## 엑셀 파일로 받기

스프레드시트에서 **파일 → 다운로드 → Microsoft Excel(.xlsx)** 을 누르면 지금까지의 문의가 엑셀 파일로 내려받아져요.

## 알아 두세요

- **웹 앱 주소는 공개돼요.** 이 주소로는 글을 **보낼 수만** 있고 읽을 수는 없어요. 다만 누구나 글을 보낼 수 있어서 스팸이 올 수 있어요. 앱에서 30초에 1번, 하루 5번으로 막고 함정 칸으로도 걸러요. 그래도 스팸이 많아지면 주소를 새로 배포해서 바꿔요.
- **앱이 "보냈어요"라고 해도 실제로 시트에 들어갔는지는 앱이 알 수 없어요.** 브라우저가 Apps Script의 답을 읽을 수 없어서예요. 그래서 배포한 뒤에 꼭 5번을 확인해요.
- **코드를 고치면 "새 배포"를 다시 해야** 앱이 바뀐 코드를 써요(같은 배포의 "버전"을 새로 올려도 돼요). 주소는 그대로 유지할 수 있어요.
- Apps Script의 무료 사용량(하루 수천 건)이면 학교 앱에는 충분해요.
- 연락처에는 개인정보가 들어 있을 수 있어요. 시트는 필요한 사람에게만 공유하고, 답변이 끝난 문의는 정기적으로 지워 주세요.
