'use client';

import React, { useEffect, useRef, useState } from 'react';
import { IoChevronBack, IoClose, IoRefresh, IoShuffle } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import type { Menu, Place } from '@/data/places';
import { won } from '@/lib/budget';
import { C, CAT_COLORS } from '@/theme';
import styles from './roulette.module.css';

/** 룰렛 한 칸: 식당 하나와 그 식당에서 예산 안에 먹을 수 있는 메뉴 하나 */
type Slot = { place: Place; menu: Menu };

/** 칸이 너무 많으면 글씨를 못 읽어서 최대 8칸 */
const MAX_SLOTS = 8;
const SPIN_MS = 4200;
const SPIN_MS_REDUCED = 600;

// 칸 색: 파랑/연파랑을 번갈아 쓰고, 칸 수가 홀수면 마지막 칸만 다른 색 (첫 칸과 같은 색이 붙지 않게)
const FILL = [C.primary, C.primarySoft];
const FILL_LAST_ODD = C.orangeSoft;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const fitMenus = (place: Place, perMeal: number) => place.menus.filter((m) => m.price <= perMeal);

/** 예산 안 메뉴가 있는 식당 중에서 무작위로 최대 8곳을 고르고, 식당마다 예산 안 메뉴 하나를 무작위로 정한다. */
function makeSlots(places: Place[], perMeal: number): Slot[] {
  const fits = places.map((place) => ({ place, menus: fitMenus(place, perMeal) })).filter((x) => x.menus.length > 0);
  return shuffle(fits)
    .slice(0, MAX_SLOTS)
    .map(({ place, menus }) => ({ place, menu: menus[Math.floor(Math.random() * menus.length)] }));
}

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** 추천 탭처럼 따로 띄울 때: 창(Modal) + 룰렛 */
export function Roulette(props: { places: Place[]; perMeal: number; onEat: (place: Place, menu: Menu) => void; onClose: () => void }) {
  return (
    <Modal onClose={props.onClose}>
      <RoulettePanel {...props} />
    </Modal>
  );
}

/**
 * "오늘 뭐 먹지?" 룰렛. 예산 안 식당으로 돌림판을 만들고, 멈춘 칸을 보여준다.
 * 예산에서 빠지는 건 결과를 보고 "이걸로 먹기"를 눌렀을 때뿐이다.
 * onBack 이 있으면 (밥먹기 창 안에서 쓸 때) 뒤로 가기 버튼을 보여준다.
 */
