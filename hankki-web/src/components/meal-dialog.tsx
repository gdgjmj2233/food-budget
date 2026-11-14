'use client';

import React, { useState } from 'react';
import { IoChevronBack, IoChevronForward, IoClose } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { PLACES, type Place } from '@/data/places';
import { DAY_NAMES, formatDate, fromDateKey, startOfDay, toDateKey, won } from '@/lib/budget';
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
  onSubmit: (menu: string, price: number, place?: Place) => void;
}) {
  return (
    <Modal sheet onClose={onClose}>
      <DirectInput sub={`오늘 남은 금액 ${won(limit)}원`} limit={limit} onClose={onClose} onSubmit={onSubmit} />
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
  onSubmit: (date: string, menu: string, price: number, place?: Place) => void;
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
          onSubmit={(menu, price, place) => onSubmit(date, menu, price, place)}
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
 * limit(오늘 남은 금액)을 주면 넘을 때 알려 주고, onBack 을 주면 "뒤로" 버튼이 생긴다.
 */
function DirectInput({
  sub,
  limit,
  onClose,
  onBack,
  onSubmit,
}: {
  sub: string;
  limit?: number;
  onClose: () => void;
  onBack?: () => void;
  onSubmit: (menu: string, price: number, place?: Place) => void;
}) {
  const [name, setName] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [menu, setMenu] = useState('');
  const [digits, setDigits] = useState('');
  const price = Number(digits);
  const over = limit === undefined ? 0 : price - limit;
  const q = name.trim();
  const suggestions = !place && q ? PLACES.filter((p) => p.name.includes(q)).slice(0, MAX_RESULTS) : [];
  const menus = place ? [...place.menus].sort((a, b) => a.price - b.price) : [];

  const pick = (p: Place | null) => {
    setPlace(p);
    setName(p ? p.name : '');
    setMenu('');
    setDigits('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price <= 0) return;
    if (place) onSubmit(menu.trim(), price, place);
    else onSubmit([q, menu.trim()].filter(Boolean).join(' ') || '식사', price);
  };

  return (
    <form className={`${styles.body} ${styles.scroll}`} onSubmit={submit}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>뭐 먹었어요?</h2>
          <p className={styles.sub}>{sub}</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          <IoClose size={22} aria-hidden />
        </button>
      </div>

      {place ? (
        <div className={styles.pickedPlace}>
          <span className={styles.resultName}>{place.name}</span>
          <button type="button" className={styles.repick} onClick={() => pick(null)}>
            다시 고르기
          </button>
        </div>
      ) : (
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
      )}

      {suggestions.length > 0 && (
        <div className={styles.chips} role="group" aria-label="이름이 맞는 식당">
          {suggestions.map((p) => (
            <button type="button" key={p.id} className={styles.chip} onClick={() => pick(p)}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {menus.length > 0 && (
        <div className={styles.chips} role="group" aria-label={`${place?.name} 메뉴`}>
          {menus.map((m) => {
            const on = menu === m.name && price === m.price;
            return (
              <button
                type="button"
                key={m.name}
                aria-pressed={on}
                className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                onClick={() => {
                  setMenu(m.name);
                  setDigits(String(m.price));
                }}>
                {m.name} {won(m.price)}원
              </button>
            );
          })}
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

      {place && <p className={styles.hint}>목록 가격은 바뀌었을 수 있어요. 다르면 고쳐서 기록하세요</p>}
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
