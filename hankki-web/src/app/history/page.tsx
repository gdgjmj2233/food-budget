'use client';

import React, { useState } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

import { useToast } from '@/components/toast';
import { Card, GhostButton, Screen, Sub } from '@/components/ui';
import ui from '@/components/ui.module.css';
import { PLACES } from '@/data/places';
import { formatDate, fromDateKey, startOfDay, toDateKey, won, type Meal } from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import { C, CAT_COLORS } from '@/theme';
import styles from './page.module.css';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const SUN = '#E5484D';
const SAT = '#3182F6';
/** 한 칸에 보여줄 최대 칩 수. 넘치면 +n 으로 줄인다 */
const MAX_CHIPS = 3;

const CAT_OF = new Map(PLACES.map((p) => [p.id, p.cat]));
const chipColor = (m: Meal) => {
  // 스킵(0원)은 회색
  if (m.price === 0) return { bg: C.divider, fg: C.muted };
  const cat = m.placeId ? CAT_OF.get(m.placeId) : undefined;
  return cat ? CAT_COLORS[cat] : { bg: C.primarySoft, fg: C.primaryDark };
};

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 달력 한 장: 앞뒤 달 날짜까지 채워 7일 단위 주로 나눈다 */
function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const lastDate = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + lastDate) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)),
  );
}

export default function HistoryPage() {
  const { summary: s, meals, undo, clearPeriod } = useBudget();
  const toast = useToast();

  const today = startOfDay(new Date());
  const todayKey = toDateKey(today);
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(todayKey);

  // 날짜별로 먹은 기록 묶기 (시간순)
  const byDay = new Map<string, Meal[]>();
  [...meals]
    .sort((a, b) => a.at - b.at)
    .forEach((m) => byDay.set(m.date, [...(byDay.get(m.date) ?? []), m]));
  const sumOf = (list: Meal[] = []) => list.reduce((sum, m) => sum + m.price, 0);

  const monthPrefix = `${cursor.y}-${pad(cursor.m + 1)}`;
  const monthMeals = meals.filter((m) => m.date.startsWith(monthPrefix));
  const weeks = monthGrid(cursor.y, cursor.m);
  const selMeals = byDay.get(selected) ?? [];

  const move = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const onUndo = () => {
    const last = undo();
    toast(last ? `${last.name} 기록을 취소했어요` : '되돌릴 기록이 없어요');
  };

  const onReset = () => {
    confirm('기록 초기화', '이번 기간의 먹은 기록을 모두 지울까요?', () => {
      clearPeriod();
      toast('이번 기간 기록을 지웠어요');
    });
  };

  return (
    <Screen>
      <div className={ui.row}>
        <div className={styles.monthNav}>
          <h1 className={styles.month}>
            {cursor.y !== today.getFullYear() && `${cursor.y}년 `}
            {cursor.m + 1}월
          </h1>
          <button type="button" onClick={() => move(-1)} aria-label="이전 달" className={styles.arrow}>
            <IoChevronBack size={20} color={C.muted} aria-hidden />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="다음 달" className={styles.arrow}>
            <IoChevronForward size={20} color={C.muted} aria-hidden />
          </button>
        </div>
        <GhostButton label="되돌리기" onPress={onUndo} />
      </div>

      <div className={styles.summary}>
        <div className={styles.sumCol}>
          <Sub>이번 달 식비</Sub>
          <span className={styles.sumValue}>
            {won(sumOf(monthMeals))}원 · {monthMeals.filter((m) => m.price > 0).length}끼
          </span>
        </div>
        <div className={`${styles.sumCol} ${styles.sumRight}`}>
          <Sub>예산 남음</Sub>
          <span className={styles.sumValue} style={s.remain < 0 ? { color: C.over } : undefined}>
            {won(s.remain)}원
          </span>
        </div>
      </div>

      {/* 달력 */}
      <div className={styles.calendar}>
        {DAY_NAMES.map((n) => (
          <span key={n} className={styles.dow}>
            {n}
          </span>
        ))}

        {weeks.flat().map((d) => {
          const key = toDateKey(d);
          const inMonth = d.getMonth() === cursor.m;
          const isToday = key === todayKey;
          const list = byDay.get(key) ?? [];
          const total = sumOf(list);
          const dayColor = d.getDay() === 0 ? SUN : d.getDay() === 6 ? SAT : C.ink;
          return (
            <button
              type="button"
              key={key}
              onClick={() => setSelected(key)}
              aria-pressed={key === selected}
              aria-label={`${formatDate(d)}${total > 0 ? `, ${won(total)}원` : ''}`}
              className={`${styles.cell} ${inMonth ? '' : styles.faded} ${key === selected ? styles.cellSelected : ''}`}>
              <span className={`${styles.date} ${isToday ? styles.today : ''}`} style={isToday ? undefined : { color: dayColor }}>
                {d.getDate()}
              </span>

              {list.slice(0, MAX_CHIPS).map((m) => {
                const c = chipColor(m);
                return (
                  <span key={m.id} className={styles.chip} style={{ backgroundColor: c.bg, borderLeftColor: c.fg, color: c.fg }}>
                    {m.name}
                  </span>
                );
              })}
              {list.length > MAX_CHIPS && <span className={styles.more}>+{list.length - MAX_CHIPS}</span>}
              {total > 0 && <span className={styles.dayTotal}>{won(total)}</span>}
            </button>
          );
        })}
      </div>

      {/* 고른 날 상세 */}
      <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
        <div className={`${ui.row} ${styles.detailHead}`}>
          <h2 className={styles.detailDate}>{formatDate(fromDateKey(selected))}</h2>
          <span className={styles.detailSum}>{won(sumOf(selMeals))}원</span>
        </div>
        {selMeals.length === 0 ? (
          <p className={styles.empty}>이 날은 기록이 없어요</p>
        ) : (
          selMeals.map((m) => {
            const c = chipColor(m);
            return (
              <div key={m.id} className={styles.row}>
                <span className={styles.bar} style={{ backgroundColor: c.fg }} />
                <span className={styles.time}>{timeOf(m.at)}</span>
                <div className={styles.rowBody}>
                  <span className={styles.name}>{m.name}</span>
                  <span className={styles.menu}>{m.menu}</span>
                </div>
                <span className={styles.price}>
                  {m.price > 0 && '−'}
                  {won(m.price)}원
                </span>
              </div>
            );
          })
        )}
      </Card>

      {s.periodMeals.length > 0 && (
        <div className={styles.center}>
          <GhostButton label="이번 기간 기록 초기화" onPress={onReset} />
        </div>
      )}
    </Screen>
  );
}
