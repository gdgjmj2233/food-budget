'use client';

import Link from 'next/link';
import React from 'react';
import { IoTrashOutline } from 'react-icons/io5';

import {
  KIND_LABEL,
  kindOf,
  addDays,
  formatShort,
  fromDateKey,
  menuOf,
  placeNameOf,
  startOfDay,
  toDateKey,
  won,
  type Meal,
  type MissingDay,
} from '@/lib/budget';
import { KIND_COLORS } from '@/theme';
import styles from './recent-meals.module.css';
import ui from './ui.module.css';

/** 보여줄 최근 기록 수 */
const MAX_ROWS = 5;

/** 가게 이름이 없을 때 아랫줄 높이를 지키는 빈칸 (일반 공백은 줄 높이가 사라진다) */
const NBSP = String.fromCharCode(0xa0);
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
          {recent.map((m) => {
            // 윗줄은 항목(아침·야식 …)과 날짜를 같은 크기로, 아랫줄은 가게(· 메뉴). 가게 이름을 안 적었으면 아랫줄은 비워 둔다
            const title = [placeNameOf(m), menuOf(m)].filter(Boolean).join(' · ');
            const kind = kindOf(m);
            return (
              <li key={m.id} className={styles.row}>
                <span className={styles.body}>
                  <span className={styles.name}>
                    <span style={{ color: KIND_COLORS[kind].fg }}>{KIND_LABEL[kind]}</span>{' '}
                    <span className={styles.day}>{dayName(m.date)}</span>
                  </span>
                  <span className={styles.when}>{title || NBSP}</span>
                </span>
                <span className={styles.price}>
                  {m.price > 0 && '−'}
                  {won(m.price)}원
                </span>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => onRemove(m)}
                  aria-label={`${dayName(m.date)} ${KIND_LABEL[kind]}${title ? ` ${title}` : ''} ${won(m.price)}원 기록 지우기`}>
                  <IoTrashOutline size={16} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
