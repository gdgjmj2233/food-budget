// 예산 계산 로직. UI와 분리된 순수 함수만 둔다.

export type Period = 'week' | 'month';

export interface Settings {
  period: Period;
  /** 기간 전체 식비 예산 (원) */
  amount: number;
  /** 하루 식사 횟수 (1~3) */
  mealsPerDay: number;
  /** 주말을 예산 일수에서 제외할지 */
  skipWeekend: boolean;
  /** 기간 시작일 YYYY-MM-DD */
  startDate: string;
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
}

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
  mealsLeft: number;
  /** 오늘 아직 기록하지 않은 계획 끼니 수 */
  mealsLeftToday: number;
  eatenToday: number;
  spent: number;
  remain: number;
  /** 다음 한 끼 권장 금액 */
  perMeal: number;
  /** 하루 권장 금액 */
  perDay: number;
  /** 처음 설정 기준 한 끼 금액 */
  base: number;
  status: BudgetStatus;
  periodMeals: Meal[];
}

export type MealSlot = '아침' | '점심' | '저녁';

/** 비어 있는 끼니. at 은 그 끼니를 기록할 때 쓰는 시각(ms) */
export interface MissingMeal {
  date: string;
  slot: MealSlot;
  at: number;
}

export const DEFAULT_AMOUNT: Record<Period, number> = { week: 70000, month: 300000 };

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

/** 기간 종료일(미포함). 주간은 7일, 월간은 다음 달 같은 날. */
export function periodEnd(settings: Pick<Settings, 'period' | 'startDate'>): Date {
  const start = fromDateKey(settings.startDate);
  if (settings.period === 'week') return addDays(start, 7);
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
  const mpd = Math.max(1, settings.mealsPerDay);

  const periodMeals = meals.filter((m) => m.date >= startKey && m.date < endKey);
  const spent = periodMeals.reduce((sum, m) => sum + m.price, 0);
  const remain = settings.amount - spent;

  const totalDays = Math.max(1, countDays(start, end, settings.skipWeekend));
  const ended = today >= end;
  const from = today > start ? today : start;
  const daysLeft = ended ? 0 : countDays(from, end, settings.skipWeekend);

  const eatenToday = periodMeals.filter((m) => m.date === todayKey).length;
  const todayCounts = !ended && today >= start && !(settings.skipWeekend && isWeekend(today));
  const mealsLeftToday = todayCounts ? Math.max(0, mpd - eatenToday) : 0;
  const mealsLeft = daysLeft <= 0 ? 0 : todayCounts ? (daysLeft - 1) * mpd + mealsLeftToday : daysLeft * mpd;

  // 남은 계획 끼니가 없는데 기간은 남은 경우(예: 주말 제외 + 마지막 주말, 오늘 끼니를 다 먹음)는
  // 남은 예산 전체를 쓸 수 있는 금액으로 본다.
  const leftover = ended ? 0 : Math.max(0, floor100(remain));
  const perMeal = mealsLeft > 0 ? Math.max(0, floor100(remain / mealsLeft)) : leftover;
  const perDay = daysLeft > 0 ? Math.max(0, floor100(remain / daysLeft)) : leftover;
  const base = floor100(settings.amount / (totalDays * mpd));
  // 초과 > 임박(남은 예산 30% 미만) > 여유
  const status: BudgetStatus = remain < 0 ? 'over' : remain < settings.amount * LOW_RATIO ? 'low' : 'ok';

  return {
    start, end, ended, totalDays, daysLeft, mealsLeft, mealsLeftToday, eatenToday,
    spent, remain, perMeal, perDay, base, status, periodMeals,
  };
}

// ---- 끼니 ----
/** 하루 식사 횟수별 끼니 */
const SLOTS: Record<number, MealSlot[]> = { 1: ['저녁'], 2: ['점심', '저녁'], 3: ['아침', '점심', '저녁'] };
const SLOT_HOUR: Record<MealSlot, number> = { 아침: 8, 점심: 12, 저녁: 18 };

export function slotOf(at: number): MealSlot {
  const h = new Date(at).getHours();
  return h < 11 ? '아침' : h < 16 ? '점심' : '저녁';
}

/** 어제 끼니 중 기록이 빠진 것. 여러 개면 가장 늦은 끼니 하나만 돌려준다. */
export function findMissingMeal(settings: Settings, meals: Meal[], now: Date = new Date()): MissingMeal | null {
  const day = addDays(startOfDay(now), -1);
  const date = toDateKey(day);
  if (date < settings.startDate || day >= periodEnd(settings)) return null;
  if (settings.skipWeekend && isWeekend(day)) return null;

  const slots = SLOTS[Math.min(3, Math.max(1, settings.mealsPerDay))];
  const eaten = meals.filter((m) => m.date === date);
  if (eaten.length >= slots.length) return null;

  const filled = new Set(eaten.map((m) => slotOf(m.at)));
  const slot = [...slots].reverse().find((s) => !filled.has(s))!;
  return { date, slot, at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), SLOT_HOUR[slot]).getTime() };
}

/** 자주 먹은 끼니. 같은 횟수면 최근에 먹은 것이 앞에 온다. */
export function frequentMeals(meals: Meal[], limit = 3): Meal[] {
  const groups = new Map<string, { meal: Meal; count: number }>();
  for (const m of meals) {
    if (m.price <= 0) continue;
    const key = `${m.name}|${m.menu}|${m.price}`;
    const g = groups.get(key);
    groups.set(key, { meal: !g || m.at > g.meal.at ? m : g.meal, count: (g?.count ?? 0) + 1 });
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.meal.at - a.meal.at)
    .slice(0, limit)
    .map((g) => g.meal);
}

// ---- 표시용 ----
export function won(n: number): string {
  const v = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? `−${v}` : v;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDate(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[d.getDay()]})`;
}

export function formatShort(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
