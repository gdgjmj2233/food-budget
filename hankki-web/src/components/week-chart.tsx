'use client';

import React, { useState } from 'react';

import {
  addDays,
  DAY_NAMES,
  formatDate,
  formatShort,
  KIND_LABEL,
  kindOf,
  MAIN_KINDS,
  startOfDay,
  toDateKey,
  won,
  type Meal,
  type MealKind,
} from '@/lib/budget';
import ui from './ui.module.css';
import styles from './week-chart.module.css';

const STEPS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

/**
 * 막대를 쌓는 칸 = 기록 항목. 아래부터 아침·점심·저녁 → 야식·간식·음료·이외·기타 순서.
 * 항목을 고르지 않은 예전 기록은 기록 탭과 같이 기록 시각으로 정한다 (kindOf).
 * 아침·점심·저녁은 같은 색이고 사이에 얇은 줄(1px)만 두고, 기타 항목은 각각 다른 색에 2px 틈을 둔다.
 */
const SEG_ORDER: MealKind[] = ['breakfast', 'lunch', 'dinner', 'latenight', 'snack', 'drink', 'other', 'etc'];
const isMealSeg = (k: MealKind) => MAIN_KINDS.includes(k);

/**
 * 색 (dataviz 기본 범주 순서 1~5를 그대로, 흰 카드 위에서 검사 통과). 끼니는 한 색으로 묶는다.
 * 간식·음료·이외 색은 흰 바탕 대비가 3:1 아래라 범례와 아래 "그날 내역" 글자로 함께 알려 준다
 */
const GROUPS: { key: string; label: string; color: string; segs: readonly MealKind[] }[] = [
  { key: 'meal', label: '식사 (아침·점심·저녁)', color: '#2a78d6', segs: MAIN_KINDS },
  { key: 'latenight', label: '야식', color: '#eb6834', segs: ['latenight'] },
  { key: 'snack', label: '간식', color: '#1baf7a', segs: ['snack'] },
  { key: 'drink', label: '음료', color: '#eda100', segs: ['drink'] },
  { key: 'other', label: '이외', color: '#e87ba4', segs: ['other', 'etc'] },
];
const colorOf = (k: MealKind) => GROUPS.find((g) => g.segs.includes(k))!.color;

type Mode = 'week' | 'month';
const MODES: { key: Mode; label: string }[] = [
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
];

/** 축 눈금 표시: 5천, 1만, 1.5만 */
const compact = (v: number) => (v === 0 ? '0' : v >= 10000 ? `${+(v / 10000).toFixed(1)}만` : `${v / 1000}천`);

/** 월간 아래쪽 날짜는 1, 5, 10, 15 … 와 마지막 날만 적는다 (30칸을 다 적으면 글씨가 겹친다) */
const showMonthLabel = (day: number, last: number) => day === 1 || day === last || (day % 5 === 0 && last - day >= 2);

/**
 * 날마다 쓴 금액을 막대로 보여준다. 위쪽 버튼으로 주간(오늘이 든 일~토)과 월간(이번 달 1일~말일)을 바꾼다.
 * 막대는 항목별로 색을 나눠 쌓고, 고른 날의 항목별 금액을 그래프 아래에 글자로 보여 준다.
 */
