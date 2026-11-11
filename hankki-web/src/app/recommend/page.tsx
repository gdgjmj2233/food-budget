'use client';

import React, { useState } from 'react';
import {
  IoCheckbox,
  IoChevronDown,
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
import { bestMenu, CATEGORIES, DATA_SOURCE, mainMenu, PLACES, type Area, type Place } from '@/data/places';
import { useExtraPlaces } from '@/hooks/use-extra-places';
import { won } from '@/lib/budget';
import { distanceM, formatDistance } from '@/lib/geo';
import { INHA, type ExtraPlace } from '@/lib/kakao-map';
import { useBudget } from '@/store/budget-store';
import { locationProblem, startLocating, useLocation } from '@/store/location-store';
import { ensurePlacePositions, usePlacePositions } from '@/store/place-positions';
import { useRatings } from '@/store/rating-store';
import { C, CAT_EMOJI } from '@/theme';
import styles from './page.module.css';

type SortKey = 'priceAsc' | 'priceDesc' | 'near' | 'walk' | 'rating';
/** 목록 보기에서 지도 버튼 옆 선택 상자로 골라 쓰는 정렬 방식 */
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'priceAsc', label: '가격 낮은 순' },
  { key: 'priceDesc', label: '가격 높은 순' },
  { key: 'near', label: '내 위치에서 가까운 순' },
  { key: 'walk', label: '학교에서 가까운 순' },
  { key: 'rating', label: '내 별점 높은 순' },
];
/** 목록에 한 번에 보여 주는 식당 수. 주변 음식점까지 합치면 수백 곳이라 나눠서 보여 준다 */
const PAGE_SIZE = 40;

/** 목록 한 줄: 앱 데이터의 식당(메뉴·가격이 있음) 또는 카카오에서 찾은 주변 음식점 */
type Row = { id: string; place?: Place; extra?: ExtraPlace; dist?: number };
const AREAS: ('전체' | Area)[] = ['전체', '후문', '정문·인하대역'];

