// 문의 보내기. 우리 Google 스프레드시트에 연결한 Apps Script 웹 앱 주소로 보낸다.
// 만드는 방법은 hankki-web/docs/inquiry-setup.md 에 있다.

/**
 * Apps Script 웹 앱 주소 (https://script.google.com/macros/s/.../exec).
 * 비어 있으면 아직 연결 전이라서 앱에 "문의하기" 버튼이 나오지 않는다.
 * 브라우저에 그대로 보이는 주소라서 숨기지 않아도 된다. 이 주소로는 글을 보낼 수만 있고 읽을 수는 없다.
 */
export const INQUIRY_URL = '';

export const INQUIRY_KINDS = ['버그 신고', '건의', '식당 정보 수정', '기타'] as const;
export type InquiryKind = (typeof INQUIRY_KINDS)[number];

export const MIN_BODY = 5;
export const MAX_BODY = 500;
export const MAX_CONTACT = 60;

/** 이만큼 간격을 두고 보낼 수 있다 */
const MIN_GAP_MS = 30_000;
/** 하루에 보낼 수 있는 최대 수 */
const MAX_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const SENT_KEY = 'hankki/inquiry-sent/v1';
const TIMEOUT_MS = 10_000;

export const inquiryReady = () => INQUIRY_URL !== '';

export interface InquiryInput {
  kind: InquiryKind;
  body: string;
  contact: string;
  /** 사람이 보지 않는 칸. 채워져 있으면 자동 프로그램이 보낸 것으로 보고 보내지 않는다 */
  website: string;
}

export type InquiryResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'invalid' | 'limited' | 'failed'; waitSec?: number };

function recentSends(): number[] {
  try {
    const list = JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((t): t is number => typeof t === 'number' && Date.now() - t < DAY_MS) : [];
  } catch {
    return [];
  }
}

/** 너무 자주 보내지 못하게 막는다. 보낼 수 있으면 null, 아니면 기다려야 하는 초 */
export function limitWait(): { waitSec: number; daily: boolean } | null {
  const sends = recentSends();
  const last = sends.length ? Math.max(...sends) : 0;
  const gap = last + MIN_GAP_MS - Date.now();
  if (gap > 0) return { waitSec: Math.ceil(gap / 1000), daily: false };
  if (sends.length >= MAX_PER_DAY) return { waitSec: Math.ceil((Math.min(...sends) + DAY_MS - Date.now()) / 1000), daily: true };
  return null;
}

function remember() {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify([...recentSends(), Date.now()]));
  } catch {
    // 저장이 막힌 브라우저에서는 횟수를 세지 못할 뿐이다
  }
}

/** 문의를 스프레드시트로 보낸다. 서버의 답은 브라우저가 읽을 수 없어서(no-cors), 네트워크로 나갔으면 보낸 것으로 본다 */
export async function sendInquiry(input: InquiryInput): Promise<InquiryResult> {
  if (!inquiryReady()) return { ok: false, reason: 'unavailable' };
  const body = input.body.trim().slice(0, MAX_BODY);
  if (body.length < MIN_BODY) return { ok: false, reason: 'invalid' };
  if (input.website) return { ok: true }; // 자동 프로그램: 보내지 않고 성공한 척한다
  const limited = limitWait();
  if (limited) return { ok: false, reason: 'limited', waitSec: limited.waitSec };

  const params = new URLSearchParams({
    kind: input.kind,
    body,
    contact: input.contact.trim().slice(0, MAX_CONTACT),
    page: window.location.pathname,
    ua: navigator.userAgent.slice(0, 120),
    sentAt: new Date().toISOString(),
    website: '',
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    await fetch(INQUIRY_URL, { method: 'POST', mode: 'no-cors', body: params, signal: controller.signal });
    remember();
    return { ok: true };
  } catch {
    return { ok: false, reason: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}
