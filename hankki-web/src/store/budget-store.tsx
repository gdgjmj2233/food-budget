'use client';

// 앱 전체 상태(예산 설정 + 먹은 기록)와 브라우저 저장(localStorage)

import React, { createContext, useContext, useEffect, useMemo, useReducer, useSyncExternalStore } from 'react';

import type { Menu, Place } from '@/data/places';
import {
  calcBudget,
  DEFAULT_AMOUNT,
  findMissingMeal,
  toDateKey,
  type BudgetSummary,
  type Meal,
  type MissingMeal,
  type Settings,
} from '@/lib/budget';

export const STORAGE_KEY = 'hankki/v1';

export interface Delta {
  name: string;
  price: number;
  before: number;
  after: number;
}

/** 기록에서 고칠 수 있는 내용 */
export type MealPatch = Pick<Meal, 'name' | 'menu' | 'price'>;

interface State {
  settings: Settings;
  meals: Meal[];
  lastDelta: Delta | null;
  /** "기억 안 나"를 누른 날짜. 그 날의 빠진 끼니는 다시 묻지 않는다 */
  dismissedDate: string | null;
}

type Action =
  | { type: 'addMeal'; meal: Meal; delta: Delta }
  | { type: 'undo' }
  | { type: 'removeMeal'; id: string }
  | { type: 'updateMeal'; id: string; patch: MealPatch }
  | { type: 'clearPeriod' }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'newPeriod' }
  | { type: 'dismissMissing'; date: string };

const initialSettings = (): Settings => ({
  period: 'week',
  amount: DEFAULT_AMOUNT.week,
  mealsPerDay: 2,
  skipWeekend: true,
  startDate: toDateKey(new Date()),
});

/** 저장된 데이터 불러오기. 없거나 깨졌으면 처음 설정으로 시작한다 */
function loadState(): State {
  const fresh: State = { settings: initialSettings(), meals: [], lastDelta: null, dismissedDate: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as { settings?: Settings; meals?: Meal[]; dismissedDate?: string };
    return {
      settings: saved.settings ?? fresh.settings,
      meals: saved.meals ?? [],
      lastDelta: null,
      dismissedDate: saved.dismissedDate ?? null,
    };
  } catch {
    return fresh;
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'addMeal':
      return { ...state, meals: [...state.meals, action.meal], lastDelta: action.delta };
    case 'undo':
      return { ...state, meals: state.meals.slice(0, -1), lastDelta: null };
    case 'removeMeal':
      return { ...state, meals: state.meals.filter((m) => m.id !== action.id), lastDelta: null };
    case 'updateMeal':
      return { ...state, meals: state.meals.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)), lastDelta: null };
    case 'clearPeriod': {
      const ids = new Set(calcBudget(state.settings, state.meals).periodMeals.map((m) => m.id));
      return { ...state, meals: state.meals.filter((m) => !ids.has(m.id)), lastDelta: null };
    }
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch }, lastDelta: null };
    case 'newPeriod':
      return { ...state, settings: { ...state.settings, startDate: toDateKey(new Date()) }, lastDelta: null };
    case 'dismissMissing':
      return { ...state, dismissedDate: action.date };
  }
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

interface BudgetContextValue {
  settings: Settings;
  meals: Meal[];
  summary: BudgetSummary;
  lastDelta: Delta | null;
  /** 어제 기록이 빠진 끼니. 없거나 "기억 안 나"를 눌렀으면 null */
  missing: MissingMeal | null;
  /** 식당 메뉴를 먹은 것으로 기록하고, 예산 변화를 돌려준다 */
  eat: (place: Place, menu: Menu) => Delta | null;
  /** 목록에 없는 끼니(직접 입력, 스킵)를 기록하고, 예산 변화를 돌려준다 */
  record: (name: string, menu: string, price: number, extra?: { placeId?: string; at?: number }) => Delta | null;
  /** 이 금액을 먹고 나면 바뀌는 한 끼 권장 금액 */
  perMealAfter: (price: number) => number;
  dismissMissing: (date: string) => void;
  undo: () => Meal | null;
  /** 기록 하나를 지운다 */
  removeMeal: (id: string) => void;
  /** 기록 하나의 이름·메뉴·가격을 고친다 */
  updateMeal: (id: string, patch: MealPatch) => void;
  clearPeriod: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  startNewPeriod: () => void;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

const noSubscribe = () => () => {};

/** 서버(빌드)에서 그릴 때는 false, 브라우저에서는 true */
const useIsClient = () => useSyncExternalStore(noSubscribe, () => true, () => false);

/**
 * 기록은 브라우저(localStorage)에만 있고 "오늘"도 보는 사람 기준이라,
 * 서버에서는 화면 내용을 그리지 않고 브라우저에서 불러온 뒤에 그린다.
 */
export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return <BudgetStore>{children}</BudgetStore>;
}

function BudgetStore({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);

  // 바뀔 때마다 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: state.settings, meals: state.meals, dismissedDate: state.dismissedDate }));
    } catch {
      // 저장 공간이 막힌 브라우저(시크릿 모드 등)에서는 저장 없이 동작
    }
  }, [state.settings, state.meals, state.dismissedDate]);

  const summary = useMemo(() => calcBudget(state.settings, state.meals), [state.settings, state.meals]);
  const missing = useMemo(() => {
    const found = summary.ended ? null : findMissingMeal(state.settings, state.meals);
    return found?.date === state.dismissedDate ? null : found;
  }, [summary.ended, state.settings, state.meals, state.dismissedDate]);

  // 끼니 하나를 기록하고(at 이 없으면 지금), 한 끼 권장 금액 변화를 돌려준다
  const addMeal = ({ at, ...fields }: Pick<Meal, 'placeId' | 'name' | 'menu' | 'price'> & { at?: number }): Delta | null => {
    if (summary.ended) return null;
    const now = new Date();
    const when = at === undefined ? now : new Date(at);
    const meal: Meal = { id: newId(), ...fields, date: toDateKey(when), at: when.getTime() };
    const after = calcBudget(state.settings, [...state.meals, meal], now);
    const delta: Delta = { name: meal.name, price: meal.price, before: summary.perMeal, after: after.perMeal };
    dispatch({ type: 'addMeal', meal, delta });
    return delta;
  };

  const value: BudgetContextValue = {
    settings: state.settings,
    meals: state.meals,
    summary,
    lastDelta: state.lastDelta,
    missing,
    eat: (place, menu) => addMeal({ placeId: place.id, name: place.name, menu: menu.name, price: menu.price }),
    record: (name, menu, price, extra) => addMeal({ name, menu, price, ...extra }),
    perMealAfter: (price) => {
      const now = new Date();
      const meal: Meal = { id: '', name: '', menu: '', price, date: toDateKey(now), at: now.getTime() };
      return calcBudget(state.settings, [...state.meals, meal], now).perMeal;
    },
    dismissMissing: (date) => dispatch({ type: 'dismissMissing', date }),
    undo: () => {
      const last = state.meals[state.meals.length - 1] ?? null;
      if (last) dispatch({ type: 'undo' });
      return last;
    },
    removeMeal: (id) => dispatch({ type: 'removeMeal', id }),
    updateMeal: (id, patch) => dispatch({ type: 'updateMeal', id, patch }),
    clearPeriod: () => dispatch({ type: 'clearPeriod' }),
    updateSettings: (patch) => dispatch({ type: 'updateSettings', patch }),
    startNewPeriod: () => dispatch({ type: 'newPeriod' }),
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used inside BudgetProvider');
  return ctx;
}
