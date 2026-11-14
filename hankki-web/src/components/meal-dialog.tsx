'use client';

import React, { useState } from 'react';
import { IoChevronBack, IoChevronForward, IoClose } from 'react-icons/io5';

import { EatHere, KindPicker } from '@/components/eat-here';
import { Modal } from '@/components/modal';
import { mainMenu, PLACES, type Place } from '@/data/places';
import {
  DAY_NAMES,
  formatDate,
  fromDateKey,
  isExtraKind,
  KIND_LABEL,
  kindNow,
  offDayName,
  startOfDay,
  toDateKey,
  won,
  type MealKind,
} from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { C } from '@/theme';
import styles from './meal-dialog.module.css';
import ui from './ui.module.css';

/** 식당 이름으로 찾을 때 보여줄 결과 수 */
const MAX_RESULTS = 4;

/**
 * 밥먹기 창. 항목(아침·점심·저녁, 기타 > 야식·간식·음료·이외)을 고르고, 가게 이름과 가격을 적어서 기록한다.
 * 목록에 있는 식당을 고르면 메뉴를 눌러 담아 기록한다. 열 때마다 새로 그려서 입력값이 비어 있다.
 * limit 은 오늘 남은 금액이고, 예산 편성 요일이 아니라(예: 주말) 오늘 편성된 예산이 없는 날은 주지 않는다.
 */
export function MealDialog({
  limit,
  onClose,
  onSubmit,
}: {
  limit?: number;
  onClose: () => void;
  onSubmit: (menu: string, price: number, place: Place | undefined, kind: MealKind) => void;
}) {
  const { settings } = useBudget();
  // 처음에는 지금 시각에 맞는 항목을 골라 둔다
  const [kind, setKind] = useState<MealKind>(() => kindNow());
  const sub =
    limit === undefined
      ? `${offDayName(settings, new Date())}이라 오늘 편성된 예산은 없어요`
      : `오늘 남은 금액 ${won(limit)}원`;
  return (
    <Modal sheet onClose={onClose}>
      <DirectInput
        sub={sub}
        limit={limit}
        kind={kind}
        onKind={setKind}
        onClose={onClose}
        onSubmit={(menu, price, place) => onSubmit(menu, price, place, kind)}
      />
    </Modal>
  );
}


/**
 * 지난 날 먹은 것 기록 창. 먼저 달력에서 날짜를 고르고, 그 다음은 밥먹기 창과 같은 양식으로 적는다.
 * initialDate 는 처음에 골라 둘 날(어제 기록 카드에서는 비어 있는 어제).
 */
export function PastMealDialog({
  initialDate,
  onClose,
  onSubmit,
}: {
  initialDate: string;
  onClose: () => void;
  onSubmit: (date: string, menu: string, price: number, place: Place | undefined, kind: MealKind) => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [step, setStep] = useState<'date' | 'form'>('date');
  // 지난 날 기록은 그 날 낮 12시로 남겨서 점심을 먼저 골라 둔다
  const [kind, setKind] = useState<MealKind>('lunch');

  return (
    <Modal sheet onClose={onClose}>
      {step === 'date' ? (
        <DatePicker value={date} onChange={setDate} onClose={onClose} onNext={() => setStep('form')} />
      ) : (
        <DirectInput
          sub={`${formatDate(fromDateKey(date))}에 먹은 것`}
          kind={kind}
          onKind={setKind}
          onClose={onClose}
          onBack={() => setStep('date')}
          onSubmit={(menu, price, place) => onSubmit(date, menu, price, place, kind)}
        />
      )}
    </Modal>
  );
}

/** 달력 한 장: 앞뒤 달 날짜까지 채워 7일 단위 주로 나눈다 */
function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const lastDate = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + lastDate) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)),
  );
}

