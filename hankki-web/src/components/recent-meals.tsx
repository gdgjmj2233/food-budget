'use client';

import Link from 'next/link';
import React from 'react';
import { IoPencilOutline, IoTrashOutline } from 'react-icons/io5';

import {
  KIND_LABEL,
  kindOf,
  formatShort,
  fromDateKey,
  menuOf,
  placeNameOf,
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

/** 기록 날짜 (예: 11/14). 오늘·어제도 말 대신 날짜로만 보여 준다 */
const dayName = (date: string) => formatShort(fromDateKey(date));

/** 기록을 날짜별로 묶는다. 최근 날짜가 위, 같은 날 안에서는 넘겨받은 순서(최근에 기록한 것이 위) 그대로 */
const byDate = (meals: Meal[]) =>
  [...new Set(meals.map((m) => m.date))]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, items: meals.filter((m) => m.date === date) }));

/**
 * 최근 기록. 연필을 누르면 금액·항목·가게를 고치고(onEdit), 휴지통을 누르면 바로 지운다.
 * 어제 기록이 하나도 없으면 맨 위에 보여준다.
 */
export function RecentMeals({
  meals,
  missing,
  onFill,
  onEdit,
  onRemove,
}: {
  meals: Meal[];
  missing: MissingDay | null;
  onFill: () => void;
  onEdit: (meal: Meal) => void;
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
          {/* 날짜를 맨 앞에 쓰고, 그 날 기록을 아래에 나눠서 보여 준다 */}
          {byDate(recent).map((g) => (
            <li key={g.date} className={styles.group}>
              <h3 className={styles.dateHead}>{dayName(g.date)}</h3>
              <ul className={styles.rows}>
                {g.items.map((m) => {
                  // 윗줄은 항목(아침·야식 …), 아랫줄은 가게(· 메뉴). 가게 이름을 안 적었으면 아랫줄은 비워 둔다
                  const title = [placeNameOf(m), menuOf(m)].filter(Boolean).join(' · ');
                  const kind = kindOf(m);
                  return (
                    <li key={m.id} className={styles.row}>
                      <span className={styles.body}>
                        <span className={styles.name} style={{ color: KIND_COLORS[kind].fg }}>
                          {KIND_LABEL[kind]}
                        </span>
                        <span className={styles.when}>{title || NBSP}</span>
                      </span>
                      <span className={styles.price}>
                        {m.price > 0 && '−'}
                        {won(m.price)}원
                      </span>
                      <button
                        type="button"
                        className={styles.edit}
                        onClick={() => onEdit(m)}
                        aria-label={`${dayName(m.date)} ${KIND_LABEL[kind]}${title ? ` ${title}` : ''} ${won(m.price)}원 기록 고치기`}>
                        <IoPencilOutline size={16} aria-hidden />
                      </button>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
