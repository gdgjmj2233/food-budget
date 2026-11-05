'use client';

import Image from 'next/image';
import React, { useState } from 'react';

import { CHARACTERS, characterOf } from '@/data/characters';
import { useEat } from '@/hooks/use-eat';
import { frequentMeals, won, type Meal, type MissingMeal } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { useProfile } from '@/store/profile-store';
import styles from './missing-meal.module.css';

const label = (m: Meal) => `${m.name} ${won(m.price)}원`;

/** 어제 끼니 기록이 비어 있을 때 홈 맨 위에서 묻는 카드 */
export function MissingMealCard({ missing, onInput }: { missing: MissingMeal; onInput: () => void }) {
  const { meals, dismissMissing } = useBudget();
  const { fillMissing } = useEat();
  const profile = useProfile();
  const [picked, setPicked] = useState<Meal | null>(null);
  const chips = frequentMeals(meals);
  const character = profile ? characterOf(profile.character) : CHARACTERS[1];

  return (
    <section className={styles.card} aria-labelledby="ask-title">
      <div className={styles.head}>
        <Image src={character.img} alt="" unoptimized className={styles.mascot} />
        <div className={styles.headText}>
          <span className={styles.notice}>어제 {missing.slot} 기록이 비어 있어요</span>
          <h2 id="ask-title" className={styles.title}>
            어제 {missing.slot} 뭐 먹었어?
          </h2>
        </div>
      </div>

      {chips.length > 0 && (
        <div className={styles.frequent}>
          <span className={styles.frequentLabel}>자주 먹은 메뉴</span>
          <div className={styles.chips}>
            {chips.map((m) => {
              const on = picked?.id === m.id;
              return (
                <button
                  type="button"
                  key={m.id}
                  aria-pressed={on}
                  className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                  onClick={() => setPicked(on ? null : m)}>
                  {label(m)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.choices}>
        <button type="button" className={styles.choice} onClick={onInput}>
          직접 입력
        </button>
        <button type="button" className={styles.choice} onClick={() => fillMissing(missing, '스킵', '끼니 건너뜀', 0)}>
          안 먹었어
        </button>
        <button type="button" className={styles.choice} onClick={() => dismissMissing(missing.date)}>
          기억 안 나
        </button>
      </div>

      {picked && (
        <button
          type="button"
          className={styles.save}
          onClick={() => fillMissing(missing, picked.name, picked.menu, picked.price, picked.placeId)}>
          어제 {missing.slot}으로 기록하기 · {label(picked)}
        </button>
      )}
    </section>
  );
}