/** 기록할 날짜 고르기. 오늘 이후는 고를 수 없고, 이미 기록이 있는 날은 점으로 보여 준다 */
function DatePicker({
  value,
  onChange,
  onClose,
  onNext,
}: {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
  onNext: () => void;
}) {
  const { meals } = useBudget();
  const today = startOfDay(new Date());
  const todayKey = toDateKey(today);
  const picked = fromDateKey(value);
  const [cursor, setCursor] = useState({ y: picked.getFullYear(), m: picked.getMonth() });
  const recorded = new Set(meals.map((m) => m.date));
  const atThisMonth = cursor.y === today.getFullYear() && cursor.m === today.getMonth();

  const move = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className={`${styles.body} ${styles.scroll}`}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>언제 먹은 거예요?</h2>
          <p className={styles.sub}>날짜를 먼저 골라 주세요</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <IoClose size={22} aria-hidden />
        </button>
      </div>

      <div className={styles.cal}>
        <div className={styles.calHead}>
          <button type="button" className={styles.calNav} onClick={() => move(-1)} aria-label="이전 달">
            <IoChevronBack size={18} aria-hidden />
          </button>
          <span className={styles.calMonth}>
            {cursor.y !== today.getFullYear() && `${cursor.y}년 `}
            {cursor.m + 1}월
          </span>
          <button type="button" className={styles.calNav} onClick={() => move(1)} aria-label="다음 달" disabled={atThisMonth}>
            <IoChevronForward size={18} aria-hidden />
          </button>
        </div>

        <div className={styles.calGrid}>
          {DAY_NAMES.map((n, i) => (
            <span key={n} className={styles.calDow} style={i === 0 ? { color: C.over } : i === 6 ? { color: C.primary } : undefined}>
              {n}
            </span>
          ))}
          {monthGrid(cursor.y, cursor.m)
            .flat()
            .map((d) => {
              const key = toDateKey(d);
              const inMonth = d.getMonth() === cursor.m;
              const future = key > todayKey;
              const on = key === value;
              return (
                <button
                  type="button"
                  key={key}
                  disabled={future}
                  onClick={() => onChange(key)}
                  aria-pressed={on}
                  aria-label={`${formatDate(d)}${recorded.has(key) ? ', 기록 있음' : ''}${key === todayKey ? ', 오늘' : ''}`}
                  className={`${styles.calDay} ${inMonth ? '' : styles.calFaded} ${on ? styles.calDayOn : ''} ${key === todayKey ? styles.calToday : ''}`}>
                  {d.getDate()}
                  {recorded.has(key) && <span className={styles.calDot} aria-hidden />}
                </button>
              );
            })}
        </div>
        <p className={styles.calLegend}>
          <span className={styles.calDot} aria-hidden /> 기록이 있는 날
        </p>
      </div>

      <div className={styles.actions}>
        <button type="button" className={ui.primary} style={{ backgroundColor: C.primary, flex: 1 }} onClick={onNext}>
          {formatDate(picked)} 기록하기
        </button>
      </div>
    </div>
  );
}

/**
 * 가게·가격을 적는 양식. 밥먹기 창과 지난 날 기록 창이 같이 쓴다.
 * 목록에 있는 식당을 고르면 메뉴를 눌러 추가하는 칸(EatHere)으로 바뀌고, 아니면 가게 이름과 가격만 적는다.
 * limit(오늘 남은 금액)을 주면 넘을 때 알려 주고, onBack 을 주면 "날짜 바꾸기" 버튼이 생긴다.
 * 맨 위에서 항목(아침·점심·저녁, 기타 > 야식·간식·음료·이외)을 고른다. 기타를 고르면 금액만 적는다.
 */
