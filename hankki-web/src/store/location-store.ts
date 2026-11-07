'use client';

// 내 위치. 지도의 "내 위치" 버튼과 목록의 "내 위치에서 가까운 순"이 함께 쓴다.
// 위치는 브라우저에서만 쓰고 저장하거나 서버로 보내지 않는다.

import { useSyncExternalStore } from 'react';

import type { LatLngPos } from '@/lib/geo';

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'error' | 'unsupported';
export type LocationState = { pos: LatLngPos | null; status: LocationStatus };

const SERVER_STATE: LocationState = { pos: null, status: 'idle' };
let state: LocationState = SERVER_STATE;
let watchId: number | null = null;
let pendingFirst: ((pos: LatLngPos) => void)[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const set = (next: LocationState) => {
  state = next;
  emit();
};

function stopWatch() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

/** 이 화면을 보는 곳이 하나도 없으면 위치 추적을 멈춘다 (마지막 위치는 남겨 둔다) */
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopWatch();
      pendingFirst = [];
      if (state.status === 'locating') state = { pos: state.pos, status: state.pos ? 'ready' : 'idle' };
    }
  };
}

/**
 * 위치 추적을 시작한다. 처음 쓰면 브라우저가 권한을 묻는다.
 * 위치를 처음 알게 되면(이미 알면 바로) onFirst 를 한 번 불러 준다.
 */
export function startLocating(onFirst?: (pos: LatLngPos) => void) {
  if (state.pos) onFirst?.(state.pos);
  else if (onFirst) pendingFirst.push(onFirst);

  if (watchId !== null) return; // 이미 추적 중
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    set({ pos: null, status: 'unsupported' });
    return;
  }
  if (!state.pos) set({ pos: null, status: 'locating' });

  watchId = navigator.geolocation.watchPosition(
    ({ coords }) => {
      const pos = { lat: coords.latitude, lng: coords.longitude };
      set({ pos, status: 'ready' });
      const callbacks = pendingFirst;
      pendingFirst = [];
      callbacks.forEach((cb) => cb(pos));
    },
    (err) => {
      stopWatch();
      pendingFirst = [];
      set({ pos: state.pos, status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error' });
    },
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
  );
}

export function useLocation(): LocationState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

/** 위치 상태를 사람이 읽을 문구로. 문제가 없으면 null */
export function locationProblem(status: LocationStatus): string | null {
  if (status === 'denied') return '위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요';
  if (status === 'error') return '내 위치를 확인할 수 없어요. 잠시 후 다시 눌러 보세요';
  if (status === 'unsupported') return '이 브라우저에서는 내 위치를 쓸 수 없어요';
  return null;
}
