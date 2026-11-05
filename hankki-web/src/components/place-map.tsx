'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { bestMenu, PLACES, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { INHA, loadKakaoMap, locatePlaces } from '@/lib/kakao-map';
import { countVisits, FREQUENT_VISITS, HIGH_RATING, placeTiers, TIER_LABEL, tierForLevel, type Tier } from '@/lib/map-tiers';
import { useBudget } from '@/store/budget-store';
import { setDeclutter, useDeclutter, useRatings } from '@/store/rating-store';
import styles from './place-map.module.css';

type Pos = { lat: number; lng: number };

/**
 * 카카오맵에 식당을 가격 핀으로 찍는다. 예산 안이면 파란색, 넘으면 빨간색.
 * 핀을 누르면 onSelect 로 식당을 알려준다.
 * "핀 정리"가 켜져 있으면 지도를 축소할수록 주요 가게만 남긴다 (단계는 lib/map-tiers 참고).
 */
export function PlaceMap({
  places,
  perMeal,
  selectedId,
  onSelect,
}: {
  places: Place[];
  perMeal: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [located, setLocated] = useState(false);
  const [level, setLevel] = useState(4);

  const { meals } = useBudget();
  const ratings = useRatings();
  const declutter = useDeclutter();
  const visits = useMemo(() => countVisits(meals), [meals]);
  const tiers = useMemo(() => placeTiers(places, perMeal, ratings, visits), [places, perMeal, ratings, visits]);
  const tier: Tier = declutter ? tierForLevel(level) : 4;

  // 지도를 만들고 모든 식당의 좌표를 찾는다 (처음 한 번)
  useEffect(() => {
    let alive = true;
    loadKakaoMap()
      .then(() => {
        if (!alive || !boxRef.current) return;
        const m = new kakao.maps.Map(boxRef.current, { center: new kakao.maps.LatLng(INHA.lat, INHA.lng), level: 4 });
        new kakao.maps.CustomOverlay({
          map: m,
          position: new kakao.maps.LatLng(INHA.lat, INHA.lng),
          content: `<div class="${styles.inha}">인하대</div>`,
          zIndex: 1,
        });
        setMap(m);
        setLevel(m.getLevel());
        kakao.maps.event.addListener(m, 'zoom_changed', () => setLevel(m.getLevel()));
        return locatePlaces(PLACES, (id, pos) => alive && setPositions((prev) => ({ ...prev, [id]: pos })));
      })
      .then(() => alive && setLocated(true))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : '카카오맵을 불러오지 못했어요'));
    return () => {
      alive = false;
    };
  }, []);

  // 가격 핀 그리기 (목록, 예산, 선택이 바뀔 때마다 다시)
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });
  useEffect(() => {
    if (!map) return;
    const overlays = places.flatMap((p) => {
      const pos = positions[p.id];
      const on = p.id === selectedId;
      if (!pos || (!on && tiers[p.id] > tier)) return [];
      const { menu, fits } = bestMenu(p, perMeal);
      const star = (ratings[p.id] ?? 0) >= HIGH_RATING;
      const regular = (visits[p.id] ?? 0) >= FREQUENT_VISITS;
      const mark = `${star ? '★' : ''}${regular ? '♥' : ''}`;
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = `${styles.pin} ${fits ? '' : styles.pinOver} ${on ? styles.pinOn : ''}`;
      pin.textContent = `${mark ? `${mark} ` : ''}${on ? `${p.name} · ${won(menu.price)}원` : won(menu.price)}`;
      pin.setAttribute(
        'aria-label',
        `${p.name}, ${menu.name} ${won(menu.price)}원${star ? `, 내 별점 ${ratings[p.id]}점` : ''}${regular ? `, ${visits[p.id]}번 방문` : ''}`,
      );
      pin.onclick = () => onSelectRef.current(p.id);
      return [
        new kakao.maps.CustomOverlay({
          map,
          position: new kakao.maps.LatLng(pos.lat, pos.lng),
          content: pin,
          yAnchor: 1,
          // 주요 가게일수록 위에 그려서 겹쳐도 가려지지 않게
          zIndex: on ? 10 : 7 - tiers[p.id],
        }),
      ];
    });
    return () => overlays.forEach((o) => o.setMap(null));
  }, [map, places, positions, perMeal, selectedId, tiers, tier, ratings, visits]);

  // 좌표를 다 찾았거나 목록(필터)이 바뀌면 보이는 식당이 다 들어오게 지도를 맞춘다
  const listKey = places.map((p) => p.id).join(',');
  useEffect(() => {
    if (!map || !located) return;
    const found = places.map((p) => positions[p.id]).filter(Boolean);
    if (!found.length) return;
    const bounds = new kakao.maps.LatLngBounds();
    found.forEach((pos) => bounds.extend(new kakao.maps.LatLng(pos.lat, pos.lng)));
    map.setBounds(bounds, 40, 30, 20, 30);
    // places/positions 는 listKey 와 located 로 대신 확인한다 (핀이 하나 찾힐 때마다 지도가 움직이지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, located, listKey]);

  const missing = located ? places.filter((p) => !positions[p.id]).length : 0;
  const shown = places.filter((p) => positions[p.id] && tiers[p.id] <= tier).length;
  const hidden = places.filter((p) => positions[p.id]).length - shown;

  return (
    <div className={styles.wrap}>
      <div ref={boxRef} className={styles.map} />
      {map && !error && (
        <div className={styles.controls}>
          <button
            type="button"
            role="switch"
            aria-checked={declutter}
            onClick={() => setDeclutter(!declutter)}
            className={`${styles.toggle} ${declutter ? styles.toggleOn : ''}`}>
            <span className={styles.knob} aria-hidden />
            핀 정리 {declutter ? 'ON' : 'OFF'}
          </button>
          {declutter && (
            <span className={styles.tier} aria-live="polite">
              {tier}단계 · {TIER_LABEL[tier]}
              {hidden > 0 && <em> (+{hidden}곳은 확대하면 보여요)</em>}
            </span>
          )}
        </div>
      )}
      {declutter && located && tier === 1 && shown === 0 && (
        <p className={styles.status}>별점 4점 이상 준 가게가 없어요. 식당 카드에서 별점을 매기거나 확대해 보세요</p>
      )}
      {error && <p className={styles.notice}>{error}. 잠시 후 다시 열어 보세요.</p>}
      {!error && !located && map && <p className={styles.status}>식당 위치를 찾는 중…</p>}
      {missing > 0 && <p className={styles.status}>위치를 못 찾은 {missing}곳은 지도에 없어요</p>}
    </div>
  );
}
