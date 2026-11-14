'use client';

import React, { useState } from 'react';
import { IoAdd, IoOpenOutline } from 'react-icons/io5';

import { CafeteriaTray } from '@/components/cafeteria-tray';
import { useTray } from '@/components/eat-here';
import { Screen, Sub, Title } from '@/components/ui';
import ui from '@/components/ui.module.css';
import { CAFETERIA, CAFETERIA_URL, MEALS, type CafeteriaCorner } from '@/data/cafeteria';
import { DAY_NAMES, formatDate, formatShort, fromDateKey, toDateKey, won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import styles from './page.module.css';

const CAFETERIA_NAME = '학생식당';
const DAY_MS = 24 * 60 * 60 * 1000;

/** 날짜(YYYY-MM-DD) 두 개 사이의 일수. 뒤가 더 늦으면 양수 */
const daysBetween = (from: string, to: string) => Math.round((fromDateKey(to).getTime() - fromDateKey(from).getTime()) / DAY_MS);

/** 담은 개수 배지. 아직 안 담았으면 + */
function AddBadge({ count }: { count: number }) {
  return (
    <span className={styles.plus} aria-hidden>
      {count ? `×${count}` : <IoAdd size={16} />}
    </span>
  );
}

/** 메뉴 사이 구분점. 줄이 바뀌어도 구분점이 줄 맨 앞에 오지 않게 앞쪽은 줄바꿈 없는 공백으로 */
const ITEM_SEP = ' · ';

/**
 * 학식 코너 하나. 눌러서 담는다 (어느 요일 메뉴든 담을 수 있고, 기록은 오늘 날짜로 남는다).
 * 가격이 하나면 코너 전체를 누르고, 여러 개면 가격 버튼을 골라 누른다. 가격이 없는 코너는 담을 수 없다.
 */
function Corner({
  corner,
  countOf,
  onAdd,
}: {
  corner: CafeteriaCorner;
  /** 이 가격으로 담은 개수 */
  countOf?: (price: number) => number;
  onAdd?: (price: number) => void;
}) {
  const canAdd = onAdd && countOf && corner.prices.length > 0;
  const single = canAdd && corner.prices.length === 1 ? corner.prices[0] : undefined;
  const singleCount = single !== undefined ? countOf!(single) : 0;

  const body = (
    <>
      <span className={styles.cornerHead}>
        <span className={styles.cornerName}>{corner.name}</span>
        {corner.prices.length > 0 && <span className={styles.price}>{corner.prices.map((p) => won(p)).join('/')}원</span>}
        {single !== undefined && <AddBadge count={singleCount} />}
      </span>
      {corner.items.length > 0 && <span className={styles.items}>{corner.items.join(ITEM_SEP)}</span>}
    </>
  );

  if (single !== undefined) {
    return (
      <li className={styles.cornerTap}>
        <button
          type="button"
          onClick={() => onAdd!(single)}
          aria-label={`${corner.name} ${won(single)}원 추가${singleCount ? `, ${singleCount}개 담김` : ''}`}
          className={`${styles.cornerBtn} ${singleCount ? styles.cornerBtnOn : ''}`}>
          {body}
        </button>
      </li>
    );
  }

  return (
    <li className={canAdd ? `${styles.cornerTap} ${styles.cornerBox}` : styles.corner}>
      {body}
      {canAdd && (
        <span className={styles.priceRow}>
          {corner.prices.map((p) => {
            const n = countOf!(p);
            return (
              <button
                type="button"
                key={p}
                onClick={() => onAdd!(p)}
                aria-label={`${corner.name} ${won(p)}원 추가${n ? `, ${n}개 담김` : ''}`}
                className={`${styles.priceBtn} ${n ? styles.priceBtnOn : ''}`}>
                {won(p)}원
                <AddBadge count={n} />
              </button>
            );
          })}
        </span>
      )}
    </li>
  );
}

/** 학생식당의 요일별 메뉴와 가격 */
export default function CafeteriaPage() {
  const { summary: s } = useBudget();
  const tray = useTray();
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

  const isToday = day.date === todayKey;

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
        {/* 주말 제외로 오늘 편성된 예산이 없는 날은 "-" */}
        <span className={styles.todayVal}>{s.restDay ? '-' : `${won(s.todayLeft)}원`}</span>
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

      <div className={styles.addHead}>
        <p className={styles.addTitle}>메뉴를 누르면 추가돼요</p>
        {/* 주말·공휴일처럼 오늘 메뉴가 없어도 고른 날 메뉴로 담을 수 있다. 기록은 언제나 오늘 날짜로 남는다 */}
        {!isToday && (
          <p className={styles.addNote}>
            {DAY_NAMES[fromDateKey(day.date).getDay()]}요일 메뉴예요. 담아서 기록하면 오늘 먹은 것으로 남아요.
          </p>
        )}
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
            <ul className={`${styles.corners} ${styles.cornersTap}`}>
              {corners.map((c) => (
                <Corner
                  key={c.name}
                  corner={c}
                  countOf={(price) => tray.countOf({ name: c.name, price })}
                  onAdd={(price) => tray.change({ name: c.name, price }, 1)}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <Sub style={{ textAlign: 'center' }}>메뉴·가격: 인하대학교 홈페이지 · {CAFETERIA.week} 기준 · 식당 사정으로 바뀔 수 있어요</Sub>

      <CafeteriaTray name={CAFETERIA_NAME} tray={tray} limit={s.restDay ? undefined : s.todayLeft} />
    </Screen>
  );
}
