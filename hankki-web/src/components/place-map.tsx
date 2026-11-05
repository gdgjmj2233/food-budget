'use client';

import React, { useEffect, useRef, useState } from 'react';

import { PLACES, type Place } from '@/data/places';
import { INHA, loadKakaoMap, locatePlaces, type ExtraPlace } from '@/lib/kakao-map';
import { useRatings } from '@/store/rating-store';
import styles from './place-map.module.css';

type Pos = { lat: number; lng: number };

/**
 * 카카오맵에 식당을 이름 핀으로 찍는다. 내가 별점을 준 식당은 이름 옆에 별점이 붙는다.
 * 앱 데이터의 식당은 파란 핀, 카카오 검색으로 찾은 주변 음식점(extras)은 흰 핀이다. 핀은 묶지 않고 모두 따로 보여 준다.
 * 핀을 누르면 onSelect 로 그 식당(또는 주변 음식점)의 id 를 알려준다.
 */
export function PlaceMap({
  places,
  extras,
  selectedId,
  onSelect,
}: {
  places: Place[];
  extras: ExtraPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [located, setLocated] = useState(false);
  const ratings = useRatings();

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
        return locatePlaces(PLACES, (id, pos) => alive && setPositions((prev) => ({ ...prev, [id]: pos })));
      })
      .then(() => alive && setLocated(true))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : '카카오맵을 불러오지 못했어요'));
    return () => {
      alive = false;
    };
  }, []);

  // 핀 그리기 (목록, 별점, 선택이 바뀔 때마다 다시)
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    if (!map) return;
    const pins = [
      ...places.flatMap((p) => (positions[p.id] ? [{ id: p.id, name: p.name, ...positions[p.id], extra: false }] : [])),
      ...extras.map((e) => ({ id: e.id, name: e.name, lat: e.lat, lng: e.lng, extra: true })),
    ];

    const overlays = pins.map((p) => {
      const on = p.id === selectedId;
      const stars = ratings[p.id];
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = `${styles.pin} ${p.extra ? styles.pinExtra : ''} ${on ? styles.pinOn : ''}`;
      pin.append(p.name);
      if (stars) {
        const badge = document.createElement('span');
        badge.className = styles.pinStar;
        badge.textContent = `★${stars}`;
        pin.append(badge);
      }
      pin.setAttribute('aria-label', stars ? `${p.name}, 내 별점 ${stars}점` : p.name);
      pin.onclick = () => onSelectRef.current(p.id);

      return new kakao.maps.CustomOverlay({
        map,
        position: new kakao.maps.LatLng(p.lat, p.lng),
        content: pin,
        yAnchor: 1,
        zIndex: on ? 4 : p.extra ? 2 : 3,
      });
    });
    return () => overlays.forEach((o) => o.setMap(null));
  }, [map, places, extras, positions, ratings, selectedId]);

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

  return (
    <div className={styles.wrap}>
      <div ref={boxRef} className={styles.map} />
      {error && <p className={styles.notice}>{error}. 잠시 후 다시 열어 보세요.</p>}
      {!error && !located && map && <p className={styles.status}>식당 위치를 찾는 중…</p>}
      {missing > 0 && <p className={styles.status}>위치를 못 찾은 {missing}곳은 지도에 없어요</p>}
    </div>
  );
}
