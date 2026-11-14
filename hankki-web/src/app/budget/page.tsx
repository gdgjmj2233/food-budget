'use client';

import React, { useState } from 'react';

import { useToast } from '@/components/toast';
import { Card, GhostButton, Screen, Sub, Title } from '@/components/ui';
import ui from '@/components/ui.module.css';
import {
  addDays,
  calcBudget,
  DEFAULT_AMOUNT,
  formatShort,
  fromDateKey,
  periodName,
  toDateKey,
  won,
  type Period,
  type Settings,
} from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import { C } from '@/theme';
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
  const { settings, meals, updateSettings, startNewPeriod } = useBudget();
  const toast = useToast();
  // 화면에서 바꾼 값. "적용"을 눌러야 저장되고, 그 전까지는 계산 결과만 미리 보여 준다
  const [edits, setEdits] = useState<Partial<Settings>>({});
  const draft: Settings = { ...settings, ...edits };
  const dirty = (Object.keys(edits) as (keyof Settings)[]).some((k) => edits[k] !== settings[k]);
  const s = calcBudget(draft, meals);
  const edit = (patch: Partial<Settings>) => setEdits((prev) => ({ ...prev, ...patch }));

  const setPeriod = (period: Period) => {
    if (period === draft.period) return;
    // 저장된 기간으로 돌아오면 저장된 금액·날짜로 되돌린다
    if (period === settings.period) {
      edit({ period, amount: settings.amount, startDate: settings.startDate, endDate: settings.endDate });
      return;
    }
    // 다른 기간을 고르면 금액은 그 기간의 기본값으로 바꾼다. 직접 설정은 시작일부터 2주로 잡고, 날짜는 아래에서 고친다
    const range = period === 'custom' ? { endDate: toDateKey(addDays(fromDateKey(draft.startDate), CUSTOM_DAYS - 1)) } : {};
    edit({ period, amount: DEFAULT_AMOUNT[period], ...range });
  };

  const setStart = (startDate: string) => {
    if (!startDate) return;
    // 시작일이 마지막 날보다 늦어지면 마지막 날도 같이 옮긴다
    const endDate = draft.endDate && draft.endDate >= startDate ? draft.endDate : startDate;
    edit({ startDate, endDate });
  };

  const apply = () => {
    if (!dirty) return;
    updateSettings(edits);
    setEdits({});
    toast('예산 설정을 적용했어요');
  };

  const onNewPeriod = () => {
    confirm('새 기간 시작', '오늘부터 새 예산 기간을 시작할까요? 지난 기록은 남아 있지만 계산에서는 빠집니다.', () => {
      startNewPeriod();
      toast('오늘부터 새 기간을 시작했어요');
    });
  };

  const endDay = addDays(s.end, -1);
  const amountLabel = { week: '일주일', month: '한 달', custom: '기간 전체' }[draft.period];

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
              aria-checked={draft.period === k}
              className={`${styles.segBtn} ${draft.period === k ? styles.segOn : ''}`}>
              {periodName(k)}
            </button>
          ))}
        </div>
        {draft.period === 'custom' && (
          <div className={styles.dates}>
            <label className={styles.dateField}>
              <span className={styles.dateLabel}>시작일</span>
              <input type="date" value={draft.startDate} onChange={(e) => setStart(e.target.value)} className={styles.dateInput} />
            </label>
            <span className={styles.dateSep}>~</span>
            <label className={styles.dateField}>
              <span className={styles.dateLabel}>마지막 날</span>
              <input
                type="date"
                value={draft.endDate ?? draft.startDate}
                min={draft.startDate}
                onChange={(e) => e.target.value && edit({ endDate: e.target.value })}
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
        <AmountInput id="amount" value={draft.amount} max={MAX_AMOUNT} min={1000} onChange={(n) => edit({ amount: n })} />
      </div>

      {s.spent > s.amount && (
        <p className={styles.warn} role="status">
          이번 기간에 이미 쓴 {won(s.spent)}원이 예산보다 많아요. 남은 예산이 마이너스로 계산돼요.
        </p>
      )}

      <Card style={{ paddingTop: 6, paddingBottom: 6 }}>
        <div className={styles.setRow}>
          <span className={styles.setLabel}>주말 제외하여 하루 예산 편성</span>
          <button
            type="button"
            onClick={() => edit({ skipWeekend: !draft.skipWeekend })}
            role="switch"
            aria-checked={draft.skipWeekend}
            aria-label="주말 제외하여 하루 예산 편성"
            className={`${styles.tog} ${draft.skipWeekend ? styles.togOn : ''}`}>
            <span className={styles.knob} />
          </button>
        </div>
      </Card>

      <div className={styles.result}>
        <span className={styles.resultSmall}>
          {dirty ? '적용하면' : '자동 계산 결과'} · {formatShort(s.start)} ~ {formatShort(endDay)}
        </span>
        <div className={styles.resultRow}>
          <span className={styles.resultLabel}>하루 기준</span>
          <span className={styles.resultBig}>{won(s.base)}원</span>
        </div>
        <span className={styles.resultSmall}>
          {won(s.amount)}원 ÷ {s.totalDays}일
        </span>
      </div>

      {dirty && (
        <p className={styles.pending} role="status">
          바꾼 내용은 아직 저장되지 않았어요. 적용을 눌러야 바뀌어요.
        </p>
      )}
      <div className={styles.applyRow}>
        <button type="button" className={`${ui.primary} ${ui.secondary}`} onClick={() => setEdits({})} disabled={!dirty}>
          되돌리기
        </button>
        <button type="button" className={ui.primary} style={{ backgroundColor: C.primary }} onClick={apply} disabled={!dirty}>
          적용
        </button>
      </div>

      <Sub>
        적용을 누르면 이미 먹은 기록은 그대로 두고 남은 예산을 다시 계산합니다. 따로 바꾸지 않으면 기간이 끝나도 같은 예산으로 다음 기간이
        자동으로 이어져요.
      </Sub>

      <div className={styles.center}>
        <GhostButton label="오늘부터 새 기간 시작" onPress={onNewPeriod} />
      </div>
    </Screen>
  );
}
