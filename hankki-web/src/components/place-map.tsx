'use client';

import React, { useEffect, useRef, useState } from 'react';
import { IoLocate } from 'react-icons/io5';

import type { Category, Place } from '@/data/places';
import { INHA, loadKakaoMap, type ExtraPlace } from '@/lib/kakao-map';
import { clusterPoints, mergeOverlapping } from '@/lib/map-cluster';
import { locationProblem, startLocating, useLocation } from '@/store/location-store';
import { ensurePlacePositions, usePlacePositions } from '@/store/place-positions';
import { useRatings } from '@/store/rating-store';
import { CAT_COLORS, CAT_EMOJI } from '@/theme';
import styles from './place-map.module.css';

type Pos = { lat: number; lng: number };
type Pin = Pos & { id: string; name: string; cat: Category | null; extra: boolean };

/** 이 확대 단계(카카오 지도 1단계 = 축척 20m)까지 확대하면 모든 식당을 실제 위치에 이름 핀으로 보여 준다 */
const NAME_LEVEL = 1;
/** 멀리서 "N곳" 핀 하나가 차지하는 화면 크기(px). 이 안에 겹치는 점은 한 핀으로 합친다 */
const CLUSTER_BOX = { width: 56, height: 32 };
/** "내 위치"를 누르면 이 확대 단계(3단계 = 축척 50m)보다 멀리 있을 때만 여기까지 확대한다 */
const ME_LEVEL = 3;
/** 핀 아래 식당 이름의 zIndex. 아이콘(2~4)보다 낮아서 이름이 다른 식당의 아이콘을 가리지 않는다 */
const LABEL_Z = 1;
/** 아이콘 배지 가운데에서 그 아래 이름 윗변까지 거리(px). 배지 높이 26px 의 절반 + 2px (선택한 핀은 1.15배라 조금 더) */
const LABEL_GAP = 15;
const LABEL_GAP_ON = 17;
/** 이름 핀 아이콘 배지 크기(px). 별점이 붙으면 가로가 늘어난다 (place-map.module.css 의 .place 와 같게) */
const PIN_SIZE = 26;
const RATED_PIN_WIDTH = 58;

/**
 * 카카오맵에 식당을 찍는다. 멀리서는 작은 점, 20m 축척까지 확대하면 이름 핀이다.
 * 이름 핀은 음식 종류 이모지 배지(내가 별점을 준 식당만 옆에 별점)와 그 아래 식당 이름으로 되어 있다. 이모지는 추천 탭 종류 버튼과 같다.
 * 앱 데이터의 식당은 종류별 색 바탕(식당 목록과 같은 색), 카카오 검색으로 찾은 주변 음식점(extras)은 회색 바탕이다. 핀은 묶지 않고 모두 따로 보여 준다.
 * 20m 축척에서는 모든 식당을 실제 위치에 이름 핀으로 찍는다. 핀 위치는 옮기지 않는다.
 * 그래도 조금이라도 겹치는 핀은 '전체' 이모지(🍽️) 핀 하나로 합치고("대표 식당 외 N곳"), 누르면 합친 식당들의 id 를
 * onSelectGroup 으로 알려 준다(N곳 핀과 같은 목록). 선택한 식당은 합치지 않는다.
 * 선택한 식당은 멀리서도 이름 핀이다. 핀을 누르면 onSelect 로 그 식당(또는 주변 음식점)의 id 를 알려준다.
 * height 를 주면 지도 높이(px)를 바꾼다.
 */
