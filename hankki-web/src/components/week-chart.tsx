'use client';

import React, { useState } from 'react';

import { addDays, DAY_NAMES, formatDate, formatShort, startOfDay, toDateKey, won, type Meal } from '@/lib/budget';
import ui from './ui.module.css';
import styles from './week-chart.module.css';

const STEPS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

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
 */
export function WeekChart({ meals, perDay }: { meals: Meal[]; perDay: number }) {
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
    const total = meals.filter((m) => m.date === key).reduce((sum, m) => sum + m.price, 0);
    const label = mode === 'week' ? DAY_NAMES[i] : showMonthLabel(i + 1, count) ? String(i + 1) : '';
    return { key, date, total, label, future: i > todayIdx };
  });
  const sum = days.reduce((s, d) => s + d.total, 0);

  // 눈금이 3칸 이하가 되는 가장 작은 간격을 고른다
  const peak = Math.max(perDay, ...days.map((d) => d.total), 1000);
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
      {perDay > 0 && (
        <p className={styles.key}>
          <span className={styles.keyLine} aria-hidden />
          하루 권장 {won(perDay)}원
        </p>
      )}

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
          {perDay > 0 && <span className={styles.ref} style={{ bottom: pct(perDay) }} aria-hidden />}

          {days.map((d, i) => (
            <button
              key={d.key}
              type="button"
              className={styles.col}
              onPointerEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onClick={() => setSel(i)}
              aria-label={`${formatDate(d.date)} ${won(d.total)}원`}>
              <span
                className={`${styles.bar} ${mode === 'month' ? styles.barThin : ''} ${i === selIdx ? styles.barOn : ''}`}
                style={{ height: d.total > 0 ? `max(${pct(d.total)}, 4px)` : 0 }}>
                {i === selIdx && !d.future && (
                  <span className={styles.value}>
                    {mode === 'month' && `${d.date.getDate()}일 `}
                    {won(d.total)}
                  </span>
                )}
              </span>
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
    </section>
  );
}
