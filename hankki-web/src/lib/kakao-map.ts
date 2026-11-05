import type { Category, Place } from '@/data/places';

// 카카오 개발자 사이트의 JavaScript 키. 브라우저에 그대로 보이는 키라서 숨기지 않아도 되고,
// 카카오 개발자 사이트 [플랫폼 키 > JavaScript SDK 도메인]에 등록한 주소에서만 동작한다.
// (로컬: http://localhost:3000, http://localhost:3001, 배포: https://gdgjmj2233.github.io)
// 등록 안 된 주소에서 열면 sdk.js 요청이 거절되어 "지도를 불러오지 못했어요"가 뜬다.
const KAKAO_JS_KEY = '867849122c282a5b4b6930ff2fb4d9e0';
const SDK_ID = 'kakao-map-sdk';
const LOAD_TIMEOUT_MS = 10_000;

/** 인하대 용현캠퍼스 */
export const INHA = { lat: 37.45, lng: 126.6531 };

let loading: Promise<void> | null = null;

/**
 * 카카오맵 SDK를 한 번만 불러온다.
 * 실패하거나 10초 안에 준비되지 않으면 오류로 끝내고(흰 화면으로 멈추지 않게),
 * 실패한 script 태그를 지워서 다음 호출 때 처음부터 다시 시도한다.
 */
export function loadKakaoMap(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저에서만 지도를 불러올 수 있어요'));
  const sdkReady = () => typeof kakao !== 'undefined' && typeof kakao.maps?.LatLng === 'function';
  if (sdkReady()) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err) {
        document.getElementById(SDK_ID)?.remove();
        reject(err);
      } else {
        resolve();
      }
    };
    const timer = setTimeout(() => finish(new Error('카카오맵 응답이 없어요 (시간 초과)')), LOAD_TIMEOUT_MS);
    const init = () => kakao.maps.load(() => finish());

    // sdk.js는 받았지만 아직 load()를 부르지 않은 경우
    if (typeof kakao !== 'undefined' && kakao.maps) {
      init();
      return;
    }

    document.getElementById(SDK_ID)?.remove(); // 예전에 실패한 태그가 남아 있으면 정리
    const script = document.createElement('script');
    script.id = SDK_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
    script.onload = init;
    script.onerror = () => finish(new Error('카카오맵을 불러오지 못했어요 (도메인 등록·차단 확인)'));
    document.head.appendChild(script);
  }).catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

// 식당 데이터에는 좌표가 없어서 카카오 장소 검색으로 찾고, 찾은 좌표는 브라우저에 저장해 다시 검색하지 않는다.
// 못 찾은 곳은 저장하지 않아서 다음에 다시 찾아본다.
const GEO_KEY = 'hankki/geo-v1';
type LatLng = { lat: number; lng: number };

