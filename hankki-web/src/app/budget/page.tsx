'use client';

import React, { useState } from 'react';

import { useToast } from '@/components/toast';
import { Card, GhostButton, Screen, Sub, Title } from '@/components/ui';
import {
  addDays,
  DEFAULT_AMOUNT,
  formatShort,
  fromDateKey,
  periodName,
  toDateKey,
  won,
  type Period,
} from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import styles from './page.module.css';

const MAX_AMOUNT = 10_000_000;
/** 직접 설정을 처음 고를 때의 기간 길이 (일) */
const CUSTOM_DAYS = 14;

/** 숫자만 받는 금액 칸. 입력하는 동안은 적은 그대로, 칸을 벗어나면 저장된 값으로 보여 준다 */
function AmountInput({ id, value, max, min, onChange }: { id: string; value: number; max: number; min: number; onChange: (n: number) => void }) {
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  return (
    <div className={styles.amount}>
      <input
        id={id}
        value={editing ? text : won(value)}
        inputMode="numeric"
        autoComplete="off"
        onFocus={() => {
          setText(won(value));
          setEditing(true);
        }}
        onBlur={() => setEditing(false)}
        onChange={(e) => {
          const n = Math.min(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0, max);
          setText(n ? won(n) : '');
          if (n >= min) onChange(n);
        }}
        className={styles.amountInput}
      />
      <span className={styles.amountUnit}>원</span>
    </div>
  );
}

export default function BudgetPage() {
  const { settings, summary: s, updateSettings, startNewPeriod } = useBudget();
  const toast = useToast();

  const setPeriod = (period: Period) => {
    if (period === settings.period) return;
    // 직접 설정은 오늘부터 2주로 시작하고, 날짜는 아래에서 고친다
    const range =
      period === 'custom'
        ? { startDate: settings.startDate, endDate: toDateKey(addDays(fromDateKey(settings.startDate), CUSTOM_DAYS - 1)) }
        : {};
    const next = DEFAULT_AMOUNT[period];
    const apply = () => updateSettings({ period, amount: next, ...range });
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

  const setStart = (startDate: string) => {
    if (!startDate) return;
    // 시작일이 마지막 날보다 늦어지면 마지막 날도 같이 옮긴다
    const endDate = settings.endDate && settings.endDate >= startDate ? settings.endDate : startDate;
    updateSettings({ startDate, endDate });
  };

  const onNewPeriod = () => {
    confirm('새 기간 시작', '오늘부터 새 예산 기간을 시작할까요? 지난 기록은 남아 있지만 계산에서는 빠집니다.', () => {
      startNewPeriod();
      toast('오늘부터 새 기간을 시작했어요');
    });
  };

  const endDay = addDays(s.end, -1);
  const amountLabel = { week: '일주일', month: '한 달', custom: '기간 전체' }[settings.period];

  return (
    <Screen>
      <Title>식비 예산 설정</Title>

      <div className={styles.field}>
        <span className={styles.label} id="period-label">
          예산 기간
        </span>
        <div className={styles.seg} role="radiogroup" aria-labelledby="period-label">
          {(['week', 'month', 'custom'] as const).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setPeriod(k)}
              role="radio"
              aria-checked={settings.period === k}
              className={`${styles.segBtn} ${settings.period === k ? styles.segOn : ''}`}>
              {periodName(k)}
            </button>
          ))}
        </div>
        {settings.period === 'custom' && (
          <div className={styles.dates}>
            <label className={styles.dateField}>
              <span className={styles.dateLabel}>시작일</span>
              <input type="date" value={settings.startDate} onChange={(e) => setStart(e.target.value)} className={styles.dateInput} />
            </label>
            <span className={styles.dateSep}>~</span>
            <label className={styles.dateField}>
              <span className={styles.dateLabel}>마지막 날</span>
              <input
                type="date"
                value={settings.endDate ?? settings.startDate}
                min={settings.startDate}
                onChange={(e) => e.target.value && updateSettings({ endDate: e.target.value })}
                className={styles.dateInput}
              />
            </label>
          </div>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="amount">
          {amountLabel} 식비 예산
        </label>
        <AmountInput id="amount" value={settings.amount} max={MAX_AMOUNT} min={1000} onChange={(n) => updateSettings({ amount: n })} />
      </div>

      {s.spent > s.amount && (
        <p className={styles.warn} role="status">
          이번 기간에 이미 쓴 {won(s.spent)}원이 예산보다 많아요. 남은 예산이 마이너스로 계산돼요.
        </p>
      )}

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

      <div className={styles.result}>
        <span className={styles.resultSmall}>
          자동 계산 결과 · {formatShort(s.start)} ~ {formatShort(endDay)}
        </span>
        <div className={styles.resultRow}>
          <span className={styles.resultLabel}>하루 기준</span>
          <span className={styles.resultBig}>{won(s.base)}원</span>
        </div>
        <span className={styles.resultSmall}>
          {won(s.amount)}원 ÷ {s.totalDays}일
        </span>
      </div>

      <Sub>설정을 바꾸면 이미 먹은 기록은 그대로 두고 남은 예산을 다시 계산합니다.</Sub>

      <div className={styles.center}>
        <GhostButton label="오늘부터 새 기간 시작" onPress={onNewPeriod} />
      </div>
    </Screen>
  );
}