function DirectInput({
  sub,
  limit,
  kind,
  onKind,
  onClose,
  onBack,
  onSubmit,
}: {
  sub: string;
  limit?: number;
  kind: MealKind;
  onKind: (kind: MealKind) => void;
  onClose: () => void;
  onBack?: () => void;
  onSubmit: (menu: string, price: number, place?: Place) => void;
}) {
  const [name, setName] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [digits, setDigits] = useState('');
  const price = Number(digits);
  const over = limit === undefined ? 0 : price - limit;
  const q = name.trim();
  const suggestions = q ? PLACES.filter((p) => p.name.includes(q)).slice(0, MAX_RESULTS) : [];

  const pick = (p: Place | null) => {
    setPlace(p);
    setName(p ? p.name : '');
    setDigits('');
  };

  const head = (
    <div className={styles.head}>
      <div>
        <h2 className={styles.title}>뭐 먹었어요?</h2>
        <p className={styles.sub}>{sub}</p>
      </div>
      <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
        <IoClose size={22} aria-hidden />
      </button>
    </div>
  );
  const kindPicker = <KindPicker value={kind} onChange={onKind} />;
  const priceField = (label: string) => (
    <label className={styles.field}>
      {label}
      <span className={styles.priceBox}>
        <input
          className={styles.input}
          value={digits && won(price)}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7))}
          inputMode="numeric"
          placeholder={limit === undefined ? '0' : won(limit)}
        />
        <span className={styles.unit}>원</span>
      </span>
    </label>
  );
  const overHint = price > 0 && over > 0 && (
    <p className={styles.hint} style={{ color: C.warn }}>
      오늘 남은 금액보다 {won(over)}원 많아요
    </p>
  );
  const actions = (
    <div className={styles.actions}>
      {onBack && (
        <button type="button" className={`${ui.primary} ${ui.secondary}`} onClick={onBack}>
          날짜 바꾸기
        </button>
      )}
      <button type="submit" className={ui.primary} style={{ backgroundColor: C.primary, flex: 1 }} disabled={price <= 0}>
        기록하기
      </button>
    </div>
  );

  // 기타(야식·간식·음료·이외)는 가게·메뉴 없이 금액만 적는다. 기록 이름은 고른 항목 (예: 간식)
  if (isExtraKind(kind)) {
    const submitAmount = (e: React.FormEvent) => {
      e.preventDefault();
      if (price > 0) onSubmit(KIND_LABEL[kind], price);
    };
    return (
      <form className={`${styles.body} ${styles.scroll}`} onSubmit={submitAmount}>
        {head}
        {kindPicker}
        {priceField('금액')}
        {overHint}
        {actions}
      </form>
    );
  }

  // 목록에 있는 식당을 골랐으면: 식당 카드의 "여기서 밥먹기"처럼 메뉴를 눌러 추가하고 한 번에 기록한다
  if (place) {
    const main = mainMenu(place);
    const menus = [main, ...place.menus.filter((m) => m.name !== main.name).sort((a, b) => a.price - b.price)];
    return (
      <div className={`${styles.body} ${styles.scroll}`}>
        {head}
        {kindPicker}
        <div className={styles.pickedPlace}>
          <span className={styles.resultName}>{place.name}</span>
          <button type="button" className={styles.repick} onClick={() => pick(null)}>
            다시 고르기
          </button>
        </div>
        <p className={styles.placeHint}>목록 가격과 다르면 아래 직접 입력에 실제 가격을 넣어 주세요</p>
        <EatHere
          name={place.name}
          placeId={place.id}
          menus={menus}
          mainName={main.name}
          limit={limit}
          onClose={onBack}
          cancelLabel="날짜 바꾸기"
          onSubmit={(m, p) => onSubmit(m, p, place)}
        />
      </div>
    );
  }

  // 목록에 없는 곳: 가게 이름과 가격만 적는다 (이름을 비우면 "식사"로 남긴다)
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price <= 0) return;
    onSubmit(q || '식사', price);
  };

  return (
    <form className={`${styles.body} ${styles.scroll}`} onSubmit={submit}>
      {head}
      {kindPicker}

      <label className={styles.field}>
        가게
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="식당 이름 (예: 신전떡볶이)"
          maxLength={20}
          autoFocus
        />
      </label>

      {suggestions.length > 0 && (
        <div className={styles.chips} role="group" aria-label="이름이 맞는 식당">
          {suggestions.map((p) => (
            <button type="button" key={p.id} className={styles.chip} onClick={() => pick(p)}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {priceField('가격')}
      {overHint}
      {actions}
    </form>
  );
}
