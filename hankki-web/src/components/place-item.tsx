'use client';

import React, { useState } from 'react';
import { IoChevronDown, IoChevronUp, IoStar, IoStarOutline } from 'react-icons/io5';

import { bestMenu, type Menu, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { setRating, useRatings } from '@/store/rating-store';
import { C, CAT_COLORS, CAT_EMOJI } from '@/theme';
import styles from './place-item.module.css';

/**
 * 식당 카드. 대표 메뉴와 가격을 보여주고, 카드를 누르면 메뉴 전체와 별점이 펼쳐진다.
 * 먹은 건 여기서 기록하지 않고 직접 입력한다.
 * menu 를 주면 예산 안 대표 메뉴 대신 그 메뉴를 보여준다. defaultOpen 을 주면 펼친 채로 시작한다.
 */
export function PlaceItem({
  place,
  limit,
  menu: shownMenu,
  defaultOpen = false,
}: {
  place: Place;
  limit: number;
  menu?: Menu;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const menu = shownMenu ?? bestMenu(place, limit).menu;
  const fits = menu.price <= limit;
  const cat = CAT_COLORS[place.cat];
  const menus = [...place.menus].sort((a, b) => a.price - b.price);
  const Chevron = open ? IoChevronUp : IoChevronDown;
  const stars = useRatings()[place.id] ?? 0;
  const visits = useBudget().meals.filter((m) => m.placeId === place.id).length;

  return (
    <div className={`${styles.card} ${fits ? '' : styles.cardOver}`}>
      <div className={styles.top}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`${place.cat} ${place.name}, ${menu.name} ${won(menu.price)}원, ${fits ? '예산 안' : '예산 초과'}. 눌러서 메뉴 보기`}
          className={styles.head}>
          <span className={styles.icon} style={{ backgroundColor: cat.bg, color: cat.fg }} title={place.cat} aria-hidden>
            {CAT_EMOJI[place.cat]}
          </span>
          <span className={styles.body}>
            <span className={styles.name}>{place.name}</span>
            <span className={styles.menuName}>
              {menu.name}
              {!fits && <b className={styles.tag}> +{won(menu.price - limit)}원 초과</b>}
            </span>
            <span className={styles.meta}>
              <span className={styles.where}>
                {stars > 0 && <span className={styles.myStar}>★{stars} · </span>}
                {visits > 0 && `${visits}번 방문 · `}
                {place.area.split('·')[0]} · 도보 {place.walk}분
              </span>
              <Chevron size={13} aria-hidden />
            </span>
          </span>
        </button>
        <span className={styles.price} style={{ color: fits ? C.ink : C.over }}>
          {won(menu.price)}원
        </span>
      </div>

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
          {menus.map((m) => (
            <div key={m.name} className={styles.menuRow}>
              <span className={styles.menuRowName}>{m.name}</span>
              <span className={styles.menuRowPrice} style={{ color: m.price <= limit ? C.ink : C.over }}>
                {won(m.price)}원
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
