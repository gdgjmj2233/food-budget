'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useRef, useState } from 'react';
import { IoChatbubbleEllipsesOutline, IoInformationCircleOutline } from 'react-icons/io5';
import { LuSoup } from 'react-icons/lu';

import { BudgetDetail } from '@/components/budget-detail';
import { InquiryDialog } from '@/components/inquiry-dialog';
import { MealDialog, PastMealDialog } from '@/components/meal-dialog';
import { MissingDayCard } from '@/components/missing-day';
import { ProfileDialog } from '@/components/profile-dialog';
import { RecentMeals } from '@/components/recent-meals';
import { useToast } from '@/components/toast';
import { AccentButton, Screen, Sub, Title } from '@/components/ui';
import { CHARACTERS, characterOf } from '@/data/characters';
import { useEat } from '@/hooks/use-eat';
import { formatDate, periodThis, won, type Meal } from '@/lib/budget';
import { inquiryReady } from '@/lib/inquiry';
import { confirm } from '@/lib/confirm';
import { suggestToday } from '@/lib/suggest';
import { useAccount } from '@/store/account-store';
import { useBudget } from '@/store/budget-store';
import { useProfile } from '@/store/profile-store';
import { STATUS } from '@/theme';
import styles from './page.module.css';

export default function HomePage() {
  const { summary: s, settings, meals, missing, removeMeal } = useBudget();
  const profile = useProfile();
  const account = useAccount();
  const { eatCustom, fillDay } = useEat();
  const toast = useToast();
  const [eating, setEating] = useState(false);
  const [detail, setDetail] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [filling, setFilling] = useState(false);
  const askRef = useRef<HTMLDivElement>(null);
  const myCharacter = profile && characterOf(profile.character);
  const mascot = myCharacter ?? CHARACTERS[0];
  // 예산이 임박·초과면 캐릭터도 지친 모습으로
  const mascotImg = s.status === 'ok' ? mascot.img : mascot.sadImg;
  const status = STATUS[s.status];
  const spentPct = s.amount > 0 ? Math.min(100, Math.max(0, (s.spent / s.amount) * 100)) : 0;
  const tip = suggestToday(meals);
  // 오늘 쓸 수 있는 금액이 처음 정한 하루 금액보다 많으면 그동안 아껴 쓴 것, 적으면 많이 쓴 것
  const budgetTalk =
    s.perDay > s.base
      ? '지금까지 예산 관리 잘했어!'
      : s.perDay === s.base
        ? '이대로만 쓰면 예산 딱 맞아.'
        : '요즘 좀 많이 썼어. 조금 아껴 보자.';

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
        <div className={styles.topRight}>
          {inquiryReady() && (
            <button type="button" className={styles.feedback} onClick={() => setFeedback(true)}>
              <IoChatbubbleEllipsesOutline size={14} aria-hidden />
              피드백
            </button>
          )}
        {/* 로그인 전에는 Log in 버튼을, 로그인 후에는 내 캐릭터를 보여 준다. 누르면 로그인·내 정보 창이 열린다 */}
        {account === null ? (
          <button type="button" className={styles.login} onClick={() => setProfileOpen(true)}>
            Log in
          </button>
        ) : (
          <button
            type="button"
            className={styles.avatar}
            onClick={() => setProfileOpen(true)}
            aria-label={profile ? `${profile.nickname}님 내 정보` : '내 정보'}>
            <Image src={(myCharacter ?? CHARACTERS[1]).img} alt="" unoptimized className={styles.avatarImg} />
          </button>
        )}
        </div>
      </header>

      {feedback && <InquiryDialog onClose={() => setFeedback(false)} />}

      {s.ended && (
        <Link href="/budget" className={styles.ended}>
          예산 기간이 끝났어요. 눌러서 새 기간을 시작하세요.
        </Link>
      )}

      {missing ? (
        <div ref={askRef}>
          <MissingDayCard missing={missing} onInput={() => setFilling(true)} />
        </div>
      ) : (
        // 정적 내보내기(GitHub Pages)에서도 되도록 unoptimized
        <div className={styles.tipRow}>
          <Image src={mascotImg} alt="" unoptimized className={styles.mascot} />
          <div className={styles.bubble}>
            <span className={styles.bubbleLabel}>오늘의 한마디</span>
            <span className={styles.bubbleText}>
              {tip ? (
                <>
                  어제 {tip.menu} 먹었지?
                  <br />
                  오늘은 {tip.theme} 어때?
                </>
              ) : s.todayLeft > 0 ? (
                <>
                  오늘은 {won(s.todayLeft)}원 쓸 수 있어.
                  <br />
                  {budgetTalk}
                </>
              ) : (
                <>
                  오늘 쓸 금액은 다 썼어.
                  <br />
                  더 먹으면 남은 날이 빠듯해.
                </>
              )}
            </span>
          </div>
        </div>
      )}

      <button type="button" className={styles.hero} onClick={() => setDetail(true)} aria-label="예산 자세히 보기">
        <span className={styles.heroTop}>
          <span className={styles.heroLabel}>{periodThis(settings.period)} 남은 예산</span>
          {!missing && (
            <span className={styles.pill} style={{ backgroundColor: status.bg, color: status.fg }}>
              {status.label}
            </span>
          )}
        </span>
        <span className={styles.bigRow}>
          <span className={styles.bigNum}>{won(s.remain)}</span>
          <span className={styles.bigUnit}>원</span>
        </span>
        <span className={styles.bar}>
          {/* 노란색 = 쓴 금액 */}
          <span className={styles.barFill} style={{ width: `${spentPct}%` }} />
        </span>
        {missing ? (
          <span className={styles.heroNote}>
            <IoInformationCircleOutline size={15} aria-hidden />
            어제 기록이 없어서 실제보다 많아 보일 수 있어요
          </span>
        ) : (
          <span className={styles.stats}>
            <span className={styles.stat}>
              <span className={styles.statLabel}>오늘 남은 금액</span>
              <span className={styles.statVal}>{won(s.todayLeft)}원</span>
            </span>
            <span className={styles.stat}>
              <span className={styles.statLabel}>오늘 쓴 금액</span>
              <span className={styles.statVal}>{won(s.spentToday)}원</span>
            </span>
          </span>
        )}
        {!missing && s.split && (
          <span className={styles.stats}>
            <span className={styles.stat}>
              <span className={styles.statLabel}>점심 남은 금액</span>
              <span className={styles.statVal}>{won(s.split.lunchLeft)}원</span>
            </span>
            <span className={styles.stat}>
              <span className={styles.statLabel}>저녁 남은 금액</span>
              <span className={styles.statVal}>{won(s.split.dinnerLeft)}원</span>
            </span>
          </span>
        )}
      </button>

      {missing ? (
        <button type="button" className={styles.eatOutline} onClick={() => setEating(true)}>
          <LuSoup size={22} aria-hidden />
          오늘 밥먹기
        </button>
      ) : (
        <AccentButton label="밥먹기" icon={LuSoup} onPress={() => setEating(true)} />
      )}

      <RecentMeals
        meals={meals}
        missing={missing}
        onFill={() => askRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        onRemove={onRemove}
      />

      {eating && (
        <MealDialog
          limit={s.todayLeft}
          onClose={() => setEating(false)}
          onSubmit={(menu, price, place, kind) => {
            eatCustom(menu, price, place, kind);
            setEating(false);
          }}
        />
      )}

      {filling && missing && (
        <PastMealDialog
          initialDate={missing.date}
          onClose={() => setFilling(false)}
          onSubmit={(date, menu, price, place, kind) => {
            fillDay(date, menu, price, place, kind);
            setFilling(false);
          }}
        />
      )}

      {detail && <BudgetDetail onClose={() => setDetail(false)} />}
      {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
    </Screen>
  );
}
