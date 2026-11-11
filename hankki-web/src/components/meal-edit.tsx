'use client';

import React, { useState } from 'react';

import { Modal } from '@/components/modal';
import { GhostButton } from '@/components/ui';
import { menuOf, SLOT_LABEL, slotOfMeal, won, type Meal, type MealSlot } from '@/lib/budget';
import { C } from '@/theme';
import styles from './meal-dialog.module.css';
import ui from './ui.module.css';

/** 기록 하나의 이름·메뉴·가격을 고치거나 지우는 창 */
export function MealEdit({
  meal,
  onClose,
  onSave,
  onRemove,
}: {
  meal: Meal;
  onClose: () => void;
  onSave: (patch: Pick<Meal, 'name' | 'menu' | 'price' | 'slot'>) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(meal.name);
  const [menu, setMenu] = useState(menuOf(meal));
  const [digits, setDigits] = useState(meal.price ? String(meal.price) : '');
  const price = Number(digits);
  const [slot, setSlot] = useState<MealSlot>(slotOfMeal(meal));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSave({ name: name.trim(), menu: menu.trim(), price, slot });
  };

  return (
    <Modal onClose={onClose}>
      <form className={styles.body} onSubmit={submit}>
        <h2 className={styles.title}>기록 고치기</h2>

        <div className={styles.field}>
          끼니
          <div className={styles.chips} role="radiogroup" aria-label="끼니">
            {(['lunch', 'dinner'] as const).map((k) => (
              <button
                type="button"
                key={k}
                role="radio"
                aria-checked={slot === k}
                className={`${styles.chip} ${slot === k ? styles.chipOn : ''}`}
                onClick={() => setSlot(k)}>
                {SLOT_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <label className={styles.field}>
          가게
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        </label>

        <label className={styles.field}>
          메뉴
          <input className={styles.input} value={menu} onChange={(e) => setMenu(e.target.value)} maxLength={20} />
        </label>

        <label className={styles.field}>
          가격
          <span className={styles.priceBox}>
            <input
              className={styles.input}
              value={digits && won(price)}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7))}
              inputMode="numeric"
              placeholder="0"
            />
            <span className={styles.unit}>원</span>
          </span>
        </label>

        <div className={styles.actions}>
          <button type="button" className={`${ui.primary} ${ui.secondary}`} onClick={onClose}>
            취소
          </button>
          <button type="submit" className={ui.primary} style={{ backgroundColor: C.primary }} disabled={!name.trim()}>
            저장하기
          </button>
        </div>

        <GhostButton label="이 기록 지우기" onPress={onRemove} />
      </form>
    </Modal>
  );
}
