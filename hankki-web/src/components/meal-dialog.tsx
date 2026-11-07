'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { IoClose, IoListOutline } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { PlaceItem } from '@/components/place-item';
import { PlaceMap } from '@/components/place-map';
import { RoulettePanel } from '@/components/roulette';
import { GhostButton } from '@/components/ui';
import { CHARACTERS, characterOf } from '@/data/characters';
import { bestMenu, cheapestPrice, PLACES, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { suggestedMenu, suggestToday } from '@/lib/suggest';
import { useBudget } from '@/store/budget-store';
import { useProfile } from '@/store/profile-store';
import { C } from '@/theme';
import styles from './meal-dialog.module.css';
import ui from './ui.module.css';

/** 추천 창에 보여줄 식당 수 */
const MAX_PLACES = 5;
/** 식당 이름으로 찾을 때 보여줄 결과 수 */
const MAX_RESULTS = 4;
/** 입력 창 안 지도 높이(px) */
const MAP_HEIGHT = 240;

type Tab = 'list' | 'roulette';

function WheelIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

/**
 * 밥먹기 창. 추천·룰렛 탭으로 뭘 먹을지 정하고, 먹은 건 식당을 고른 뒤 메뉴·가격을 입력해서 기록한다.
 * 열 때마다 새로 그려서 입력값이 비어 있다.
 */
export function MealDialog({
  limit,
  onClose,
  onSubmit,
}: {
  limit: number;
  onClose: () => void;
  onSubmit: (menu: string, price: number, place?: Place) => void;
}) {
  const [tab, setTab] = useState<Tab>('list');
  const [inputting, setInputting] = useState(false);
  const [entries, setEntries] = useState<string[]>([]);

  return (
    <Modal sheet onClose={onClose}>
      {inputting ? (
        <MealInput title="직접 입력" limit={limit} onBack={() => setInputting(false)} onSubmit={onSubmit} />
      ) : (
        <Choose
          tab={tab}
          limit={limit}
          entries={entries}
          onTab={setTab}
          onInput={() => setInputting(true)}
          onEntries={setEntries}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function Choose({
  tab,
  limit,
  entries,
  onTab,
  onInput,
  onEntries,
  onClose,
}: {
  tab: Tab;
  limit: number;
  entries: string[];
  onTab: (tab: Tab) => void;
  onInput: () => void;
  onEntries: (entries: string[]) => void;
  onClose: () => void;
}) {
  const hasFits = PLACES.some((p) => bestMenu(p, limit).fits);
  const tabs = [
    { id: 'list', label: '추천', icon: <IoListOutline size={16} aria-hidden /> },
    { id: 'roulette', label: '룰렛', icon: <WheelIcon size={16} /> },
  ] as const;

  return (
    <div className={styles.sheetBody}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>오늘 뭐 먹을까요?</h2>
          <p className={styles.sub}>
            {tab === 'roulette' ? (
              <>
                오늘 남은 금액 <b>{won(limit)}원</b>
              </>
            ) : hasFits ? (
              <>
                오늘 남은 <b>{won(limit)}원</b> 안에서 골랐어요
              </>
            ) : (
              `오늘 남은 ${won(limit)}원 안인 곳이 없어서 가장 싼 곳을 골랐어요`
            )}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <IoClose size={22} aria-hidden />
        </button>
      </div>

      <div role="tablist" aria-label="고르는 방법" className={styles.tabs}>
        {tabs.map((t) => (
          <button
            type="button"
            key={t.id}
            role="tab"
            aria-selected={t.id === tab}
            className={`${styles.tab} ${t.id === tab ? styles.tabOn : ''}`}
            onClick={() => onTab(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && <Recommend limit={limit} />}
      {tab === 'roulette' && <RoulettePanel entries={entries} onEntries={onEntries} />}

      {/* 룰렛은 메뉴를 정하는 데만 쓴다. 먹은 건 추천 탭의 "입력"으로 기록한다 */}
      {tab === 'list' && (
        <div className={styles.foot}>
          <button type="button" className={`${ui.primary} ${ui.secondary} ${styles.footBtn}`} onClick={onInput}>
            입력
          </button>
        </div>
      )}
    </div>
  );
}

/** 예산 안 메뉴가 있는 식당을 가까운 순으로(어제와 다른 메뉴가 있는 곳이 먼저). 하나도 없으면 가장 싼 곳들. */
function Recommend({ limit }: { limit: number }) {
  const { meals } = useBudget();
  const profile = useProfile();
  const tip = suggestToday(meals);
  const fits = PLACES.filter((p) => bestMenu(p, limit).fits);
  const list = (
    fits.length
      ? fits.sort(
          (a, b) =>
            Number(!suggestedMenu(a, limit, tip)) - Number(!suggestedMenu(b, limit, tip)) ||
            a.walk - b.walk ||
            cheapestPrice(a) - cheapestPrice(b),
        )
      : [...PLACES].sort((a, b) => cheapestPrice(a) - cheapestPrice(b))
  ).slice(0, fits.length ? MAX_PLACES : 3);
  const showTip = tip && list.some((p) => suggestedMenu(p, limit, tip));
  const character = profile ? characterOf(profile.character) : CHARACTERS[1];

  return (
    <div className={styles.list}>
      {showTip && (
        <div className={styles.tip}>
          <Image src={character.img} alt="" unoptimized className={styles.tipImg} />
          <span>
            어제 <b>{tip.cat}</b>을 먹어서 오늘은 {tip.theme} 있는 곳을 앞에 뒀어요
          </span>
        </div>
      )}
      {list.map((p) => (
        <PlaceItem key={p.id} place={p} limit={limit} menu={suggestedMenu(p, limit, tip)} />
      ))}
      <Link href="/recommend" className={styles.more}>
        식당 전체 보기
      </Link>
    </div>
  );
}

/**
 * 먹은 것을 기록하는 창. 먼저 지도에서 먹은 식당을 고르고(지도에 없으면 건너뛰고), 메뉴·가격을 적는다.
 * limit 은 오늘 남은 금액이고, 지난 날을 채울 때는 주지 않는다.
 */
export function MealInput({
  title,
  limit,
  onBack,
  onSubmit,
}: {
  title: string;
  limit?: number;
  onBack: () => void;
  onSubmit: (menu: string, price: number, place?: Place) => void;
}) {
  // undefined: 아직 식당을 고르는 중, null: 지도에 없는 곳
  const [place, setPlace] = useState<Place | null>();

  if (place === undefined) return <PlacePicker title={title} onBack={onBack} onPick={setPlace} />;
  return (
    <MenuForm
      title={title}
      limit={limit}
      place={place}
      onBack={() => setPlace(undefined)}
      onSubmit={(menu, price) => onSubmit(menu, price, place ?? undefined)}
    />
  );
}

/** 지도에서 먹은 식당 고르기. 이름으로 찾을 수도 있다 */
function PlacePicker({
  title,
  onBack,
  onPick,
}: {
  title: string;
  onBack: () => void;
  onPick: (place: Place | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const q = query.trim();
  const found = q ? PLACES.filter((p) => p.name.includes(q)) : PLACES;
  const picked = PLACES.find((p) => p.id === pickedId);

  return (
    <div className={`${styles.body} ${styles.scroll}`}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.sub}>어디서 먹었어요? 지도에서 식당을 눌러 주세요</p>
      </div>

      <input
        type="search"
        className={styles.input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="식당 이름으로 찾기"
        aria-label="식당 이름으로 찾기"
      />

      {q && (
        <div className={styles.results}>
          {found.length === 0 && <p className={styles.noResult}>이름이 맞는 식당이 없어요</p>}
          {found.slice(0, MAX_RESULTS).map((p) => (
            <button
              type="button"
              key={p.id}
              aria-pressed={p.id === pickedId}
              className={`${styles.result} ${p.id === pickedId ? styles.resultOn : ''}`}
              onClick={() => setPickedId(p.id)}>
              <span className={styles.resultName}>{p.name}</span>
              <span className={styles.resultWhere}>
                {p.area} · 도보 {p.walk}분
              </span>
            </button>
          ))}
        </div>
      )}

      <PlaceMap places={found} extras={[]} selectedId={pickedId} onSelect={setPickedId} height={MAP_HEIGHT} />

      <GhostButton label="지도에 없는 곳이에요" onPress={() => onPick(null)} />

      <div className={styles.actions}>
        <button type="button" className={`${ui.primary} ${ui.secondary}`} onClick={onBack}>
          뒤로
        </button>
        <button
          type="button"
          className={ui.primary}
          style={{ backgroundColor: C.primary }}
          disabled={!picked}
          onClick={() => picked && onPick(picked)}>
          {picked ? `${picked.name}에서 먹었어요` : '식당을 골라 주세요'}
        </button>
      </div>
    </div>
  );
}

/** 메뉴·가격 적기. 고른 식당이 있으면 그 식당 메뉴를 눌러서 채울 수 있다 */
function MenuForm({
  title,
  limit,
  place,
  onBack,
  onSubmit,
}: {
  title: string;
  limit?: number;
  place: Place | null;
  onBack: () => void;
  onSubmit: (menu: string, price: number) => void;
}) {
  const [menu, setMenu] = useState('');
  const [digits, setDigits] = useState('');
  const price = Number(digits);
  const over = limit === undefined ? 0 : price - limit;
  const menus = place ? [...place.menus].sort((a, b) => a.price - b.price) : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price > 0) onSubmit(menu.trim(), price);
  };

  return (
    <form className={`${styles.body} ${styles.scroll}`} onSubmit={submit}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {limit !== undefined && <p className={styles.sub}>오늘 남은 금액 {won(limit)}원</p>}
      </div>

      {place && (
        <div className={styles.pickedPlace}>
          <span className={styles.resultName}>{place.name}</span>
          <button type="button" className={styles.repick} onClick={onBack}>
            다시 고르기
          </button>
        </div>
      )}

      {menus.length > 0 && (
        <div className={styles.chips} role="group" aria-label={`${place?.name} 메뉴`}>
          {menus.map((m) => {
            const on = menu === m.name && price === m.price;
            return (
              <button
                type="button"
                key={m.name}
                aria-pressed={on}
                className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                onClick={() => {
                  setMenu(m.name);
                  setDigits(String(m.price));
                }}>
                {m.name} {won(m.price)}원
              </button>
            );
          })}
        </div>
      )}

      <label className={styles.field}>
        메뉴
        <input
          className={styles.input}
          value={menu}
          onChange={(e) => setMenu(e.target.value)}
          placeholder={menus[0]?.name ? `예: ${menus[0].name}` : '예: 김치찌개'}
          maxLength={20}
          autoFocus={!place}
        />
      </label>

      <label className={styles.field}>
        가격
        <span className={styles.priceBox}>
          <input
            className={styles.input}
            value={digits && won(price)}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7))}
            inputMode="numeric"
            placeholder={won(limit ?? 0)}
          />
          <span className={styles.unit}>원</span>
        </span>
      </label>

      {price > 0 && over > 0 && (
        <p className={styles.hint} style={{ color: C.warn }}>
          오늘 남은 금액보다 {won(over)}원 많아요
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className={`${ui.primary} ${ui.secondary}`} onClick={onBack}>
          뒤로
        </button>
        <button type="submit" className={ui.primary} style={{ backgroundColor: C.primary }} disabled={price <= 0}>
          기록하기
        </button>
      </div>
    </form>
  );
}
