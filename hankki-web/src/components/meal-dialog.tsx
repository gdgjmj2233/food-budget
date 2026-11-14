'use client';

import React, { useState } from 'react';
import { IoChevronBack, IoChevronForward, IoClose } from 'react-icons/io5';

import { EatHere } from '@/components/eat-here';
import { Modal } from '@/components/modal';
import { mainMenu, PLACES, type Place } from '@/data/places';
import { currentSlot, DAY_NAMES, formatDate, fromDateKey, KIND_LABEL, kindOfTime, MEAL_KINDS, startOfDay, toDateKey, won, type MealKind } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';
import { C } from '@/theme';
import styles from './meal-dialog.module.css';
import ui from './ui.module.css';

/** 식당 이름으로 찾을 때 보여줄 결과 수 */
const MAX_RESULTS = 4;

/**
 * 밥먹기 창. 먹은 것을 직접 적어서 기록한다: 가게 이름(목록에 있으면 골라서 메뉴를 채울 수 있다), 메뉴, 가격.
 * 열 때마다 새로 그려서 입력값이 비어 있다. limit 은 오늘 남은 금액.
 */
export function MealDialog({
  limit,
  onClose,
  onSubmit,
}: {
  limit: number;
  onClose: () => void;
  onSubmit: (menu: string, price: number, place?: Place, kind?: MealKind) => void;
}) {
  const { summary } = useBudget();
  // 점심·저녁을 나눠 관리하면 지금 끼니에 남은 금액을 기준으로 보여 주고 초과를 알려 준다
  const split = summary.split;
  const slotLeft = split ? (currentSlot() === 'lunch' ? split.lunchLeft : split.dinnerLeft) : limit;
  const sub = split ? `${currentSlot() === 'lunch' ? '점심' : '저녁'} 남은 금액 ${won(Math.max(0, slotLeft))}원` : `오늘 남은 금액 ${won(limit)}원`;
  return (
    <Modal sheet onClose={onClose}>
      <DirectInput sub={sub} limit={slotLeft} onClose={onClose} onSubmit={onSubmit} />
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
  onSubmit: (date: string, menu: string, price: number, place?: Place, kind?: MealKind) => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [step, setStep] = useState<'date' | 'form'>('date');

  return (
    <Modal sheet onClose={onClose}>
      {step === 'date' ? (
        <DatePicker value={date} onChange={setDate} onClose={onClose} onNext={() => setStep('form')} />
      ) : (
        <DirectInput
          sub={`${formatDate(fromDateKey(date))}에 먹은 것`}
          onClose={onClose}
          onBack={() => setStep('date')}
          defaultKind="lunch"
          onSubmit={(menu, price, place, kind) => onSubmit(date, menu, price, place, kind)}
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
 * 가게·메뉴·가격을 적는 양식. 밥먹기 창과 지난 날 기록 창이 같이 쓴다.
 * 목록에 있는 식당을 고르면 메뉴를 눌러 추가하는 칸(EatHere)으로 바뀌고, 아니면 메뉴·가격을 직접 적는다.
 * limit(오늘 남은 금액)을 주면 넘을 때 알려 주고, onBack 을 주면 "날짜 바꾸기" 버튼이 생긴다.
 */
/** 아침·점심·저녁·기타 고르기. 처음엔 시각에 맞는 끼니가 골라져 있어서 대부분 그대로 두면 된다 */
function KindPicker({ value, onChange }: { value: MealKind; onChange: (kind: MealKind) => void }) {
  return (
    <div className={styles.chips} role="radiogroup" aria-label="끼니">
      {MEAL_KINDS.map((k) => (
        <button
          type="button"
          key={k}
          role="radio"
          aria-checked={value === k}
          className={`${styles.chip} ${value === k ? styles.chipOn : ''}`}
          onClick={() => onChange(k)}>
          {KIND_LABEL[k]}
        </button>
      ))}
    </div>
  );
}

function DirectInput({
  sub,
  limit,
  defaultKind,
  onClose,
  onBack,
  onSubmit,
}: {
  sub: string;
  limit?: number;
  /** 처음 골라 둘 끼니. 없으면 창을 연 시각에 맞는 끼니 */
  defaultKind?: MealKind;
  onClose: () => void;
  onBack?: () => void;
  onSubmit: (menu: string, price: number, place: Place | undefined, kind: MealKind) => void;
}) {
  const [kind, setKind] = useState<MealKind>(() => defaultKind ?? kindOfTime(Date.now()));
  const [name, setName] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [menu, setMenu] = useState('');
  const [digits, setDigits] = useState('');
  const price = Number(digits);
  const over = limit === undefined ? 0 : price - limit;
  const q = name.trim();
  const suggestions = q ? PLACES.filter((p) => p.name.includes(q)).slice(0, MAX_RESULTS) : [];

  const pick = (p: Place | null) => {
    setPlace(p);
    setName(p ? p.name : '');
    setMenu('');
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
  const kindPicker = <KindPicker value={kind} onChange={setKind} />;

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
          onSubmit={(m, p) => onSubmit(m, p, place, kind)}
        />
      </div>
    );
  }

  // 목록에 없는 곳: 가게 이름·메뉴·가격을 직접 적는다
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price <= 0) return;
    onSubmit([q, menu.trim()].filter(Boolean).join(' ') || '식사', price, undefined, kind);
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

      <label className={styles.field}>
        메뉴
        <input
          className={styles.input}
          value={menu}
          onChange={(e) => setMenu(e.target.value)}
          placeholder="예: 김치찌개"
          maxLength={20}
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
            placeholder={limit === undefined ? '0' : won(limit)}
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
        {onBack && (
          <button type="button" className={`${ui.primary} ${ui.secondary}`} onClick={onBack}>
            날짜 바꾸기
          </button>
        )}
        <button type="submit" className={ui.primary} style={{ backgroundColor: C.primary, flex: 1 }} disabled={price <= 0}>
          기록하기
        </button>
      </div>
    </form>
  );
}
