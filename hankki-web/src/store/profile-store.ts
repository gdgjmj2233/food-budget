'use client';

// 간단 로그인: 개인정보와 고른 캐릭터를 이 브라우저(localStorage)에만 저장한다. 서버·비밀번호는 없다.

import { useSyncExternalStore } from 'react';

import { CHARACTERS, type CharacterId } from '@/data/characters';

const STORAGE_KEY = 'hankki/profile/v1';

export interface Profile {
  nickname: string;
  major: string;
  studentId: string;
  email: string;
  character: CharacterId;
}

const listeners = new Set<() => void>();
/** undefined = 아직 저장소에서 읽지 않음, null = 로그아웃 상태 */
let current: Profile | null | undefined;

function load(): Profile | null {
  if (current !== undefined) return current;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Profile>) : null;
    current =
      saved && typeof saved.nickname === 'string' && saved.nickname
        ? {
            nickname: saved.nickname,
            major: saved.major ?? '',
            studentId: saved.studentId ?? '',
            email: saved.email ?? '',
            character: CHARACTERS.some((c) => c.id === saved.character) ? saved.character! : CHARACTERS[0].id,
          }
        : null;
  } catch {
    current = null;
  }
  return current;
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** 로그인·정보 수정(profile) 또는 로그아웃(null) */
export function saveProfile(profile: Profile | null) {
  current = profile;
  try {
    if (profile) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장 공간이 막힌 브라우저(시크릿 모드 등)에서는 이번 방문 동안만 유지
  }
  listeners.forEach((fn) => fn());
}

/** 로그인한 사람의 정보. 로그인 전이면 null */
export function useProfile(): Profile | null {
  return useSyncExternalStore(subscribe, load, () => null);
}