export function RoulettePanel({
  places,
  perMeal,
  onEat,
  onClose,
  onBack,
}: {
  places: Place[];
  perMeal: number;
  onEat: (place: Place, menu: Menu) => void;
  onClose: () => void;
  onBack?: () => void;
}) {
  const [slots, setSlots] = useState<Slot[]>(() => makeSlots(places, perMeal));
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Slot | null>(null);
  const [duration, setDuration] = useState(SPIN_MS);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const n = slots.length;
  const seg = n ? 360 / n : 360;
  const fitCount = places.filter((p) => fitMenus(p, perMeal).length > 0).length;

  const spin = () => {
    if (spinning || !n) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduced ? SPIN_MS_REDUCED : SPIN_MS;
    const idx = Math.floor(Math.random() * n);
    // idx 칸의 가운데(살짝 흔들어서)가 위쪽 화살표에 오도록 돌린다
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const target = 360 - (idx * seg + seg / 2 + jitter);
    const now = ((rotation % 360) + 360) % 360;
    const extra = (((target - now) % 360) + 360) % 360;
    setDuration(ms);
    setRotation(rotation + (reduced ? 360 : 360 * 6) + extra);
    setResult(null);
    setSpinning(true);
    timer.current = setTimeout(() => {
      setSpinning(false);
      setResult(slots[idx]);
    }, ms);
  };

  const reshuffle = () => {
    if (spinning) return;
    setSlots(makeSlots(places, perMeal));
    setResult(null);
  };

  const R = 140; // 돌림판 반지름 (SVG 좌표)
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(R * Math.cos(rad)).toFixed(2)} ${(R * Math.sin(rad)).toFixed(2)}`;
  };

  const resultCat = result ? CAT_COLORS[result.place.cat] : null;

  return (
    <div className={styles.body}>
      <div className={styles.head}>
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="뒤로" className={styles.iconBtn}>
            <IoChevronBack size={22} aria-hidden />
          </button>
        ) : (
          <span className={styles.iconSpacer} />
        )}
        <h2 className={styles.title}>오늘 뭐 먹지? 룰렛</h2>
        <button type="button" onClick={onClose} aria-label="닫기" className={styles.iconBtn}>
          <IoClose size={22} aria-hidden />
        </button>
      </div>

      {!n ? (
        <p className={styles.empty}>
          지금 한 끼 권장 금액({won(perMeal)}원) 안에서 먹을 수 있는 곳이 없어요.{'\n'}필터를 바꾸거나 예산을 확인해 보세요.
        </p>
      ) : (
        <>
          <p className={styles.sub}>
            한 끼 {won(perMeal)}원 안에서 먹을 수 있는 {fitCount > n ? `${fitCount}곳 중 ${n}곳` : `${n}곳`}으로 돌려요
          </p>

          <div className={styles.wheelWrap}>
            <span className={styles.pointer} aria-hidden />
            <svg
              viewBox={`${-R - 4} ${-R - 4} ${2 * R + 8} ${2 * R + 8}`}
              className={styles.wheel}
              style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${duration}ms` }}
              aria-hidden>
              <circle r={R + 3} fill={C.ink} />
              {slots.map((s, i) => {
                const a0 = i * seg;
                const mid = a0 + seg / 2;
                const fill = n > 1 && n % 2 === 1 && i === n - 1 ? FILL_LAST_ODD : FILL[i % 2];
                const dark = fill === C.primary;
                const flip = mid > 180; // 왼쪽 절반은 글씨가 뒤집히지 않게
                const nameLen = n <= 4 ? 9 : 7;
                return (
                  <g key={s.place.id}>
                    {n === 1 ? (
                      <circle r={R} fill={fill} />
                    ) : (
                      <path
                        d={`M0 0 L${point(a0)} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${point(a0 + seg)} Z`}
                        fill={fill}
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    )}
                    <g transform={`rotate(${mid - 90}) translate(${R * 0.6} 0) rotate(${flip ? 180 : 0})`}>
                      <text textAnchor="middle" y={-3} className={styles.label} fill={dark ? '#fff' : C.ink}>
                        {short(s.place.name, nameLen)}
                      </text>
                      <text textAnchor="middle" y={12} className={styles.price} fill={dark ? '#DCEBFF' : C.muted}>
                        {won(s.menu.price)}원
                      </text>
                    </g>
                  </g>
                );
              })}
              <circle r={26} fill="#fff" stroke={C.line} strokeWidth={2} />
            </svg>
            <button type="button" onClick={spin} disabled={spinning} className={styles.hub} aria-label="룰렛 돌리기">
              {spinning ? '…' : 'GO'}
            </button>
          </div>

          <div aria-live="polite" className={styles.resultArea}>
            {spinning && <p className={styles.sub}>두구두구…</p>}
            {result && resultCat && (
              <div className={styles.result}>
                <span className={styles.cat} style={{ backgroundColor: resultCat.bg, color: resultCat.fg }}>
                  {result.place.cat}
                </span>
                <p className={styles.resultName}>{result.place.name}</p>
                <p className={styles.resultMenu}>
                  {result.menu.name} · <b>{won(result.menu.price)}원</b>
                </p>
                <p className={styles.resultMeta}>
                  {result.place.area} · 도보 약 {result.place.walk}분{result.place.hours ? ` · ${result.place.hours}` : ''}
                </p>
              </div>
            )}
          </div>

          {result ? (
            <div className={styles.actions}>
              <button type="button" className={styles.eat} onClick={() => onEat(result.place, result.menu)}>
                이걸로 먹기 · {won(result.menu.price)}원 차감
              </button>
              <button type="button" className={styles.ghost} onClick={spin}>
                <IoRefresh size={16} aria-hidden /> 다시 돌리기
              </button>
            </div>
          ) : (
            <button type="button" className={styles.eat} onClick={spin} disabled={spinning}>
              {spinning ? '돌아가는 중…' : '룰렛 돌리기'}
            </button>
          )}

          {fitCount > n && (
            <button type="button" className={styles.reshuffle} onClick={reshuffle} disabled={spinning}>
              <IoShuffle size={15} aria-hidden /> 다른 식당으로 바꾸기
            </button>
          )}
        </>
      )}
    </div>
  );
}
