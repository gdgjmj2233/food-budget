'use client';

import React, { useState } from 'react';
import { IoOpenOutline } from 'react-icons/io5';

import { Screen, Sub, Title } from '@/components/ui';
import ui from '@/components/ui.module.css';
import { CAFETERIA, CAFETERIA_URL, MEALS, type CafeteriaCorner } from '@/data/cafeteria';
import { DAY_NAMES, formatDate, formatShort, fromDateKey, toDateKey, won } from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useEat } from '@/hooks/use-eat';
import { useBudget } from '@/store/budget-store';
import styles from './page.module.css';

const CAFETERIA_NAME = '학생식당';
const DAY_MS = 24 * 60 * 60 * 1000;

/** 날짜(YYYY-MM-DD) 두 개 사이의 일수. 뒤가 더 늦으면 양수 */
const daysBetween = (from: string, to: string) => Math.round((fromDateKey(to).getTime() - fromDateKey(from).getTime()) / DAY_MS);

/** 오늘 메뉴일 때만 "먹었어요" 버튼을 보여 준다. 다른 날 메뉴를 오늘 먹은 것으로 기록하는 실수를 막으려는 것 */
function Corner({
  corner,
  limit,
  onEat,
}: {
  corner: CafeteriaCorner;
  limit: number;
  onEat?: (price: number) => void;
}) {
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
      {onEat && corner.prices.length > 0 && (
        <div className={styles.eatRow}>
          {corner.prices.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => onEat(p)}
              aria-label={`${corner.name} ${won(p)}원 먹은 걸로 기록`}
              className={styles.eatBtn}>
              먹었어요 · {won(p)}원
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

/** 학생식당의 요일별 메뉴와 가격 */
export default function CafeteriaPage() {
  const { summary: s } = useBudget();
  const { eatAt } = useEat();
  const todayKey = toDateKey(new Date());
  const hasToday = CAFETERIA.days.some((d) => d.date === todayKey);
  // 오늘 메뉴가 없으면 오늘과 가장 가까운 날(예: 주말에는 금요일)을 먼저 보여 준다
  const nearest = [...CAFETERIA.days].sort(
    (a, b) => Math.abs(daysBetween(todayKey, a.date)) - Math.abs(daysBetween(todayKey, b.date)),
  )[0];
  const [selected, setSelected] = useState(hasToday ? todayKey : nearest.date);
  const day = CAFETERIA.days.find((d) => d.date === selected) ?? CAFETERIA.days[0];

  // 메뉴 자료가 얼마나 오래됐는지: 마지막 날짜가 오늘보다 이틀 넘게 지났으면 지난 주 자료로 본다 (주말 이틀은 정상)
  const lastDate = CAFETERIA.days[CAFETERIA.days.length - 1].date;
  const staleDays = daysBetween(lastDate, todayKey);
  const stale = staleDays > 2;

  const onEat = (cornerName: string, price: number) =>
    confirm('먹은 걸로 기록', `${CAFETERIA_NAME} ${cornerName} ${won(price)}원을 오늘 먹은 걸로 기록할까요?`, () =>
      eatAt(CAFETERIA_NAME, cornerName, price),
    );

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

      {stale ? (
        <p className={styles.notice} role="status">
          아직 이번 주 메뉴를 받지 못했어요. {staleDays}일 전에 끝난 {CAFETERIA.week} 메뉴예요. 학교 홈페이지에서 오늘 메뉴를 확인해 주세요.
        </p>
      ) : (
        !hasToday && <p className={styles.notice}>오늘 메뉴는 없어요. 주말이거나 아직 올라오지 않았을 수 있어요. {CAFETERIA.week} 메뉴를 보여 드려요.</p>
      )}

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
                <Corner
                  key={c.name}
                  corner={c}
                  limit={s.todayLeft}
                  onEat={day.date === todayKey ? (price) => onEat(c.name, price) : undefined}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <Sub style={{ textAlign: 'center' }}>메뉴·가격: 인하대학교 홈페이지 · {CAFETERIA.week} 기준 · 식당 사정으로 바뀔 수 있어요</Sub>
    </Screen>
  );
}
