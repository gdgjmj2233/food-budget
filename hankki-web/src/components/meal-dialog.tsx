'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { IoClose, IoListOutline, IoMapOutline } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { PlaceItem } from '@/components/place-item';
import { PlaceMap } from '@/components/place-map';
import { RoulettePanel } from '@/components/roulette';
import { CHARACTERS, characterOf } from '@/data/characters';
import { bestMenu, cheapestPrice, mainMenu, PLACES, type Menu, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { matchesTheme, suggestToday } from '@/lib/suggest';
import { useBudget } from '@/store/budget-store';
import { useProfile } from '@/store/profile-store';
import { C } from '@/theme';
import styles from './meal-dialog.module.css';
import ui from './ui.module.css';

/** 추천 창에 보여줄 식당 수 */
const MAX_PLACES = 5;

type Step = 'list' | 'map' | 'roulette' | 'input';

function WheelIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

/**
 * 밥먹기 창. 추천·지도·룰렛으로 식당을 고르고, 목록에 없으면 메뉴·가격을 직접 입력한다.
 * 열 때마다 새로 그려서 입력값이 비어 있다.
 */
export function MealDialog({
  perMeal,
  onClose,
  onPick,
  onSubmit,
}: {
  perMeal: number;
  onClose: () => void;
  onPick: (place: Place, menu: Menu) => void;
  onSubmit: (menu: string, price: number) => void;
}) {
  const [step, setStep] = useState<Step>('list');

  return (
    <Modal sheet onClose={onClose}>
      {(step === 'list' || step === 'map') && <Choose step={step} perMeal={perMeal} onStep={setStep} onClose={onClose} onPick={onPick} />}
      {step === 'input' && <MealInput title="직접 입력" perMeal={perMeal} onBack={() => setStep('list')} onSubmit={onSubmit} />}
      {step === 'roulette' && (
        <RoulettePanel places={PLACES} perMeal={perMeal} onEat={onSubmit} onClose={onClose} onBack={() => setStep('list')} />
      )}
    </Modal>
  );
}

function Choose({
  step,
  perMeal,
  onStep,
  onClose,
  onPick,
}: {
  step: 'list' | 'map';
  perMeal: number;
  onStep: (step: Step) => void;
  onClose: () => void;
  onPick: (place: Place, menu: Menu) => void;
}) {
  const hasFits = PLACES.some((p) => bestMenu(p, perMeal).fits);
  const tabs = [
    { id: 'list', label: '추천', icon: <IoListOutline size={16} aria-hidden /> },
    { id: 'map', label: '지도', icon: <IoMapOutline size={16} aria-hidden /> },
    { id: 'roulette', label: '룰렛', icon: <WheelIcon size={16} /> },
  ] as const;

  return (
    <div className={styles.sheetBody}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>오늘 뭐 먹을까요?</h2>
          <p className={styles.sub}>
            {hasFits ? (
              <>
                한 끼 <b>{won(perMeal)}원</b> 안에서 골랐어요
              </>
            ) : (
              `한 끼 ${won(perMeal)}원 안인 곳이 없어서 가장 싼 곳을 골랐어요`
            )}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <IoClose size={22} aria-hidden />
        </button>
      </div>

      <div role="tablist" aria-label="고르는 방법" className={styles.tabs}>
        {tabs.map((t) => (
          <button
            type="button"
            key={t.id}
            role="tab"
            aria-selected={t.id === step}
            className={`${styles.tab} ${t.id === step ? styles.tabOn : ''}`}
            onClick={() => onStep(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {step === 'list' ? <Recommend perMeal={perMeal} onPick={onPick} /> : <MapTab perMeal={perMeal} onPick={onPick} />}

      <div className={styles.foot}>
        <button type="button" className={styles.stuck} onClick={() => onStep('roulette')}>
          <WheelIcon size={18} />
          못 고르겠어요
        </button>
        <button type="button" className={`${ui.primary} ${ui.secondary} ${styles.footBtn}`} onClick={() => onStep('input')}>
          직접 입력
        </button>
      </div>
    </div>
  );
}

/**
 * 예산 안 메뉴가 있는 식당을 가까운 순으로. 카드에는 각 가게의 대표 메뉴를 보여 주고,
 * 대표 메뉴가 어제와 다른 종류(국물·면·밥)인 곳을 앞에 둔다. 하나도 없으면 가장 싼 곳들.
 */
function Recommend({ perMeal, onPick }: { perMeal: number; onPick: (place: Place, menu: Menu) => void }) {
  const { meals } = useBudget();
  const profile = useProfile();
  const tip = suggestToday(meals);
  const fits = PLACES.filter((p) => bestMenu(p, perMeal).fits);
  const list = (
    fits.length
      ? fits.sort(
          (a, b) =>
            Number(!matchesTheme(mainMenu(a), tip)) - Number(!matchesTheme(mainMenu(b), tip)) ||
            a.walk - b.walk ||
            cheapestPrice(a) - cheapestPrice(b),
        )
      : [...PLACES].sort((a, b) => cheapestPrice(a) - cheapestPrice(b))
  ).slice(0, fits.length ? MAX_PLACES : 3);
  const showTip = tip && list.some((p) => matchesTheme(mainMenu(p), tip));
  const character = profile ? characterOf(profile.character) : CHARACTERS[1];

  return (
    <div className={styles.list}>
      {showTip && (
        <div className={styles.tip}>
          <Image src={character.img} alt="" unoptimized className={styles.tipImg} />
          <span>
            어제 <b>{tip.cat}</b>을 먹어서 오늘은 {tip.theme} 있는 곳을 앞에 뒀어요
          </span>
        </div>
      )}
      {list.map((p) => (
        <PlaceItem key={p.id} place={p} perMeal={perMeal} onPick={(m) => onPick(p, m)} />
      ))}
      <Link href="/recommend" className={styles.more}>
        식당 전체 보기
      </Link>
    </div>
  );
}

/** 지도에서 핀을 눌러 식당을 고른다 */
function MapTab({ perMeal, onPick }: { perMeal: number; onPick: (place: Place, menu: Menu) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const selected = PLACES.find((p) => p.id === selectedId);
  const group = PLACES.filter((p) => groupIds.includes(p.id));

  return (
    <div className={styles.list}>
      <PlaceMap
        places={PLACES}
        perMeal={perMeal}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setGroupIds([]);
        }}
        onSelectGroup={(ids) => {
          setGroupIds(ids);
          setSelectedId(null);
        }}
      />
      {selected && <PlaceItem key={selected.id} place={selected} perMeal={perMeal} onPick={(m) => onPick(selected, m)} />}
      {group.map((p) => (
        <PlaceItem key={p.id} place={p} perMeal={perMeal} onPick={(m) => onPick(p, m)} />
      ))}
    </div>
  );
}

/** 목록에 없는 끼니를 메뉴·가격 직접 입력으로 기록 */
export function MealInput({
  title,
  perMeal,
  onBack,
  onSubmit,
}: {
  title: string;
  perMeal: number;
  onBack: () => void;
  onSubmit: (menu: string, price: number) => void;
}) {
  const [menu, setMenu] = useState('');
  const [digits, setDigits] = useState('');
  const price = Number(digits);
  const over = price - perMeal;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price > 0) onSubmit(menu.trim(), price);
  };

  return (
    <form className={styles.body} onSubmit={submit}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.sub}>다음 한 끼 권장 {won(perMeal)}원</p>
      </div>

      <label className={styles.field}>
        메뉴
        <input
          className={styles.input}
          value={menu}
          onChange={(e) => setMenu(e.target.value)}
          placeholder="예: 김치찌개"
          maxLength={20}
          autoFocus
        />
      </label>

      <label className={styles.field}>
        가격
        <span className={styles.priceBox}>
          <input
            className={styles.input}
            value={digits && won(price)}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7))}
            inputMode="numeric"
            placeholder={won(perMeal)}
          />
          <span className={styles.unit}>원</span>
        </span>
      </label>

      {price > 0 && over > 0 && (
        <p className={styles.hint} style={{ color: C.warn }}>
          권장 금액보다 {won(over)}원 많아요
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className={`${ui.primary} ${ui.secondary}`} onClick={onBack}>
          뒤로
        </button>
        <button type="submit" className={ui.primary} style={{ backgroundColor: C.primary }} disabled={price <= 0}>
          기록하기
        </button>
      </div>
    </form>
  );
}
