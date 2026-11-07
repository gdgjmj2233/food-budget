'use client';

import React, { useState } from 'react';
import { IoOpenOutline } from 'react-icons/io5';

import { Screen, Sub, Title } from '@/components/ui';
import ui from '@/components/ui.module.css';
import { CAFETERIA, CAFETERIA_URL, MEALS, type CafeteriaCorner } from '@/data/cafeteria';
import { DAY_NAMES, formatDate, formatShort, fromDateKey, toDateKey, won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import styles from './page.module.css';

function Corner({ corner, limit }: { corner: CafeteriaCorner; limit: number }) {
  const over = corner.prices.length ? Math.min(...corner.prices) - limit : 0;

  return (
    <li className={styles.corner}>
      <div className={styles.cornerHead}>
        <span className={styles.cornerName}>
          {corner.name}
          {over > 0 && <b className={styles.tag}> +{won(over)}원 초과</b>}
        </span>
        {corner.prices.length > 0 && (
          <span className={`${styles.price} ${over > 0 ? styles.priceOver : ''}`}>{corner.prices.map((p) => won(p)).join('/')}원</span>
        )}
      </div>
      {/* 줄이 바뀌어도 구분점이 줄 맨 앞에 오지 않게 앞쪽은 줄바꿈 없는 공백으로 */}
      {corner.items.length > 0 && <p className={styles.items}>{corner.items.join(' · ')}</p>}
    </li>
  );
}

/** 학생식당의 요일별 메뉴와 가격 */
export default function CafeteriaPage() {
  const { summary: s } = useBudget();
  const todayKey = toDateKey(new Date());
  const hasToday = CAFETERIA.days.some((d) => d.date === todayKey);
  const [selected, setSelected] = useState(hasToday ? todayKey : CAFETERIA.days[0].date);
  const day = CAFETERIA.days.find((d) => d.date === selected) ?? CAFETERIA.days[0];

  return (
    <Screen>
      <div className={ui.row}>
        <div>
          <Title>인하대 학식</Title>
          <Sub>학생식당(학생회관)</Sub>
        </div>
        <a href={CAFETERIA_URL} target="_blank" rel="noreferrer" className={styles.link}>
          학교 홈페이지
          <IoOpenOutline size={14} aria-hidden />
        </a>
      </div>

      <div className={styles.today}>
        <span className={styles.todayLabel}>오늘 남은 금액</span>
        <span className={styles.todayVal}>{won(s.todayLeft)}원</span>
      </div>

      {!hasToday && <p className={styles.notice}>오늘 메뉴는 아직 없어요. {CAFETERIA.week} 메뉴를 보여 드려요.</p>}

      <div className={styles.days} role="group" aria-label="요일">
        {CAFETERIA.days.map((d) => {
          const date = fromDateKey(d.date);
          return (
            <button
              type="button"
              key={d.date}
              onClick={() => setSelected(d.date)}
              aria-pressed={d.date === day.date}
              aria-label={formatDate(date)}
              className={`${styles.day} ${d.date === day.date ? styles.dayOn : ''}`}>
              {DAY_NAMES[date.getDay()]}
              <span className={styles.dayDate}>{d.date === todayKey ? '오늘' : formatShort(date)}</span>
            </button>
          );
        })}
      </div>

      {MEALS.map((meal) => {
        const corners = day.corners.filter((c) => c.meal === meal.key);
        if (!corners.length) return null;
        return (
          <section key={meal.key} className={styles.card} aria-labelledby={`meal-${meal.key}`}>
            <div className={styles.mealHead}>
              <h2 id={`meal-${meal.key}`} className={styles.mealTitle}>
                <span className={styles.emoji} aria-hidden>
                  {meal.emoji}
                </span>
                {meal.title}
              </h2>
              <span className={styles.hours}>{CAFETERIA.hours[meal.key]}</span>
            </div>
            <ul className={styles.corners}>
              {corners.map((c) => (
                <Corner key={c.name} corner={c} limit={s.todayLeft} />
              ))}
            </ul>
          </section>
        );
      })}

      <Sub style={{ textAlign: 'center' }}>메뉴·가격: 인하대학교 홈페이지 · {CAFETERIA.week} 기준 · 식당 사정으로 바뀔 수 있어요</Sub>
    </Screen>
  );
}
