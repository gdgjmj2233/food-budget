'use client';

import Image from 'next/image';
import React from 'react';

import { CHARACTERS, characterOf } from '@/data/characters';
import { type MissingDay } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { useProfile } from '@/store/profile-store';
import styles from './missing-day.module.css';

/** 어제 기록이 하나도 없을 때 홈 맨 위에서 묻는 카드 */
export function MissingDayCard({ missing, onInput }: { missing: MissingDay; onInput: () => void }) {
  const { dismissMissing } = useBudget();
  const profile = useProfile();
  const character = profile ? characterOf(profile.character) : CHARACTERS[1];

  return (
    <section className={styles.card} aria-labelledby="ask-title">
      <div className={styles.head}>
        <Image src={character.img} alt="" unoptimized className={styles.mascot} />
        <h2 id="ask-title" className={styles.notice}>
          어제 기록이 비어 있어요
        </h2>
      </div>

      <div className={styles.choices}>
        <button type="button" className={styles.choice} onClick={onInput}>
          직접 입력
        </button>
        <button type="button" className={styles.choice} onClick={() => dismissMissing(missing.date)}>
          지출 없음
        </button>
      </div>
    </section>
  );
}
