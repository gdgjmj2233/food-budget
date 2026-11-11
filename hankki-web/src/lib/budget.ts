// 예산 계산 로직. UI와 분리된 순수 함수만 둔다.

/** week: 7일, month: 한 달, custom: 시작일~종료일을 직접 정한 기간 */
export type Period = 'week' | 'month' | 'custom';

export type MealSlot = 'lunch' | 'dinner';

export const PERIOD_NAME: Record<Period, string> = { week: '주간', month: '월간', custom: '직접 정한 기간' };
/** 오늘 남은 예산 카드 제목에 붙는 말 */
export const PERIOD_THIS: Record<Period, string> = { week: '이번 주', month: '이번 달', custom: '이번 기간' };

/** 직접 정하는 기간의 가장 긴 길이(일) */
export const MAX_CUSTOM_DAYS = 366;

export interface Settings {
  period: Period;
  /** 기간 전체 식비 예산 (원) */
  amount: number;
  /** 주말을 예산 일수에서 제외할지 */
  skipWeekend: boolean;
  /** 기간 시작일 YYYY-MM-DD */
  startDate: string;
  /** period 가 custom 일 때 마지막 날 YYYY-MM-DD (이 날 포함) */
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
  /** 점심/저녁. 없으면 기록 시각으로 본다 */
  slot?: MealSlot;
}

/** 15시 전에 먹은 건 점심, 그 뒤는 저녁으로 본다 */
export const mealSlot = (m: Pick<Meal, 'at' | 'slot'>): MealSlot => m.slot ?? (new Date(m.at).getHours() < 15 ? 'lunch' : 'dinner');

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
  /** 하루 권장 금액에서 오늘 쓴 만큼 뺀 금액 */
  todayLeft: number;
  /** 처음 설정 기준 하루 금액 */
  base: number;
  /** 점심·저녁 나눔을 켰고 오늘이 예산 일수에 들면 끼니별 금액, 아니면 null */
  split: MealSplit | null;
  status: BudgetStatus;
  periodMeals: Meal[];
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

export const DEFAULT_AMOUNT: Record<Period, number> = { week: 70000, month: 300000, custom: 100000 };

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

/** 기간 종료일(미포함). 주간은 7일, 월간은 다음 달 같은 날, 직접 정한 기간은 마지막 날의 다음 날. */
export function periodEnd(settings: Pick<Settings, 'period' | 'startDate' | 'endDate'>): Date {
  const start = fromDateKey(settings.startDate);
  if (settings.period === 'week') return addDays(start, 7);
  if (settings.period === 'custom') {
    const last = settings.endDate ? fromDateKey(settings.endDate) : addDays(start, 13);
    // 종료일이 시작일보다 앞서거나 너무 길면 안전한 범위로 맞춘다
    const days = Math.round((last.getTime() - start.getTime()) / 86_400_000) + 1;
    return addDays(start, Math.min(MAX_CUSTOM_DAYS, Math.max(1, days)));
  }
  const y = start.getFullYear();
  const m = start.getMonth() + 1;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(start.getDate(), lastDay));
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
  const remain = settings.amount - spent;

  const totalDays = Math.max(1, countDays(start, end, settings.skipWeekend));
  const ended = today >= end;
  const from = today > start ? today : start;
  const daysLeft = ended ? 0 : countDays(from, end, settings.skipWeekend);

  const spentToday = periodMeals.filter((m) => m.date === todayKey).reduce((sum, m) => sum + m.price, 0);
  const todayCounts = !ended && today >= start && !(settings.skipWeekend && isWeekend(today));

  // 남은 날이 없는데 기간은 남은 경우(예: 주말 제외 + 마지막 주말)는 남은 예산 전체를 쓸 수 있는 금액으로 본다.
  const leftover = ended ? 0 : Math.max(0, floor100(remain));
  const budgetForDays = todayCounts ? remain + spentToday : remain;
  const perDay = daysLeft > 0 ? Math.max(0, floor100(budgetForDays / daysLeft)) : leftover;
  const todayLeft = todayCounts ? Math.max(0, perDay - spentToday) : perDay;
  const base = floor100(settings.amount / totalDays);
  let split: MealSplit | null = null;
  if (todayCounts && settings.lunchPct) {
    const lunchBudget = floor100((perDay * settings.lunchPct) / 100);
    const dinnerBudget = perDay - lunchBudget;
    const today = periodMeals.filter((m) => m.date === todayKey);
    const spentLunch = today.filter((m) => mealSlot(m) === 'lunch').reduce((sum, m) => sum + m.price, 0);
    const spentDinner = spentToday - spentLunch;
    const lunchLeft = lunchBudget - spentLunch;
    split = { lunchBudget, dinnerBudget, lunchLeft, dinnerLeft: dinnerBudget - spentDinner - Math.max(0, -lunchLeft) };
  }
  // 초과 > 임박(남은 예산 30% 미만) > 여유
  const status: BudgetStatus = remain < 0 ? 'over' : remain < settings.amount * LOW_RATIO ? 'low' : 'ok';

  return {
    start, end, ended, totalDays, daysLeft,
    spent, spentToday, remain, perDay, todayLeft, base, split, status, periodMeals,
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
