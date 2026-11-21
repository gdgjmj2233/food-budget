'use client';

import React, { useState } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

import {
  addDays,
  DAY_NAMES,
  formatDate,
  formatShort,
  KIND_LABEL,
  kindOf,
  startOfDay,
  toDateKey,
  won,
  type Meal,
  type MealKind,
} from '@/lib/budget';
import { KIND_COLORS } from '@/theme';
import ui from './ui.module.css';
import styles from './week-chart.module.css';

const STEPS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

/**
 * 막대를 쌓는 칸 = 기록 항목. 아래부터 아침·점심·저녁 → 야식·간식·음료·이외·기타 순서.
 * 항목을 고르지 않은 예전 기록은 기록 탭과 같이 기록 시각으로 정한다 (kindOf).
 * 색이 다른 칸 사이에는 2px 틈을, 같은 색(기타로 묶인 간식·음료·이외)끼리는 얇은 줄(1px)만 둔다.
 */
const SEG_ORDER: MealKind[] = ['breakfast', 'lunch', 'dinner', 'latenight', 'snack', 'drink', 'other', 'etc'];

/**
 * 범례. 색은 앱 전체의 항목 색(KIND_COLORS.base)을 그대로 쓰고, 간식·음료·이외는 "기타" 한 색으로 묶는다.
 * 아침·점심·기타 색은 흰 바탕 대비가 3:1 아래라 범례와 아래 "그날 내역" 글자로 함께 알려 준다
 */
const GROUPS: { key: string; label: string; color: string }[] = [
  { key: 'breakfast', label: '아침', color: KIND_COLORS.breakfast.base },
  { key: 'lunch', label: '점심', color: KIND_COLORS.lunch.base },
  { key: 'dinner', label: '저녁', color: KIND_COLORS.dinner.base },
  { key: 'latenight', label: '야식', color: KIND_COLORS.latenight.base },
  { key: 'other', label: '기타 (간식·음료·이외)', color: KIND_COLORS.other.base },
];
const colorOf = (k: MealKind) => KIND_COLORS[k].base;

type Mode = 'week' | 'month';
const MODES: { key: Mode; label: string }[] = [
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
];

/** 축 눈금 표시: 5천, 1만, 1.5만 */
const compact = (v: number) => (v === 0 ? '0' : v >= 10000 ? `${+(v / 10000).toFixed(1)}만` : `${v / 1000}천`);

/** 월간 아래쪽 날짜는 1, 5, 10, 15 … 와 마지막 날만 적는다 (30칸을 다 적으면 글씨가 겹친다) */
const showMonthLabel = (day: number, last: number) => day === 1 || day === last || (day % 5 === 0 && last - day >= 2);

/** 기간 이름. offset 0 이 지금 기간, -1 이 바로 전 기간 */
function periodLabel(mode: Mode, offset: number, start: Date, today: Date) {
  if (mode === 'week') return offset === 0 ? '이번 주' : offset === -1 ? '지난주' : `${-offset}주 전`;
  if (offset === 0) return '이번 달';
  if (offset === -1) return '지난달';
  const month = `${start.getMonth() + 1}월`;
  return start.getFullYear() === today.getFullYear() ? month : `${start.getFullYear()}년 ${month}`;
}

/**
 * 날마다 쓴 금액을 막대로 보여준다. 위쪽 버튼으로 주간(일~토)과 월간(1일~말일)을 바꾸고,
 * 금액 양옆 화살표로 지난 기간을 넘겨 본다 (첫 기록이 있는 기간까지, 앞으로는 지금 기간까지).
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
  /** 지금 기간에서 몇 칸 앞으로 넘겼는지 (0 = 이번 주·이번 달, -1 = 지난주·지난달 …) */
  const [offset, setOffset] = useState(0);

  const start =
    mode === 'week'
      ? addDays(today, -today.getDay() + offset * 7)
      : new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const count = mode === 'week' ? 7 : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const todayIdx = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  const hasToday = todayIdx >= 0 && todayIdx < count;
  const [sel, setSel] = useState<number | null>(null);
  // 처음 고른 날: 지금 기간이면 오늘, 지난 기간이면 마지막 날
  const restIdx = hasToday ? todayIdx : count - 1;
  const selIdx = sel ?? restIdx;

  // 이 기간보다 앞선 기록이 있어야 더 지난 기간으로 넘길 수 있다
  const firstDate = meals.reduce<string | null>((min, m) => (min === null || m.date < min ? m.date : min), null);
  const canPrev = firstDate !== null && firstDate < toDateKey(start);
  const canNext = offset < 0;
  const label = periodLabel(mode, offset, start, today);

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
    return { key, date, total, segs, label, future: date > today };
  });
  const selDay = days[Math.min(selIdx, days.length - 1)];
  const breakdown = (d: (typeof days)[number]) => d.segs.map((s) => `${KIND_LABEL[s.seg]} ${won(s.value)}원`).join(', ');
  const sum = days.reduce((s, d) => s + d.total, 0);

  // 눈금이 3칸 이하가 되는 가장 작은 간격을 고른다
  const peak = Math.max(daily, ...days.map((d) => d.total), 1000);
  const step = STEPS.find((s) => peak / s <= 3) ?? STEPS[STEPS.length - 1];
  const top = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const pct = (v: number) => `${(v / top) * 100}%`;
  const cols = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };

  const pick = (m: Mode) => {
    setMode(m);
    setOffset(0);
    setSel(null);
  };
  const move = (step: number) => {
    setOffset((o) => Math.min(0, o + step));
    setSel(null);
  };
  const unit = mode === 'week' ? '주' : '달';

  return (
    <section className={ui.card}>
      <div className={ui.row}>
        <h2 className={ui.sec}>{label} 사용 금액</h2>
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
      {/* 금액·기간 양옆 화살표로 지난 기간을 넘겨 본다 */}
      <div className={styles.period}>
        <button type="button" className={styles.arrow} onClick={() => move(-1)} disabled={!canPrev} aria-label={`이전 ${unit} 보기`}>
          <IoChevronBack size={18} aria-hidden />
        </button>
        <p className={styles.total} aria-live="polite">
          {won(sum)}원
          <span className={styles.range}>
            {formatShort(start)} – {formatShort(addDays(start, count - 1))}
          </span>
        </p>
        <button type="button" className={styles.arrow} onClick={() => move(1)} disabled={!canNext} aria-label={`다음 ${unit} 보기`}>
          <IoChevronForward size={18} aria-hidden />
        </button>
      </div>
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

        {/* 마우스가 벗어나면 처음 고른 날(오늘·지난 기간은 마지막 날)로 돌아간다. 터치는 손을 떼면 바로 leave가 와서 제외 */}
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
                  // 바로 아래 칸과의 틈: 같은 색끼리는 얇은 줄 1px, 그 밖에는 2px
                  const below = d.segs[j - 1];
                  const gap = !below ? 0 : colorOf(s.seg) === colorOf(below.seg) ? 1 : 2;
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
          <span key={d.key} className={`${hasToday && i === todayIdx ? styles.today : ''} ${d.future ? styles.future : ''}`}>
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
