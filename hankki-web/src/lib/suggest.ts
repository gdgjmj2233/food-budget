// 어제 먹은 기록을 보고 오늘 먹을 종류를 권한다. UI와 분리된 순수 함수만 둔다.

import { CAFETERIA, CAFETERIA_NAME } from '@/data/cafeteria';
import { bestMenu, PLACES, type Category } from '@/data/places';
import { addDays, startOfDay, toDateKey, type Meal } from '@/lib/budget';

/** 권하는 종류: 주변 식당 음식 종류 6가지 + 학식 */
export type FoodKind = Category | '학식';

/** 같은 조건이면 이 순서로 권한다. 시작 위치는 날마다 바꿔서 돌아가며 권한다 */
const KINDS: FoodKind[] = ['학식', '한식', '분식', '중식', '일식', '양식', '아시안'];

/** 최근 며칠 동안 먹은 종류를 피해서 권할지 */
const LOOK_BACK_DAYS = 7;

/** 학식에서 가장 싼 메뉴 가격 (메뉴 자료가 비어 있으면 0) */
const CAFETERIA_MIN = Math.min(...CAFETERIA.days.flatMap((d) => d.corners.flatMap((c) => c.prices)), Infinity);
const cafeteriaMin = Number.isFinite(CAFETERIA_MIN) ? CAFETERIA_MIN : 0;

export interface Suggestion {
  /** 어제 마지막으로 먹은 메뉴와 그 종류 */
  menu: string;
  from: FoodKind;
  /** 오늘 권하는 종류 */
  kind: FoodKind;
}

/** 기록 하나의 종류. 목록의 식당으로 기록했으면 그 식당 종류, 학식 탭에서 기록했으면 학식. 알 수 없으면 null */
export function kindOfMeal(m: Meal): FoodKind | null {
  if (m.placeId) return PLACES.find((p) => p.id === m.placeId)?.cat ?? null;
  return m.name === CAFETERIA_NAME ? '학식' : null;
}

/** 오늘 남은 금액(limit)으로 그 종류에서 먹을 수 있는 곳이 있는지 */
function fitsBudget(kind: FoodKind, limit: number): boolean {
  if (kind === '학식') return limit >= cafeteriaMin;
  return PLACES.some((p) => p.cat === kind && bestMenu(p, limit).fits);
}

/**
 * 어제 마지막으로 먹은 기록과 다른 종류를 오늘 권한다. 어제 종류를 알 수 있는 기록이 없으면 null.
 * - 어제 먹은 종류는 빼고, 주말에는 학생식당이 쉬어서 학식도 뺀다
 * - 오늘 남은 금액(limit)으로 먹을 수 있는 종류가 있으면 그중에서 고른다
 * - 최근 7일 동안 안 먹은(오래전에 먹은) 종류부터, 같으면 날마다 바뀌는 순서로 고른다 (같은 날에는 늘 같은 답)
 */
export function suggestToday(meals: Meal[], limit: number, now: Date = new Date()): Suggestion | null {
  const today = startOfDay(now);
  const yesterday = toDateKey(addDays(today, -1));
  const last = meals.filter((m) => m.date === yesterday && m.price > 0 && kindOfMeal(m)).sort((a, b) => b.at - a.at)[0];
  if (!last) return null;
  const from = kindOfMeal(last)!;

  // 종류별로 마지막에 먹은 날이 며칠 전인지 (최근 7일 안에서)
  const daysAgo = new Map<FoodKind, number>();
  for (let d = 1; d <= LOOK_BACK_DAYS; d++) {
    const key = toDateKey(addDays(today, -d));
    for (const m of meals) {
      if (m.date !== key || m.price <= 0) continue;
      const k = kindOfMeal(m);
      if (k && !daysAgo.has(k)) daysAgo.set(k, d);
    }
  }

  const weekend = today.getDay() === 0 || today.getDay() === 6;
  const candidates = KINDS.filter((k) => k !== from && !(k === '학식' && weekend));
  const affordable = candidates.filter((k) => fitsBudget(k, limit));
  const pool = affordable.length ? affordable : candidates;

  const dayNo = Math.round(today.getTime() / 86_400_000);
  const turn = (k: FoodKind) => (KINDS.indexOf(k) - (dayNo % KINDS.length) + KINDS.length) % KINDS.length;
  const ago = (k: FoodKind) => daysAgo.get(k) ?? LOOK_BACK_DAYS + 1;
  pool.sort((a, b) => ago(b) - ago(a) || turn(a) - turn(b));
  return { menu: last.menu, from, kind: pool[0] };
}
