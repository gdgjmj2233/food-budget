'use client';

import React, { useMemo, useState } from 'react';
import { IoStar } from 'react-icons/io5';

import { PLACES } from '@/data/places';
import { formatShort, fromDateKey, KIND_LABEL, won, type Meal } from '@/lib/budget';
import { cachedNearbyNames } from '@/lib/kakao-map';
import { setRating, useRatings } from '@/store/rating-store';
import { CAT_EMOJI } from '@/theme';
import ui from './ui.module.css';
import styles from './my-places.module.css';

/** 자주 간 곳은 몇 곳까지 보여 줄지 */
const MAX_FREQUENT = 5;

type Tab = 'frequent' | 'ratings';
const TABS: { key: Tab; label: string }[] = [
  { key: 'frequent', label: '자주 간 곳' },
  { key: 'ratings', label: '내 별점' },
];

const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));
const PLACE_BY_NAME = new Map(PLACES.map((p) => [p.name.replace(/\s/g, ''), p]));

type Visit = { key: string; name: string; emoji: string; count: number; total: number; last: string };

/**
 * 기록 전체에서 많이 간 곳(가게로 연결된 기록은 가게로, 직접 입력은 적은 이름으로 묶음)과
 * 내가 별점을 준 식당을 모아 보여 준다.
 */
export function MyPlaces({ meals }: { meals: Meal[] }) {
  const [tab, setTab] = useState<Tab>('frequent');
  const ratings = useRatings();

  const frequent = useMemo(() => {
    const byKey = new Map<string, Visit>();
    for (const m of meals) {
      // 금액만 적은 기타 기록(이름이 곧 항목: 간식·음료·이외 …)은 가게가 아니라서 뺀다
      if (m.price <= 0 || (m.kind && m.name === KIND_LABEL[m.kind])) continue;
      const place = (m.placeId && PLACE_BY_ID.get(m.placeId)) || PLACE_BY_NAME.get(m.name.replace(/\s/g, ''));
      const key = place ? place.id : `name:${m.name}`;
      const cur = byKey.get(key) ?? {
        key,
        name: place ? place.name : m.name,
        emoji: place ? CAT_EMOJI[place.cat] : CAT_EMOJI['전체'],
        count: 0,
        total: 0,
        last: m.date,
      };
      cur.count += 1;
      cur.total += m.price;
      if (m.date > cur.last) cur.last = m.date;
      byKey.set(key, cur);
    }
    return [...byKey.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, MAX_FREQUENT);
  }, [meals]);

  const rated = useMemo(() => {
    const nearby = cachedNearbyNames();
    return Object.entries(ratings)
      .map(([id, stars]) => {
        const place = PLACE_BY_ID.get(id);
        const name = place?.name ?? nearby[id];
        return name ? { id, name, stars, emoji: place ? CAT_EMOJI[place.cat] : CAT_EMOJI['전체'] } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name));
  }, [ratings]);

  return (
    <section className={ui.card}>
      <div className={ui.row}>
        <h2 className={ui.sec}>나의 식당</h2>
        <div className={styles.tabs} role="tablist" aria-label="나의 식당">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`${styles.tab} ${tab === t.key ? styles.tabOn : ''}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'frequent' ? (
        frequent.length ? (
          <ol className={styles.list}>
            {frequent.map((v, i) => (
              <li key={v.key} className={styles.row}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.emoji} aria-hidden>
                  {v.emoji}
                </span>
                <span className={styles.body}>
                  <span className={styles.name}>{v.name}</span>
                  <span className={styles.meta}>
                    {won(v.total)}원 · 마지막 {formatShort(fromDateKey(v.last))}
                  </span>
                </span>
                <span className={styles.count}>{v.count}번</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.empty}>아직 기록이 없어요. 먹은 걸 기록하면 자주 간 곳이 여기 쌓여요.</p>
        )
      ) : rated.length ? (
        <ul className={styles.list}>
          {rated.map((r) => (
            <li key={r.id} className={`${styles.row} ${styles.rowWrap}`}>
              <span className={styles.emoji} aria-hidden>
                {r.emoji}
              </span>
              <span className={styles.body}>
                <span className={`${styles.name} ${styles.nameWrap}`}>{r.name}</span>
              </span>
              {/* 눌러서 별점을 고친다. 같은 별을 다시 누르면 지워져서 목록에서 빠진다 (다른 별점 칸과 같은 동작) */}
              <span className={styles.stars} role="group" aria-label={`${r.name} 내 별점 ${r.stars}점`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setRating(r.id, n === r.stars ? 0 : n)}
                    aria-label={n === r.stars ? `별점 ${n}점 지우기` : `별점 ${n}점으로 바꾸기`}
                    aria-pressed={n <= r.stars}
                    className={styles.starBtn}>
                    <IoStar size={17} className={n <= r.stars ? styles.starOn : styles.starOff} aria-hidden />
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>아직 별점을 준 식당이 없어요. 주변 식당 탭에서 식당을 눌러 별점을 남겨 보세요.</p>
      )}
    </section>
  );
}
