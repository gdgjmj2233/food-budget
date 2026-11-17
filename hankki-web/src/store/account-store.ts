'use client';

// 로그인은 Google 계정으로만 한다. 로그인 정보는 Supabase 가 관리하고 이 앱은 비밀번호를 다루지 않는다.

import { useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';

export interface Account {
  uid: string;
  email: string;
}

const NOT_READY = 'not_ready';

const ERRORS: Record<string, string> = {
  [NOT_READY]: '로그인을 아직 쓸 수 없어요. 이 기기에만 저장돼요',
  over_request_rate_limit: '시도가 너무 많았어요. 잠시 후 다시 해 주세요',
  unexpected_failure: '잠시 후 다시 해 주세요',
};

/** Supabase 오류를 화면에 보여 줄 말로 바꾼다 */
export function accountError(e: unknown) {
  const err = e as { code?: string; name?: string };
  if (err?.name === 'AuthRetryableFetchError') return '인터넷 연결을 확인해 주세요';
  return ERRORS[err?.code ?? ''] ?? '잠시 후 다시 해 주세요';
}

function client() {
  if (!supabase) throw { code: NOT_READY };
  return supabase;
}

/** 로그인한 뒤 돌아올 주소: 지금 보던 화면. GitHub Pages 처럼 하위 경로(/food-budget)에 있어도 그대로 맞고, 주소 뒤의 #·? 는 뗀다 */
const home = () => window.location.origin + window.location.pathname;

/** Google 로그인. 구글 화면으로 이동했다가 이 앱으로 돌아온다 */
export async function logInWithGoogle() {
  const { error } = await client().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: home() } });
  if (error) throw error;
}

export async function logOut() {
  const { error } = await client().auth.signOut();
  if (error) throw error;
}

/** undefined = 아직 확인 중, null = 로그인 안 함 */
let current: Account | null | undefined = supabase ? undefined : null;
let started = false;
const listeners = new Set<() => void>();

function set(next: Account | null) {
  // 같은 사람이면 값을 바꾸지 않아서 불필요하게 다시 그리지 않는다
  if (current !== undefined && current?.uid === next?.uid && current?.email === next?.email) return;
  current = next;
  listeners.forEach((fn) => fn());
}

function start() {
  if (started || !supabase) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => {
    const u = data.session?.user;
    set(u ? { uid: u.id, email: u.email ?? '' } : null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    set(u ? { uid: u.id, email: u.email ?? '' } : null);
  });
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  start();
  return () => {
    listeners.delete(fn);
  };
};

export function useAccount(): Account | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => undefined,
  );
}
