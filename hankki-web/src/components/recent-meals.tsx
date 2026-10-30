'use client';

import Link from 'next/link';
import React from 'react';
import { IoTrashOutline } from 'react-icons/io5';

import { formatShort, fromDateKey, toDateKey, won, type Meal } from '@/lib/budget';
import styles from './recent-meals.module.css';
import ui from './ui.module.css';

/** 보여줄 최근 기록 수 */
const MAX_ROWS = 5;

const pad = (n: number) => String(n).padStart(2, '0');

const timeOf = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 최근에 기록한 끼니. 잘못 기록한 것을 바로 지울 수 있다. */
export function RecentMeals({ meals, onRemove }: { meals: Meal[]; onRemove: (meal: Meal) => void }) {
  const todayKey = toDateKey(new Date());
  const recent = [...meals].sort((a, b) => b.at - a.at).slice(0, MAX_ROWS);

  return (
    <section className={ui.card}>
      <div className={ui.row}>
        <h2 className={ui.sec}>최근 기록</h2>
        <Link href="/history" className={styles.more}>
          전체 보기
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className={styles.empty}>아직 기록이 없어요</p>
      ) : (
        <ul className={styles.list}>
          {recent.map((m) => (
            <li key={m.id} className={styles.row}>
              <span className={styles.when}>
                <span>{m.date === todayKey ? '오늘' : formatShort(fromDateKey(m.date))}</span>
                <span>{timeOf(m.at)}</span>
              </span>
              <span className={styles.body}>
                <span className={styles.name}>{m.name}</span>
                <span className={styles.menu}>{m.menu}</span>
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
                <IoTrashOutline size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
