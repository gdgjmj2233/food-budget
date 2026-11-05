'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { IoAdd, IoChevronBack, IoClose, IoRestaurantOutline } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { CHARACTERS, characterOf } from '@/data/characters';
import type { Place } from '@/data/places';
import { won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { useProfile } from '@/store/profile-store';
import { C, CAT_EMOJI } from '@/theme';
import styles from './roulette.module.css';

/** 룰렛 한 칸. 추천받은 칸에는 식당 정보가 붙고, 직접 넣은 칸은 이름만 있다. */
type Entry = { id: string; name: string; place?: Place };

type RouletteProps = {
  places: Place[];
  perMeal: number;
  onEat: (name: string, price: number) => void;
  onClose: () => void;
};

/** 칸이 너무 많으면 글씨를 못 읽어서 최대 8칸 */
const MAX_SLOTS = 8;
/** 후보가 2개는 있어야 돌리는 의미가 있다 */
const MIN_SLOTS = 2;
const SPIN_MS = 4200;
const SPIN_MS_REDUCED = 600;

// 칸 색: 파랑/연파랑을 번갈아 쓰고, 칸 수가 홀수면 마지막 칸만 다른 색 (첫 칸과 같은 색이 붙지 않게)
const FILL = [C.primary, C.primarySoft];
const FILL_LAST_ODD = C.accentSoft;

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** 추천 탭처럼 따로 띄울 때: 창(Modal) + 룰렛 */
export function Roulette(props: RouletteProps) {
  return (
    <Modal sheet onClose={props.onClose}>
      <RoulettePanel {...props} />
    </Modal>
  );
}

/**
 * "오늘 뭐 먹지?" 룰렛. 빈 돌림판에서 시작해 식당을 추천받거나 후보를 직접 적어서 칸을 채우고, 멈춘 칸을 보여준다.
 * 예산에서 빠지는 건 결과를 보고 가격을 적어 "이걸로 먹기"를 눌렀을 때뿐이다.
 * onBack 이 있으면 (밥먹기 창 안에서 쓸 때) 뒤로 가기 버튼을 보여준다.
 */
export function RoulettePanel({ places, perMeal, onEat, onClose, onBack }: RouletteProps & { onBack?: () => void }) {
  const { perMealAfter } = useBudget();
  const profile = useProfile();
  const character = profile ? characterOf(profile.character) : CHARACTERS[0];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState('');
  const [digits, setDigits] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Entry | null>(null);
  const [duration, setDuration] = useState(SPIN_MS);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const n = entries.length;
  const seg = n ? 360 / n : 360;
  const name = draft.trim();
  const duplicate = entries.some((e) => e.name === name);
  const full = n >= MAX_SLOTS;
  const canAdd = !!name && !duplicate && !full;
  // 적어 놓고 "추가"를 안 눌렀어도 빠뜨리지 않고 같이 돌린다
  const wheel = canAdd ? [...entries, { id: `custom:${name}`, name }] : entries;
  const canSpin = !spinning && wheel.length >= MIN_SLOTS;
  const fits = places.filter((p) => p.menus.some((m) => m.price <= perMeal));
  const candidates = fits.filter((p) => !entries.some((e) => e.name === p.name));
  const price = Number(digits);

  const spin = () => {
    if (!canSpin) return;
    const angle = 360 / wheel.length;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduced ? SPIN_MS_REDUCED : SPIN_MS;
    const idx = Math.floor(Math.random() * wheel.length);
    // idx 칸의 가운데(살짝 흔들어서)가 위쪽 화살표에 오도록 돌린다
    const jitter = (Math.random() - 0.5) * angle * 0.6;
    const target = 360 - (idx * angle + angle / 2 + jitter);
    const now = ((rotation % 360) + 360) % 360;
    const extra = (((target - now) % 360) + 360) % 360;
    setEntries(wheel);
    setDraft('');
    setDigits('');
    setDuration(ms);
    setRotation(rotation + (reduced ? 360 : 360 * 6) + extra);
    setResult(null);
    setSpinning(true);
    timer.current = setTimeout(() => {
      setSpinning(false);
      setResult(wheel[idx]);
    }, ms);
  };

  /** 예산 안 식당 중 아직 칸에 없는 곳을 무작위로 하나 넣는다 */
  const recommend = () => {
    if (full || !candidates.length) return;
    const place = candidates[Math.floor(Math.random() * candidates.length)];
    setEntries([...entries, { id: place.id, name: place.name, place }]);
  };

  const R = 140; // 돌림판 반지름 (SVG 좌표)
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(R * Math.cos(rad)).toFixed(2)} ${(R * Math.sin(rad)).toFixed(2)}`;
  };

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
        <h2 className={styles.title}>못 고르겠을 땐 룰렛</h2>
        <button type="button" onClick={onClose} aria-label="닫기" className={styles.iconBtn}>
          <IoClose size={22} aria-hidden />
        </button>
      </div>

      <p className={styles.sub}>{n >= MIN_SLOTS ? `${n}칸으로 돌려요` : `후보를 ${MIN_SLOTS}개 이상 넣어 주세요`}</p>

      <div className={styles.wheelWrap}>
        <span className={styles.pointer} aria-hidden />
        <svg
          viewBox={`${-R - 4} ${-R - 4} ${2 * R + 8} ${2 * R + 8}`}
          className={styles.wheel}
          style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${duration}ms` }}
          aria-hidden>
          <circle r={R + 3} fill={C.primary} />
          {!n && <circle r={R} fill={C.primarySoft} />}
          {entries.map((e, i) => {
            const a0 = i * seg;
            const mid = a0 + seg / 2;
            const fill = n > 1 && n % 2 === 1 && i === n - 1 ? FILL_LAST_ODD : FILL[i % 2];
            const dark = fill === C.primary;
            const flip = mid > 180; // 왼쪽 절반은 글씨가 뒤집히지 않게
            const nameLen = n <= 4 ? 9 : 7;
            return (
              <g key={e.id}>
                {n === 1 ? (
                  <circle r={R} fill={fill} />
                ) : (
                  <path
                    d={`M0 0 L${point(a0)} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${point(a0 + seg)} Z`}
                    fill={fill}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
                <g transform={`rotate(${mid - 90}) translate(${R * 0.6} 0) rotate(${flip ? 180 : 0})`}>
                  <text textAnchor="middle" y={4} className={styles.label} fill={dark ? '#fff' : C.ink}>
                    {short(e.name, nameLen)}
                  </text>
                </g>
              </g>
            );
          })}
          <circle r={32} fill="#fff" stroke={C.line} strokeWidth={2} />
        </svg>
        <button type="button" onClick={spin} disabled={!canSpin} className={styles.hub} aria-label="룰렛 돌리기">
          {spinning ? '…' : 'GO'}
        </button>
      </div>

      {spinning || result ? (
        <div aria-live="polite" className={styles.resultArea}>
          {spinning && <p className={styles.sub}>두구두구…</p>}
          {result && (
            <div className={styles.result}>
              <Image src={character.img} alt="" unoptimized className={styles.resultImg} />
              <div className={styles.resultBody}>
                <span className={styles.badge}>오늘은 이거다!</span>
                <p className={styles.resultName}>{result.name}</p>
                {result.place && (
                  <p className={styles.resultMeta}>
                    {CAT_EMOJI[result.place.cat]} {result.place.cat} · {result.place.area.split('·')[0]} · 도보 {result.place.walk}분
                  </p>
                )}
                {price > 0 && <p className={styles.resultMeta}>먹고 나면 다음 한 끼 {won(perMealAfter(price))}원</p>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.editor}>
          <form
            className={styles.addRow}
            onSubmit={(e) => {
              e.preventDefault();
              if (!canAdd) return;
              setEntries(wheel);
              setDraft('');
            }}>
            <input
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={full ? `최대 ${MAX_SLOTS}칸까지 넣을 수 있어요` : '예: 국밥'}
              aria-label="룰렛에 넣을 항목"
              maxLength={20}
              disabled={full}
            />
            <button type="submit" className={styles.addBtn} disabled={!canAdd}>
              <IoAdd size={18} aria-hidden /> 추가
            </button>
          </form>

          {duplicate && (
            <p className={styles.hint} style={{ color: C.warn }}>
              이미 있는 항목이에요
            </p>
          )}

          <button type="button" className={styles.ghost} onClick={recommend} disabled={full || !candidates.length}>
            <IoRestaurantOutline size={16} aria-hidden />
            {fits.length ? `한 끼 ${won(perMeal)}원 안의 식당 추천 받기` : `한 끼 ${won(perMeal)}원 안인 식당이 없어요`}
          </button>

          {n > 0 && (
            <ul className={styles.items}>
              {entries.map((e) => (
                <li key={e.id} className={styles.item}>
                  <span className={styles.itemName}>{e.name}</span>
                  <button
                    type="button"
                    onClick={() => setEntries(entries.filter((x) => x.id !== e.id))}
                    aria-label={`${e.name} 지우기`}
                    className={styles.itemDel}>
                    <IoClose size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result ? (
        <form
            className={styles.actions}
            onSubmit={(e) => {
              e.preventDefault();
              if (price > 0) onEat(result.name, price);
            }}>
            <label className={styles.field}>
              가격을 넣으면 예산에서 빠져요
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
            <button type="submit" className={styles.eat} disabled={price <= 0}>
              {price > 0 ? `이걸로 먹기 · ${won(price)}원 차감` : '이걸로 먹기'}
            </button>
            <div className={styles.again}>
              <button type="button" className={styles.ghost} onClick={spin}>
                다시 돌리기
              </button>
              <button type="button" className={styles.ghost} onClick={() => setResult(null)}>
                칸 고치기
              </button>
            </div>
        </form>
      ) : (
        <div className={styles.actions}>
          <button type="button" className={styles.eat} onClick={spin} disabled={!canSpin}>
            {spinning ? '돌아가는 중…' : '룰렛 돌리기'}
          </button>
        </div>
      )}
    </div>
  );
}
