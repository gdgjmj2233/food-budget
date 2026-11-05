'use client';

import React, { useEffect, useRef, useState } from 'react';

import { PLACES, type Place } from '@/data/places';
import { INHA, loadKakaoMap, locatePlaces, type ExtraPlace } from '@/lib/kakao-map';
import { clusterPoints } from '@/lib/map-cluster';
import { useRatings } from '@/store/rating-store';
import styles from './place-map.module.css';

type Pos = { lat: number; lng: number };
type Pin = Pos & { id: string; name: string; extra: boolean };

/** 이 확대 단계(카카오 지도 2단계 = 축척 30m)까지 확대하면 점 대신 이름 핀을 보여 준다 */
const NAME_LEVEL = 2;
/** 가장 크게 확대한 단계(1단계). 이때는 겹친 이름 핀을 위아래로 풀어 놓고 실제 위치를 점으로 따로 찍는다 */
const MAX_ZOOM_LEVEL = 1;
/** 이름 핀 하나가 차지하는 화면 크기(px). 이 안에 겹치면 한 묶음으로 보고 풀어 놓는다 */
const PIN_BOX = { width: 110, height: 30 };
/** 풀어 놓은 이름 핀 사이 간격(px) */
const SPREAD_STEP = 30;

/**
 * 카카오맵에 식당을 찍는다. 멀리서는 작은 점, 30m 축척까지 확대하면 이름 핀이고, 내가 별점을 준 식당은 이름 옆에 별점이 붙는다.
 * 앱 데이터의 식당은 파란색, 카카오 검색으로 찾은 주변 음식점(extras)은 흰색이다. 핀은 묶지 않고 모두 따로 보여 준다.
 * 최대로 확대하면 겹친 이름 핀을 위아래로 풀어 놓고, 실제 위치는 점으로 따로 보여 준다.
 * 선택한 식당은 멀리서도 이름 핀이다. 핀을 누르면 onSelect 로 그 식당(또는 주변 음식점)의 id 를 알려준다.
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
  const [level, setLevel] = useState(4);
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

  // 핀 그리기 (목록, 별점, 선택, 확대 단계가 바뀔 때마다 다시)
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // 확대 단계가 바뀌면 점과 이름 핀을 바꿔 그린다
  useEffect(() => {
    if (!map) return;
    const onZoom = () => setLevel(map.getLevel());
    onZoom();
    kakao.maps.event.addListener(map, 'zoom_changed', onZoom);
    return () => kakao.maps.event.removeListener(map, 'zoom_changed', onZoom);
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const named = level <= NAME_LEVEL;
    const pins: Pin[] = [
      ...places.flatMap((p) => (positions[p.id] ? [{ id: p.id, name: p.name, ...positions[p.id], extra: false }] : [])),
      ...extras.map((e) => ({ id: e.id, name: e.name, lat: e.lat, lng: e.lng, extra: true })),
    ];

    const dotOf = (p: Pin) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `${styles.dot} ${p.extra ? styles.dotExtra : ''}`;
      dot.setAttribute('aria-label', p.name);
      dot.onclick = () => onSelectRef.current(p.id);
      return dot;
    };

    const namedOf = (p: Pin) => {
      const stars = ratings[p.id];
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = `${styles.pin} ${p.extra ? styles.pinExtra : ''} ${p.id === selectedId ? styles.pinOn : ''}`;
      pin.append(p.name);
      if (stars) {
        const badge = document.createElement('span');
        badge.className = styles.pinStar;
        badge.textContent = `★${stars}`;
        pin.append(badge);
      }
      pin.setAttribute('aria-label', stars ? `${p.name}, 내 별점 ${stars}점` : p.name);
      pin.onclick = () => onSelectRef.current(p.id);
      return pin;
    };

    const overlays: kakao.maps.CustomOverlay[] = [];
    const add = (content: HTMLElement, pos: Pos, yAnchor: number, zIndex: number) =>
      overlays.push(new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(pos.lat, pos.lng), content, yAnchor, zIndex }));
    const zOf = (p: Pin) => (p.id === selectedId ? 4 : p.extra ? 2 : 3);

    // 최대 확대: 화면에서 겹치는 이름 핀끼리 묶어서, 북쪽에 있는 식당이 위로 오게 위아래로 풀어 놓는다
    const groups: Pin[][] = [];
    if (level <= MAX_ZOOM_LEVEL) {
      const proj = map.getProjection();
      const byId = new Map(pins.map((p) => [p.id, p]));
      const points = [...pins]
        .sort((a, b) => b.lat - a.lat)
        .flatMap((p) => {
          // SDK 버전에 따라 좌표가 getX()/getY() 메서드 또는 x/y 값으로 온다. 못 읽으면 이 핀은 풀지 않고 그대로 둔다
          const pt = proj.containerPointFromCoords(new kakao.maps.LatLng(p.lat, p.lng)) as unknown as {
            x?: number;
            y?: number;
            getX?: () => number;
            getY?: () => number;
          } | undefined;
          const x = typeof pt?.getX === 'function' ? pt.getX() : pt?.x;
          const y = typeof pt?.getY === 'function' ? pt.getY() : pt?.y;
          return typeof x === 'number' && typeof y === 'number' ? [{ id: p.id, x, y }] : [];
        });
      const placed = new Set(points.map((pt) => pt.id));
      clusterPoints(points, PIN_BOX.width, PIN_BOX.height).forEach((g) => groups.push(g.map((pt) => byId.get(pt.id)!)));
      pins.filter((p) => !placed.has(p.id)).forEach((p) => groups.push([p]));
    } else {
      pins.forEach((p) => groups.push([p]));
    }

    groups.forEach((g) => {
      if (g.length === 1) {
        const [p] = g;
        const showName = named || p.id === selectedId;
        add(showName ? namedOf(p) : dotOf(p), p, showName ? 1 : 0.5, zOf(p));
        return;
      }
      // 풀어 놓은 이름 핀은 묶음의 가운데에 쌓고, 각 식당의 실제 위치는 점으로 따로 찍는다
      const center = { lat: g.reduce((s, p) => s + p.lat, 0) / g.length, lng: g.reduce((s, p) => s + p.lng, 0) / g.length };
      g.forEach((p, i) => {
        add(dotOf(p), p, 0.5, 1);
        const pin = namedOf(p);
        pin.classList.add(styles.pinSpread);
        pin.style.transform = `translateY(${(i - (g.length - 1) / 2) * SPREAD_STEP}px)`;
        add(pin, center, 0.5, zOf(p));
      });
    });

    return () => overlays.forEach((o) => o.setMap(null));
  }, [map, places, extras, positions, ratings, selectedId, level]);

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
