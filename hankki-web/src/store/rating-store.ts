'use client';

import { useSyncExternalStore } from 'react';

// 식당별 내 별점(1~5). 이 브라우저(localStorage)에만 저장된다.
const KEY = 'hankki/ratings-v1';

type Ratings = Record<string, number>;

const EMPTY: Ratings = {};
const listeners = new Set<() => void>();
let cache: Ratings | null = null;

function read(): Ratings {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function snapshot(): Ratings {
  return (cache ??= read());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 별점을 저장한다. 0 이하를 주면 지운다 */
export function setRating(id: string, stars: number) {
  const next = { ...snapshot() };
  if (stars > 0) next[id] = stars;
  else delete next[id];
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장이 막혀 있으면 이번 방문 동안만 유지된다
  }
  listeners.forEach((l) => l());
}

/** 식당 id → 내 별점. 서버 렌더링 때는 비어 있다 */
export function useRatings(): Ratings {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
