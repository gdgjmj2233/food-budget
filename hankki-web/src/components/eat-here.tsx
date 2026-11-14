'use client';

import React, { useId, useState } from 'react';
import { IoAdd, IoRemove } from 'react-icons/io5';

import type { Menu } from '@/data/places';
import { useEat } from '@/hooks/use-eat';
import { useBudget } from '@/store/budget-store';
import { EXTRA_KINDS, isExtraKind, KIND_LABEL, kindNow, MAIN_KINDS, won, type MealKind } from '@/lib/budget';
import { C, KIND_COLORS } from '@/theme';
import styles from './eat-here.module.css';
import ui from './ui.module.css';

/**
 * 기록 항목 고르기. 첫 줄은 아침·점심·저녁·기타이고, 기타를 누르면 둘째 줄에서 야식·간식·음료·이외 중 하나를 고른다.
 * 고른 칸은 기록 탭의 항목 표시와 같은 색(KIND_COLORS)으로 보여 준다.
 * 밥먹기 창, 기록 고치기, 식당 카드의 "여기서 밥먹기", 학식 탭이 같이 쓴다.
 */
export function KindPicker({ value, onChange }: { value: MealKind; onChange: (kind: MealKind) => void }) {
  const labelId = useId();
  const extra = isExtraKind(value);
  const chip = (key: string, label: string, color: MealKind, on: boolean, onPress: () => void, sub = false) => (
    <button
      type="button"
      key={key}
      role="radio"
      aria-checked={on}
      onClick={onPress}
      className={`${sub ? styles.subKind : styles.kind} ${on ? styles.kindOn : ''}`}
      style={on ? { borderColor: KIND_COLORS[color].fg, backgroundColor: KIND_COLORS[color].bg, color: KIND_COLORS[color].fg } : undefined}>
      {label}
    </button>
  );
  return (
    <div className={styles.kindField}>
      <span className={styles.kindLabel} id={labelId}>
        항목
      </span>
      <div className={styles.kinds} role="radiogroup" aria-labelledby={labelId}>
        {MAIN_KINDS.map((k) => chip(k, KIND_LABEL[k], k, k === value, () => onChange(k)))}
        {/* 기타를 처음 누르면 둘째 줄 첫 항목(야식)을 골라 둔다 */}
        {chip('extra', '기타', 'etc', extra, () => !extra && onChange(EXTRA_KINDS[0]))}
      </div>
      {extra && (
        <div className={styles.subKinds} role="radiogroup" aria-label="기타 항목">
          {EXTRA_KINDS.map((k) => chip(k, KIND_LABEL[k], k, k === value, () => onChange(k), true))}
        </div>
      )}
    </div>
  );
}

/** 지금 시각에 맞는 항목 (10시 반 전 아침, 15시 전 점심, 21시 전 저녁, 그 밖은 기타 > 야식) */
export const defaultKind = (): MealKind => kindNow();

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
 * pickKind 를 주면 맨 위에서 항목(아침·점심·저녁·기타)을 골라 같이 기록한다. 밥먹기 창처럼 바깥에서 항목을 고르면 주지 않는다.
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
  pickKind = false,
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
  pickKind?: boolean;
}) {
  const { eatAt } = useEat();
  const { restDay } = useBudget().summary;
  const { items, change, countOf, total } = useTray();
  const [kind, setKind] = useState<MealKind>(defaultKind);
  const [digits, setDigits] = useState('');
  const customPrice = Number(digits);
  // 주말이라 오늘 편성된 예산이 없는 날은 "오늘 남은 금액보다 많아요"를 보여 주지 않는다
  const over = limit === undefined || restDay ? 0 : total - limit;

  const addCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrice <= 0) return;
    change({ name: CUSTOM_NAME, price: customPrice }, 1);
    setDigits('');
  };

  const submit = () => {
    if (!items.length) return;
    if (onSubmit) onSubmit(menuText(items), total);
    else if (eatAt(name, menuText(items), total, placeId, pickKind ? kind : undefined)) onClose?.();
  };

  return (
    <div className={styles.panel}>
      {pickKind && <KindPicker value={kind} onChange={setKind} />}
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
                  <span className={styles.menuPrice}>
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
