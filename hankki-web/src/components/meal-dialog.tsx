'use client';

import React, { useEffect, useRef, useState } from 'react';

import { won } from '@/lib/budget';
import { C } from '@/theme';
import styles from './meal-dialog.module.css';
import ui from './ui.module.css';

/** 먹은 메뉴와 가격을 직접 입력하는 창. 열 때마다 새로 그려서 입력값이 비어 있다. */
export function MealDialog({
  perMeal,
  onClose,
  onSubmit,
}: {
  perMeal: number;
  onClose: () => void;
  onSubmit: (menu: string, price: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [menu, setMenu] = useState('');
  const [digits, setDigits] = useState('');
  const price = Number(digits);
  const over = price - perMeal;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price > 0) onSubmit(menu.trim(), price);
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClose={onClose}
      // 바깥 어두운 부분을 누르면 닫는다
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className={styles.body} onSubmit={submit}>
        <div>
          <h2 className={styles.title}>밥먹기</h2>
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
          <button type="button" className={`${ui.primary} ${ui.secondary}`} onClick={onClose}>
            취소
          </button>
          <button type="submit" className={ui.primary} style={{ backgroundColor: C.ink }} disabled={price <= 0}>
            기록하기
          </button>
        </div>
      </form>
    </dialog>
  );
}
