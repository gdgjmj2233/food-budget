// 로그인한 사람의 데이터를 Firestore 에 읽고 쓴다

import { doc, getDoc, setDoc } from 'firebase/firestore';

import type { CloudData, CloudDoc, SyncMark } from '@/lib/cloud-merge';
import { db } from '@/lib/firebase';

const MARK_KEY = 'hankki/cloud-sync/v1';

const docOf = (uid: string) => doc(db, 'users', uid, 'data', 'main');

export async function loadCloud(uid: string): Promise<CloudDoc | null> {
  const snap = await getDoc(docOf(uid));
  if (!snap.exists()) return null;
  const { json, updatedAt } = snap.data() as { json: string; updatedAt: number };
  return { data: JSON.parse(json) as CloudData, updatedAt };
}

/** JSON 글자로 저장한다. 값이 없는 칸(undefined)을 Firestore 가 거절하지 않고, 저장 전후 내용을 그대로 비교할 수 있다 */
export async function saveCloud(uid: string, json: string) {
  const updatedAt = Date.now();
  await setDoc(docOf(uid), { json, updatedAt });
  writeMark({ uid, at: updatedAt });
}

export function readMark(): SyncMark | null {
  try {
    return JSON.parse(localStorage.getItem(MARK_KEY) ?? 'null') as SyncMark | null;
  } catch {
    return null;
  }
}

export function writeMark(mark: SyncMark | null) {
  try {
    if (mark) localStorage.setItem(MARK_KEY, JSON.stringify(mark));
    else localStorage.removeItem(MARK_KEY);
  } catch {
    // 저장이 막힌 브라우저에서는 다음에 처음 로그인한 것처럼 합친다
  }
}
