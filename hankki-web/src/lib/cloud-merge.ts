// 이 브라우저의 데이터와 계정에 저장된 데이터 중 무엇을 쓸지 정한다

import type { Meal, Settings } from './budget';

export interface CloudData {
  settings: Settings;
  meals: Meal[];
  dismissedDate: string | null;
  profile: unknown;
  ratings: Record<string, number>;
}

export interface CloudDoc {
  data: CloudData;
  updatedAt: number;
}

/** 이 브라우저가 마지막으로 맞춘 계정과 그때의 저장 시각 */
export interface SyncMark {
  uid: string;
  at: number;
}

/**
 * 로그인했을 때 쓸 데이터. apply 가 true 면 이 브라우저의 데이터를 바꿔야 한다.
 * - 이 브라우저에서 처음 로그인: 기록과 별점을 합친다. 그동안 쓴 기록이 사라지지 않게 하려는 것
 * - 다른 기기에서 저장한 적 있음: 계정 쪽으로 바꾼다. 합치면 다른 기기에서 지운 기록이 되살아난다
 * - 그 밖에는 이 브라우저 데이터가 최신이다
 */
export function reconcile(local: CloudData, remote: CloudDoc | null, mark: SyncMark | null, uid: string) {
  if (!remote) return { data: local, apply: false };
  if (mark?.uid === uid) return remote.updatedAt === mark.at ? { data: local, apply: false } : { data: remote.data, apply: true };

  const byId = new Map(remote.data.meals.map((m) => [m.id, m]));
  local.meals.forEach((m) => {
    if (!byId.has(m.id)) byId.set(m.id, m);
  });
  const data: CloudData = {
    ...remote.data,
    meals: [...byId.values()].sort((a, b) => a.at - b.at),
    profile: remote.data.profile ?? local.profile,
    ratings: { ...local.ratings, ...remote.data.ratings },
  };
  return { data, apply: true };
}
