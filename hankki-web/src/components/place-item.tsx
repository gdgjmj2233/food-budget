'use client';

import React, { useRef, useState } from 'react';
import { IoChevronDown, IoChevronUp, IoStar, IoStarOutline } from 'react-icons/io5';

import { bestMenu, mainMenu, type Menu, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { setRating, useRatings } from '@/store/rating-store';
import { C, CAT_COLORS, CAT_EMOJI } from '@/theme';
import { EatHere, EatHereButton, keepCardInView } from './eat-here';
import styles from './place-item.module.css';

/**
 * 식당 카드. 대표 메뉴 이름을 보여주고(가격은 펼친 메뉴 목록에서 본다), 카드를 누르면 메뉴 전체와 별점이 펼쳐진다.
 * canEat 을 주면 펼친 카드에 "여기서 밥먹기"가 생겨서, 메뉴를 눌러 추가하거나 직접 입력해서 바로 기록할 수 있다.
 * 기본은 가게의 대표 메뉴를 보여주고, menu 를 주면 그 메뉴를 보여준다. defaultOpen 을 주면 펼친 채로 시작한다.
 */
export function PlaceItem({
  place,
  limit,
  menu: shownMenu,
  defaultOpen = false,
  canEat = false,
}: {
  place: Place;
  limit: number;
  menu?: Menu;
  defaultOpen?: boolean;
  canEat?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [eating, setEating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeEat = () => {
    setEating(false);
    keepCardInView(cardRef.current);
  };
  const menu = shownMenu ?? mainMenu(place);
  const fits = menu.price <= limit;
  // 대표 메뉴는 비싸도 예산 안에서 먹을 수 있는 다른 메뉴가 있는지 ("예산 안만" 필터와 같은 기준)
  const otherFits = !fits && !shownMenu && bestMenu(place, limit).fits;
  const cat = CAT_COLORS[place.cat];
  // 펼친 메뉴는 보여 주는 메뉴(대표)를 맨 위에, 나머지는 싼 순서로
  const menus = [menu, ...place.menus.filter((m) => m.name !== menu.name).sort((a, b) => a.price - b.price)];
  const Chevron = open ? IoChevronUp : IoChevronDown;
  const stars = useRatings()[place.id] ?? 0;
  const visits = useBudget().meals.filter((m) => m.placeId === place.id).length;

  return (
    <div ref={cardRef} className={`${styles.card} ${fits || otherFits ? '' : styles.cardOver}`}>
      <div className={styles.top}>
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setEating(false);
          }}
          aria-expanded={open}
          aria-label={`${place.cat} ${place.name}, ${shownMenu ? '' : '대표 메뉴 '}${menu.name} ${won(menu.price)}원, ${fits ? '예산 안' : otherFits ? '예산 안 메뉴 있음' : '예산 초과'}. 눌러서 메뉴 보기`}
          className={styles.head}>
          <span className={styles.icon} style={{ backgroundColor: cat.bg, color: cat.fg }} title={place.cat} aria-hidden>
            {CAT_EMOJI[place.cat]}
          </span>
          <span className={styles.body}>
            <span className={styles.name}>{place.name}</span>
            <span className={styles.menuName}>
              {menu.name}
              {!fits && (
                <b className={styles.tag} style={otherFits ? { color: C.primary } : undefined}>
                  {otherFits ? ' · 예산 안 메뉴 있음' : ` +${won(menu.price - limit)}원 초과`}
                </b>
              )}
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
            <span className={styles.rateHint}>4점 이상이면 지도 핀에 ★이 붙어요</span>
          </div>
          {eating ? (
            <EatHere
              name={place.name}
              placeId={place.id}
              menus={menus}
              mainName={shownMenu ? undefined : menu.name}
              limit={limit}
              onClose={closeEat}
            />
          ) : (
            <>
              {menus.map((m) => (
                <div key={m.name} className={styles.menuRow}>
                  <span className={styles.menuRowName}>
                    {m.name === menu.name && !shownMenu && <span className={styles.mainBadge}>대표</span>}
                    {m.name}
                  </span>
                  <span className={styles.menuRowPrice} style={{ color: m.price <= limit ? C.ink : C.over }}>
                    {won(m.price)}원
                  </span>
                </div>
              ))}
              {canEat && <EatHereButton onPress={() => setEating(true)} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
