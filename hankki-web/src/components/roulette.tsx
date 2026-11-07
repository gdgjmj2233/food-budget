'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { IoAdd, IoClose } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { CHARACTERS, characterOf } from '@/data/characters';
import { PLACES, type Menu, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { useProfile } from '@/store/profile-store';
import { C } from '@/theme';
import styles from './roulette.module.css';

type RouletteProps = {
  limit: number;
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

/** 결과 아래에 보여 줄 메뉴 수 */
const MAX_MENUS = 6;
const squash = (s: string) => s.replace(/\s/g, '');

type MenuHit = { place: Place; menu: Menu };

/**
 * 룰렛 결과로 먹을 수 있는 메뉴를 찾는다.
 * 그 이름이 들어간 메뉴가 있으면 그 메뉴를 가진 가게들의 메뉴(싼 순), 없으면 가게 이름으로 찾아서 그 가게 메뉴 전부.
 */
function menusFor(result: string): { place?: Place; hits: MenuHit[]; more: number } {
  const q = squash(result);
  if (!q) return { hits: [], more: 0 };
  const all = PLACES.flatMap((p) => p.menus.filter((m) => squash(m.name).includes(q)).map((menu) => ({ place: p, menu }))).sort(
    (a, b) => a.menu.price - b.menu.price,
  );
  if (all.length) return { hits: all.slice(0, MAX_MENUS), more: Math.max(0, all.length - MAX_MENUS) };
  const place = PLACES.find((p) => squash(p.name).includes(q) || q.includes(squash(p.name.split(' ')[0])));
  if (!place) return { hits: [], more: 0 };
  return { place, hits: [...place.menus].sort((a, b) => a.price - b.price).map((menu) => ({ place, menu })), more: 0 };
}

/** 추천 탭처럼 따로 띄울 때: 창(Modal) + 룰렛 */
export function Roulette({ limit, onClose }: RouletteProps & { onClose: () => void }) {
  const [entries, setEntries] = useState<string[]>([]);

  return (
    <Modal sheet onClose={onClose}>
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.iconSpacer} />
          <h2 className={styles.title}>못 고르겠을 땐 룰렛</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className={styles.iconBtn}>
            <IoClose size={22} aria-hidden />
          </button>
        </div>
        <RoulettePanel limit={limit} entries={entries} onEntries={setEntries} />
      </div>
    </Modal>
  );
}

/**
 * "오늘 뭐 먹지?" 룰렛. 빈 돌림판에서 시작해 후보를 직접 적어서 칸을 채우고, 멈춘 칸을 보여준다.
 * 결과가 나오면 그걸 먹을 수 있는 메뉴와 가격을 보여 준다 (가게 이름이면 그 가게 메뉴, 음식이면 그 음식 메뉴).
 * 룰렛에서는 기록하지 않는다. 먹은 건 밥먹기의 "입력"으로 기록한다.
 * 적어 둔 후보(entries)는 밥먹기 창에서 탭을 오가도 남도록 바깥에서 들고 있는다.
 */
export function RoulettePanel({
  limit,
  entries,
  onEntries,
}: RouletteProps & {
  entries: string[];
  onEntries: (entries: string[]) => void;
}) {
  const profile = useProfile();
  const character = profile ? characterOf(profile.character) : CHARACTERS[0];
  const [draft, setDraft] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [duration, setDuration] = useState(SPIN_MS);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const n = entries.length;
  const seg = n ? 360 / n : 360;
  const name = draft.trim();
  const duplicate = entries.includes(name);
  const full = n >= MAX_SLOTS;
  const canAdd = !!name && !duplicate && !full;
  // 적어 놓고 "추가"를 안 눌렀어도 빠뜨리지 않고 같이 돌린다
  const wheel = canAdd ? [...entries, name] : entries;
  const canSpin = !spinning && wheel.length >= MIN_SLOTS;
  const found = result ? menusFor(result) : null;

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
    onEntries(wheel);
    setDraft('');
    setDuration(ms);
    setRotation(rotation + (reduced ? 360 : 360 * 6) + extra);
    setResult(null);
    setSpinning(true);
    timer.current = setTimeout(() => {
      setSpinning(false);
      setResult(wheel[idx]);
    }, ms);
  };

  const R = 140; // 돌림판 반지름 (SVG 좌표)
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(R * Math.cos(rad)).toFixed(2)} ${(R * Math.sin(rad)).toFixed(2)}`;
  };

  return (
    <div className={styles.panel}>
      {!result && <p className={styles.sub}>{n >= MIN_SLOTS ? `${n}칸으로 돌려요` : `후보를 ${MIN_SLOTS}개 이상 넣어 주세요`}</p>}

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
              <g key={e}>
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
                    {short(e, nameLen)}
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
                <p className={styles.resultName}>{result}</p>
                <p className={styles.resultMeta}>
                  {!found?.hits.length
                    ? '근처 식당 메뉴에서 찾지 못했어요'
                    : found.place
                      ? `${found.place.name} 메뉴예요`
                      : `"${result}" 메뉴가 있는 곳이에요 (싼 순)`}
                </p>
              </div>
            </div>
          )}
          {result && !!found?.hits.length && (
            <ul className={styles.menus} aria-label={`${result} 메뉴`}>
              {found.hits.map(({ place, menu }) => (
                <li key={`${place.id}-${menu.name}`} className={styles.menuRow}>
                  <span className={styles.menuName}>
                    {menu.name}
                    {!found.place && <span className={styles.menuPlace}>{place.name}</span>}
                  </span>
                  <span className={styles.menuPrice} style={{ color: menu.price <= limit ? C.ink : C.over }}>
                    {won(menu.price)}원
                  </span>
                </li>
              ))}
              {found.more > 0 && <li className={styles.menuMore}>외 {found.more}개 더 있어요</li>}
            </ul>
          )}
        </div>
      ) : (
        <div className={styles.editor}>
          <form
            className={styles.addRow}
            onSubmit={(e) => {
              e.preventDefault();
              if (!canAdd) return;
              onEntries(wheel);
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

          {n > 0 && (
            <ul className={styles.items}>
              {entries.map((e) => (
                <li key={e} className={styles.item}>
                  <span className={styles.itemName}>{e}</span>
                  <button
                    type="button"
                    onClick={() => onEntries(entries.filter((x) => x !== e))}
                    aria-label={`${e} 지우기`}
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
        <div className={styles.actions}>
          <div className={styles.again}>
            <button type="button" className={styles.ghost} onClick={spin}>
              다시 돌리기
            </button>
            <button type="button" className={styles.ghost} onClick={() => setResult(null)}>
              칸 고치기
            </button>
          </div>
        </div>
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
