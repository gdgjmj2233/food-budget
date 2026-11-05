'use client';

import React, { useEffect, useRef, useState } from 'react';

import { bestMenu, PLACES, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { INHA, loadKakaoMap, locatePlaces } from '@/lib/kakao-map';
import { clusterPoints, isSameSpot } from '@/lib/map-cluster';
import styles from './place-map.module.css';

type Pos = { lat: number; lng: number };

/** 화면에서 핀 하나가 차지하는 크기(px, 묶음 핀 "12곳 10,500~" 기준 + 여백). 이 안에 겹치는 핀은 하나로 묶는다 */
const PIN_BOX = { width: 104, height: 34 };

/**
 * 카카오맵에 식당을 가격 핀으로 찍는다. 예산 안이면 파란색, 넘으면 빨간 테두리.
 * 화면에서 겹치는 핀은 "N곳 · 최저가~" 묶음 핀으로 합친다.
 * 핀을 누르면 onSelect 로 식당을, 같은 건물이라 확대해도 안 풀리는 묶음을 누르면 onSelectGroup 으로 식당들을 알려준다.
 */
export function PlaceMap({
  places,
  perMeal,
  selectedId,
  onSelect,
  onSelectGroup,
}: {
  places: Place[];
  perMeal: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectGroup: (ids: string[]) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [located, setLocated] = useState(false);
  const [level, setLevel] = useState(4);

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

  // 가격 핀 그리기 (목록, 예산, 선택이 바뀔 때마다 다시)
  const onSelectRef = useRef(onSelect);
  const onSelectGroupRef = useRef(onSelectGroup);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onSelectGroupRef.current = onSelectGroup;
  });

  // 확대 단계가 바뀌면 핀끼리의 화면 거리가 달라지므로 다시 묶는다 (이동만 하면 거리는 그대로)
  useEffect(() => {
    if (!map) return;
    const onZoom = () => setLevel(map.getLevel());
    onZoom();
    kakao.maps.event.addListener(map, 'zoom_changed', onZoom);
    return () => kakao.maps.event.removeListener(map, 'zoom_changed', onZoom);
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const proj = map.getProjection();
    const info = places.flatMap((p) => {
      const pos = positions[p.id];
      if (!pos) return [];
      const ll = new kakao.maps.LatLng(pos.lat, pos.lng);
      const pt = proj.containerPointFromCoords(ll);
      return [{ place: p, pos, ll, x: pt.getX(), y: pt.getY(), ...bestMenu(p, perMeal) }];
    });
    const byId = new Map(info.map((i) => [i.place.id, i]));

    // 선택한 식당은 묶지 않고 항상 이름과 함께 보여 준다. 싼 곳을 기준점으로 삼도록 가격순으로 묶는다
    const rest = info.filter((i) => i.place.id !== selectedId).sort((a, b) => a.menu.price - b.menu.price);
    const groups = clusterPoints(
      rest.map((i) => ({ id: i.place.id, x: i.x, y: i.y })),
      PIN_BOX.width,
      PIN_BOX.height,
    ).map((g) => g.map((pt) => byId.get(pt.id)!));
    const sel = selectedId ? byId.get(selectedId) : undefined;
    if (sel) groups.push([sel]);

    const overlays = groups.map((g) => {
      const pin = document.createElement('button');
      pin.type = 'button';
      const position = g[0].ll;
      let zIndex = 2;

      if (g.length === 1) {
        const { place: p, menu, fits } = g[0];
        const on = p.id === selectedId;
        pin.className = `${styles.pin} ${fits ? '' : styles.pinOver} ${on ? styles.pinOn : ''}`;
        pin.textContent = on ? `${p.name} · ${won(menu.price)}원` : won(menu.price);
        pin.setAttribute('aria-label', `${p.name}, ${menu.name} ${won(menu.price)}원`);
        pin.onclick = () => onSelectRef.current(p.id);
        zIndex = on ? 4 : fits ? 2 : 1;
      } else {
        const anyFits = g.some((i) => i.fits);
        // 묶음 핀은 기준점(가장 싼 곳) 자리에 그려야 다른 핀과 겹치지 않는다
        const min = g[0].menu.price;
        pin.className = `${styles.pin} ${styles.cluster} ${anyFits ? '' : styles.pinOver}`;
        pin.innerHTML = `<b class="${styles.count}">${g.length}곳</b>${won(min)}~`;
        pin.setAttribute('aria-label', `식당 ${g.length}곳, 가장 싼 메뉴 ${won(min)}원. 눌러서 보기`);
        pin.onclick = () => {
          // 같은 건물이거나 더 확대할 수 없으면 목록으로, 아니면 묶음이 풀리도록 그 부분을 확대
          if (isSameSpot(g.map((i) => i.pos)) || map.getLevel() <= 1) {
            onSelectGroupRef.current(g.map((i) => i.place.id));
            return;
          }
          const bounds = new kakao.maps.LatLngBounds();
          g.forEach((i) => bounds.extend(i.ll));
          map.setBounds(bounds, 60, 40, 40, 40);
          if (map.getLevel() >= level) map.setLevel(level - 1, { anchor: position });
        };
        zIndex = anyFits ? 3 : 1;
      }

      return new kakao.maps.CustomOverlay({ map, position, content: pin, yAnchor: 1, zIndex });
    });
    return () => overlays.forEach((o) => o.setMap(null));
  }, [map, places, positions, perMeal, selectedId, level]);

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
