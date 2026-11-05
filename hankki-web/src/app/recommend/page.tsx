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
  IoSwapVertical,
} from 'react-icons/io5';

import { PlaceItem } from '@/components/place-item';
import { PlaceMap } from '@/components/place-map';
import { PrimaryButton, Screen, Sub, Title } from '@/components/ui';
import ui from '@/components/ui.module.css';
import { bestMenu, CATEGORIES, mainMenuPrice, DATA_SOURCE, PLACES, type Area } from '@/data/places';
import { useEat } from '@/hooks/use-eat';
import { won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { C } from '@/theme';
import styles from './page.module.css';

type SortKey = 'price' | 'walk';
const AREAS: ('전체' | Area)[] = ['전체', '후문', '정문·인하대역'];

export default function RecommendPage() {
  const { summary: s } = useBudget();
  const { pick, pickRandom } = useEat();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('전체');
  const [area, setArea] = useState<(typeof AREAS)[number]>('전체');
  const [sort, setSort] = useState<SortKey>('price');
  const [onlyFits, setOnlyFits] = useState(true);
  const [query, setQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupIds, setGroupIds] = useState<string[]>([]);

  const q = query.trim();
  const base = PLACES.filter(
    (p) =>
      (cat === '전체' || p.cat === cat) &&
      (area === '전체' || p.area === area) &&
      (!q || p.name.includes(q) || p.menus.some((m) => m.name.includes(q))),
  );
  const inBudget = base.filter((p) => bestMenu(p, s.perMeal).fits);
  const list = (onlyFits ? inBudget : base).sort((a, b) =>
    sort === 'price' ? mainMenuPrice(a) - mainMenuPrice(b) || a.walk - b.walk : a.walk - b.walk || mainMenuPrice(a) - mainMenuPrice(b),
  );
  const Check = onlyFits ? IoCheckbox : IoSquareOutline;
  const selected = list.find((p) => p.id === selectedId);
  const group = list.filter((p) => groupIds.includes(p.id));
  const selectOne = (id: string) => {
    setSelectedId(id);
    setGroupIds([]);
  };
  const selectGroup = (ids: string[]) => {
    setGroupIds(ids);
    setSelectedId(null);
  };

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

      <div className={styles.chips}>
        {CATEGORIES.map((k) => (
          <Chip key={k} label={k} on={k === cat} onPress={() => setCat(k)} />
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
            대표 메뉴 예산 안만 ({inBudget.length}/{base.length})
          </Sub>
        </button>
        <div className={styles.tools}>
          {!showMap && (
            <button type="button" onClick={() => setSort(sort === 'price' ? 'walk' : 'price')} className={styles.check}>
              <IoSwapVertical size={16} color={C.ink} aria-hidden />
              <span className={styles.sortText}>{sort === 'price' ? '대표 메뉴 가격순' : '가까운 순'}</span>
            </button>
          )}
          <button type="button" onClick={() => setShowMap(!showMap)} aria-pressed={showMap} className={styles.viewBtn}>
            {showMap ? <IoListOutline size={16} aria-hidden /> : <IoMapOutline size={16} aria-hidden />}
            {showMap ? '목록' : '지도'}
          </button>
        </div>
      </div>

      <Sub>
        {showMap
          ? '핀의 숫자는 대표 메뉴 가격, 흰 핀은 예산 초과예요. "N곳" 핀은 가까운 식당을 묶은 것이라 누르면 확대되거나 목록이 나와요.'
          : '식당을 누르면 메뉴가 펼쳐져요. 먹은 메뉴의 "먹기"를 누르면 예산에서 빠집니다.'}
      </Sub>

      {showMap && (
        <>
          <PlaceMap
            places={list}
            perMeal={s.perMeal}
            selectedId={selected?.id ?? null}
            onSelect={selectOne}
            onSelectGroup={selectGroup}
          />
          {selected && <PlaceItem key={selected.id} place={selected} perMeal={s.perMeal} onPick={(m) => pick(selected, m)} />}
          {group.length > 0 && (
            <div className={styles.list}>
              <Sub>같은 건물에 있는 {group.length}곳</Sub>
              {group.map((p) => (
                <PlaceItem key={p.id} place={p} perMeal={s.perMeal} onPick={(m) => pick(p, m)} />
              ))}
            </div>
          )}
        </>
      )}

      {!showMap && (
        <div className={styles.list}>
          {list.length ? (
            list.map((p) => <PlaceItem key={p.id} place={p} perMeal={s.perMeal} onPick={(m) => pick(p, m)} />)
          ) : (
            <p className={styles.empty}>
              {onlyFits ? '조건에 맞으면서 예산 안인 곳이 없어요.\n"예산 안만" 체크를 풀어 보세요.' : '조건에 맞는 곳이 없어요.'}
            </p>
          )}
        </div>
      )}

      <PrimaryButton label="예산 안에서 자동 선택" icon={IoDiceOutline} color={C.primary} onPress={() => pickRandom(base)} />
      <Sub style={{ textAlign: 'center' }}>가격 정보: {DATA_SOURCE} · 실제 가격은 다를 수 있어요</Sub>
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
