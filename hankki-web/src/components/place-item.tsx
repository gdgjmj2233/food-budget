'use client';

import React, { useState } from 'react';
import { IoChevronDown, IoChevronUp, IoStar, IoStarOutline } from 'react-icons/io5';

import { bestMenu, mainMenu, type Menu, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { setRating, useRatings } from '@/store/rating-store';
import { C, CAT_COLORS, CAT_EMOJI } from '@/theme';
import styles from './place-item.module.css';

/**
 * 식당 카드. 가게의 대표 메뉴와 가격을 보여주고 (대표 메뉴가 예산을 넘으면 예산 안 메뉴가 있는지 알려준다),
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
  const menu = mainMenu(place);
  const mainFits = menu.price <= perMeal;
  // 대표 메뉴가 아니어도 예산 안에서 먹을 수 있는 메뉴가 하나라도 있는지 ("예산 안만" 필터와 같은 기준)
  const { fits } = bestMenu(place, perMeal);
  const tag = mainFits ? '예산 안' : fits ? '예산 안 메뉴 있음' : `+${won(menu.price - perMeal)}원 초과`;
  const cat = CAT_COLORS[place.cat];
  // 펼친 메뉴는 대표 메뉴를 맨 위에, 나머지는 싼 순서로
  const menus = [menu, ...place.menus.filter((m) => m !== menu).sort((a, b) => a.price - b.price)];
  const Chevron = open ? IoChevronUp : IoChevronDown;
  const stars = useRatings()[place.id] ?? 0;
  const visits = useBudget().meals.filter((m) => m.placeId === place.id).length;

  return (
    <div className={styles.card} style={{ borderColor: fits ? '#C9DFFB' : '#FAD4D8' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`${place.cat} ${place.name}, 대표 메뉴 ${menu.name} ${won(menu.price)}원, ${tag}. 눌러서 메뉴 보기`}
        className={styles.head}>
        <span className={styles.icon} style={{ backgroundColor: cat.bg, color: cat.fg }} title={place.cat} aria-hidden>
          {CAT_EMOJI[place.cat]}
        </span>
        <span className={styles.body}>
          <span className={styles.name}>{place.name}</span>
          <span className={styles.meta}>
            {stars > 0 && <span className={styles.myStar}>★{stars} · </span>}
            {visits > 0 && `${visits}번 방문 · `}
            {place.area} · 도보 약 {place.walk}분 · 메뉴 {place.menus.length}개
          </span>
        </span>
        <span className={styles.right}>
          <span className={styles.menuName}>{menu.name}</span>
          <span className={styles.price}>{won(menu.price)}원</span>
          <span className={styles.tag} style={{ color: fits ? C.primary : C.over }}>
            {tag}
          </span>
        </span>
        <Chevron size={18} color={C.muted} aria-hidden />
      </button>

      {open && (
        <div className={styles.menus}>
          <p className={styles.address}>{place.address}</p>
          {place.hours && <p className={styles.hours}>영업 {place.hours}</p>}
          <div className={styles.rate} role="group" aria-label="내 별점">
            <span className={styles.rateLabel}>내 별점</span>
            {[1, 2, 3, 4, 5].map((n) => {
              const Star = n <= stars ? IoStar : IoStarOutline;
              return (
                <button
                  type="button"
                  key={n}
                  onClick={() => setRating(place.id, n === stars ? 0 : n)}
                  aria-label={n === stars ? `별점 ${n}점 지우기` : `별점 ${n}점`}
                  aria-pressed={n <= stars}
                  className={styles.starBtn}>
                  <Star size={20} color={n <= stars ? '#FFB400' : C.muted} aria-hidden />
                </button>
              );
            })}
            <span className={styles.rateHint}>4점 이상이면 지도를 멀리서 봐도 보여요</span>
          </div>
          {menus.map((m) => {
            const ok = m.price <= perMeal;
            return (
              <button
                type="button"
                key={m.name}
                onClick={() => onPick(m)}
                aria-label={`${m.name} ${won(m.price)}원 먹은 걸로 기록`}
                className={styles.menuRow}>
                <span className={styles.menuRowName}>
                  {m.name === menu.name && <span className={styles.mainBadge}>대표</span>}
                  {m.name}
                </span>
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
