'use client';

import React, { useState } from 'react';
import {
  IoCheckbox,
  IoCloseCircle,
  IoDiceOutline,
  IoListOutline,
  IoLocationOutline,
  IoMapOutline,
  IoSearch,
  IoSquareOutline,
} from 'react-icons/io5';

import { ExtraPlaceCard } from '@/components/extra-place-card';
import { PlaceItem } from '@/components/place-item';
import { PlaceMap } from '@/components/place-map';
import { Roulette } from '@/components/roulette';
import { AccentButton, Screen, Sub, Title } from '@/components/ui';
import ui from '@/components/ui.module.css';
import { bestMenu, CATEGORIES, DATA_SOURCE, PLACES, type Area } from '@/data/places';
import { useEat } from '@/hooks/use-eat';
import { useExtraPlaces } from '@/hooks/use-extra-places';
import { won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { C, CAT_EMOJI } from '@/theme';
import styles from './page.module.css';

type SortKey = 'priceAsc' | 'priceDesc' | 'walk';
/** 목록 보기에서 칩으로 골라 쓰는 정렬 방식 */
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'priceAsc', label: '가격 낮은 순' },
  { key: 'priceDesc', label: '가격 높은 순' },
  { key: 'walk', label: '가까운 순' },
];
const AREAS: ('전체' | Area)[] = ['전체', '후문', '정문·인하대역'];

