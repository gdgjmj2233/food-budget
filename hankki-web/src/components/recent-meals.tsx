'use client';

import Link from 'next/link';
import React from 'react';
import { IoTrashOutline } from 'react-icons/io5';

import {
  addDays,
  formatShort,
  fromDateKey,
  menuOf,
  startOfDay,
  toDateKey,
  won,
  type Meal,
  type MissingDay,
} from '@/lib/budget';
import styles from './recent-meals.module.css';
import ui from './ui.module.css';

/** 보여줄 최근 기록 수 */
const MAX_ROWS = 5;

/** 오늘·어제는 말로, 그 전은 날짜로 */
const dayName = (date: string) => {
  const today = startOfDay(new Date());
  if (date === toDateKey(today)) return '오늘';
  if (date === toDateKey(addDays(today, -1))) return '어제';
  return formatShort(fromDateKey(date));
};

/** 최근 기록. 잘못 기록한 것을 바로 지울 수 있고, 어제 기록이 하나도 없으면 맨 위에 보여준다. */
export function RecentMeals({
  meals,
  missing,
  onFill,
  onRemove,
}: {
  meals: Meal[];
  missing: MissingDay | null;
  onFill: () => void;
  onRemove: (meal: Meal) => void;
}) {
  const recent = [...meals].sort((a, b) => b.at - a.at).slice(0, MAX_ROWS);

  return (
    <section className={styles.section}>
      <div className={ui.row}>
        <h2 className={ui.sec}>최근 기록</h2>
        <Link href="/history" className={styles.more}>
          전체 보기
        </Link>
      </div>

      {recent.length === 0 && !missing ? (
        <p className={styles.empty}>아직 기록이 없어요</p>
      ) : (
        <ul className={styles.list}>
          {missing && (
            <li className={styles.row}>
              <span className={styles.body}>
                <span className={styles.blankName}>기록 없음</span>
                <span className={styles.when}>어제</span>
              </span>
              <button type="button" className={styles.fill} onClick={onFill}>
                채우기
              </button>
            </li>
          )}
          {recent.map((m) => (
            <li key={m.id} className={styles.row}>
              <span className={styles.body}>
                <span className={styles.name}>
                  {m.name}
                  {menuOf(m) && ` · ${menuOf(m)}`}
                </span>
                <span className={styles.when}>{dayName(m.date)}</span>
              </span>
              <span className={styles.price}>
                {m.price > 0 && '−'}
                {won(m.price)}원
              </span>
              <button
                type="button"
                className={styles.remove}
                onClick={() => onRemove(m)}
                aria-label={`${m.name} ${won(m.price)}원 기록 지우기`}>
                <IoTrashOutline size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
