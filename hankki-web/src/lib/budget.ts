// 예산 계산 로직. UI와 분리된 순수 함수만 둔다.

export type Period = 'week' | 'month' | 'custom';


export interface Settings {
  period: Period;
  /** 기간 전체 식비 예산 (원) */
  amount: number;
  /** 주말을 예산 일수에서 제외할지 */
  skipWeekend: boolean;
  /** 기간 시작일 YYYY-MM-DD */
  startDate: string;
  /** 직접 설정한 기간의 마지막 날 YYYY-MM-DD (이 날 포함) */
  endDate?: string;
  /** 하루 예산에서 점심이 차지하는 비율(%). 없으면 점심·저녁을 나누지 않는다 */
  lunchPct?: number;
}

export interface Meal {
  id: string;
  name: string;
  menu: string;
  price: number;
  placeId?: string;
  /** 먹은 날짜 YYYY-MM-DD */
  date: string;
  /** 기록 시각 (ms) */
  at: number;
  /** 아침·점심·저녁, 또는 기타(야식·간식·음료·이외). 기록할 때 고르고, 없으면 기록 시각으로 정한다 (kindOf) */
  kind?: MealKind;
}

/**
 * 기록 항목. 첫 줄 끼니는 아침·점심·저녁이고, "기타"를 누르면 야식·간식·음료·이외 중에서 고른다.
 * etc 는 하위 항목이 생기기 전의 "기타" 값이라 예전 기록 읽기용으로 남겨 둔다 (시각으로 정할 때 21시 이후도 etc)
 */
export type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'latenight' | 'snack' | 'drink' | 'other' | 'etc';

/** 항목 첫 줄: 끼니 */
export const MAIN_KINDS: readonly MealKind[] = ['breakfast', 'lunch', 'dinner'];

/** "기타"를 누르면 나오는 둘째 줄. 이외는 야식·간식·음료 어디에도 안 맞는 지출 */
export const EXTRA_KINDS: readonly MealKind[] = ['latenight', 'snack', 'drink', 'other'];

/** 고를 수 있는 모든 항목 (첫 줄 + 기타의 둘째 줄) */
export const MEAL_KINDS: MealKind[] = [...MAIN_KINDS, ...EXTRA_KINDS];

export const KIND_LABEL: Record<MealKind, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  latenight: '야식',
  snack: '간식',
  drink: '음료',
  other: '이외',
  // 하위 항목이 생기기 전의 "기타" 기록은 이외와 같은 것으로 보여 준다
  etc: '이외',
};

/** 기타로 묶인 항목인지 (야식·간식·음료·이외, 예전 "기타") */
export const isExtraKind = (kind?: MealKind) => kind !== undefined && !MAIN_KINDS.includes(kind);

/** 시각으로 정하는 끼니: 10시 반 전 아침, 15시 전 점심, 21시 전 저녁, 그 뒤는 기타(야식 등) */
export function kindOfTime(at: number): MealKind {
  const d = new Date(at);
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (minutes < 10 * 60 + 30) return 'breakfast';
  if (minutes < 15 * 60) return 'lunch';
  if (minutes < 21 * 60) return 'dinner';
  return 'etc';
}

/** 잠깐 한글 값(아침·점심 …)으로 저장하던 때가 있어서, 그 기록도 읽을 수 있게 바꿔 준다 */
const KOREAN_KIND: Record<string, MealKind> = {
  아침: 'breakfast',
  점심: 'lunch',
  저녁: 'dinner',
  야식: 'latenight',
  간식: 'snack',
  음료: 'drink',
  이외: 'other',
  기타: 'etc',
};

/** 저장된 항목 값을 지금 쓰는 값으로. 한글 값은 바꿔 주고, 모르는 값이면 undefined (기록 시각으로 정하게) */
export function normalizeKind(kind: unknown): MealKind | undefined {
  if (typeof kind !== 'string') return undefined;
  if (Object.hasOwn(KIND_LABEL, kind)) return kind as MealKind;
  return KOREAN_KIND[kind];
}

/** 저장된 기록의 항목 값을 정리한다 (불러올 때 한 번). 모르는 값은 지워서 기록 시각으로 정하게 한다 */
export function normalizeMeal(m: Meal): Meal {
  const kind = normalizeKind(m.kind);
  if (kind === m.kind) return m;
  const next: Meal = { ...m };
  if (kind) next.kind = kind;
  else delete next.kind;
  return next;
}

export const kindOf = (m: Pick<Meal, 'kind' | 'at'>): MealKind => normalizeKind(m.kind) ?? kindOfTime(m.at);

/** 기록할 때 처음 골라 둘 항목: 시각 기준이고, 밤 9시 이후·새벽 5시 전은 기타 > 야식 */
export const kindNow = (now: Date = new Date()): MealKind => {
  if (now.getHours() < 5) return 'latenight';
  const k = kindOfTime(now.getTime());
  return k === 'etc' ? 'latenight' : k;
};