export function PlaceMap({
  places,
  extras,
  selectedId,
  onSelect,
  onSelectGroup,
  height,
}: {
  places: Place[];
  extras: ExtraPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** N곳 핀을 누르면 그 안의 식당 id 들을 알려 준다 */
  onSelectGroup: (ids: string[]) => void;
  height?: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(4);
  const { positions, located } = usePlacePositions();
  const { pos: me, status: locStatus } = useLocation();
  const locError = locationProblem(locStatus);
  const ratings = useRatings();

  // 지도를 만들고 모든 식당의 좌표를 찾는다 (좌표 찾기는 목록과 함께 쓰는 저장소가 한 번만 한다)
  useEffect(() => {
    let alive = true;
    ensurePlacePositions();
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
      })
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
      ...places.flatMap((p) => (positions[p.id] ? [{ id: p.id, name: p.name, cat: p.cat, ...positions[p.id], extra: false }] : [])),
      ...extras.map((e) => ({ id: e.id, name: e.name, cat: e.cat, lat: e.lat, lng: e.lng, extra: true })),
    ];

    const dotOf = (p: Pin) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `${styles.dot} ${p.extra ? styles.dotExtra : ''}`;
      dot.setAttribute('aria-label', p.name);
      dot.onclick = () => onSelectRef.current(p.id);
      return dot;
    };

    // 이름 핀의 모양: 이모지 배지(stars 가 있으면 옆에 숫자, 없으면 비움)와 그 아래 이름. bg 가 없으면 기본 바탕(CSS)
    const badgeOf = (o: {
      emoji: string;
      bg?: string;
      extra: boolean;
      on: boolean;
      stars?: number;
      name: string;
      ariaLabel: string;
      onPick: () => void;
    }) => {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = `${styles.place} ${o.extra ? styles.placeExtra : ''} ${o.on ? styles.placeOn : ''}`;
      const icon = document.createElement('span');
      icon.className = styles.placeIcon;
      icon.textContent = o.emoji;
      if (o.bg) icon.style.backgroundColor = o.bg;
      pin.append(icon);
      if (o.stars) {
        const star = document.createElement('span');
        star.className = styles.placeStar;
        star.textContent = o.stars.toFixed(1);
        pin.append(star);
      }
      pin.setAttribute('aria-label', o.ariaLabel);
      pin.onclick = o.onPick;

      // 이름도 눌러서 고를 수 있다. 화면 읽기 프로그램에는 핀이 이미 이름을 알려 주므로 숨긴다
      const label = document.createElement('button');
      label.type = 'button';
      label.tabIndex = -1;
      label.setAttribute('aria-hidden', 'true');
      label.className = `${styles.placeName} ${o.extra ? styles.placeNameExtra : ''} ${o.on ? styles.placeNameOn : ''}`;
      label.textContent = o.name;
      label.onclick = o.onPick;
      return { pin, label };
    };

    // 식당 핀: 음식 종류 이모지(종류를 모르는 주변 음식점은 '전체' 이모지 🍽️)와 내 별점, 식당 이름
    const namedOf = (p: Pin) => {
      const stars = ratings[p.id];
      return badgeOf({
        emoji: CAT_EMOJI[p.cat ?? '전체'],
        bg: !p.extra && p.cat ? CAT_COLORS[p.cat].bg : undefined,
        extra: p.extra,
        on: p.id === selectedId,
        stars,
        name: p.name,
        ariaLabel: stars ? `${p.name}, 내 별점 ${stars}점` : p.name,
        onPick: () => onSelectRef.current(p.id),
      });
    };

    const overlays: kakao.maps.CustomOverlay[] = [];
    const add = (content: HTMLElement, pos: Pos, yAnchor: number, zIndex: number) => {
      overlays.push(new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(pos.lat, pos.lng), content, yAnchor, zIndex }));
      // 카카오가 핀에 씌우는 네모난 틀은 터치를 받지 않게 한다. 둥근 핀의 모서리 바깥이 옆 핀의 터치를 가로채지 않도록 (핀 자체는 CSS 에서 다시 켬)
      if (content.parentElement) content.parentElement.style.pointerEvents = 'none';
    };
    const zOf = (p: Pin) => (p.id === selectedId ? 4 : p.extra ? 2 : 3);

    // 화면 좌표(px). SDK 버전에 따라 getX()/getY() 메서드 또는 x/y 값으로 온다. 못 읽은 핀은 묶지 않고 그대로 둔다
    const proj = map.getProjection();
    const byId = new Map(pins.map((p) => [p.id, p]));
    const toScreen = (pos: Pos) => {
      const pt = proj.containerPointFromCoords(new kakao.maps.LatLng(pos.lat, pos.lng)) as unknown as
        | { x?: number; y?: number; getX?: () => number; getY?: () => number }
        | undefined;
      const x = typeof pt?.getX === 'function' ? pt.getX() : pt?.x;
      const y = typeof pt?.getY === 'function' ? pt.getY() : pt?.y;
      return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
    };
    const screenPoint = (p: Pin) => {
      const pt = toScreen(p);
      return pt ? { id: p.id, ...pt } : null;
    };

    // 화면에서 at 보다 dy(px) 아래인 지점의 좌표.
    // 이름을 CSS 여백(margin)이나 transform 으로 띄우면 카카오가 씌우는 보이지 않는 틀이 그 빈자리까지 덮어 옆 핀의 터치를 가로챈다.
    // 그래서 이름이 보일 자리의 좌표를 구해 그 자리에 바로 찍는다
    const below = (at: Pos, dy: number): Pos => {
      const pt = toScreen(at);
      if (!pt) return at;
      const ll = proj.coordsFromContainerPoint(new kakao.maps.Point(pt.x, pt.y + dy));
      return { lat: ll.getLat(), lng: ll.getLng() };
    };

    // 아이콘 배지는 실제 위치 한가운데에, 이름은 그 바로 아래에 따로 깐다
    const addNamed = (p: Pin) => {
      const { pin, label } = namedOf(p);
      add(pin, p, 0.5, zOf(p));
      add(label, below(p, p.id === selectedId ? LABEL_GAP_ON : LABEL_GAP), 0, LABEL_Z);
    };

    // 겹친 식당들을 합친 핀: 합친 식당들의 가운데에 '전체' 이모지(🍽️) 배지와 "대표 식당 외 N곳".
    // 대표는 메뉴가 있는 식당(없으면 첫 식당)이고, 누르면 합친 식당 목록을 보여 준다
    const addMerged = (g: Pin[]) => {
      const lead = g.find((p) => !p.extra) ?? g[0];
      const allExtra = g.every((p) => p.extra);
      const ids = g.map((p) => p.id);
      const at = { lat: g.reduce((s, p) => s + p.lat, 0) / g.length, lng: g.reduce((s, p) => s + p.lng, 0) / g.length };
      const { pin, label } = badgeOf({
        emoji: CAT_EMOJI['전체'],
        extra: allExtra,
        on: false,
        name: `${lead.name} 외 ${g.length - 1}곳`,
        ariaLabel: `식당 ${g.length}곳: ${g.map((p) => p.name).join(', ')}. 눌러서 목록 보기`,
        onPick: () => onSelectGroupRef.current(ids),
      });
      add(pin, at, 0.5, allExtra ? 2 : 3);
      add(label, below(at, LABEL_GAP), 0, LABEL_Z);
    };

    if (named) {
      // 20m 축척: 모든 식당을 실제 위치에 이름 핀으로 찍는다. 위치는 옮기지 않는다.
      // 조금이라도 겹치는 핀은 🍽️ 핀 하나로 합친다. 선택한 식당은 합치지 않고 따로 보여 준다
      const ordered = [...pins].sort((a, b) => b.lat - a.lat);
      const nodes = mergeOverlapping(
        ordered
          .filter((p) => p.id !== selectedId)
          .flatMap((p) => {
            const pt = screenPoint(p);
            return pt ? [{ ...pt, width: ratings[p.id] ? RATED_PIN_WIDTH : PIN_SIZE, members: [p] }] : [];
          }),
        PIN_SIZE,
        PIN_SIZE,
      );
      const inNodes = new Set(nodes.flatMap((n) => n.members.map((p) => p.id)));
      ordered.filter((p) => !inNodes.has(p.id)).forEach(addNamed); // 선택한 식당, 화면 좌표를 못 읽은 식당
      nodes.forEach((n) => (n.members.length > 1 ? addMerged(n.members) : addNamed(n.members[0])));
      return () => overlays.forEach((o) => o.setMap(null));
    }

    // 그보다 멀리서는 가까운 핀을 "N곳" 한 핀으로 합친다. 선택한 식당은 합치지 않고 항상 따로 보여 준다
    const points = pins
      .filter((p) => p.id !== selectedId)
      .sort((a, b) => b.lat - a.lat)
      .flatMap((p) => screenPoint(p) ?? []);
    const groups: Pin[][] = clusterPoints(points, CLUSTER_BOX.width, CLUSTER_BOX.height).map((g) => g.map((pt) => byId.get(pt.id)!));
    const placed = new Set(points.map((pt) => pt.id));
    pins.filter((p) => !placed.has(p.id)).forEach((p) => groups.push([p]));

    groups.forEach((g) => {
      if (g.length === 1) {
        const [p] = g;
        if (p.id === selectedId) addNamed(p);
        else add(dotOf(p), p, 0.5, zOf(p));
        return;
      }
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

  const flyTo = (pos: Pos) => {
    if (!map) return;
    if (map.getLevel() > ME_LEVEL) map.setLevel(ME_LEVEL);
    map.panTo(new kakao.maps.LatLng(pos.lat, pos.lng));
  };

  // "내 위치" 버튼: 처음 누르면 권한을 물어보고 위치 추적을 시작하며 그 자리로 이동한다. 이후에는 마지막 위치로 다시 이동한다
  const locateMe = () => {
    if (!map) return;
    startLocating(flyTo);
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
      <div ref={boxRef} className={styles.map} style={height ? { height } : undefined} />
      <button
        type="button"
        onClick={locateMe}
        disabled={!map}
        aria-label="내 위치로 이동"
        className={`${styles.locate} ${me ? styles.locateOn : ''}`}>
        <IoLocate size={18} aria-hidden />
        {locStatus === 'locating' ? '찾는 중…' : '내 위치'}
      </button>
      {locError && <p className={styles.status}>{locError}</p>}
      {error &&<p className={styles.notice}>{error}. 잠시 후 다시 열어 보세요.</p>}
      {!error && !located && map && <p className={styles.status}>식당 위치를 찾는 중…</p>}
      {missing > 0 && <p className={styles.status}>위치를 못 찾은 {missing}곳은 지도에 없어요</p>}
    </div>
  );
}
