'use client';

import Link from 'next/link';
import React from 'react';

import { Screen, Sub, Title } from '@/components/ui';
import ui from '@/components/ui.module.css';
import { formatDate, won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { STATUS } from '@/theme';
import styles from './page.module.css';

export default function HomePage() {
  const { summary: s, settings, lastDelta } = useBudget();
  const status = STATUS[s.status];
  const usedPct = settings.amount > 0 ? Math.min(100, Math.max(0, (s.spent / settings.amount) * 100)) : 0;

  return (
    <Screen>
      <div>
        <Sub>{formatDate(new Date())}</Sub>
        <Title>인하대 근처</Title>
      </div>

      {s.ended && (
        <Link href="/budget" className={styles.ended}>
          예산 기간이 끝났어요. 눌러서 새 기간을 시작하세요.
        </Link>
      )}

      <section className={styles.hero} style={{ backgroundColor: status.color }}>
        <div className={ui.row}>
          <span className={styles.heroLabel}>다음 한 끼 권장 금액</span>
          <span className={styles.pill} style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
        <div className={styles.bigRow}>
          <span className={styles.bigNum}>{won(s.perMeal)}</span>
          <span className={styles.bigUnit}>원</span>
        </div>
        <div className={styles.miniRow}>
          <div className={styles.mini}>
            <span className={styles.miniLabel}>하루 권장</span>
            <span className={styles.miniVal}>{won(s.perDay)}원</span>
          </div>
          <div className={styles.mini}>
            <span className={styles.miniLabel}>남은 끼니 · 일수</span>
            <span className={styles.miniVal}>
              {s.mealsLeft}끼 · {s.daysLeft}일
            </span>
          </div>
        </div>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${usedPct}%` }} />
        </div>
        <div className={ui.row}>
          <span className={styles.heroSmall}>{won(s.spent)}원 사용</span>
          <span className={styles.heroSmall}>남은 예산 {won(s.remain)}원</span>
        </div>
        {lastDelta && (
          <p className={styles.delta}>
            {`${lastDelta.name} ${won(lastDelta.price)}원 차감 → 한 끼 권장 ${won(lastDelta.before)}원에서 ${won(
              lastDelta.after,
            )}원으로 ${lastDelta.after >= lastDelta.before ? '늘었어요' : '줄었어요'}`}
          </p>
        )}
      </section>
    </Screen>
  );
}
