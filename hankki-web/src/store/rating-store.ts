'use client';

// 내가 식당에 매긴 별점(1~5). 이 브라우저(localStorage)에만 저장한다.

import { useSyncExternalStore } from 'react';

export const RATINGS_KEY = 'hankki/ratings/v1';

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const emit = () => listeners.forEach((fn) => fn());

const EMPTY: Record<string, number> = {};
let ratings: Record<string, number> | undefined;

function loadRatings(): Record<string, number> {
  if (ratings) return ratings;
  try {
    const saved = JSON.parse(localStorage.getItem(RATINGS_KEY) ?? '{}') as Record<string, unknown>;
    ratings = Object.fromEntries(
      Object.entries(saved).filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] >= 1 && e[1] <= 5),
    );
  } catch {
    ratings = {};
  }
  return ratings;
}

/** 별점 저장. 0 이면 별점을 지운다 */
export function setRating(placeId: string, stars: number) {
  const next = { ...loadRatings() };
  if (stars > 0) next[placeId] = stars;
  else delete next[placeId];
  ratings = next;
  try {
    localStorage.setItem(RATINGS_KEY, JSON.stringify(next));
  } catch {
    // 저장이 막힌 브라우저에서는 이번 방문 동안만 유지
  }
  emit();
}

/** 식당 id → 내 별점(1~5) */
export function useRatings(): Record<string, number> {
  return useSyncExternalStore(subscribe, loadRatings, () => EMPTY);
}
