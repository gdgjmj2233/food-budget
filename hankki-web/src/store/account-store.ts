'use client';

// 회원가입·로그인. 비밀번호는 Firebase 가 관리하고 이 앱은 저장하지 않는다.

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { useSyncExternalStore } from 'react';

import { auth } from '@/lib/firebase';

export interface Account {
  uid: string;
  email: string;
}

const ERRORS: Record<string, string> = {
  'auth/email-already-in-use': '이미 가입한 이메일이에요. 로그인해 주세요',
  'auth/invalid-credential': '이메일이나 비밀번호가 맞지 않아요',
  'auth/invalid-email': '이메일 형식을 확인해 주세요',
  'auth/network-request-failed': '인터넷 연결을 확인해 주세요',
  'auth/too-many-requests': '시도가 너무 많았어요. 잠시 후 다시 해 주세요',
  'auth/user-not-found': '이메일이나 비밀번호가 맞지 않아요',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해요',
  'auth/wrong-password': '이메일이나 비밀번호가 맞지 않아요',
};

/** Firebase 오류를 화면에 보여 줄 말로 바꾼다 */
export const accountError = (e: unknown) => ERRORS[(e as { code?: string }).code ?? ''] ?? '잠시 후 다시 해 주세요';

export const signUp = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const logIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const logOut = () => signOut(auth);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

/** undefined = 아직 확인 중, null = 로그인 안 함 */
let current: Account | null | undefined;
const subscribe = (fn: () => void) =>
  onAuthStateChanged(auth, (user) => {
    if (user?.uid !== (current?.uid ?? undefined) || current === undefined) {
      current = user ? { uid: user.uid, email: user.email ?? '' } : null;
    }
    fn();
  });

export function useAccount(): Account | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => undefined,
  );
}
