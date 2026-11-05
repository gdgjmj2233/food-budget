"use client";

import React, { useState } from "react";
import {
  IoChevronDown,
  IoChevronUp,
  IoStar,
  IoStarOutline,
} from "react-icons/io5";

import { bestMenu, mainMenu, type Menu, type Place } from "@/data/places";
import { won } from "@/lib/budget";
import { useBudget } from "@/store/budget-store";
import { setRating, useRatings } from "@/store/rating-store";
import { C, CAT_COLORS, CAT_EMOJI } from "@/theme";
import styles from "./place-item.module.css";

/**
 * 식당 카드. 대표 메뉴를 바로 "먹기"로 기록할 수 있고,
 * 카드를 누르면 메뉴 전체가 펼쳐져서 다른 메뉴를 고를 수 있다.
 * 기본은 가게의 대표 메뉴를 보여주고, menu 를 주면 그 메뉴를 보여준다.
 */
export function PlaceItem({
  place,
  perMeal,
  menu: shownMenu,
  onPick,
}: {
  place: Place;
  perMeal: number;
  menu?: Menu;
  onPick: (menu: Menu) => void;
}) {
  const [open, setOpen] = useState(false);
  const menu = shownMenu ?? mainMenu(place);
  const fits = menu.price <= perMeal;
  // 대표 메뉴는 비싸도 예산 안에서 먹을 수 있는 다른 메뉴가 있는지 ("예산 안만" 필터와 같은 기준)
  const otherFits = !fits && !shownMenu && bestMenu(place, perMeal).fits;
  const cat = CAT_COLORS[place.cat];
  // 펼친 메뉴는 보여 주는 메뉴(대표)를 맨 위에, 나머지는 싼 순서로
  const menus = [
    menu,
    ...place.menus
      .filter((m) => m.name !== menu.name)
      .sort((a, b) => a.price - b.price),
  ];
  const Chevron = open ? IoChevronUp : IoChevronDown;
  const stars = useRatings()[place.id] ?? 0;
  const visits = useBudget().meals.filter((m) => m.placeId === place.id).length;

  return (
    <div
      className={`${styles.card} ${fits || otherFits ? "" : styles.cardOver}`}
    >
      <div className={styles.top}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`${place.cat} ${place.name}, ${shownMenu ? "" : "대표 메뉴 "}${menu.name} ${won(menu.price)}원, ${fits ? "예산 안" : otherFits ? "예산 안 메뉴 있음" : "예산 초과"}. 눌러서 메뉴 보기`}
          className={styles.head}
        >
          <span
            className={styles.icon}
            style={{ backgroundColor: cat.bg, color: cat.fg }}
            title={place.cat}
            aria-hidden
          >
            {CAT_EMOJI[place.cat]}
          </span>
          <span className={styles.body}>
            <span className={styles.name}>{place.name}</span>
            <span className={styles.menuName}>
              {menu.name}
              {!fits && (
                <b
                  className={styles.tag}
                  style={otherFits ? { color: C.primary } : undefined}
                >
                  {otherFits
                    ? " · 예산 안 메뉴 있음"
                    : ` +${won(menu.price - perMeal)}원 초과`}
                </b>
              )}
            </span>
            <span className={styles.meta}>
              <span className={styles.where}>
                {stars > 0 && (
                  <span className={styles.myStar}>★{stars} · </span>
                )}
                {visits > 0 && `${visits}번 방문 · `}
                {place.area.split("·")[0]} · 도보 {place.walk}분
              </span>
              <Chevron size={13} aria-hidden />
            </span>
          </span>
        </button>
        <div className={styles.side}>
          <span
            className={styles.price}
            style={{ color: fits ? C.ink : C.over }}
          >
            {won(menu.price)}원
          </span>
          <button
            type="button"
            onClick={() => onPick(menu)}
            aria-label={`${menu.name} ${won(menu.price)}원 먹은 걸로 기록`}
            className={styles.eatBtn}
            style={{ backgroundColor: fits ? C.primary : C.muted }}
          >
            먹기
          </button>
        </div>
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
                  aria-label={
                    n === stars ? `별점 ${n}점 지우기` : `별점 ${n}점`
                  }
                  aria-pressed={n <= stars}
                  className={styles.starBtn}
                >
                  <Star
                    size={20}
                    color={n <= stars ? "#FFB400" : C.muted}
                    aria-hidden
                  />
                </button>
              );
            })}
            <span className={styles.rateHint}>
              4점 이상이면 지도를 멀리서 봐도 보여요
            </span>
          </div>
          {menus.map((m) => {
            const ok = m.price <= perMeal;
            return (
              <button
                type="button"
                key={m.name}
                onClick={() => onPick(m)}
                aria-label={`${m.name} ${won(m.price)}원 먹은 걸로 기록`}
                className={styles.menuRow}
              >
                <span className={styles.menuRowName}>
                  {m.name === menu.name && !shownMenu && (
                    <span className={styles.mainBadge}>대표</span>
                  )}
                  {m.name}
                </span>
                <span
                  className={styles.menuRowPrice}
                  style={{ color: ok ? C.ink : C.over }}
                >
                  {won(m.price)}원
                </span>
                <span
                  className={styles.eatBtn}
                  style={{ backgroundColor: ok ? C.primary : C.muted }}
                >
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
