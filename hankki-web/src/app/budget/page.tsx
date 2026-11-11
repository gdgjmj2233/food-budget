'use client';

import React, { useState } from 'react';

import { useToast } from '@/components/toast';
import { Card, GhostButton, Screen, Sub, Title } from '@/components/ui';
import {
  addDays,
  DEFAULT_AMOUNT,
  formatShort,
  fromDateKey,
  MAX_CUSTOM_DAYS,
  toDateKey,
  won,
  type Period,
} from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import styles from './page.module.css';

const MAX_AMOUNT = 10_000_000;

export default function BudgetPage() {
  const { settings, summary: s, updateSettings, startNewPeriod } = useBudget();
  const toast = useToast();
  const [text, setText] = useState(won(settings.amount));
  const [editing, setEditing] = useState(false);
  const shown = editing ? text : won(settings.amount);

  const setPeriod = (period: Period) => {
    if (period === settings.period) return;
    if (period === 'custom') {
      // 금액은 그대로 두고, 시작일부터 2주를 기본 기간으로 잡는다
      updateSettings({ period, endDate: toDateKey(addDays(fromDateKey(settings.startDate), 13)) });
      return;
    }
    const next = DEFAULT_AMOUNT[period];
    const apply = () => updateSettings({ period, amount: next });
    // 기간을 바꾸면 금액이 기본값으로 덮어써져서, 직접 정해 둔 금액이 있으면 먼저 물어본다
    if (settings.amount === DEFAULT_AMOUNT[settings.period]) {
      apply();
      return;
    }
    confirm(
      '예산 기간 바꾸기',
      `${won(settings.amount)}원으로 정해 둔 예산이 ${won(next)}원(기본값)으로 바뀌어요. 바꿀까요?`,
      apply,
    );
  };

  const onAmount = (t: string) => {
    const n = Math.min(parseInt(t.replace(/\D/g, ''), 10) || 0, MAX_AMOUNT);
    setText(n ? won(n) : '');
    if (n >= 1000) updateSettings({ amount: n });
  };

  const onNewPeriod = () => {
    confirm('새 기간 시작', '오늘부터 새 예산 기간을 시작할까요? 지난 기록은 남아 있지만 계산에서는 빠집니다.', () => {
      startNewPeriod();
      toast('오늘부터 새 기간을 시작했어요');
    });
  };

  const endDay = new Date(s.end.getFullYear(), s.end.getMonth(), s.end.getDate() - 1);
  const endKey = toDateKey(endDay);
  const maxEnd = toDateKey(addDays(fromDateKey(settings.startDate), MAX_CUSTOM_DAYS - 1));

  const onStart = (value: string) => {
    if (!value) return;
    const days = Math.round((endDay.getTime() - fromDateKey(settings.startDate).getTime()) / 86_400_000);
    // 시작일을 옮기면 기간 길이를 그대로 유지한다
    updateSettings({ startDate: value, endDate: toDateKey(addDays(fromDateKey(value), Math.max(0, days))) });
  };
  const onEnd = (value: string) => {
    if (value && value >= settings.startDate && value <= maxEnd) updateSettings({ endDate: value });
  };
  const lunchPct = settings.lunchPct ?? 0;
  const lunchBase = Math.floor((s.base * lunchPct) / 100 / 100) * 100;

  return (
    <Screen>
      <Title>식비 예산 설정</Title>

      <div className={styles.field}>
        <span className={styles.label} id="period-label">
          예산 기간
        </span>
        <div className={styles.seg} role="radiogroup" aria-labelledby="period-label">
          {(
            [
              ['week', '주간'],
              ['month', '월간'],
              ['custom', '직접'],
            ] as const
          ).map(([k, l]) => (
            <button
              type="button"
              key={k}
              onClick={() => setPeriod(k)}
              role="radio"
              aria-checked={settings.period === k}
              className={`${styles.segBtn} ${settings.period === k ? styles.segOn : ''}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {settings.period === 'custom' && (
        <div className={styles.field}>
          <span className={styles.label}>기간 (최대 {MAX_CUSTOM_DAYS}일)</span>
          <div className={styles.dates}>
            <label className={styles.dateBox}>
              <span className={styles.dateCap}>시작일</span>
              <input type="date" value={settings.startDate} onChange={(e) => onStart(e.target.value)} className={styles.dateInput} />
            </label>
            <span aria-hidden>~</span>
            <label className={styles.dateBox}>
              <span className={styles.dateCap}>마지막 날</span>
              <input
                type="date"
                value={endKey}
                min={settings.startDate}
                max={maxEnd}
                onChange={(e) => onEnd(e.target.value)}
                className={styles.dateInput}
              />
            </label>
          </div>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="amount">
          {settings.period === 'week' ? '일주일' : settings.period === 'month' ? '한 달' : `${s.totalDays}일 동안의`} 식비 예산
        </label>
        <div className={styles.amount}>
          <input
            id="amount"
            value={shown}
            inputMode="numeric"
            autoComplete="off"
            onFocus={() => {
              setText(won(settings.amount));
              setEditing(true);
            }}
            onBlur={() => setEditing(false)}
            onChange={(e) => onAmount(e.target.value)}
            className={styles.amountInput}
          />
          <span className={styles.amountUnit}>원</span>
        </div>
        {s.spent > settings.amount && (
          <p className={styles.warn} role="status">
            이번 기간에 이미 쓴 {won(s.spent)}원이 예산보다 많아요. 남은 예산이 마이너스로 계산돼요.
          </p>
        )}
      </div>

      <Card style={{ paddingTop: 6, paddingBottom: 6 }}>
        <div className={styles.setRow}>
          <span className={styles.setLabel}>주말은 예산에서 제외</span>
          <button
            type="button"
            onClick={() => updateSettings({ skipWeekend: !settings.skipWeekend })}
            role="switch"
            aria-checked={settings.skipWeekend}
            aria-label="주말 제외"
            className={`${styles.tog} ${settings.skipWeekend ? styles.togOn : ''}`}>
            <span className={styles.knob} />
          </button>
        </div>
      </Card>

      <Card style={{ paddingTop: 6, paddingBottom: lunchPct ? 14 : 6 }}>
        <div className={styles.setRow}>
          <span className={styles.setLabel}>점심·저녁 나눠서 관리</span>
          <button
            type="button"
            onClick={() => updateSettings({ lunchPct: lunchPct ? undefined : 50 })}
            role="switch"
            aria-checked={lunchPct > 0}
            aria-label="점심 저녁 나누기"
            className={`${styles.tog} ${lunchPct ? styles.togOn : ''}`}>
            <span className={styles.knob} />
          </button>
        </div>
        {lunchPct > 0 && (
          <>
            <p className={styles.splitNote}>하루 예산 중 점심 비율</p>
            <div className={styles.seg} role="radiogroup" aria-label="점심 비율">
              {[30, 40, 50, 60, 70].map((p) => (
                <button
                  type="button"
                  key={p}
                  role="radio"
                  aria-checked={lunchPct === p}
                  onClick={() => updateSettings({ lunchPct: p })}
                  className={`${styles.segBtn} ${lunchPct === p ? styles.segOn : ''}`}>
                  {p}%
                </button>
              ))}
            </div>
            <p className={styles.splitNote}>
              하루 기준 점심 {won(lunchBase)}원 · 저녁 {won(s.base - lunchBase)}원. 점심에 더 쓰면 저녁 금액에서 빠져요.
            </p>
          </>
        )}
      </Card>

      <div className={styles.result}>
        <span className={styles.resultSmall}>
          자동 계산 결과 · {formatShort(s.start)} ~ {formatShort(endDay)}
        </span>
        <div className={styles.resultRow}>
          <span className={styles.resultLabel}>하루 기준</span>
          <span className={styles.resultBig}>{won(s.base)}원</span>
        </div>
        <span className={styles.resultSmall}>
          {won(settings.amount)}원 ÷ {s.totalDays}일
        </span>
      </div>

      <Sub>설정을 바꾸면 이미 먹은 기록은 그대로 두고 남은 예산을 다시 계산합니다.</Sub>

      <div className={styles.center}>
        <GhostButton label="오늘부터 새 기간 시작" onPress={onNewPeriod} />
      </div>
    </Screen>
  );
}
