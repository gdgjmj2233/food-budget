'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useRef, useState } from 'react';
import { IoChatbubbleEllipsesOutline, IoInformationCircleOutline, IoSettingsSharp } from 'react-icons/io5';

import { BudgetDetail } from '@/components/budget-detail';
import { InquiryDialog } from '@/components/inquiry-dialog';
import { MealDialog, PastMealDialog } from '@/components/meal-dialog';
import { MealEdit } from '@/components/meal-edit';
import { MissingDayCard } from '@/components/missing-day';
import { ProfileDialog } from '@/components/profile-dialog';
import { RecentMeals } from '@/components/recent-meals';
import { useToast } from '@/components/toast';
import { RiceBowlIcon } from '@/components/rice-bowl-icon';
import { AccentButton, Screen, Sub, Title } from '@/components/ui';
import { CHARACTERS, characterOf } from '@/data/characters';
import { useEat } from '@/hooks/use-eat';
import { addDays, formatDate, offDayName, periodThis, startOfDay, toDateKey, won, type Meal } from '@/lib/budget';
import { inquiryReady } from '@/lib/inquiry';
import { confirm } from '@/lib/confirm';
import { suggestToday } from '@/lib/suggest';
import { useAccount } from '@/store/account-store';
import { useBudget } from '@/store/budget-store';
import { useProfile } from '@/store/profile-store';
import { STATUS } from '@/theme';
import styles from './page.module.css';

export default function HomePage() {
  const { summary: s, settings, meals, missing, removeMeal, updateMeal } = useBudget();
  const profile = useProfile();
  const account = useAccount();
  const { eatCustom, fillDay } = useEat();
  const toast = useToast();
  const [eating, setEating] = useState(false);
  const [detail, setDetail] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [feedback, setFeedback] = useState(false);
  // 지난 날 기록 창에서 처음 골라 둘 날짜. 열려 있지 않으면 null (어제 기록 카드나 밥먹기 창의 "지난 날 기록"으로 연다)
  const [pastDate, setPastDate] = useState<string | null>(null);
  // 최근 기록에서 연필을 눌러 고치는 중인 기록
  const [editing, setEditing] = useState<Meal | null>(null);
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
      setEditing(null);
      toast(`${m.name} 기록을 지웠어요`);
    });
  };

  return (
    <Screen>
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <Sub>{formatDate(new Date())}</Sub>
          {/* 내 정보(닉네임)가 있으면 "닉네임님 !", 없으면(로그인 전) "환영합니다 !".
              한 줄로 보이고, 닉네임이 길면 닉네임만 …으로 줄여서 "님 !"은 늘 보이게 한다 */}
          <Title>
            {profile ? (
              <span className={styles.greet}>
                <span className={styles.nick}>{profile.nickname}</span>님 !
              </span>
            ) : (
              '환영합니다 !'
            )}
          </Title>
        </div>
        <div className={styles.topRight}>
          {inquiryReady() && (
            <button type="button" className={styles.feedback} onClick={() => setFeedback(true)}>
              <IoChatbubbleEllipsesOutline size={18} aria-hidden />
              문의
            </button>
          )}
        {/* 로그인 전에는 Log in 버튼을, 로그인 후에는 내 캐릭터 + 톱니바퀴(계정 정보라는 표시)를 보여 준다. 누르면 로그인·내 정보 창이 열린다 */}
        {account === null ? (
          <button type="button" className={styles.login} onClick={() => setProfileOpen(true)}>
            Log in
          </button>
        ) : (
          <button
            type="button"
            className={styles.avatar}
            onClick={() => setProfileOpen(true)}
            aria-label={profile ? `${profile.nickname}님 계정 정보` : '계정 정보'}>
            <span className={styles.avatarCircle} aria-hidden>
              <Image src={(myCharacter ?? CHARACTERS[1]).img} alt="" unoptimized className={styles.avatarImg} />
            </span>
            <span className={styles.avatarGear} aria-hidden>
              <IoSettingsSharp size={11} />
            </span>
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
          <MissingDayCard missing={missing} onInput={() => setPastDate(missing.date)} />
        </div>
      ) : (
        // 정적 내보내기(GitHub Pages)에서도 되도록 unoptimized
        <div className={styles.tipRow}>
          <Image src={mascotImg} alt="" unoptimized className={styles.mascot} />
          <div className={styles.bubble}>
            <span className={styles.bubbleLabel}>오늘의 한마디</span>
            <span className={styles.bubbleText}>
              {/* 예산 편성 요일이 아닌 날(예: 주말): 오늘은 예산이 편성되지 않은 날이라고 먼저 알려 준다 */}
              {s.restDay ? (
                <>
                  설정에서 {offDayName(settings, new Date())}은 빼고 하루 예산을 편성해서
                  <br />
                  오늘은 편성된 예산이 없어 !
                </>
              ) : tip ? (
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
              <span className={styles.statVal}>{s.restDay ? '-' : `${won(s.todayLeft)}원`}</span>
            </span>
            <span className={styles.stat}>
              <span className={styles.statLabel}>오늘 쓴 금액</span>
              <span className={styles.statVal}>{won(s.spentToday)}원</span>
            </span>
          </span>
        )}
      </button>

      {missing ? (
        <button type="button" className={styles.eatOutline} onClick={() => setEating(true)}>
          <RiceBowlIcon size={22} aria-hidden />
          오늘 밥먹기
        </button>
      ) : (
        <AccentButton label="밥먹기" icon={RiceBowlIcon} onPress={() => setEating(true)} />
      )}

      <RecentMeals
        meals={meals}
        missing={missing}
        onFill={() => askRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        onEdit={setEditing}
        onRemove={onRemove}
      />

      {/* 기록 탭과 같은 기록 고치기 창 (금액·항목·가게·메뉴) */}
      {editing && (
        <MealEdit
          meal={editing}
          onClose={() => setEditing(null)}
          onRemove={() => onRemove(editing)}
          onSave={(patch) => {
            updateMeal(editing.id, patch);
            setEditing(null);
            toast('기록을 고쳤어요');
          }}
        />
      )}

      {eating && (
        <MealDialog
          limit={s.restDay ? undefined : s.todayLeft}
          onClose={() => setEating(false)}
          onSubmit={(menu, price, place, kind) => {
            eatCustom(menu, price, place, kind);
            setEating(false);
          }}
          // 지난 날 기록: 밥먹기 창을 닫고 어제를 골라 둔 날짜 고르기부터 연다
          onPast={() => {
            setEating(false);
            setPastDate(toDateKey(addDays(startOfDay(new Date()), -1)));
          }}
        />
      )}

      {pastDate && (
        <PastMealDialog
          initialDate={pastDate}
          onClose={() => setPastDate(null)}
          onSubmit={(date, menu, price, place, kind) => {
            fillDay(date, menu, price, place, kind);
            setPastDate(null);
          }}
        />
      )}

      {detail && <BudgetDetail onClose={() => setDetail(false)} />}
      {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
    </Screen>
  );
}
