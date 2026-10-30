'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { IoClose } from 'react-icons/io5';

import { PlaceItem } from '@/components/place-item';
import { bestMenu, cheapestPrice, PLACES, type Menu, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { C } from '@/theme';
import styles from './meal-dialog.module.css';
import ui from './ui.module.css';

/** 추천 창에 보여줄 식당 수 */
const MAX_PLACES = 5;

/**
 * 밥먹기 창. 먼저 예산 안 식당을 추천하고, 목록에 없으면 메뉴·가격을 직접 입력한다.
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
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<'recommend' | 'input'>('recommend');

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClose={onClose}
      // 바깥 어두운 부분을 누르면 닫는다
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      {step === 'recommend' ? (
        <Recommend perMeal={perMeal} onClose={onClose} onPick={onPick} onInput={() => setStep('input')} />
      ) : (
        <Input perMeal={perMeal} onBack={() => setStep('recommend')} onSubmit={onSubmit} />
      )}
    </dialog>
  );
}

/** 예산 안 메뉴가 있는 식당을 가까운 순으로. 하나도 없으면 가장 싼 곳들. */
function Recommend({
  perMeal,
  onClose,
  onPick,
  onInput,
}: {
  perMeal: number;
  onClose: () => void;
  onPick: (place: Place, menu: Menu) => void;
  onInput: () => void;
}) {
  const fits = PLACES.filter((p) => bestMenu(p, perMeal).fits);
  const list = fits.length
    ? fits.sort((a, b) => a.walk - b.walk || cheapestPrice(a) - cheapestPrice(b)).slice(0, MAX_PLACES)
    : [...PLACES].sort((a, b) => cheapestPrice(a) - cheapestPrice(b)).slice(0, 3);

  return (
    <div className={styles.body}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>오늘 뭐 먹을까요?</h2>
          <p className={styles.sub}>
            {fits.length
              ? `한 끼 ${won(perMeal)}원 안에서 먹을 수 있는 가까운 곳`
              : `한 끼 ${won(perMeal)}원 안인 곳이 없어서 가장 싼 곳을 골랐어요`}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <IoClose size={22} aria-hidden />
        </button>
      </div>

      <div className={styles.list}>
        {list.map((p) => (
          <PlaceItem key={p.id} place={p} perMeal={perMeal} onPick={(m) => onPick(p, m)} />
        ))}
      </div>

      <div className={styles.foot}>
        <button type="button" className={`${ui.primary} ${ui.secondary}`} onClick={onInput}>
          직접 입력
        </button>
        <Link href="/recommend" className={styles.more}>
          추천 탭에서 전체 보기
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
