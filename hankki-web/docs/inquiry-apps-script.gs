// 한끼예산 문의·제보 받기 (Google Apps Script)
// 앱이 보낸 글을 종류에 따라 이 스프레드시트의 시트(탭)에 한 줄씩 쌓는다.
//   - 문의             : 버그 신고·건의 등
//   - 메뉴 정보 수정    : 식당 카드 오른쪽 위 "메뉴 정보 수정 제보"
//   - 식당 미등록 제보  : 주변 식당 화면의 "식당 미등록 제보"
// 시트가 없으면 첫 글이 올 때 제목 줄과 함께 저절로 만든다.
// 붙이는 방법은 docs/inquiry-setup.md 에 있다. 이 파일 전체를 Apps Script 에 붙여 넣는다.

const MAX_TEXT = 500;
const MAX_FIELD = 200;
/** "처리 상태" 칸에서 고르는 값. 새 글은 첫 번째 값으로 들어간다 */
const STATUSES = ['접수', '확인 중', '반영함', '반영 안 함'];
const INQUIRY_KINDS = ['버그 신고', '건의', '식당 정보 수정', '기타'];

const SHEETS = {
  inquiry: {
    name: '문의',
    header: ['접수 시각', '종류', '내용', '연락처', '보던 화면', '기기', '처리 상태', '메모'],
  },
  menu: {
    name: '메뉴 정보 수정',
    header: ['접수 시각', '내용 종류', '식당 이름', '주소', '내용', '보던 화면', '기기', '처리 상태', '메모'],
  },
  place: {
    name: '식당 미등록 제보',
    header: ['접수 시각', '식당 이름', '위치', '보던 화면', '기기', '처리 상태', '메모'],
  },
};

function doPost(e) {
  const p = (e && e.parameter) || {};

  // 스팸 함정 칸이 채워져 있으면 자동 프로그램이 보낸 것이니 받지 않는다
  if (p.website) return ok();

  const row = toRow(p);
  if (!row) return ok();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheetFor(row.sheet).appendRow(row.values);
  } finally {
    lock.releaseLock();
  }
  return ok();
}

/** 앱이 보낸 값을 어느 시트의 어떤 한 줄로 쌓을지 정한다. 쌓지 않을 글이면 null */
function toRow(p) {
  const now = new Date();
  const page = clean(p.page, MAX_FIELD);
  const ua = clean(p.ua, MAX_FIELD);
  const status = STATUSES[0];

  if (p.kind === '메뉴 정보 수정') {
    // text 는 이용자가 적은 내용만, body 는 앞에 [종류 · 주제 · 식당] 머리말이 붙은 것 (예전 앱 대비)
    const text = clean(p.text || p.body, MAX_TEXT);
    if (!text) return null;
    return {
      sheet: SHEETS.menu,
      values: [now, clean(p.topic, MAX_FIELD), clean(p.place, MAX_FIELD), clean(p.address, MAX_FIELD), text, page, ua, status, ''],
    };
  }

  if (p.kind === '식당 미등록 제보') {
    const place = clean(p.place, MAX_FIELD);
    const where = clean(p.text || p.body, MAX_TEXT);
    if (!place && !where) return null;
    return { sheet: SHEETS.place, values: [now, place, where, page, ua, status, ''] };
  }

  const body = clean(p.body, MAX_TEXT);
  if (body.length < 5) return null;
  const kind = INQUIRY_KINDS.indexOf(p.kind) >= 0 ? p.kind : '기타';
  return { sheet: SHEETS.inquiry, values: [now, kind, body, clean(p.contact, MAX_FIELD), page, ua, status, ''] };
}

/** 이름으로 시트를 찾고, 없으면 만들어서 제목 줄(굵게, 고정)과 "처리 상태" 고르기 목록을 넣는다 */
function sheetFor(def) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(def.name) || ss.insertSheet(def.name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(def.header);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, def.header.length).setFontWeight('bold');
    const statusCol = def.header.indexOf('처리 상태') + 1;
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(true).build();
    sheet.getRange(2, statusCol, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  }
  return sheet;
}

// 엑셀·스프레드시트가 글자를 수식으로 읽어 실행하지 못하게, = + - @ 로 시작하면 앞에 ' 를 붙인다
function clean(value, max) {
  const text = String(value || '').slice(0, max).trim();
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function ok() {
  return ContentService.createTextOutput('ok');
}
