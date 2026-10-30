// 먹은 기록에서 자주 먹은 메뉴를 뽑는다 (홈 '자주 먹은 메뉴' 빠른 기록용)

import { PLACES, type Menu, type Place } from '@/data/places';
import type { Meal } from '@/lib/budget';

export interface Frequent {
  /** 같은 메뉴를 묶는 키 */
  key: string;
  name: string;
  menu: string;
  /** 지금 기준 가격: 식당 목록에 있는 메뉴면 목록 가격, 아니면 마지막으로 기록한 가격 */
  price: number;
  count: number;
  /** 식당 목록에 지금도 있는 메뉴면 같이 넘긴다 */
  place?: Place;
  placeMenu?: Menu;
}

const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));

/** 스킵(0원)은 빼고, 많이 먹은 순 → 최근에 먹은 순으로 limit 개 */
export function frequentMeals(meals: Meal[], limit: number): Frequent[] {
  const groups = new Map<string, { last: Meal; count: number }>();
  for (const m of meals) {
    if (m.price <= 0) continue;
    const key = `${m.placeId ?? ''}|${m.name}|${m.menu}`;
    const g = groups.get(key);
    if (!g) groups.set(key, { last: m, count: 1 });
    else {
      g.count++;
      if (m.at > g.last.at) g.last = m;
    }
  }

  return [...groups.entries()]
    .sort(([, a], [, b]) => b.count - a.count || b.last.at - a.last.at)
    .slice(0, limit)
    .map(([key, { last, count }]) => {
      const place = last.placeId ? PLACE_BY_ID.get(last.placeId) : undefined;
      const placeMenu = place?.menus.find((x) => x.name === last.menu);
      return {
        key,
        name: last.name,
        menu: last.menu,
        price: placeMenu?.price ?? last.price,
        count,
        place: placeMenu ? place : undefined,
        placeMenu,
      };
    });
}
