'use client';

import React, { useState } from 'react';

import { useToast } from '@/components/toast';
import { Card, GhostButton, Screen, Sub, Title } from '@/components/ui';
import { DEFAULT_AMOUNT, formatShort, won, type Period } from '@/lib/budget';
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
    updateSettings({ period, amount: DEFAULT_AMOUNT[period] });
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

      <div className={styles.field}>
        <label className={styles.label} htmlFor="amount">
          {settings.period === 'week' ? '일주일' : '한 달'} 식비 예산
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
      </div>

      <Card style={{ paddingTop: 6, paddingBottom: 6 }}>
        <div className={styles.setRow}>
          <span className={styles.setLabel}>하루 식사 횟수</span>
          <div className={styles.step}>
            <button
              type="button"
              className={styles.stepBtn}
              aria-label="식사 횟수 줄이기"
              onClick={() => updateSettings({ mealsPerDay: Math.max(1, settings.mealsPerDay - 1) })}>
              −
            </button>
            <span className={styles.stepVal}>{settings.mealsPerDay}끼</span>
            <button
              type="button"
              className={styles.stepBtn}
              aria-label="식사 횟수 늘리기"
              onClick={() => updateSettings({ mealsPerDay: Math.min(3, settings.mealsPerDay + 1) })}>
              +
            </button>
          </div>
        </div>
        <div className={`${styles.setRow} ${styles.divider}`}>
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

      <div className={styles.result}>
        <span className={styles.resultSmall}>
          자동 계산 결과 · {formatShort(s.start)} ~ {formatShort(endDay)}
        </span>
        <div className={styles.resultRow}>
          <span className={styles.resultLabel}>한 끼 기준</span>
          <span className={styles.resultBig}>{won(s.base)}원</span>
        </div>
        <span className={styles.resultSmall}>
          {s.totalDays}일 × 하루 {settings.mealsPerDay}끼 = 총 {s.totalDays * settings.mealsPerDay}끼 기준
        </span>
      </div>

      <Sub>설정을 바꾸면 이미 먹은 기록은 그대로 두고 남은 예산을 다시 계산합니다.</Sub>

      <div className={styles.center}>
        <GhostButton label="오늘부터 새 기간 시작" onPress={onNewPeriod} />
      </div>
    </Screen>
  );
}