export function WeekChart({
  meals,
  daily,
}: {
  meals: Meal[];
  /** 점선으로 그릴 하루 기준 금액. 설정의 예산 ÷ 편성 일수라서 돈을 써도 바뀌지 않는다 */
  daily: number;
}) {
  const today = startOfDay(new Date());
  const [mode, setMode] = useState<Mode>('week');

  const start = mode === 'week' ? addDays(today, -today.getDay()) : new Date(today.getFullYear(), today.getMonth(), 1);
  const count = mode === 'week' ? 7 : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const todayIdx = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  const [sel, setSel] = useState<number | null>(null);
  const selIdx = sel ?? todayIdx;

  const days = Array.from({ length: count }, (_, i) => {
    const date = addDays(start, i);
    const key = toDateKey(date);
    const dayMeals = meals.filter((m) => m.date === key && m.price > 0);
    const total = dayMeals.reduce((sum, m) => sum + m.price, 0);
    // 항목별 합계 (0원인 칸은 빼고, 아래에서부터 쌓을 순서대로)
    const segs = SEG_ORDER.map((seg) => ({
      seg,
      value: dayMeals.filter((m) => kindOf(m) === seg).reduce((sum, m) => sum + m.price, 0),
    })).filter((s) => s.value > 0);
    const label = mode === 'week' ? DAY_NAMES[i] : showMonthLabel(i + 1, count) ? String(i + 1) : '';
    return { key, date, total, segs, label, future: i > todayIdx };
  });
  const selDay = days[Math.min(selIdx, days.length - 1)];
  const breakdown = (d: (typeof days)[number]) => d.segs.map((s) => `${KIND_LABEL[s.seg]} ${won(s.value)}원`).join(', ');
  const sum = days.reduce((s, d) => s + d.total, 0);

  // 눈금이 3칸 이하가 되는 가장 작은 간격을 고른다
  const peak = Math.max(daily,...days.map((d) => d.total), 1000);
  const step = STEPS.find((s) => peak / s <= 3) ?? STEPS[STEPS.length - 1];
  const top = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const pct = (v: number) => `${(v / top) * 100}%`;
  const cols = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };

  const pick = (m: Mode) => {
    setMode(m);
    setSel(null);
  };

  return (
    <section className={ui.card}>
      <div className={ui.row}>
        <h2 className={ui.sec}>{mode === 'week' ? '이번 주' : '이번 달'} 사용 금액</h2>
        <div className={styles.modes} role="radiogroup" aria-label="기간">
          {MODES.map((m) => (
            <button
              type="button"
              key={m.key}
              role="radio"
              aria-checked={mode === m.key}
              onClick={() => pick(m.key)}
              className={`${styles.mode} ${mode === m.key ? styles.modeOn : ''}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.total}>
        {won(sum)}원
        <span className={styles.range}>
          {formatShort(start)} – {formatShort(addDays(start, count - 1))}
        </span>
      </p>
      {daily > 0 && (
        <p className={styles.key}>
          <span className={styles.keyLine} aria-hidden />
          <span className={styles.keyText}>하루 기준 {won(daily)}원</span>
        </p>
      )}
      {/* 막대 색 범례 */}
      <ul className={styles.legend} aria-label="막대 색">
        {GROUPS.map((g) => (
          <li key={g.key} className={styles.legendItem}>
            <span className={styles.swatch} style={{ backgroundColor: g.color }} aria-hidden />
            {g.label}
          </li>
        ))}
      </ul>

      <div className={styles.chart}>
        <div className={styles.yAxis} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className={styles.tick} style={{ bottom: pct(t) }}>
              {compact(t)}
            </span>
          ))}
        </div>

        {/* 마우스가 벗어나면 오늘로 돌아간다. 터치는 손을 떼면 바로 leave가 와서 제외 */}
        <div className={styles.plot} style={cols} onPointerLeave={(e) => e.pointerType === 'mouse' && setSel(null)}>
          {ticks.map((t) => (
            <span key={t} className={styles.grid} style={{ bottom: pct(t) }} aria-hidden />
          ))}
          {daily > 0 && <span className={styles.ref} style={{ bottom: pct(daily) }} aria-hidden />}

          {days.map((d, i) => (
            <button
              key={d.key}
              type="button"
              className={styles.col}
              onPointerEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onClick={() => setSel(i)}
              aria-label={`${formatDate(d.date)} ${won(d.total)}원${d.segs.length ? ` (${breakdown(d)})` : ''}`}>
              <span
                className={`${styles.bar} ${mode === 'month' ? styles.barThin : ''}`}
                style={{ height: d.total > 0 ? `max(${pct(d.total)}, 4px)` : 0 }}>
                {d.segs.map((s, j) => {
                  // 바로 아래 칸과의 틈: 식사끼리는 얇은 줄 1px, 그 밖에는 2px
                  const below = d.segs[j - 1];
                  const gap = !below ? 0 : isMealSeg(s.seg) && isMealSeg(below.seg) ? 1 : 2;
                  return (
                    <span
                      key={s.seg}
                      className={styles.seg}
                      style={{
                        height: `${(s.value / d.total) * 100}%`,
                        backgroundColor: colorOf(s.seg),
                        borderBottom: gap ? `${gap}px solid var(--card)` : undefined,
                      }}
                    />
                  );
                })}
              </span>
              {i === selIdx && !d.future && (
                <span className={styles.value} style={{ bottom: `calc(max(${pct(d.total)}, ${d.total > 0 ? 4 : 0}px) + 4px)` }}>
                  {mode === 'month' && `${d.date.getDate()}일 `}
                  {won(d.total)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.xAxis} style={cols} aria-hidden>
        {days.map((d, i) => (
          <span key={d.key} className={`${i === todayIdx ? styles.today : ''} ${d.future ? styles.future : ''}`}>
            {d.label}
          </span>
        ))}
      </div>

      {/* 고른 날의 항목별 금액 (색만으로 구분하지 않도록 글자로도 보여 준다) */}
      {selDay && !selDay.future && (
        <p className={styles.detail}>
          <span className={styles.detailDate}>{formatDate(selDay.date)}</span>
          {selDay.segs.length ? (
            selDay.segs.map((s) => (
              <span key={s.seg} className={styles.detailItem}>
                <span className={styles.swatch} style={{ backgroundColor: colorOf(s.seg) }} aria-hidden />
                {KIND_LABEL[s.seg]} {won(s.value)}원
              </span>
            ))
          ) : (
            <span className={styles.detailItem}>기록 없음</span>
          )}
        </p>
      )}
    </section>
  );
}
