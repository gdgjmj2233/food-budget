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

/** 좌표가 거의 같아서(같은 건물) 지도를 확대해도 풀리지 않는 묶음인지. 약 20m 이내 */
export function isSameSpot(points: { lat: number; lng: number }[]): boolean {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return Math.max(...lats) - Math.min(...lats) < 0.0002 && Math.max(...lngs) - Math.min(...lngs) < 0.00025;
}
