'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { IoClose, IoDiceOutline } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { RoulettePanel } from '@/components/roulette';
import { PLACES } from '@/data/places';
import { won } from '@/lib/budget';
import { C } from '@/theme';
import styles from './meal-dialog.module.css';
import ui from './ui.module.css';

/**
 * 밥먹기 창. 룰렛을 돌리거나 메뉴·가격을 직접 입력한다.
 * 열 때마다 새로 그려서 입력값이 비어 있다.
 */
export function MealDialog({
  perMeal,
  onClose,
  onSubmit,
}: {
  perMeal: number;
  onClose: () => void;
  onSubmit: (menu: string, price: number) => void;
}) {
  const [step, setStep] = useState<'choose' | 'input' | 'roulette'>('choose');

  return (
    <Modal onClose={onClose}>
      {step === 'choose' && (
        <Choose
          perMeal={perMeal}
          onClose={onClose}
          onInput={() => setStep('input')}
          onRoulette={() => setStep('roulette')}
        />
      )}
      {step === 'input' && <Input perMeal={perMeal} onBack={() => setStep('choose')} onSubmit={onSubmit} />}
      {step === 'roulette' && (
        <RoulettePanel places={PLACES} perMeal={perMeal} onEat={onSubmit} onClose={onClose} onBack={() => setStep('choose')} />
      )}
    </Modal>
  );
}

/** 룰렛과 직접 입력 중에서 고른다. */
function Choose({
  perMeal,
  onClose,
  onInput,
  onRoulette,
}: {
  perMeal: number;
  onClose: () => void;
  onInput: () => void;
  onRoulette: () => void;
}) {
  return (
    <div className={styles.body}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>오늘 뭐 먹을까요?</h2>
          <p className={styles.sub}>다음 한 끼 권장 {won(perMeal)}원</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <IoClose size={22} aria-hidden />
        </button>
      </div>

      <div className={styles.foot}>
        <button type="button" className={ui.primary} style={{ backgroundColor: C.primary }} onClick={onRoulette}>
          <IoDiceOutline size={20} aria-hidden />
          못 고르겠으면 룰렛 돌리기
        </button>
        <button type="button" className={`${ui.primary} ${ui.secondary}`} onClick={onInput}>
          직접 입력
        </button>
        <Link href="/recommend" className={styles.more}>
          추천 탭에서 식당 고르기
        </Link>
      </div>
    </div>
  );
}

/** 목록에 없는 끼니를 메뉴·가격 직접 입력으로 기록 */
function Input({
  perMeal,
  onBack,
  onSubmit,
}: {
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
        <h2 className={styles.title}>직접 입력</h2>
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
        <button type="submit" className={ui.primary} style={{ backgroundColor: C.ink }} disabled={price <= 0}>
          기록하기
        </button>
      </div>
    </form>
  );
}
