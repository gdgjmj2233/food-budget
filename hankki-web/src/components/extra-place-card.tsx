'use client';

import React, { useRef, useState } from 'react';

import type { ExtraPlace } from '@/lib/kakao-map';
import { EatHere, EatHereButton, keepCardInView } from './eat-here';
import { StarRating } from './star-rating';
import styles from './extra-place-card.module.css';

/**
 * 앱 데이터에 없는 주변 음식점(카카오 장소 검색 결과). 메뉴 정보는 없고 이름·주소·내 별점만 보여 준다.
 * "여기서 밥먹기"를 누르면 먹은 메뉴와 가격을 직접 입력해서 기록할 수 있다. limit 은 오늘 남은 금액
 */
export function ExtraPlaceCard({ place, limit }: { place: ExtraPlace; limit: number }) {
  const [eating, setEating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeEat = () => {
    setEating(false);
    keepCardInView(cardRef.current);
  };

  return (
    <div ref={cardRef} className={styles.card}>
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
      {eating ? (
        <div className={styles.eat}>
          <EatHere name={place.name} placeId={place.id} menus={[]} limit={limit} onClose={closeEat} pickKind />
        </div>
      ) : (
        <EatHereButton soft onPress={() => setEating(true)} />
      )}
    </div>
  );
}
