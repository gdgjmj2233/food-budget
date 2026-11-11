// 지도에서 화면상 가까운 핀을 하나로 묶는 계산 (카카오맵과 분리한 순수 함수)

export type ScreenPoint = { id: string; x: number; y: number };

/**
 * 화면 좌표(px)로 가로 width, 세로 height 안에 겹치는 점끼리 묶는다. 각 묶음의 첫 점이 기준점이다.
 * 기준점끼리는 서로의 범위 밖에 있으므로, 핀을 기준점 자리에 그리면 핀 크기가 범위보다 작은 한 겹치지 않는다.
 * 앞에 있는 점부터 기준으로 삼으므로, 먼저 보여 주고 싶은 점(예: 싼 식당)을 앞에 두면 된다.
 */
export function clusterPoints(points: ScreenPoint[], width: number, height: number): ScreenPoint[][] {
  const used = new Set<string>();
  const groups: ScreenPoint[][] = [];
  for (const seed of points) {
    if (used.has(seed.id)) continue;
    used.add(seed.id);
    const group = [seed];
    for (const p of points) {
      if (used.has(p.id)) continue;
      if (Math.abs(p.x - seed.x) < width && Math.abs(p.y - seed.y) < height) {
        used.add(p.id);
        group.push(p);
      }
    }
    groups.push(group);
  }
  return groups;
}

/**
 * 화면에서 서로 겹친 핀끼리 묶는다(핀 위치는 바꾸지 않는다). 가운데가 (x, y)이고 크기가 width x height 인 핀이
 * 조금이라도 겹치면 한 더미이고, 그 더미와 또 겹친 핀도 같은 더미로 본다. 둘 이상 겹친 핀만 id → 같은 더미의 id 목록으로 돌려준다.
 * 더미 안 id 는 points 에 넣은 순서를 따른다.
 */
export function stackedPiles(points: (ScreenPoint & { width: number })[], height: number): Map<string, string[]> {
  const parent = new Map(points.map((p) => [p.id, p.id]));
  const root = (id: string): string => {
    const up = parent.get(id)!;
    if (up === id) return id;
    const top = root(up);
    parent.set(id, top);
    return top;
  };
  const byX = [...points].sort((a, b) => a.x - b.x);
  const widest = Math.max(0, ...points.map((p) => p.width));
  for (let i = 0; i < byX.length; i++) {
    const a = byX[i];
    for (let j = i + 1; j < byX.length && byX[j].x - a.x < (a.width + widest) / 2; j++) {
      const b = byX[j];
      if (Math.abs(b.x - a.x) < (a.width + b.width) / 2 && Math.abs(b.y - a.y) < height) parent.set(root(b.id), root(a.id));
    }
  }
  const piles = new Map<string, string[]>();
  for (const p of points) {
    const r = root(p.id);
    const pile = piles.get(r);
    if (pile) pile.push(p.id);
    else piles.set(r, [p.id]);
  }
  const result = new Map<string, string[]>();
  for (const pile of piles.values()) if (pile.length > 1) pile.forEach((id) => result.set(id, pile));
  return result;
}

/** 화면에 놓인 핀: 가운데 (x, y), 가로 크기, 이 핀에 들어 있는 것들(합친 핀이면 여럿) */
export type PinNode<T> = ScreenPoint & { width: number; members: T[] };

/**
 * 조금이라도 겹친 핀을 하나로 합친다. 합친 핀은 합쳐진 것들의 가운데에 놓이고 가로 크기는 mergedWidth 이며,
 * 그 자리에서 또 다른 핀과 겹치면 다시 합친다(남는 핀끼리는 겹치지 않는다). 핀을 다른 자리로 옮기지는 않는다.
 * 합친 핀의 members 는 nodes 에 넣은 순서를 따른다.
 */
export function mergeOverlapping<T>(nodes: PinNode<T>[], height: number, mergedWidth: number): PinNode<T>[] {
  let current = nodes;
  // 한 번 돌 때마다 핀 수가 줄어서 언젠가 끝나지만, 혹시 몰라 횟수를 제한한다
  for (let round = 0; round < 20; round++) {
    const piles = stackedPiles(current, height);
    if (!piles.size) break;
    const byId = new Map(current.map((n) => [n.id, n]));
    const done = new Set<string[]>();
    const next: PinNode<T>[] = [];
    for (const n of current) {
      const pile = piles.get(n.id);
      if (!pile) {
        next.push(n);
        continue;
      }
      if (done.has(pile)) continue;
      done.add(pile);
      const parts = pile.map((id) => byId.get(id)!);
      const count = parts.reduce((s, q) => s + q.members.length, 0);
      next.push({
        id: parts[0].id,
        x: parts.reduce((s, q) => s + q.x * q.members.length, 0) / count,
        y: parts.reduce((s, q) => s + q.y * q.members.length, 0) / count,
        width: mergedWidth,
        members: parts.flatMap((q) => q.members),
      });
    }
    current = next;
  }
  return current;
}

/** 좌표가 거의 같아서(같은 건물) 지도를 확대해도 풀리지 않는 묶음인지. 약 20m 이내 */
export function isSameSpot(points: { lat: number; lng: number }[]): boolean {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return Math.max(...lats) - Math.min(...lats) < 0.0002 && Math.max(...lngs) - Math.min(...lngs) < 0.00025;
}
