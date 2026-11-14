'use client';

import React, { useState } from 'react';
import { IoAdd, IoRemove } from 'react-icons/io5';

import type { Menu } from '@/data/places';
import { useEat } from '@/hooks/use-eat';
import { won } from '@/lib/budget';
import { C } from '@/theme';
import styles from './eat-here.module.css';
import ui from './ui.module.css';

/** 담은 메뉴 한 줄. 같은 이름·가격을 다시 담으면 개수만 늘어난다 */
export type TrayItem = { name: string; price: number; count: number };
type Priced = { name: string; price: number };

const keyOf = (m: Priced) => `${m.name}|${m.price}`;

/** 직접 입력은 가격만 받아서, 담을 때 이 이름을 붙인다 */
const CUSTOM_NAME = '기타';

/** 기록에 남길 메뉴 이름. 예: "제육볶음 ×2, 계란찜" */
export const menuText = (items: TrayItem[]) => items.map((i) => (i.count > 1 ? `${i.name} ×${i.count}` : i.name)).join(', ');

/** 담은 메뉴 상태. 식당 카드의 "여기서 밥먹기"와 학식 탭이 같이 쓴다 */
export function useTray() {
  const [items, setItems] = useState<TrayItem[]>([]);
  /** n 만큼 개수를 늘리거나 줄인다. 0개가 되면 뺀다 */
  const change = (m: Priced, n: number) =>
    setItems((prev) => {
      const k = keyOf(m);
      if (!prev.some((i) => keyOf(i) === k)) return n > 0 ? [...prev, { name: m.name, price: m.price, count: n }] : prev;
      return prev.map((i) => (keyOf(i) === k ? { ...i, count: i.count + n } : i)).filter((i) => i.count > 0);
    });
  return {
    items,
    change,
    countOf: (m: Priced) => items.find((i) => keyOf(i) === keyOf(m))?.count ?? 0,
    total: items.reduce((sum, i) => sum + i.price * i.count, 0),
    clear: () => setItems([]),
  };
}

export type Tray = ReturnType<typeof useTray>;

