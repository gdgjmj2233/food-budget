'use client';

import { useEffect, useState } from 'react';

import { PLACES } from '@/data/places';
import { findNearbyRestaurants, loadKakaoMap, type ExtraPlace } from '@/lib/kakao-map';

/** 앱 데이터에 없는 주변 음식점. 카카오 검색이 끝나면 채워지고, 실패하면 빈 목록이다 */
export function useExtraPlaces(): ExtraPlace[] {
  const [extras, setExtras] = useState<ExtraPlace[]>([]);

  useEffect(() => {
    let alive = true;
    loadKakaoMap()
      .then(() => findNearbyRestaurants(PLACES))
      .then((found) => alive && setExtras(found))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return extras;
}
