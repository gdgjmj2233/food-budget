'use client';

import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { PlaceMap } from '@/components/place-map';
import { GhostButton } from '@/components/ui';
import { PLACES, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { C } from '@/theme';
import styles from './meal-dialog.module.css';
import ui from './ui.module.css';

/** 식당 이름으로 찾을 때 보여줄 결과 수 */
const MAX_RESULTS = 4;
/** 지도에서 N곳 핀을 눌렀을 때 목록으로 보여줄 식당 수 */
const MAX_GROUP = 6;
/** 입력 창 안 지도 높이(px) */
const MAP_HEIGHT = 240;

/**
 * 밥먹기 창. 먹은 것을 직접 적어서 기록한다: 가게 이름(목록에 있으면 골라서 메뉴를 채울 수 있다), 메뉴, 가격.
 * 열 때마다 새로 그려서 입력값이 비어 있다. limit 은 오늘 남은 금액.
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
  return (
    <Modal sheet onClose={onClose}>
      <DirectInput limit={limit} onClose={onClose} onSubmit={onSubmit} />
    </Modal>
  );
}

function DirectInput({
  limit,
  onClose,
  onSubmit,
}: {
  limit: number;
  onClose: () => void;
  onSubmit: (menu: string, price: number, place?: Place) => void;
}) {
  const [name, setName] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [menu, setMenu] = useState('');
  const [digits, setDigits] = useState('');
  const price = Number(digits);
  const over = price - limit;
  const q = name.trim();
  const suggestions = !place && q ? PLACES.filter((p) => p.name.includes(q)).slice(0, MAX_RESULTS) : [];
  const menus = place ? [...place.menus].sort((a, b) => a.price - b.price) : [];

  const pick = (p: Place | null) => {
    setPlace(p);
    setName(p ? p.name : '');
    setMenu('');
    setDigits('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price <= 0) return;
    if (place) onSubmit(menu.trim(), price, place);
    else onSubmit([q, menu.trim()].filter(Boolean).join(' ') || '식사', price);
  };

  return (
    <form className={`${styles.body} ${styles.scroll}`} onSubmit={submit}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>뭐 먹었어요?</h2>
          <p className={styles.sub}>오늘 남은 금액 {won(limit)}원</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <IoClose size={22} aria-hidden />
        </button>
      </div>

      {place ? (
        <div className={styles.pickedPlace}>
          <span className={styles.resultName}>{place.name}</span>
          <button type="button" className={styles.repick} onClick={() => pick(null)}>
            다시 고르기
          </button>
        </div>
      ) : (
        <label className={styles.field}>
          가게
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="식당 이름 (예: 신전떡볶이)"
            maxLength={20}
            autoFocus
          />
        </label>
      )}

      {suggestions.length > 0 && (
        <div className={styles.chips} role="group" aria-label="이름이 맞는 식당">
          {suggestions.map((p) => (
            <button type="button" key={p.id} className={styles.chip} onClick={() => pick(p)}>
              {p.name}
            </button>
          ))}
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
          placeholder="예: 김치찌개"
          maxLength={20}
        />
      </label>

      <label className={styles.field}>
        가격
        <span className={styles.priceBox}>
          <input
            className={styles.input}
            value={digits && won(price)}
            onChange={(e) => setDigits(e.target.value.replace(/D/g, '').replace(/^0+/, '').slice(0, 7))}
            inputMode="numeric"
            placeholder={won(limit)}
          />
          <span className={styles.unit}>원</span>
        </span>
      </label>

      {place && <p className={styles.hint}>목록 가격은 바뀌었을 수 있어요. 다르면 고쳐서 기록하세요</p>}
      {price > 0 && over > 0 && (
        <p className={styles.hint} style={{ color: C.warn }}>
          오늘 남은 금액보다 {won(over)}원 많아요
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={ui.primary} style={{ backgroundColor: C.primary, flex: 1 }} disabled={price <= 0}>
          기록하기
        </button>
      </div>
    </form>
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
  // 목록에 없는 곳은 찾던 이름을 메뉴 칸에 미리 적어 둔다 (가격을 모르는 곳도 이름·가격만 적으면 된다)
  const [typed, setTyped] = useState('');

  if (place === undefined)
    return (
      <PlacePicker
        title={title}
        onBack={onBack}
        onPick={(p, name) => {
          setTyped(name ?? '');
          setPlace(p);
        }}
      />
    );
  return (
    <MenuForm
      title={title}
      limit={limit}
      place={place}
      initialMenu={typed}
      onBack={() => setPlace(undefined)}
      onSubmit={(menu, price) => onSubmit(menu, price, place ?? undefined)}
    />
  );
}

/** 지도에서 먹은 식당 고르기. 이름으로 찾거나, N곳 핀을 눌러 나온 목록에서 고를 수도 있다 */
function PlacePicker({
  title,
  onBack,
  onPick,
}: {
  title: string;
  onBack: () => void;
  onPick: (place: Place | null, typedName?: string) => void;
}) {
  const { meals } = useBudget();
  const [query, setQuery] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const q = query.trim();
  // 최근에 기록한 식당 3곳 (눌러서 바로 메뉴·가격 입력으로 넘어간다)
  const recent = [...new Set([...meals].sort((a, b) => b.at - a.at).map((m) => m.placeId))]
    .flatMap((id) => PLACES.filter((p) => p.id === id))
    .slice(0, 3);
  const found = q ? PLACES.filter((p) => p.name.includes(q)) : PLACES;
  const picked = PLACES.find((p) => p.id === pickedId);
  // 지도 아래 목록: 검색어가 있으면 이름이 맞는 식당, 없으면 지도에서 누른 N곳 핀 안의 식당
  const options = q ? found : PLACES.filter((p) => groupIds.includes(p.id));
  const shownMax = q ? MAX_RESULTS : MAX_GROUP;

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

      {recent.length > 0 && !q && (
        <div className={styles.quick}>
          <p className={styles.quickLabel}>최근 간 곳</p>
          <div className={styles.chips}>
            {recent.map((p) => (
              <button type="button" key={p.id} className={styles.chip} onClick={() => onPick(p)}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <PlaceMap
        places={found}
        extras={[]}
        selectedId={pickedId}
        onSelect={setPickedId}
        onSelectGroup={setGroupIds}
        height={MAP_HEIGHT}
      />

      {(q || options.length > 0) && (
        <div className={styles.results}>
          {q && found.length === 0 && <p className={styles.noResult}>이름이 맞는 식당이 없어요</p>}
          {options.slice(0, shownMax).map((p) => (
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
          {options.length > shownMax && (
            <p className={styles.noResult}>
              {options.length}곳 중 {shownMax}곳만 보여요. 지도를 더 확대하거나 이름으로 찾아 주세요
            </p>
          )}
        </div>
      )}

      {q && !found.some((p) => p.name === q) && (
        <GhostButton label={`'${q}' 가격 직접 입력해서 기록`} onPress={() => onPick(null, q)} />
      )}
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
  initialMenu = '',
  initialPrice,
  onBack,
  onSubmit,
}: {
  title: string;
  limit?: number;
  place: Place | null;
  initialMenu?: string;
  initialPrice?: number;
  onBack: () => void;
  onSubmit: (menu: string, price: number) => void;
}) {
  const [menu, setMenu] = useState(initialMenu);
  const [digits, setDigits] = useState(initialPrice ? String(initialPrice) : '');
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

      {place && <p className={styles.hint}>가격이 달라졌으면 고쳐서 기록하세요</p>}

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
