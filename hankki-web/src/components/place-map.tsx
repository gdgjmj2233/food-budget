'use client';

import React, { useEffect, useRef, useState } from 'react';
import { IoLocate } from 'react-icons/io5';

import { PLACES, type Place } from '@/data/places';
import { INHA, loadKakaoMap, locatePlaces, type ExtraPlace } from '@/lib/kakao-map';
import { clusterPoints } from '@/lib/map-cluster';
import { useRatings } from '@/store/rating-store';
import styles from './place-map.module.css';

type Pos = { lat: number; lng: number };
type Pin = Pos & { id: string; name: string; extra: boolean };

/** 이 확대 단계(카카오 지도 1단계 = 축척 20m)까지 확대하면 점 대신 이름 핀을 보여 준다 */
const NAME_LEVEL = 1;
/** 이 확대 단계(1단계 = 축척 20m)부터는 겹친 이름 핀을 위아래로 풀어 놓고 실제 위치를 점으로 따로 찍는다 */
const MAX_ZOOM_LEVEL = 1;
/** 이름 핀 하나가 차지하는 화면 크기(px). 이 안에 겹치면 한 묶음으로 보고 풀어 놓는다 */
const PIN_BOX = { width: 110, height: 30 };
/** 멀리서 "N곳" 핀 하나가 차지하는 화면 크기(px). 이 안에 겹치는 점은 한 핀으로 합친다 */
const CLUSTER_BOX = { width: 56, height: 32 };
/** "내 위치"를 누르면 이 확대 단계(3단계 = 축척 50m)보다 멀리 있을 때만 여기까지 확대한다 */
const ME_LEVEL = 3;
/** 풀어 놓은 이름 핀 사이 간격(px) */
const SPREAD_STEP = 30;

/**
 * 카카오맵에 식당을 찍는다. 멀리서는 작은 점, 20m 축척까지 확대하면 이름 핀이고, 내가 별점을 준 식당은 이름 옆에 별점이 붙는다.
 * 앱 데이터의 식당은 파란색, 카카오 검색으로 찾은 주변 음식점(extras)은 흰색이다. 핀은 묶지 않고 모두 따로 보여 준다.
 * 20m 축척부터는 겹친 이름 핀을 위아래로 풀어 놓고, 실제 위치는 점으로 따로 보여 준다.
 * 선택한 식당은 멀리서도 이름 핀이다. 핀을 누르면 onSelect 로 그 식당(또는 주변 음식점)의 id 를 알려준다.
 */
