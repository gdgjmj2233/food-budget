'use client';

import React, { useEffect, useRef, useState } from 'react';

import { bestMenu, PLACES, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { INHA, loadKakaoMap, locatePlaces } from '@/lib/kakao-map';
import styles from './place-map.module.css';

type Pos = { lat: number; lng: number };

/**
 * 카카오맵에 식당을 가격 핀으로 찍는다. 예산 안이면 파란색, 넘으면 빨간색.
 * 핀을 누르면 onSelect 로 식당을 알려준다.
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
  const [error, setError] = useState(false);
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [located, setLocated] = useState(false);

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
      .catch(() => alive && setError(true));
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
      if (!pos) return [];
      const { menu, fits } = bestMenu(p, perMeal);
      const on = p.id === selectedId;
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = `${styles.pin} ${fits ? '' : styles.pinOver} ${on ? styles.pinOn : ''}`;
      pin.textContent = on ? `${p.name} · ${won(menu.price)}원` : `${won(menu.price)}`;
      pin.setAttribute('aria-label', `${p.name}, ${menu.name} ${won(menu.price)}원`);
      pin.onclick = () => onSelectRef.current(p.id);
      return [
        new kakao.maps.CustomOverlay({
          map,
          position: new kakao.maps.LatLng(pos.lat, pos.lng),
          content: pin,
          yAnchor: 1,
          zIndex: on ? 3 : 2,
        }),
      ];
    });
    return () => overlays.forEach((o) => o.setMap(null));
  }, [map, places, positions, perMeal, selectedId]);

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
      {error && <p className={styles.notice}>지도를 불러오지 못했어요. 잠시 후 다시 열어 보세요.</p>}
      {!error && !located && map && <p className={styles.status}>식당 위치를 찾는 중…</p>}
      {missing > 0 && <p className={styles.status}>위치를 못 찾은 {missing}곳은 지도에 없어요</p>}
    </div>
  );
}
