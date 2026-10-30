'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { IoChevronForward, IoPlaySkipForwardOutline, IoRestaurantOutline } from 'react-icons/io5';

import { BudgetDetail } from '@/components/budget-detail';
import { MealDialog } from '@/components/meal-dialog';
import { RecentMeals } from '@/components/recent-meals';
import { useToast } from '@/components/toast';
import { PrimaryButton, Screen, SecondaryButton, Sub, Title } from '@/components/ui';
import ui from '@/components/ui.module.css';
import { WeekChart } from '@/components/week-chart';
import { useEat } from '@/hooks/use-eat';
import { formatDate, won, type Meal } from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import { STATUS } from '@/theme';
import styles from './page.module.css';

export default function HomePage() {
  const { summary: s, settings, meals, removeMeal } = useBudget();
  const { pick, eatCustom, skip } = useEat();
  const toast = useToast();
  const [eating, setEating] = useState(false);
  const [detail, setDetail] = useState(false);
  const status = STATUS[s.status];
  const leftPct = settings.amount > 0 ? Math.min(100, Math.max(0, (s.remain / settings.amount) * 100)) : 0;

  const onRemove = (m: Meal) => {
    confirm('기록 지우기', `${m.name} ${won(m.price)}원 기록을 지울까요?`, () => {
      removeMeal(m.id);
      toast(`${m.name} 기록을 지웠어요`);
    });
  };

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
          <span className={styles.heroLabel}>남은 예산</span>
          <span className={styles.pill} style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
        <div>
          <div className={styles.bigRow}>
            <span className={styles.bigNum}>{won(s.remain)}</span>
            <span className={styles.bigUnit}>원</span>
          </div>
          <p className={styles.heroSub}>
            {s.remain >= 0
              ? `전체 ${won(settings.amount)}원 중 ${Math.round(leftPct)}% 남았어요`
              : `전체 ${won(settings.amount)}원보다 ${won(-s.remain)}원 더 썼어요`}
          </p>
        </div>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${leftPct}%` }} />
        </div>
        <div className={ui.row}>
          <span className={styles.heroSmall}>{won(s.spent)}원 사용</span>
          <button type="button" className={styles.more} onClick={() => setDetail(true)}>
            더보기
            <IoChevronForward size={14} aria-hidden />
          </button>
        </div>
      </section>

      <div className={styles.actions}>
        <PrimaryButton label="밥먹기" icon={IoRestaurantOutline} onPress={() => setEating(true)} />
        <SecondaryButton label="스킵" icon={IoPlaySkipForwardOutline} onPress={skip} />
      </div>

      <WeekChart meals={meals} perDay={s.perDay} />

      <RecentMeals meals={meals} onRemove={onRemove} />

      {eating && (
        <MealDialog
          perMeal={s.perMeal}
          onClose={() => setEating(false)}
          onPick={(place, menu) => {
            pick(place, menu);
            setEating(false);
          }}
          onSubmit={(menu, price) => {
            eatCustom(menu, price);
            setEating(false);
          }}
        />
      )}

      {detail && <BudgetDetail onClose={() => setDetail(false)} />}
    </Screen>
  );
}
