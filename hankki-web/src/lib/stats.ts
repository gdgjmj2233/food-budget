// 기록 통계 계산. UI와 분리된 순수 함수만 둔다.

import { DAY_NAMES, fromDateKey, type Meal } from '@/lib/budget';

export interface MonthStats {
  total: number;
  /** 돈을 쓴 날 수 */
  days: number;
  /** 돈을 쓴 날 하루 평균 */
  perDay: number;
  /** 가장 많이 쓴 요일 */
  topWeekday: { name: string; total: number } | null;
  /** 가장 비싼 한 끼 */
  priciest: Meal | null;
  /** 2번 이상 간 곳 중 가장 자주 간 곳. 같으면 최근에 간 곳 */
  frequent: { name: string; count: number } | null;
}

/** 0원(쉬어가기) 기록을 뺀 기록들로 한 달 통계를 만든다. 기록이 없으면 null */
export function monthStats(meals: Meal[]): MonthStats | null {
  const paid = meals.filter((m) => m.price > 0);
  if (!paid.length) return null;

  const total = paid.reduce((sum, m) => sum + m.price, 0);
  const days = new Set(paid.map((m) => m.date)).size;

  const byWeekday = new Map<number, number>();
  paid.forEach((m) => {
    const d = fromDateKey(m.date).getDay();
    byWeekday.set(d, (byWeekday.get(d) ?? 0) + m.price);
  });
  const [topDay, topTotal] = [...byWeekday.entries()].sort((a, b) => b[1] - a[1])[0];

  const byName = new Map<string, { count: number; at: number }>();
  paid.forEach((m) => {
    const cur = byName.get(m.name);
    byName.set(m.name, { count: (cur?.count ?? 0) + 1, at: Math.max(cur?.at ?? 0, m.at) });
  });
  const top = [...byName.entries()].sort((a, b) => b[1].count - a[1].count || b[1].at - a[1].at)[0];

  return {
    total,
    days,
    perDay: Math.round(total / days),
    topWeekday: { name: DAY_NAMES[topDay], total: topTotal },
    priciest: paid.reduce((max, m) => (m.price > max.price ? m : max)),
    frequent: top[1].count >= 2 ? { name: top[0], count: top[1].count } : null,
  };
}
