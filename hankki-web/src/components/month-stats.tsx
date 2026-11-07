import React from 'react';

import { won, type Meal } from '@/lib/budget';
import { monthStats } from '@/lib/stats';
import styles from './month-stats.module.css';

type Tile = { label: string; value: string; note?: string };

/** 보고 있는 달의 식비 요약: 하루 평균, 가장 많이 쓴 요일, 가장 비싼 한 끼, 자주 간 곳 */
export function MonthStats({ meals }: { meals: Meal[] }) {
  const st = monthStats(meals);
  if (!st) return null;

  const tiles: Tile[] = [{ label: '하루 평균', value: `${won(st.perDay)}원`, note: `${st.days}일 기준` }];
  if (st.topWeekday) {
    tiles.push({ label: '가장 많이 쓴 요일', value: `${st.topWeekday.name}요일`, note: `${won(st.topWeekday.total)}원` });
  }
  if (st.priciest) tiles.push({ label: '가장 비싼 한 끼', value: `${won(st.priciest.price)}원`, note: st.priciest.name });
  if (st.frequent) tiles.push({ label: '자주 간 곳', value: st.frequent.name, note: `${st.frequent.count}번` });

  return (
    <section className={styles.stats} aria-label="이번 달 요약">
      {tiles.map((t) => (
        <div key={t.label} className={styles.tile}>
          <span className={styles.label}>{t.label}</span>
          <span className={styles.value}>{t.value}</span>
          {t.note && <span className={styles.note}>{t.note}</span>}
        </div>
      ))}
    </section>
  );
}