export type MealSlot = 'lunch' | 'dinner';

/**
 * 항목이 끼니면 점심·저녁 나눔에서 어느 쪽인지: 아침·점심은 점심 쪽, 저녁·야식은 저녁 쪽.
 * 간식·음료·이외·기타처럼 끼니가 아니면 null
 */
export const slotOfKind = (kind?: MealKind): MealSlot | null =>
  kind === 'breakfast' || kind === 'lunch' ? 'lunch' : kind === 'dinner' || kind === 'latenight' ? 'dinner' : null;

/**
 * 점심·저녁 나눔에서 어느 쪽 예산을 쓸지. 고른 항목이 끼니면 그걸 따르고(slotOfKind),
 * 끼니가 아니거나 고르지 않은 기록은 15시 전이면 점심, 그 뒤는 저녁으로 본다.
 */
export const mealSlot = (m: Pick<Meal, 'at' | 'kind'>): MealSlot =>
  slotOfKind(normalizeKind(m.kind)) ?? (new Date(m.at).getHours() < 15 ? 'lunch' : 'dinner');

/** 지금 시각에 맞는 끼니 */
export const currentSlot = (now: Date = new Date()): MealSlot => (now.getHours() < 15 ? 'lunch' : 'dinner');

/** 기록의 메뉴. 예전 기록은 메뉴 칸에 '직접 입력'이 들어 있어서 빈 값으로 본다 */
export const menuOf = (m: Meal) => (m.menu === '직접 입력' ? '' : m.menu);

export type BudgetStatus = 'ok' | 'low' | 'over';

/** 남은 예산이 전체의 이 비율보다 적으면 '임박' */
export const LOW_RATIO = 0.3;

export interface BudgetSummary {
  start: Date;
  /** 기간이 끝나는 날 (이 날은 포함하지 않음) */
  end: Date;
  ended: boolean;
  totalDays: number;
  daysLeft: number;
  spent: number;
  /** 오늘 기록한 금액 합계 */
  spentToday: number;
  remain: number;
  /** 하루 권장 금액. 오늘 쓰기 전 예산으로 계산해서 오늘 안에서는 그대로다 */
  perDay: number;
  /** 하루 권장 금액에서 오늘 쓴 만큼 뺀 금액. restDay 면 남은 평일 하루 금액(화면에는 "-"로 보여 준다) */
  todayLeft: number;
  /** "주말 제외하여 하루 예산 편성"이 켜져 있고 오늘이 주말이라 오늘 편성된 예산이 없는 날 */
  restDay: boolean;
  /** 처음 설정 기준 하루 금액 */
  base: number;
  status: BudgetStatus;
  periodMeals: Meal[];
  /** 기간 전체 예산 */
  amount: number;
  /** 점심·저녁 나눔을 켰고 오늘이 예산 일수에 들면 끼니별 금액, 아니면 null */
  split: MealSplit | null;
}

export interface MealSplit {
  lunchBudget: number;
  dinnerBudget: number;
  /** 점심에 더 쓸 수 있는 금액 (넘게 썼으면 음수) */
  lunchLeft: number;
  /** 저녁에 쓸 수 있는 금액. 점심에 예산을 넘게 쓴 만큼은 여기서 빠진다 (넘게 썼으면 음수) */
  dinnerLeft: number;
}

/** 기록이 하나도 없는 날. at 은 그 날로 기록할 때 쓰는 시각(ms) */
export interface MissingDay {
  date: string;
  at: number;
}

export const DEFAULT_AMOUNT: Record<Period, number> = { week: 70000, month: 300000, custom: 140000 };

// ---- 날짜 ----
const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/** 기간 종료일(미포함). 주간은 7일, 월간은 다음 달 같은 날, 직접 설정은 고른 마지막 날의 다음 날. */
export function periodEnd(settings: Pick<Settings, 'period' | 'startDate' | 'endDate'>): Date {
  const start = fromDateKey(settings.startDate);
  if (settings.period === 'week') return addDays(start, 7);
  if (settings.period === 'custom') {
    const last = settings.endDate && settings.endDate >= settings.startDate ? fromDateKey(settings.endDate) : start;
    return addDays(last, 1);
  }
  const y = start.getFullYear();
  const m = start.getMonth() + 1;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(start.getDate(), lastDay));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 기간이 끝났으면 같은 기간 종류·같은 예산으로 다음 기간을 이어 붙여서, 오늘이 들어 있는 기간의 설정을 돌려준다.
 * 사용자가 따로 바꾸지 않으면 예산이 그대로 이어지게 하려는 것 (예: 주간 7만원 → 다음 주도 7만원).
 * 다음 기간은 앞 기간이 끝난 다음 날부터 시작하고, 직접 설정한 기간은 같은 길이로 이어 간다.
 * 아직 끝나지 않았으면 받은 settings 를 그대로 돌려준다.
 */
