'use client';

import React, { useState } from 'react';

import { InquiryDialog } from '@/components/inquiry-dialog';
import { useToast } from '@/components/toast';
import { Card, GhostButton, Screen, Sub, Title } from '@/components/ui';
import { DEFAULT_AMOUNT, formatShort, won, type Period } from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { inquiryReady } from '@/lib/inquiry';
import { useBudget } from '@/store/budget-store';
import styles from './page.module.css';

const MAX_AMOUNT = 10_000_000;

export default function BudgetPage() {
  const { settings, summary: s, updateSettings, startNewPeriod } = useBudget();
  const toast = useToast();
  const [text, setText] = useState(won(settings.amount));
  const [editing, setEditing] = useState(false);
  const [inquiring, setInquiring] = useState(false);
  const shown = editing ? text : won(settings.amount);

  const setPeriod = (period: Period) => {
    if (period === settings.period) return;
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

      {/* 스프레드시트 주소(lib/inquiry)가 연결되기 전에는 문의 버튼을 보여 주지 않는다 */}
      {inquiryReady() && (
        <>
          <Sub style={{ textAlign: 'center' }}>불편한 점이나 바라는 점이 있나요?</Sub>
          <div className={styles.center}>
            <GhostButton label="문의하기" onPress={() => setInquiring(true)} />
          </div>
          {inquiring && <InquiryDialog onClose={() => setInquiring(false)} />}
        </>
      )}
    </Screen>
  );
}