/** 담은 메뉴 목록. 줄마다 −/+ 로 개수를 바꾼다 */
export function TrayList({ items, onChange }: { items: TrayItem[]; onChange: (m: TrayItem, n: number) => void }) {
  return (
    <ul className={styles.trayList}>
      {items.map((i) => (
        <li key={keyOf(i)} className={styles.trayRow}>
          <span className={styles.trayName}>{i.name}</span>
          <span className={styles.trayRight}>
            <span className={styles.stepper}>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => onChange(i, -1)}
                aria-label={i.count > 1 ? `${i.name} 하나 빼기` : `${i.name} 빼기`}>
                <IoRemove size={16} aria-hidden />
              </button>
              <span className={styles.count}>{i.count}</span>
              <button type="button" className={styles.stepBtn} onClick={() => onChange(i, 1)} aria-label={`${i.name} 하나 더`}>
                <IoAdd size={16} aria-hidden />
              </button>
            </span>
            <span className={styles.trayPrice}>{won(i.price * i.count)}원</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 식당 카드 아래의 "여기서 밥먹기" 버튼. soft 는 목록에 많이 나오는 주변 음식점 카드용 연한 버튼 */
export function EatHereButton({ onPress, soft = false }: { onPress: () => void; soft?: boolean }) {
  return (
    <button
      type="button"
      className={`${ui.primary} ${styles.start} ${soft ? styles.soft : ''}`}
      style={soft ? undefined : { backgroundColor: C.primary }}
      onClick={onPress}>
      여기서 밥먹기
    </button>
  );
}

/**
 * 밥먹기 칸을 닫으면 카드가 짧아져서 화면이 아래 식당으로 넘어가 버린다.
 * 카드 윗부분이 화면 위로 올라가 있으면 카드가 다시 보이게 올려 준다
 */
export function keepCardInView(card: HTMLElement | null) {
  requestAnimationFrame(() => {
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
}

/**
 * 먹은 것을 메뉴를 눌러 추가하고, 메뉴판에 없는 건 가격만 직접 입력해서 추가한 뒤 한 번에 기록하는 칸.
 * 식당 카드의 "여기서 밥먹기"와 홈 밥먹기 창(식당을 고른 뒤)이 같이 쓴다.
 * menus 가 비어 있으면(메뉴 정보가 없는 주변 음식점) 직접 입력만 보여 준다.
 * onSubmit 을 주면 직접 기록하지 않고 (메뉴 이름, 합계)를 넘긴다. 없으면 오늘 날짜로 바로 기록하고 onClose 를 부른다.
 * onClose 를 주면 왼쪽에 취소 버튼(cancelLabel)이 생긴다.
 */
export function EatHere({
  name,
  placeId,
  menus,
  mainName,
  limit,
  onClose,
  cancelLabel = '취소',
  onSubmit,
}: {
  name: string;
  placeId?: string;
  menus: Menu[];
  /** 대표 메뉴 이름 ("대표" 표시용) */
  mainName?: string;
  /** 오늘 남은 금액. 지난 날을 기록할 때는 주지 않는다 */
  limit?: number;
  onClose?: () => void;
  cancelLabel?: string;
  onSubmit?: (menu: string, price: number) => void;
}) {
  const { eatAt } = useEat();
  const { items, change, countOf, total } = useTray();
  const [digits, setDigits] = useState('');
  const customPrice = Number(digits);
  const over = limit === undefined ? 0 : total - limit;

  const addCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrice <= 0) return;
    change({ name: CUSTOM_NAME, price: customPrice }, 1);
    setDigits('');
  };

  const submit = () => {
    if (!items.length) return;
    if (onSubmit) onSubmit(menuText(items), total);
    else if (eatAt(name, menuText(items), total, placeId)) onClose?.();
  };

  return (
    <div className={styles.panel}>
      {menus.length > 0 && (
        <>
          <p className={styles.label}>메뉴를 누르면 추가돼요</p>
          <div className={styles.menuList} role="group" aria-label={`${name} 메뉴`}>
            {menus.map((m) => {
              const count = countOf(m);
              return (
                <button
                  type="button"
                  key={keyOf(m)}
                  onClick={() => change(m, 1)}
                  aria-label={`${m.name} ${won(m.price)}원 추가${count ? `, ${count}개 담김` : ''}`}
                  className={`${styles.menuRow} ${count ? styles.menuRowOn : ''}`}>
                  <span className={styles.menuName}>
                    {m.name === mainName && <span className={styles.mainBadge}>대표</span>}
                    {m.name}
                  </span>
                  <span className={styles.menuPrice} style={{ color: limit === undefined || m.price <= limit ? C.ink : C.over }}>
                    {won(m.price)}원
                  </span>
                  <span className={styles.plus} aria-hidden>
                    {count ? `×${count}` : <IoAdd size={16} />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <form className={styles.custom} onSubmit={addCustom}>
        <p className={styles.label}>{menus.length ? '직접 입력' : '먹은 금액을 직접 입력해 주세요'}</p>
        <div className={styles.customRow}>
          <span className={styles.priceBox}>
            <input
              className={styles.input}
              value={digits && won(customPrice)}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7))}
              inputMode="numeric"
              placeholder="가격"
              aria-label="직접 입력할 가격"
            />
            <span className={styles.unit}>원</span>
          </span>
          <button type="submit" className={styles.addBtn} disabled={customPrice <= 0}>
            추가
          </button>
        </div>
      </form>

      {items.length > 0 && (
        <div className={styles.tray}>
          <p className={styles.label}>추가한 메뉴</p>
          <TrayList items={items} onChange={change} />
          <div className={styles.total}>
            <span>합계</span>
            <b>{won(total)}원</b>
          </div>
          {over > 0 && (
            <p className={styles.hint} style={{ color: C.warn }}>
              오늘 남은 금액보다 {won(over)}원 많아요
            </p>
          )}
        </div>
      )}

      <div className={styles.actions}>
        {onClose && (
          <button type="button" className={`${ui.primary} ${ui.secondary} ${styles.actionBtn}`} onClick={onClose}>
            {cancelLabel}
          </button>
        )}
        <button
          type="button"
          className={`${ui.primary} ${styles.actionBtn}`}
          style={{ backgroundColor: C.primary }}
          disabled={!items.length}
          onClick={submit}>
          {items.length ? `${won(total)}원 기록하기` : '기록하기'}
        </button>
      </div>
    </div>
  );
}
