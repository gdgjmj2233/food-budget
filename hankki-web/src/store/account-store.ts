'use client';

// 회원가입·로그인(이메일, Google). 비밀번호는 Supabase 가 관리하고 이 앱은 저장하지 않는다.

import { useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';

export interface Account {
  uid: string;
  email: string;
}

const NOT_READY = 'not_ready';

const ERRORS: Record<string, string> = {
  [NOT_READY]: '로그인을 아직 쓸 수 없어요. 이 기기에만 저장돼요',
  user_already_exists: '이미 가입한 이메일이에요. 로그인해 주세요',
  email_exists: '이미 가입한 이메일이에요. 로그인해 주세요',
  invalid_credentials: '이메일이나 비밀번호가 맞지 않아요',
  email_address_invalid: '이메일 형식을 확인해 주세요',
  validation_failed: '이메일 형식을 확인해 주세요',
  weak_password: '비밀번호는 6자 이상이어야 해요',
  over_request_rate_limit: '시도가 너무 많았어요. 잠시 후 다시 해 주세요',
  over_email_send_rate_limit: '메일을 너무 자주 보냈어요. 잠시 후 다시 해 주세요',
  email_not_confirmed: '메일로 보낸 확인 링크를 먼저 눌러 주세요',
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

/** 로그인한 뒤 돌아올 주소. GitHub Pages 처럼 하위 경로(/food-budget)에 있어도 맞게 만든다 */
const home = () => window.location.origin + (process.env.PAGES_BASE_PATH ?? '') + '/';

export async function signUp(email: string, password: string) {
  const { error } = await client().auth.signUp({ email, password, options: { emailRedirectTo: home() } });
  if (error) throw error;
}

export async function logIn(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Google 로그인. 구글 화면으로 이동했다가 이 앱으로 돌아온다 */
export async function logInWithGoogle() {
  const { error } = await client().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: home() } });
  if (error) throw error;
}

export async function logOut() {
  const { error } = await client().auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: home() });
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
