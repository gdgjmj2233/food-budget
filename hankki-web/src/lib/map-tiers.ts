import { bestMenu, type Place } from '@/data/places';

/**
 * 지도 핀 정리 단계. 멀리서 볼수록(카카오맵 level 이 클수록) 주요 가게만 남긴다.
 * 단계는 누적이라 2단계에는 1단계 가게도 같이 나온다.
 *  1단계: 내가 별점 4점 이상 준 가게
 *  2단계: + 추천 가게(예산 안 · 도보 3분 이내) + 내가 2번 이상 간 가게
 *  3단계: + 가격이 싼 가게(지금 목록에서 대표 메뉴 가격 하위 1/3)
 *  4단계: 모든 가게
 */
export type Tier = 1 | 2 | 3 | 4;

export const TIER_LABEL: Record<Tier, string> = {
  1: '별점 높은 가게',
  2: '추천 · 자주 간 가게',
  3: '추천 · 자주 간 · 싼 가게',
  4: '모든 가게',
};

export const HIGH_RATING = 4;
export const FREQUENT_VISITS = 2;
const NEAR_WALK = 3;

/** 카카오맵 level(1이 가장 확대) → 보여 줄 단계 */
export function tierForLevel(level: number): Tier {
  if (level >= 6) return 1;
  if (level === 5) return 2;
  if (level === 4) return 3;
  return 4;
}

/** 식당마다 처음 보이기 시작하는 단계를 매긴다 */
export function placeTiers(
  places: Place[],
  perMeal: number,
  ratings: Record<string, number>,
  visits: Record<string, number>,
): Record<string, Tier> {
  const prices = places.map((p) => bestMenu(p, perMeal).menu.price).sort((a, b) => a - b);
  const cheapLimit = prices.length ? prices[Math.max(0, Math.ceil(prices.length / 3) - 1)] : 0;

  const out: Record<string, Tier> = {};
  for (const p of places) {
    const { menu, fits } = bestMenu(p, perMeal);
    if ((ratings[p.id] ?? 0) >= HIGH_RATING) out[p.id] = 1;
    else if ((fits && p.walk <= NEAR_WALK) || (visits[p.id] ?? 0) >= FREQUENT_VISITS) out[p.id] = 2;
    else if (menu.price <= cheapLimit) out[p.id] = 3;
    else out[p.id] = 4;
  }
  return out;
}

/** 기록에서 식당별 방문 횟수를 센다 */
export function countVisits(meals: { placeId?: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of meals) if (m.placeId) out[m.placeId] = (out[m.placeId] ?? 0) + 1;
  return out;
}
