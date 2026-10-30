'use client';

import React, { useState } from 'react';

import { addDays, formatDate, formatShort, startOfDay, toDateKey, won, type Meal } from '@/lib/budget';
import ui from './ui.module.css';
import styles from './week-chart.module.css';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const STEPS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

/** 축 눈금 표시: 5천, 1만, 1.5만 */
const compact = (v: number) => (v === 0 ? '0' : v >= 10000 ? `${+(v / 10000).toFixed(1)}만` : `${v / 1000}천`);

/** 오늘이 들어 있는 한 주(일~토) 동안 날마다 쓴 금액을 막대로 보여준다 */
export function WeekChart({ meals, perDay }: { meals: Meal[]; perDay: number }) {
  const today = startOfDay(new Date());
  const todayIdx = today.getDay();
  const weekStart = addDays(today, -todayIdx);
  const [sel, setSel] = useState(todayIdx);

  const days = DAY_NAMES.map((name, i) => {
    const date = addDays(weekStart, i);
    const key = toDateKey(date);
    const total = meals.filter((m) => m.date === key).reduce((sum, m) => sum + m.price, 0);
    return { name, date, total, future: i > todayIdx };
  });
  const weekTotal = days.reduce((sum, d) => sum + d.total, 0);

  // 눈금이 3칸 이하가 되는 가장 작은 간격을 고른다
  const peak = Math.max(perDay, ...days.map((d) => d.total), 1000);
  const step = STEPS.find((s) => peak / s <= 3) ?? STEPS[STEPS.length - 1];
  const top = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const pct = (v: number) => `${(v / top) * 100}%`;

  return (
    <section className={ui.card}>
      <div className={ui.row}>
        <h2 className={ui.sec}>이번 주 사용 금액</h2>
        <span className={styles.range}>
          {formatShort(weekStart)} – {formatShort(addDays(weekStart, 6))}
        </span>
      </div>
      <p className={styles.total}>{won(weekTotal)}원</p>
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
        <div className={styles.plot} onPointerLeave={(e) => e.pointerType === 'mouse' && setSel(todayIdx)}>
          {ticks.map((t) => (
            <span key={t} className={styles.grid} style={{ bottom: pct(t) }} aria-hidden />
          ))}
          {perDay > 0 && <span className={styles.ref} style={{ bottom: pct(perDay) }} aria-hidden />}

          {days.map((d, i) => (
            <button
              key={d.name}
              type="button"
              className={styles.col}
              onPointerEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onClick={() => setSel(i)}
              aria-label={`${formatDate(d.date)} ${won(d.total)}원`}>
              <span
                className={`${styles.bar} ${i === sel ? styles.barOn : ''}`}
                style={{ height: d.total > 0 ? `max(${pct(d.total)}, 4px)` : 0 }}>
                {i === sel && !d.future && <span className={styles.value}>{won(d.total)}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.xAxis} aria-hidden>
        {days.map((d, i) => (
          <span key={d.name} className={`${i === todayIdx ? styles.today : ''} ${d.future ? styles.future : ''}`}>
            {d.name}
          </span>
        ))}
      </div>
    </section>
  );
}
