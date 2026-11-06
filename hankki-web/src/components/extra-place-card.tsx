'use client';

import React from 'react';

import type { ExtraPlace } from '@/lib/kakao-map';
import { StarRating } from './star-rating';
import styles from './extra-place-card.module.css';

/** 앱 데이터에 없는 주변 음식점(카카오 장소 검색 결과). 메뉴 정보는 없고 이름·주소·내 별점만 보여 준다 */
export function ExtraPlaceCard({ place }: { place: ExtraPlace }) {
  return (
    <div className={styles.card}>
      <div className={styles.name}>{place.name}</div>
      <div className={styles.meta}>
        {place.cat ?? '음식점'} · {place.address}
      </div>
      <StarRating id={place.id} name={place.name} />
      <a
        className={styles.link}
        href={`https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`}
        target="_blank"
        rel="noreferrer">
        카카오맵에서 보기
      </a>
    </div>
  );
}
