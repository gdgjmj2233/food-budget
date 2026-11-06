'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { IoClose, IoListOutline } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { PlaceItem } from '@/components/place-item';
import { RoulettePanel } from '@/components/roulette';
import { CHARACTERS, characterOf } from '@/data/characters';
import { bestMenu, cheapestPrice, mainMenu, PLACES } from '@/data/places';
import { won } from '@/lib/budget';
import { matchesTheme, suggestToday } from '@/lib/suggest';
import { useBudget } from '@/store/budget-store';
import { useProfile } from '@/store/profile-store';
import { C } from '@/theme';
import styles from './meal-dialog.module.css';
import ui from './ui.module.css';

/** 추천 창에 보여줄 식당 수 */
const MAX_PLACES = 5;

type Tab = 'list' | 'roulette';

function WheelIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

/**
 * 밥먹기 창. 추천·룰렛 탭으로 뭘 먹을지 정하고, 먹은 건 메뉴·가격을 직접 입력해서 기록한다.
 * 열 때마다 새로 그려서 입력값이 비어 있다.
 */
export function MealDialog({
  limit,
  onClose,
  onSubmit,
}: {
  limit: number;
  onClose: () => void;
  onSubmit: (menu: string, price: number) => void;
}) {
  const [tab, setTab] = useState<Tab>('list');
  const [inputting, setInputting] = useState(false);
  const [entries, setEntries] = useState<string[]>([]);

  return (
    <Modal sheet onClose={onClose}>
      {inputting ? (
        <MealInput title="직접 입력" limit={limit} onBack={() => setInputting(false)} onSubmit={onSubmit} />
      ) : (
        <Choose
          tab={tab}
          limit={limit}
          entries={entries}
          onTab={setTab}
          onInput={() => setInputting(true)}
          onEntries={setEntries}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function Choose({
  tab,
  limit,
  entries,
  onTab,
  onInput,
  onEntries,
  onClose,
}: {
  tab: Tab;
  limit: number;
  entries: string[];
  onTab: (tab: Tab) => void;
  onInput: () => void;
  onEntries: (entries: string[]) => void;
  onClose: () => void;
}) {
  const hasFits = PLACES.some((p) => bestMenu(p, limit).fits);
  const tabs = [
    { id: 'list', label: '추천', icon: <IoListOutline size={16} aria-hidden /> },
    { id: 'roulette', label: '룰렛', icon: <WheelIcon size={16} /> },
  ] as const;

  return (
    <div className={styles.sheetBody}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>오늘 뭐 먹을까요?</h2>
          <p className={styles.sub}>
            {tab === 'roulette' ? (
              <>
                오늘 남은 금액 <b>{won(limit)}원</b>
              </>
            ) : hasFits ? (
              <>
                오늘 남은 <b>{won(limit)}원</b> 안에서 골랐어요
              </>
            ) : (
              `오늘 남은 ${won(limit)}원 안인 곳이 없어서 가장 싼 곳을 골랐어요`
            )}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <IoClose size={22} aria-hidden />
        </button>
      </div>

      <div role="tablist" aria-label="고르는 방법" className={styles.tabs}>
        {tabs.map((t) => (
          <button
            type="button"
            key={t.id}
            role="tab"
            aria-selected={t.id === tab}
            className={`${styles.tab} ${t.id === tab ? styles.tabOn : ''}`}
            onClick={() => onTab(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && <Recommend limit={limit} />}
      {tab === 'roulette' && <RoulettePanel limit={limit} entries={entries} onEntries={onEntries} />}

      <div className={styles.foot}>
        <button type="button" className={`${ui.primary} ${ui.secondary} ${styles.footBtn}`} onClick={onInput}>
          입력
        </button>
      </div>
    </div>
  );
}

/**
 * 예산 안 메뉴가 있는 식당을 가까운 순으로. 카드에는 각 가게의 대표 메뉴를 보여 주고,
 * 대표 메뉴가 어제와 다른 종류(국물·면·밥)인 곳을 앞에 둔다. 하나도 없으면 가장 싼 곳들.
 */
function Recommend({ limit }: { limit: number }) {
  const { meals } = useBudget();
  const profile = useProfile();
  const tip = suggestToday(meals);
  const fits = PLACES.filter((p) => bestMenu(p, limit).fits);
  const list = (
    fits.length
      ? fits.sort(
          (a, b) =>
            Number(!matchesTheme(mainMenu(a), tip)) - Number(!matchesTheme(mainMenu(b), tip)) ||
            a.walk - b.walk ||
            cheapestPrice(a) - cheapestPrice(b),
        )
      : [...PLACES].sort((a, b) => cheapestPrice(a) - cheapestPrice(b))
  ).slice(0, fits.length ? MAX_PLACES : 3);
  const showTip = tip && list.some((p) => matchesTheme(mainMenu(p), tip));
  const character = profile ? characterOf(profile.character) : CHARACTERS[1];

  return (
    <div className={styles.list}>
      {showTip && (
        <div className={styles.tip}>
          <Image src={character.img} alt="" unoptimized className={styles.tipImg} />
          <span>
            어제 <b>{tip.cat}</b>을 먹어서 오늘은 {tip.theme} 있는 곳을 앞에 뒀어요
          </span>
        </div>
      )}
      {list.map((p) => (
        <PlaceItem key={p.id} place={p} limit={limit} />
      ))}
      <Link href="/recommend" className={styles.more}>
        식당 전체 보기
      </Link>
    </div>
  );
}

/** 먹은 것을 메뉴·가격 직접 입력으로 기록. limit 은 오늘 남은 금액이고, 지난 날을 채울 때는 주지 않는다 */
export function MealInput({
  title,
  limit,
  onBack,
  onSubmit,
}: {
  title: string;
  limit?: number;
  onBack: () => void;
  onSubmit: (menu: string, price: number) => void;
}) {
  const [menu, setMenu] = useState('');
  const [digits, setDigits] = useState('');
  const price = Number(digits);
  const over = limit === undefined ? 0 : price - limit;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price > 0) onSubmit(menu.trim(), price);
  };

  return (
    <form className={styles.body} onSubmit={submit}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {limit !== undefined && <p className={styles.sub}>오늘 남은 금액 {won(limit)}원</p>}
      </div>

      <label className={styles.field}>
        메뉴
        <input
          className={styles.input}
          value={menu}
          onChange={(e) => setMenu(e.target.value)}
          placeholder="예: 김치찌개"
          maxLength={20}
          autoFocus
        />
      </label>

      <label className={styles.field}>
        가격
        <span className={styles.priceBox}>
          <input
            className={styles.input}
            value={digits && won(price)}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7))}
            inputMode="numeric"
            placeholder={won(limit ?? 0)}
          />
          <span className={styles.unit}>원</span>
        </span>
      </label>

      {price > 0 && over > 0 && (
        <p className={styles.hint} style={{ color: C.warn }}>
          오늘 남은 금액보다 {won(over)}원 많아요
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className={`${ui.primary} ${ui.secondary}`} onClick={onBack}>
          뒤로
        </button>
        <button type="submit" className={ui.primary} style={{ backgroundColor: C.primary }} disabled={price <= 0}>
          기록하기
        </button>
      </div>
    </form>
  );
}