export function PlaceMap({
  places,
  extras,
  selectedId,
  onSelect,
  onSelectGroup,
}: {
  places: Place[];
  extras: ExtraPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** N곳 핀을 누르면 그 안의 식당 id 들을 알려 준다 */
  onSelectGroup: (ids: string[]) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [located, setLocated] = useState(false);
  const [level, setLevel] = useState(4);
  const [me, setMe] = useState<Pos | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
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
  const onSelectGroupRef = useRef(onSelectGroup);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onSelectGroupRef.current = onSelectGroup;
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

    // 화면 좌표(px). SDK 버전에 따라 getX()/getY() 메서드 또는 x/y 값으로 온다. 못 읽은 핀은 묶지 않고 그대로 둔다
    const proj = map.getProjection();
    const byId = new Map(pins.map((p) => [p.id, p]));
    const screenPoint = (p: Pin) => {
      const pt = proj.containerPointFromCoords(new kakao.maps.LatLng(p.lat, p.lng)) as unknown as
        | { x?: number; y?: number; getX?: () => number; getY?: () => number }
        | undefined;
      const x = typeof pt?.getX === 'function' ? pt.getX() : pt?.x;
      const y = typeof pt?.getY === 'function' ? pt.getY() : pt?.y;
      return typeof x === 'number' && typeof y === 'number' ? { id: p.id, x, y } : null;
    };

    // 20m 축척부터는 겹친 이름 핀을 풀어 놓고(북쪽이 위로), 그보다 멀리서는 가까운 핀을 "N곳" 한 핀으로 합친다.
    // 선택한 식당은 합치지 않고 항상 따로 보여 준다
    const spread = level <= MAX_ZOOM_LEVEL;
    const points = (spread ? [...pins] : pins.filter((p) => p.id !== selectedId))
      .sort((a, b) => b.lat - a.lat)
      .flatMap((p) => screenPoint(p) ?? []);
    const box = spread ? PIN_BOX : CLUSTER_BOX;
    const groups: Pin[][] = clusterPoints(points, box.width, box.height).map((g) => g.map((pt) => byId.get(pt.id)!));
    const placed = new Set(points.map((pt) => pt.id));
    pins.filter((p) => !placed.has(p.id)).forEach((p) => groups.push([p]));

    groups.forEach((g) => {
      if (g.length === 1) {
        const [p] = g;
        const showName = named || p.id === selectedId;
        add(showName ? namedOf(p) : dotOf(p), p, showName ? 1 : 0.5, zOf(p));
        return;
      }
      if (!spread) {
        // 합친 핀을 누르면 그 식당들이 풀리도록 그 부분을 확대한다 (핀은 첫 식당 자리에 그려야 다른 핀과 겹치지 않는다)
        const pin = document.createElement('button');
        pin.type = 'button';
        pin.className = `${styles.pin} ${styles.cluster}`;
        const count = document.createElement('b');
        count.className = styles.count;
        count.textContent = `${g.length}곳`;
        pin.append(count);
        pin.setAttribute('aria-label', `식당 ${g.length}곳. 눌러서 확대`);
        pin.onclick = () => {
          onSelectGroupRef.current(g.map((p) => p.id));
          const bounds = new kakao.maps.LatLngBounds();
          g.forEach((p) => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng)));
          map.setBounds(bounds, 60, 40, 40, 40);
          if (map.getLevel() >= level) map.setLevel(level - 1, { anchor: new kakao.maps.LatLng(g[0].lat, g[0].lng) });
        };
        add(pin, g[0], 1, 3);
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

  // 내 위치 점 (위치가 바뀔 때마다 다시 그린다)
  useEffect(() => {
    if (!map || !me) return;
    const dot = document.createElement('div');
    dot.className = styles.me;
    dot.setAttribute('aria-label', '내 위치');
    const overlay = new kakao.maps.CustomOverlay({
      map,
      position: new kakao.maps.LatLng(me.lat, me.lng),
      content: dot,
      yAnchor: 0.5,
      zIndex: 5,
    });
    return () => overlay.setMap(null);
  }, [map, me]);

  // 화면을 떠나면 위치 추적을 끝낸다
  useEffect(
    () => () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    },
    [],
  );

  const flyTo = (pos: Pos) => {
    if (!map) return;
    if (map.getLevel() > ME_LEVEL) map.setLevel(ME_LEVEL);
    map.panTo(new kakao.maps.LatLng(pos.lat, pos.lng));
  };

  // "내 위치" 버튼: 처음 누르면 권한을 물어보고 위치 추적을 시작하며 그 자리로 이동한다. 이후에는 마지막 위치로 다시 이동한다
  const locateMe = () => {
    if (!map) return;
    setLocError(null);
    if (me) {
      flyTo(me);
      return;
    }
    if (!('geolocation' in navigator)) {
      setLocError('이 브라우저에서는 내 위치를 쓸 수 없어요');
      return;
    }
    if (watchRef.current !== null) return; // 이미 위치를 찾는 중
    setLocating(true);
    let first = true;
    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        setMe(pos);
        setLocating(false);
        if (first) {
          first = false;
          flyTo(pos);
        }
      },
      (err) => {
        if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
        setLocating(false);
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? '위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요'
            : '내 위치를 확인할 수 없어요. 잠시 후 다시 눌러 보세요',
        );
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
  };

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
      <button
        type="button"
        onClick={locateMe}
        disabled={!map}
        aria-label="내 위치로 이동"
        className={`${styles.locate} ${me ? styles.locateOn : ''}`}>
        <IoLocate size={18} aria-hidden />
        {locating ? '찾는 중…' : '내 위치'}
      </button>
      {locError && <p className={styles.status}>{locError}</p>}
      {error &&<p className={styles.notice}>{error}. 잠시 후 다시 열어 보세요.</p>}
      {!error && !located && map && <p className={styles.status}>식당 위치를 찾는 중…</p>}
      {missing > 0 && <p className={styles.status}>위치를 못 찾은 {missing}곳은 지도에 없어요</p>}
    </div>
  );
}
