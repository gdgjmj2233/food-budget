'use client';

import React from 'react';
import { IoStar, IoStarOutline } from 'react-icons/io5';

import { setRating, useRatings } from '@/store/rating-store';
import styles from './star-rating.module.css';

/** 내 별점 입력. 같은 별을 다시 누르면 별점이 지워진다 */
export function StarRating({ id, name }: { id: string; name: string }) {
  const stars = useRatings()[id] ?? 0;

  return (
    <div className={styles.row} role="group" aria-label={`${name} 내 별점`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const Icon = n <= stars ? IoStar : IoStarOutline;
        return (
          <button
            type="button"
            key={n}
            onClick={() => setRating(id, n === stars ? 0 : n)}
            aria-label={`${n}점`}
            aria-pressed={n === stars}
            className={styles.star}>
            <Icon size={22} aria-hidden />
          </button>
        );
      })}
      <span className={styles.label}>{stars ? `${stars}점` : '별점을 남겨 보세요'}</span>
    </div>
  );
}
