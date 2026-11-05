'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  IoCheckbox,
  IoCloseCircle,
  IoDiceOutline,
  IoListOutline,
  IoLocationOutline,
  IoMapOutline,
  IoSearch,
  IoSquareOutline,
  IoSwapVertical,
} from 'react-icons/io5';

import { PlaceItem } from '@/components/place-item';
import { PlaceMap } from '@/components/place-map';
import { Roulette } from '@/components/roulette';
import { AccentButton, Screen, Sub, Title } from '@/components/ui';
import ui from '@/components/ui.module.css';
import { bestMenu, CATEGORIES, cheapestPrice, DATA_SOURCE, PLACES, type Area } from '@/data/places';
import { useEat } from '@/hooks/use-eat';
import { won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { C, CAT_EMOJI } from '@/theme';
import styles from './page.module.css';

type SortKey = 'price' | 'walk';
const AREAS: ('전체' | Area)[] = ['전체', '후문', '정문·인하대역'];

export default function RecommendPage() {
  const { summary: s } = useBudget();
  const { eatCustom } = useEat();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('전체');
  const [area, setArea] = useState<(typeof AREAS)[number]>('전체');
  const [sort, setSort] = useState<SortKey>('price');
  const [onlyFits, setOnlyFits] = useState(true);
  const [query, setQuery] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roulette, setRoulette] = useState(false);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [groupSameSpot, setGroupSameSpot] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  const q = query.trim();
  const base = PLACES.filter(
    (p) =>
      (cat === '전체' || p.cat === cat) &&
      (area === '전체' || p.area === area) &&
      (!q || p.name.includes(q) || p.menus.some((m) => m.name.includes(q))),
  );
  const inBudget = base.filter((p) => bestMenu(p, s.perMeal).fits);
  const list = (onlyFits ? inBudget : base).sort((a, b) =>
    sort === 'price' ? cheapestPrice(a) - cheapestPrice(b) || a.walk - b.walk : a.walk - b.walk || cheapestPrice(a) - cheapestPrice(b),
  );
  const Check = onlyFits ? IoCheckbox : IoSquareOutline;
  const selected = list.find((p) => p.id === selectedId);
  const group = list.filter((p) => groupIds.includes(p.id));
  const selectOne = (id: string) => {
    setSelectedId(id);
    setGroupIds([]);
  };
  const selectGroup = (ids: string[], sameSpot: boolean) => {
    setGroupIds(ids);
    setGroupSameSpot(sameSpot);
    setSelectedId(null);
  };

  // 묶음 핀을 누르면 아래 가게 목록이 화면 밖에 있을 수 있어서, 첫 카드가 보일 만큼만 내린다 (지도는 최대한 남긴다)
  useEffect(() => {
    const top = groupRef.current?.getBoundingClientRect().top;
    if (top === undefined) return;
    const visibleBottom = window.innerHeight - 60 - 150; // 하단 탭 + 첫 카드 높이 정도
    if (top > visibleBottom) window.scrollBy({ top: top - visibleBottom, behavior: 'smooth' });
  }, [groupIds]);

  return (
    <Screen>
      <Title>예산 맞춤 맛집</Title>

      <div className={styles.loc}>
        <IoLocationOutline size={20} color={C.primary} aria-hidden />
        <span className={styles.locText}>인하대 주변 {PLACES.length}곳</span>
        <span className={styles.locLimit}>한 끼 {won(s.perMeal)}원 이하</span>
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
            <button type="button" onClick={() => setSort(sort === 'price' ? 'walk' : 'price')} className={styles.check}>
              <IoSwapVertical size={16} color={C.ink} aria-hidden />
              <span className={styles.sortText}>{sort === 'price' ? '가격 낮은 순' : '가까운 순'}</span>
            </button>
          )}
          <button type="button" onClick={() => setShowMap(!showMap)} aria-pressed={showMap} className={styles.viewBtn}>
            {showMap ? <IoListOutline size={16} aria-hidden /> : <IoMapOutline size={16} aria-hidden />}
            {showMap ? '목록' : '지도'}
          </button>
        </div>
      </div>

      {!showMap && <Sub>식당을 누르면 메뉴가 펼쳐져요.</Sub>}

      {showMap && (
        <>
          <PlaceMap
            places={list}
            perMeal={s.perMeal}
            selectedId={selected?.id ?? null}
            onSelect={selectOne}
            onSelectGroup={selectGroup}
          />
          {selected && <PlaceItem key={selected.id} place={selected} perMeal={s.perMeal} />}
          {group.length > 0 && (
            <div ref={groupRef} className={styles.list}>
              <Sub>{groupSameSpot ? `같은 건물에 있는 ${group.length}곳` : `누른 핀에 모인 ${group.length}곳`}</Sub>
              {group.map((p) => (
                <PlaceItem key={p.id} place={p} perMeal={s.perMeal} />
              ))}
            </div>
          )}
        </>
      )}

      {!showMap && (
        <div className={styles.list}>
          {list.length ? (
            list.map((p) => <PlaceItem key={p.id} place={p} perMeal={s.perMeal} />)
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
          perMeal={s.perMeal}
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
