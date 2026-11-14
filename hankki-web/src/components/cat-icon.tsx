import Image from 'next/image';
import React from 'react';

import type { Category } from '@/data/places';
import { CAT_EMOJI, CAT_IMAGE } from '@/theme';
import styles from './cat-icon.module.css';

/**
 * 음식 종류 아이콘. 그림이 있는 종류(분식 떡볶이, 중식 짜장면)는 그림, 나머지는 이모지.
 * 크기는 부모의 글자 크기를 따른다 (이모지와 같은 크기로 보이게 그림은 1.15em).
 */
export function CatIcon({ cat }: { cat: Category | '전체' }) {
  const img = CAT_IMAGE[cat];
  if (!img) return <>{CAT_EMOJI[cat]}</>;
  return <Image src={img} alt="" unoptimized draggable={false} className={styles.img} />;
}
