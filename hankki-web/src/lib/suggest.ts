// 어제 먹은 기록을 보고 오늘 메뉴를 권한다. UI와 분리된 순수 함수만 둔다.

import { PLACES, type Category, type Menu, type Place } from '@/data/places';
import { addDays, startOfDay, toDateKey, type Meal } from '@/lib/budget';

type Theme = '국물' | '면' | '밥';

const THEME_MENU: Record<Theme, RegExp> = {
  국물: /국|탕|찌개|우동|수제비|짬뽕|라멘/,
  면: /면|국수|우동|라멘|파스타/,
  밥: /밥|정식/,
};

/** 어제 먹은 종류와 겹치지 않게 권할 메뉴 */
const NEXT_THEME: Record<Category, Theme> = { 분식: '국물', 양식: '국물', 중식: '국물', 한식: '면', 일식: '밥', 아시안: '밥' };

export interface Suggestion {
  /** 어제 먹은 메뉴와 종류 */
  menu: string;
  cat: Category;
  theme: Theme;
}

/** 어제 마지막으로 먹은 식당 기록으로 오늘 권할 메뉴를 정한다. 없으면 null. */
export function suggestToday(meals: Meal[], now: Date = new Date()): Suggestion | null {
  const yesterday = toDateKey(addDays(startOfDay(now), -1));
  const last = meals.filter((m) => m.date === yesterday && m.price > 0 && m.placeId).sort((a, b) => b.at - a.at)[0];
  const cat = last && PLACES.find((p) => p.id === last.placeId)?.cat;
  return cat ? { menu: last.menu, cat, theme: NEXT_THEME[cat] } : null;
}

/** 이 식당에서 권하는 메뉴 중 예산 안에서 가장 든든한(비싼) 것 */
export function suggestedMenu(place: Place, limit: number, s: Suggestion | null): Menu | undefined {
  if (!s) return undefined;
  return place.menus.filter((m) => m.price <= limit && THEME_MENU[s.theme].test(m.name)).sort((a, b) => b.price - a.price)[0];
}
