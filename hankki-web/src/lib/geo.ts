export type LatLngPos = { lat: number; lng: number };

/** 두 지점 사이의 직선거리(m). 하버사인 공식 */
export function distanceM(a: LatLngPos, b: LatLngPos): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 거리를 "120m", "1.4km"처럼 읽기 쉽게 */
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}
