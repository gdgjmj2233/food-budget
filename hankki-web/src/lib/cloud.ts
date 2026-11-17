// 로그인한 사람의 데이터를 Supabase 의 user_data 표에 읽고 쓴다 (한 사람당 한 줄)

import type { CloudData, CloudDoc, SyncMark } from '@/lib/cloud-merge';
import { supabase } from '@/lib/supabase';

const MARK_KEY = 'hankki/cloud-sync/v1';

const TABLE = 'user_data';

export async function loadCloud(uid: string): Promise<CloudDoc | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select('json, updated_at').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { data: JSON.parse(data.json as string) as CloudData, updatedAt: Number(data.updated_at) };
}

/** JSON 글자로 저장한다. 저장 전후 내용을 그대로 비교할 수 있다 */
export async function saveCloud(uid: string, json: string) {
  if (!supabase) return;
  const updatedAt = Date.now();
  const { error } = await supabase.from(TABLE).upsert({ user_id: uid, json, updated_at: updatedAt });
  if (error) throw error;
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
