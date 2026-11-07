'use client';

// 앱 데이터 식당들의 지도 좌표. 카카오 장소 검색으로 한 번만 찾아서 지도와 목록이 함께 쓴다.
// (찾은 좌표는 lib/kakao-map 이 브라우저에 저장해 두어서 다음 방문부터는 검색하지 않는다)

import { useSyncExternalStore } from 'react';

import { PLACES } from '@/data/places';
import { loadKakaoMap, locatePlaces } from '@/lib/kakao-map';
import type { LatLngPos } from '@/lib/geo';

type Snapshot = { positions: Record<string, LatLngPos>; located: boolean };

const SERVER_SNAPSHOT: Snapshot = { positions: {}, located: false };
let snapshot: Snapshot = SERVER_SNAPSHOT;
let started = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const set = (next: Snapshot) => {
  snapshot = next;
  listeners.forEach((l) => l());
};

/** 좌표 찾기를 시작한다. 여러 번 불러도 한 번만 찾는다. 카카오맵을 못 불러오면 다음에 다시 시도한다 */
export function ensurePlacePositions() {
  if (started) return;
  started = true;
  loadKakaoMap()
    .then(() =>
      locatePlaces(PLACES, (id, pos) => set({ ...snapshot, positions: { ...snapshot.positions, [id]: pos } })),
    )
    .then(() => set({ ...snapshot, located: true }))
    .catch(() => {
      started = false;
    });
}

export function usePlacePositions(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
}