export function rollPeriod(settings: Settings, now: Date = new Date()): Settings {
  const today = startOfDay(now);
  const customDays =
    settings.period === 'custom'
      ? Math.max(1, Math.round((periodEnd(settings).getTime() - fromDateKey(settings.startDate).getTime()) / DAY_MS))
      : 0;
  let s = settings;
  // 아주 오래 안 열었어도 멈추지 않게 횟수를 막아 둔다 (주간 기준 약 20년)
  for (let i = 0; i < 1000 && today >= periodEnd(s); i++) {
    const next = periodEnd(s);
    s = {
      ...s,
      startDate: toDateKey(next),
      ...(s.period === 'custom' ? { endDate: toDateKey(addDays(next, customDays - 1)) } : {}),
    };
  }
  return s;
}

/** from 이상 to 미만 날짜 수 (주말 제외 옵션) */
export function countDays(from: Date, to: Date, skipWeekend: boolean): number {
  let n = 0;
  for (let d = startOfDay(from); d < to; d = addDays(d, 1)) {
    if (!(skipWeekend && isWeekend(d))) n++;
  }
  return n;
}

const floor100 = (n: number) => Math.floor(n / 100) * 100;

/** 화면에 쓰는 기간 이름 */
export const periodName = (period: Period) => ({ week: '주간', month: '월간', custom: '직접 설정' })[period];
export const periodThis = (period: Period) => ({ week: '이번 주', month: '이번 달', custom: '이번 기간' })[period];

// ---- 핵심 계산 ----
export function calcBudget(settings: Settings, meals: Meal[], now: Date = new Date()): BudgetSummary {
  const start = fromDateKey(settings.startDate);
  const end = periodEnd(settings);
  const startKey = settings.startDate;
  const endKey = toDateKey(end);
  const today = startOfDay(now);
  const todayKey = toDateKey(today);

  const periodMeals = meals.filter((m) => m.date >= startKey && m.date < endKey);
  const spent = periodMeals.reduce((sum, m) => sum + m.price, 0);
  const amount = settings.amount;
  const remain = amount - spent;

  const totalDays = Math.max(1, countDays(start, end, settings.skipWeekend));
  const ended = today >= end;
  const from = today > start ? today : start;
  const daysLeft = ended ? 0 : countDays(from, end, settings.skipWeekend);

  const spentToday = periodMeals.filter((m) => m.date === todayKey).reduce((sum, m) => sum + m.price, 0);
  const restDay = !ended && today >= start && settings.skipWeekend && isWeekend(today);
  const todayCounts = !ended && today >= start && !restDay;

  // 남은 날이 없는데 기간은 남은 경우(예: 주말 제외 + 마지막 주말)는 남은 예산 전체를 쓸 수 있는 금액으로 본다.
  const leftover = ended ? 0 : Math.max(0, floor100(remain));
  const budgetForDays = todayCounts ? remain + spentToday : remain;
  const perDay = daysLeft > 0 ? Math.max(0, floor100(budgetForDays / daysLeft)) : leftover;
  const todayLeft = todayCounts ? Math.max(0, perDay - spentToday) : perDay;
  const base = floor100(amount / totalDays);
  let split: MealSplit | null = null;
  if (todayCounts && settings.lunchPct) {
    const lunchBudget = floor100((perDay * settings.lunchPct) / 100);
    const dinnerBudget = perDay - lunchBudget;
    const todayMeals = periodMeals.filter((m) => m.date === todayKey);
    const spentLunch = todayMeals.filter((m) => mealSlot(m) === 'lunch').reduce((sum, m) => sum + m.price, 0);
    const lunchLeft = lunchBudget - spentLunch;
    split = { lunchBudget, dinnerBudget, lunchLeft, dinnerLeft: dinnerBudget - (spentToday - spentLunch) - Math.max(0, -lunchLeft) };
  }
  // 초과 > 임박(남은 예산 30% 미만) > 여유
  const status: BudgetStatus = remain < 0 ? 'over' : remain < amount * LOW_RATIO ? 'low' : 'ok';

  return {
    start, end, ended, totalDays, daysLeft,
    spent, spentToday, remain, perDay, todayLeft, restDay, base, status, periodMeals, amount, split,
  };
}

// ---- 기록 ----
/** 어제 기록이 하나도 없으면 그 날을 돌려준다. */
export function findMissingDay(settings: Settings, meals: Meal[], now: Date = new Date()): MissingDay | null {
  const day = addDays(startOfDay(now), -1);
  const date = toDateKey(day);
  if (date < settings.startDate || day >= periodEnd(settings)) return null;
  if (settings.skipWeekend && isWeekend(day)) return null;
  if (meals.some((m) => m.date === date)) return null;
  return { date, at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12).getTime() };
}

// ---- 표시용 ----
export function won(n: number): string {
  const v = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? `−${v}` : v;
}

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDate(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[d.getDay()]})`;
}

export function formatShort(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
