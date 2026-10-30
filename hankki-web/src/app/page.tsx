'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { IoChevronForward, IoPlaySkipForwardOutline, IoRestaurantOutline } from 'react-icons/io5';

import { BudgetTools } from '@/components/budget-tools';
import { QuickMeals } from '@/components/quick-meals';
import { BudgetDetail } from '@/components/budget-detail';
import { MealDialog } from '@/components/meal-dialog';
import { ProfileDialog } from '@/components/profile-dialog';
import { RecentMeals } from '@/components/recent-meals';
import { useToast } from '@/components/toast';
import { PrimaryButton, Screen, SecondaryButton, Sub, Title } from '@/components/ui';
import ui from '@/components/ui.module.css';
import { WeekChart } from '@/components/week-chart';
import { CHARACTERS, characterOf } from '@/data/characters';
import { useEat } from '@/hooks/use-eat';
import { formatDate, won, type Meal } from '@/lib/budget';
import { confirm } from '@/lib/confirm';
import { useBudget } from '@/store/budget-store';
import { useProfile } from '@/store/profile-store';
import { STATUS } from '@/theme';
import styles from './page.module.css';

export default function HomePage() {
  const { summary: s, settings, meals, removeMeal, record } = useBudget();
  const profile = useProfile();
  const { pick, eatCustom, skip } = useEat();
  const toast = useToast();
  const [eating, setEating] = useState(false);
  const [detail, setDetail] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const myCharacter = profile && characterOf(profile.character);
  const mascot = myCharacter ?? CHARACTERS[0];
  // 예산이 임박·초과면 캐릭터도 지친 모습으로
  const mascotImg = s.status === 'ok' ? mascot.img : mascot.sadImg;
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
      <header className={styles.top}>
        <div>
          <Sub>{formatDate(new Date())}</Sub>
          <Title>인하대 근처</Title>
        </div>
        {profile && myCharacter ? (
          <button type="button" className={styles.me} onClick={() => setProfileOpen(true)} aria-label="내 정보">
            <span className={styles.meName}>{profile.nickname}님</span>
            <span className={styles.avatar}>
              <Image src={myCharacter.img} alt="" unoptimized className={styles.avatarImg} />
            </span>
          </button>
        ) : (
          <button type="button" className={styles.login} onClick={() => setProfileOpen(true)}>
            로그인
          </button>
        )}
      </header>

      {s.ended && (
        <Link href="/budget" className={styles.ended}>
          예산 기간이 끝났어요. 눌러서 새 기간을 시작하세요.
        </Link>
      )}

      {/* 마스코트 : 예산 카드 = 1 : 3. 로그인하면 고른 캐릭터, 아니면 기본 캐릭터(용).
          정적 내보내기(GitHub Pages)에서도 되도록 unoptimized */}
      <div className={styles.heroRow}>
        <div className={styles.mascots} aria-hidden>
          <Image src={mascotImg} alt="" unoptimized className={styles.mascot} />
        </div>

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
            {/* 흰색 = 쓴 금액, 옅은 부분 = 남은 금액 */}
            <div className={styles.barFill} style={{ width: `${100 - leftPct}%` }} />
          </div>
          <div className={ui.row}>
            <span className={styles.heroSmall}>{won(s.spent)}원 사용</span>
            <button type="button" className={styles.more} onClick={() => setDetail(true)}>
              더보기
              <IoChevronForward size={14} aria-hidden />
            </button>
          </div>
        </section>
      </div>

      <div className={styles.actions}>
        <PrimaryButton label="밥먹기" icon={IoRestaurantOutline} onPress={() => setEating(true)} />
        <SecondaryButton label="스킵" icon={IoPlaySkipForwardOutline} onPress={skip} />
      </div>

      <QuickMeals meals={meals} perMeal={s.perMeal} onPick={f => {
        if (f.place && f.placeMenu) { pick(f.place, f.placeMenu); return; }
        const delta = record(f.name, f.menu, f.price);
        toast(delta ? f.name + ' ' + won(f.price) + '원 기록했어요' : '예산 기간이 끝났어요. 새 기간을 시작하세요.');
      }} />
      <BudgetTools />
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
      {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
    </Screen>
  );
}