function readCache(): Record<string, LatLng> {
  try {
    return JSON.parse(localStorage.getItem(GEO_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, LatLng>) {
  try {
    localStorage.setItem(GEO_KEY, JSON.stringify(cache));
  } catch {
    // 저장이 막혀 있으면 다음에 다시 검색하면 된다
  }
}

function searchByName(name: string): Promise<LatLng | null> {
  return new Promise((resolve) => {
    new kakao.maps.services.Places().keywordSearch(
      name,
      (result, status) => {
        const top = status === kakao.maps.services.Status.OK ? result[0] : undefined;
        resolve(top ? { lat: Number(top.y), lng: Number(top.x) } : null);
      },
      { location: new kakao.maps.LatLng(INHA.lat, INHA.lng), radius: 2000, size: 1 },
    );
  });
}

function searchByAddress(address: string): Promise<LatLng | null> {
  return new Promise((resolve) => {
    new kakao.maps.services.Geocoder().addressSearch(address, (result, status) => {
      const top = status === kakao.maps.services.Status.OK ? result[0] : undefined;
      resolve(top ? { lat: Number(top.y), lng: Number(top.x) } : null);
    });
  });
}

/** 앱 데이터에는 없지만 카카오 장소 검색에 나오는 주변 음식점 */
export interface ExtraPlace {
  id: string;
  name: string;
  address: string;
  cat: Category | null;
  lat: number;
  lng: number;
}

// 카카오 분류("음식점 > 한식 > 육류,고기")를 앱 카테고리로 바꾼다. 모르면 null
const CAT_WORDS: [string, Category][] = [
  ['한식', '한식'],
  ['분식', '분식'],
  ['중식', '중식'],
  ['일식', '일식'],
  ['양식', '양식'],
  ['아시아', '아시안'],
];

const categoryOf = (kakaoCategory: string): Category | null => CAT_WORDS.find(([word]) => kakaoCategory.includes(word))?.[1] ?? null;

// 한 번 검색에 최대 45곳(15곳 x 3쪽)만 주므로, 인하대 주변을 여러 중심점으로 나눠서 찾는다
const SEARCH_CENTERS = [
  { lat: INHA.lat, lng: INHA.lng },
  { lat: INHA.lat + 0.004, lng: INHA.lng },
  { lat: INHA.lat - 0.004, lng: INHA.lng },
  { lat: INHA.lat, lng: INHA.lng + 0.005 },
  { lat: INHA.lat, lng: INHA.lng - 0.005 },
];
const SEARCH_RADIUS_M = 600;

function foodPage(center: LatLng, page: number): Promise<kakao.maps.services.PlaceResult[]> {
  return new Promise((resolve) => {
    new kakao.maps.services.Places().categorySearch(
      'FD6',
      (result, status) => resolve(status === kakao.maps.services.Status.OK ? result : []),
      { location: new kakao.maps.LatLng(center.lat, center.lng), radius: SEARCH_RADIUS_M, size: 15, page },
    );
  });
}

const squash = (name: string) => name.replace(/\s/g, '');

let nearby: Promise<ExtraPlace[]> | null = null;

/**
 * 인하대 주변 음식점을 카카오 장소 검색으로 찾는다. 앱 데이터에 이미 있는 식당(이름이 같거나 포함)은 뺀다.
 * 같은 검색을 두 번 하지 않도록 결과를 기억한다.
 */
export function findNearbyRestaurants(known: Place[]): Promise<ExtraPlace[]> {
  return (nearby ??= (async () => {
    const found = new Map<string, ExtraPlace>();
    for (const center of SEARCH_CENTERS) {
      for (let page = 1; page <= 3; page++) {
        const result = await foodPage(center, page);
        for (const r of result) {
          found.set(r.id, {
            id: `kakao:${r.id}`,
            name: r.place_name,
            address: r.road_address_name || r.address_name,
            cat: categoryOf(r.category_name),
            lat: Number(r.y),
            lng: Number(r.x),
          });
        }
        if (result.length < 15) break;
      }
    }
    const names = known.map((p) => squash(p.name));
    return [...found.values()].filter((e) => {
      const n = squash(e.name);
      return !names.some((k) => n.includes(k) || k.includes(n));
    });
  })().catch((e) => {
    nearby = null;
    throw e;
  }));
}

/**
 * 식당들의 좌표를 찾는다. 이름으로 먼저 찾고(같은 건물 식당도 구분됨), 없으면 주소로 찾는다.
 * 하나 찾을 때마다 onFound 를 불러서 지도에 바로 핀을 찍을 수 있게 한다.
 */
export async function locatePlaces(places: Place[], onFound: (id: string, pos: LatLng) => void): Promise<void> {
  const cache = readCache();
  const todo: Place[] = [];
  for (const p of places) {
    if (cache[p.id]) onFound(p.id, cache[p.id]);
    else todo.push(p);
  }

  // 한꺼번에 100곳을 검색하지 않도록 4곳씩 나눠서 찾는다
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(
      todo.slice(i, i + 4).map(async (p) => {
        const pos = (await searchByName(p.name)) ?? (p.address.includes('인근') ? null : await searchByAddress(p.address));
        if (!pos) return;
        cache[p.id] = pos;
        onFound(p.id, pos);
      }),
    );
    writeCache(cache);
  }
}
