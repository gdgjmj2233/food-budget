'use client';

import Link from 'next/link';
import React from 'react';
import { IoChevronForward, IoClose } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { addDays, formatShort, won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import styles from './budget-detail.module.css';

/** 홈 예산 카드의 "더보기". 한 끼·하루 권장 금액과 남은 끼니 같은 자세한 숫자를 보여준다. */
export function BudgetDetail({ onClose }: { onClose: () => void }) {
  const { summary: s, settings, lastDelta } = useBudget();
  const stats = [
    { label: '하루 권장', value: `${won(s.perDay)}원` },
    { label: '남은 끼니 · 일수', value: `${s.mealsLeft}끼 · ${s.daysLeft}일` },
    { label: '사용한 금액', value: `${won(s.spent)}원` },
    { label: '전체 예산', value: `${won(settings.amount)}원` },
  ];

  return (
    <Modal onClose={onClose}>
      <div className={styles.body}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>예산 자세히</h2>
            <p className={styles.sub}>
              {formatShort(s.start)} – {formatShort(addDays(s.end, -1))} · {settings.period === 'week' ? '주간' : '월간'} 예산
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <IoClose size={22} aria-hidden />
          </button>
        </div>

        <div className={styles.perMeal}>
          <span className={styles.perMealLabel}>다음 한 끼 권장 금액</span>
          <span className={styles.perMealVal}>{won(s.perMeal)}원</span>
        </div>

        <dl className={styles.grid}>
          {stats.map((x) => (
            <div key={x.label} className={styles.stat}>
              <dt className={styles.statLabel}>{x.label}</dt>
              <dd className={styles.statVal}>{x.value}</dd>
            </div>
          ))}
        </dl>

        {lastDelta && (
          <p className={styles.delta}>
            {`${lastDelta.name}${lastDelta.price > 0 ? ` ${won(lastDelta.price)}원 차감` : ''} → 한 끼 권장 ${won(
              lastDelta.before,
            )}원에서 ${won(lastDelta.after)}원으로 ${lastDelta.after >= lastDelta.before ? '늘었어요' : '줄었어요'}`}
          </p>
        )}

        <Link href="/budget" className={styles.link}>
          예산 설정 바꾸기
          <IoChevronForward size={14} aria-hidden />
        </Link>
      </div>
    </Modal>
  );
}