export default function RecommendPage() {
  const { summary: s } = useBudget();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('전체');
  const [area, setArea] = useState<(typeof AREAS)[number]>('전체');
  const [sort, setSort] = useState<SortKey>('priceAsc');
  const [onlyFits, setOnlyFits] = useState(true);
  const [query, setQuery] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [roulette, setRoulette] = useState(false);
  const [more, setMore] = useState({ key: '', n: PAGE_SIZE });
  const extras = useExtraPlaces();
  const ratings = useRatings();
  const { pos: me, status: locStatus } = useLocation();
  const { positions } = usePlacePositions();

  const q = query.trim();
  const base = PLACES.filter(
    (p) =>
      (cat === '전체' || p.cat === cat) &&
      (area === '전체' || p.area === area) &&
      (!q || p.name.includes(q) || p.menus.some((m) => m.name.includes(q))),
  );
  const inBudget = base.filter((p) => bestMenu(p, s.todayLeft).fits);
  const list = onlyFits ? inBudget : base;
  const Check = onlyFits ? IoCheckbox : IoSquareOutline;
  // 앱 데이터에 없는 주변 음식점은 메뉴가 없어서 카테고리·검색어만 맞으면 보여 준다 (위치 구분이 없으니 위치를 고르면 숨긴다).
  // 예산을 알 수 없어서 "예산 안만"과 상관없이 보여 준다
  const extraList = extras.filter(
    (e) => (cat === '전체' || e.cat === cat) && area === '전체' && (!q || e.name.includes(q)),
  );
  const selected = list.find((p) => p.id === selectedId);
  const selectedExtra = extraList.find((e) => e.id === selectedId);

  const groupPlaces = list.filter((p) => groupIds.includes(p.id));
  const groupExtras = extraList.filter((e) => groupIds.includes(e.id));
  const groupCount = groupPlaces.length + groupExtras.length;

  const selectOne = (id: string) => {
    setSelectedId(id);
    setGroupIds([]);
  };
  const selectGroup = (ids: string[]) => {
    setGroupIds(ids);
    setSelectedId(null);
  };

  // 내 위치를 아직 모르면 "내 위치에서 가까운 순"은 학교에서 가까운 순으로 대신 보여 준다
  const effectiveSort: SortKey = sort === 'near' && !me ? 'walk' : sort;
  const rows: Row[] = [
    ...list.map((p) => ({ id: p.id, place: p, dist: me && positions[p.id] ? distanceM(me, positions[p.id]) : undefined })),
    ...extraList.map((e) => ({ id: e.id, extra: e, dist: me ? distanceM(me, e) : undefined })),
  ];
  const nameOf = (r: Row) => r.place?.name ?? r.extra!.name;
  const byName = (a: Row, b: Row) => nameOf(a).localeCompare(nameOf(b), 'ko');
  // 가격은 카드에 보이는 대표 메뉴 값 기준(오늘 예산 안에서 가장 비싼 메뉴)이고, 같으면 가까운 곳이 먼저다
  // 카드에 보이는 가격 = 가게 대표 메뉴 가격
  const shownPrice = (p: Place) => mainMenu(p).price;
  const stars = (r: Row) => ratings[r.id] ?? 0;
  rows.sort((a, b) => {
    const mixed = effectiveSort === 'near' || effectiveSort === 'rating'; // 이 둘만 주변 음식점을 섞어서 줄 세운다
    if (!mixed && !a.place !== !b.place) return a.place ? -1 : 1; // 나머지는 메뉴·가격이 있는 식당이 먼저
    const ap = a.place;
    const bp = b.place;
    switch (effectiveSort) {
      case 'near':
        return (a.dist ?? Infinity) - (b.dist ?? Infinity) || byName(a, b);
      case 'rating':
        return stars(b) - stars(a) || (!ap !== !bp ? (ap ? -1 : 1) : ap && bp ? ap.walk - bp.walk : byName(a, b));
      case 'priceAsc':
        return ap && bp ? shownPrice(ap) - shownPrice(bp) || ap.walk - bp.walk : byName(a, b);
      case 'priceDesc':
        return ap && bp ? shownPrice(bp) - shownPrice(ap) || ap.walk - bp.walk : byName(a, b);
      default:
        return ap && bp
          ? ap.walk - bp.walk || shownPrice(ap) - shownPrice(bp)
          : distanceM(INHA, a.extra ?? INHA) - distanceM(INHA, b.extra ?? INHA) || byName(a, b);
    }
  });
  const filterKey = [cat, area, q, onlyFits, sort].join('|');
  const shownCount = more.key === filterKey ? more.n : PAGE_SIZE;
  const pickSort = (key: SortKey) => {
    setSort(key);
    if (key === 'near') {
      ensurePlacePositions();
      startLocating();
    }
  };
  const nearHint =
    sort !== 'near'
      ? null
      : locStatus === 'locating'
        ? '내 위치를 찾는 중이에요…'
        : locationProblem(locStatus) && `${locationProblem(locStatus)}. 지금은 학교에서 가까운 순으로 보여 줘요.`;

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
          {!showMap && (
            <label className={styles.sortPick}>
              <span className={styles.srOnly}>정렬</span>
              <select value={sort} onChange={(e) => pickSort(e.target.value as SortKey)} className={styles.sortSelect}>
                {SORTS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <IoChevronDown size={14} aria-hidden />
            </label>
          )}
          <button type="button" onClick={() => setShowMap(!showMap)} aria-pressed={showMap} className={styles.viewBtn}>
            {showMap ? <IoListOutline size={16} aria-hidden /> : <IoMapOutline size={16} aria-hidden />}
            {showMap ? '목록' : '지도'}
          </button>
        </div>
      </div>

      {!showMap && (
        <>
          <Sub>
            식당을 누르면 메뉴가 펼쳐져요.
            {extraList.length > 0 && ' 메뉴 정보가 없는 주변 음식점은 이름과 별점만 보여요.'}
          </Sub>
          {nearHint && <Sub>{nearHint}</Sub>}
        </>
      )}

      {showMap && (
        <>
          <PlaceMap
            places={list}
            extras={extraList}
            selectedId={selected?.id ?? selectedExtra?.id ?? null}
            onSelect={selectOne}
            onSelectGroup={selectGroup}
          />
          <Sub>가까운 식당은 &quot;N곳&quot; 핀으로 합쳐져 있어요. 핀을 누르거나 20m 축척까지 확대하면 식당 이름으로 풀리고, 그래도 겹치는 곳은 🍽️ 핀 하나로 합쳐져요. 파란 점과 종류별 색 핀은 메뉴를 볼 수 있는 식당, 회색은 카카오 지도에서 찾은 다른 음식점이에요.</Sub>
          {(selected || selectedExtra) && (
            <div>
              {selected && <PlaceItem key={selected.id} place={selected} limit={s.todayLeft} defaultOpen />}
              {selectedExtra && <ExtraPlaceCard key={selectedExtra.id} place={selectedExtra} />}
            </div>
          )}
          {groupCount > 0 && (
            <div className={styles.list}>
              <Sub>누른 핀에 모인 {groupCount}곳</Sub>
              {groupPlaces.map((p) => (
                <PlaceItem key={p.id} place={p} limit={s.todayLeft} />
              ))}
              {groupExtras.map((e) => (
                <ExtraPlaceCard key={e.id} place={e} />
              ))}
            </div>
          )}
        </>
      )}

      {!showMap && (
        <div className={styles.list}>
          {rows.length ? (
            <>
              {rows.slice(0, shownCount).map((r) => (
                <div key={r.id}>
                  {effectiveSort === 'near' && r.dist !== undefined && (
                    <p className={styles.dist}>내 위치에서 {formatDistance(r.dist)}</p>
                  )}
                  {r.place ? <PlaceItem place={r.place} limit={s.todayLeft} /> : <ExtraPlaceCard place={r.extra!} />}
                </div>
              ))}
              {rows.length > shownCount && (
                <button type="button" className={styles.moreBtn} onClick={() => setMore({ key: filterKey, n: shownCount + PAGE_SIZE })}>
                  더 보기 ({rows.length - shownCount}곳 남음)
                </button>
              )}
            </>
          ) : (
            <p className={styles.empty}>
              {onlyFits ? '조건에 맞으면서 예산 안인 곳이 없어요.\n"예산 안만" 체크를 풀어 보세요.' : '조건에 맞는 곳이 없어요.'}
            </p>
          )}
        </div>
      )}

      <AccentButton label="못 고르겠으면 룰렛" icon={IoDiceOutline} onPress={() => setRoulette(true)} />
      <Sub style={{ textAlign: 'center' }}>가격 정보: {DATA_SOURCE} · 실제 가격은 다를 수 있어요</Sub>

      {roulette && <Roulette limit={s.todayLeft} onClose={() => setRoulette(false)} />}
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