export default function RecommendPage() {
  const { summary: s } = useBudget();
  const { eatCustom } = useEat();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('전체');
  const [area, setArea] = useState<(typeof AREAS)[number]>('전체');
  const [sort, setSort] = useState<SortKey>('priceAsc');
  const [onlyFits, setOnlyFits] = useState(true);
  const [query, setQuery] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roulette, setRoulette] = useState(false);
  const extras = useExtraPlaces();

  const q = query.trim();
  const base = PLACES.filter(
    (p) =>
      (cat === '전체' || p.cat === cat) &&
      (area === '전체' || p.area === area) &&
      (!q || p.name.includes(q) || p.menus.some((m) => m.name.includes(q))),
  );
  const inBudget = base.filter((p) => bestMenu(p, s.todayLeft).fits);
  // 가격은 카드에 보이는 대표 메뉴 값 기준(오늘 예산 안에서 가장 비싼 메뉴)이고, 같으면 가까운 곳이 먼저다
  const shownPrice = (p: (typeof PLACES)[number]) => bestMenu(p, s.todayLeft).menu.price;
  const list = (onlyFits ? inBudget : base).sort((a, b) => {
    const byPrice = shownPrice(a) - shownPrice(b);
    if (sort === 'priceAsc') return byPrice || a.walk - b.walk;
    if (sort === 'priceDesc') return -byPrice || a.walk - b.walk;
    return a.walk - b.walk || byPrice;
  });
  const Check = onlyFits ? IoCheckbox : IoSquareOutline;
  // 앱 데이터에 없는 주변 음식점은 메뉴가 없어서 카테고리·검색어만 맞으면 보여 준다 (위치 구분이 없으니 위치를 고르면 숨긴다)
  const extraList = extras.filter(
    (e) => (cat === '전체' || e.cat === cat) && area === '전체' && (!q || e.name.includes(q)),
  );
  const selected = list.find((p) => p.id === selectedId);
  const selectedExtra = extraList.find((e) => e.id === selectedId);

  return (
    <Screen>
      <Title>예산 맞춤 맛집</Title>

      <div className={styles.loc}>
        <IoLocationOutline size={20} color={C.primary} aria-hidden />
        <span className={styles.locText}>인하대 주변 {PLACES.length}곳</span>
        <span className={styles.locLimit}>오늘 {won(s.todayLeft)}원 이하</span>
      </div>

      <div className={styles.search}>
        <IoSearch size={18} color={C.muted} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="식당이나 메뉴 검색 (예: 국밥, 라멘)"
          aria-label="식당이나 메뉴 검색"
          className={styles.searchInput}
        />
        {query.length > 0 && (
          <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기" className={styles.clear}>
            <IoCloseCircle size={18} color={C.muted} aria-hidden />
          </button>
        )}
      </div>

      <div className={styles.cats} role="group" aria-label="음식 종류">
        {CATEGORIES.map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => setCat(k)}
            aria-pressed={k === cat}
            aria-label={k}
            title={k}
            className={`${styles.cat} ${k === cat ? styles.catOn : ''}`}>
            <span className={styles.catEmoji} aria-hidden>
              {CAT_EMOJI[k]}
            </span>
            <span className={styles.catName} aria-hidden>
              {k}
            </span>
          </button>
        ))}
      </div>
      <div className={styles.chips}>
        {AREAS.map((k) => (
          <Chip key={k} label={k === '전체' ? '모든 위치' : k} on={k === area} onPress={() => setArea(k)} small />
        ))}
      </div>

      <div className={ui.row}>
        <button
          type="button"
          role="checkbox"
          aria-checked={onlyFits}
          onClick={() => setOnlyFits(!onlyFits)}
          className={styles.check}>
          <Check size={20} color={onlyFits ? C.primary : C.muted} aria-hidden />
          <Sub>
            예산 안만 ({inBudget.length}/{base.length})
          </Sub>
        </button>
        <div className={styles.tools}>
          <button type="button" onClick={() => setShowMap(!showMap)} aria-pressed={showMap} className={styles.viewBtn}>
            {showMap ? <IoListOutline size={16} aria-hidden /> : <IoMapOutline size={16} aria-hidden />}
            {showMap ? '목록' : '지도'}
          </button>
        </div>
      </div>

      {!showMap && (
        <>
          <div className={styles.chips} role="group" aria-label="정렬">
            {SORTS.map((o) => (
              <Chip key={o.key} label={o.label} on={o.key === sort} onPress={() => setSort(o.key)} small />
            ))}
          </div>
          <Sub>식당을 누르면 메뉴가 펼쳐져요.</Sub>
        </>
      )}

      {showMap && (
        <>
          <PlaceMap
            places={list}
            extras={extraList}
            selectedId={selected?.id ?? selectedExtra?.id ?? null}
            onSelect={setSelectedId}
          />
          <Sub>가까운 식당은 &quot;N곳&quot; 핀으로 합쳐져 있어요. 핀을 누르거나 20m 축척까지 확대하면 식당 이름으로 풀려요. 파란색은 메뉴를 볼 수 있는 식당, 회색·흰색은 카카오 지도에서 찾은 다른 음식점이에요.</Sub>
          {selected && <PlaceItem key={selected.id} place={selected} limit={s.todayLeft} />}
          {selectedExtra && <ExtraPlaceCard key={selectedExtra.id} place={selectedExtra} />}
        </>
      )}

      {!showMap && (
        <div className={styles.list}>
          {list.length ? (
            list.map((p) => <PlaceItem key={p.id} place={p} limit={s.todayLeft} />)
          ) : (
            <p className={styles.empty}>
              {onlyFits ? '조건에 맞으면서 예산 안인 곳이 없어요.\n"예산 안만" 체크를 풀어 보세요.' : '조건에 맞는 곳이 없어요.'}
            </p>
          )}
        </div>
      )}

      <AccentButton label="못 고르겠으면 룰렛" icon={IoDiceOutline} onPress={() => setRoulette(true)} />
      <Sub style={{ textAlign: 'center' }}>가격 정보: {DATA_SOURCE} · 실제 가격은 다를 수 있어요</Sub>

      {roulette && (
        <Roulette
          limit={s.todayLeft}
          onClose={() => setRoulette(false)}
          onEat={(name, price) => {
            eatCustom(name, price);
            setRoulette(false);
          }}
        />
      )}
    </Screen>
  );
}

function Chip({ label, on, onPress, small }: { label: string; on: boolean; onPress: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={on}
      className={`${styles.chip} ${small ? styles.chipSmall : ''} ${on ? styles.chipOn : ''}`}>
      {label}
    </button>
  );
}
