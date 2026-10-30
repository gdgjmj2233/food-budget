'use client';

import React from 'react';
import { IoAdd } from 'react-icons/io5';

import { BudgetPreview } from './budget-tools';
import type { Meal } from '@/lib/budget';
import { won } from '@/lib/budget';
import { frequentMeals, type Frequent } from '@/lib/frequent';
import styles from './quick-meals.module.css';
import ui from './ui.module.css';

/** 보여줄 메뉴 수 */
const LIMIT = 4;

/** 홈: 자주 먹은 메뉴를 한 번 눌러 바로 기록 */
export function QuickMeals({ meals, perMeal, onPick }: { meals: Meal[]; perMeal: number; onPick: (f: Frequent) => void }) {
  const list = frequentMeals(meals, LIMIT);

  return (
    <section className={ui.card}>
      <div className={styles.heading}>
        <div>
          <h2 className={ui.sec}>자주 먹은 메뉴</h2>
          <p className={styles.hint}>누르면 바로 기록돼요</p>
        </div>
      </div>

      {list.length === 0 ? (
        <p className={styles.empty}>기록이 쌓이면 자주 먹은 메뉴가 여기 나와요. 그다음부터는 한 번만 누르면 기록됩니다.</p>
      ) : (
        <div className={styles.grid}>
          {list.map((f) => (
            <button
              type="button"
              key={f.key}
              onClick={() => onPick(f)}
              aria-label={`${f.name} ${f.menu} ${won(f.price)}원 바로 기록`}
              className={styles.item}>
              <span className={styles.top}>
                <span className={styles.name}>{f.name}</span>
                <span className={styles.count}>{f.count}번</span>
              </span>
              <span className={styles.menu}>{f.menu}{f.price <= perMeal ? " · 예산 안 추천" : " · 권장 금액 초과"}</span>
              <BudgetPreview price={f.price} />
              <span className={styles.bottom}>
                <span className={`${styles.price} ${f.price > perMeal ? styles.over : ''}`}>{won(f.price)}원</span>
                <span className={styles.add}>
                  <IoAdd size={16} aria-hidden />
                  기록
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
