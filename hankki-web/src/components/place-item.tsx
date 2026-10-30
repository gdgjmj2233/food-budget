'use client';

import React, { useState } from 'react';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

import { bestMenu, type Menu, type Place } from '@/data/places';
import { PlaceNote, BudgetPreview } from './budget-tools';
import { won } from '@/lib/budget';
import { C, CAT_COLORS } from '@/theme';
import styles from './place-item.module.css';

/**
 * 식당 카드. 예산 안에서 고를 수 있는 대표 메뉴를 보여주고,
 * 누르면 메뉴 전체가 펼쳐져서 먹은 메뉴를 골라 기록할 수 있다.
 */
export function PlaceItem({
  place,
  perMeal,
  onPick,
}: {
  place: Place;
  perMeal: number;
  onPick: (menu: Menu) => void;
}) {
  const [open, setOpen] = useState(false);
  const { menu, fits } = bestMenu(place, perMeal);
  const cat = CAT_COLORS[place.cat];
  const menus = [...place.menus].sort((a, b) => a.price - b.price);
  const Chevron = open ? IoChevronUp : IoChevronDown;

  return (
    <div className={styles.card} style={{ borderColor: fits ? '#C9DFFB' : '#FAD4D8' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`${place.name}, ${menu.name} ${won(menu.price)}원, ${fits ? '예산 안' : '예산 초과'}. 눌러서 메뉴 보기`}
        className={styles.head}>
        <span className={styles.icon} style={{ backgroundColor: cat.bg, color: cat.fg }}>
          {place.cat}
        </span>
        <span className={styles.body}>
          <span className={styles.name}>{place.name}</span>
          <span className={styles.meta}>
            {place.area} · 도보 약 {place.walk}분 · 메뉴 {place.menus.length}개
          </span>
        </span>
        <span className={styles.right}>
          <span className={styles.menuName}>{menu.name}</span>
          <span className={styles.price}>{won(menu.price)}원</span>
          <span className={styles.tag} style={{ color: fits ? C.primary : C.over }}>
            {fits ? '예산 안' : `+${won(menu.price - perMeal)}원 초과`}
          </span>
        </span>
        <Chevron size={18} color={C.muted} aria-hidden />
      </button>

      {open && (
        <div className={styles.menus}>
          <PlaceNote id={place.id} name={place.name} />
          <p className={styles.address}>{place.address}</p>
          {place.hours && <p className={styles.hours}>영업 {place.hours}</p>}
          {menus.map((m) => {
            const ok = m.price <= perMeal;
            return (
              <button
                type="button"
                key={m.name}
                onClick={() => onPick(m)}
                aria-label={`${m.name} ${won(m.price)}원 먹은 걸로 기록`}
                className={styles.menuRow}>
                <span className={styles.menuRowName}>{m.name}<BudgetPreview price={m.price} /></span>
                <span className={styles.menuRowPrice} style={{ color: ok ? C.ink : C.over }}>
                  {won(m.price)}원
                </span>
                <span className={styles.eatBtn} style={{ backgroundColor: ok ? C.primary : C.muted }}>
                  먹기
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
