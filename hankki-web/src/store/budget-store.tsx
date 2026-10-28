'use client';

// 앱 전체 상태(예산 설정 + 먹은 기록)와 브라우저 저장(localStorage)

import React, { createContext, useContext, useEffect, useMemo, useReducer, useSyncExternalStore } from 'react';

import type { Menu, Place } from '@/data/places';
import { calcBudget, DEFAULT_AMOUNT, toDateKey, type BudgetSummary, type Meal, type Settings } from '@/lib/budget';

const STORAGE_KEY = 'hankki/v1';

export interface Delta {
  name: string;
  price: number;
  before: number;
  after: number;
}

interface State {
  settings: Settings;
  meals: Meal[];
  lastDelta: Delta | null;
}

type Action =
  | { type: 'addMeal'; meal: Meal; delta: Delta }
  | { type: 'undo' }
  | { type: 'clearPeriod' }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'newPeriod' };

const initialSettings = (): Settings => ({
  period: 'week',
  amount: DEFAULT_AMOUNT.week,
  mealsPerDay: 2,
  skipWeekend: true,
  startDate: toDateKey(new Date()),
});

/** 저장된 데이터 불러오기. 없거나 깨졌으면 처음 설정으로 시작한다 */
function loadState(): State {
  const fresh: State = { settings: initialSettings(), meals: [], lastDelta: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as { settings?: Settings; meals?: Meal[] };
    return { settings: saved.settings ?? fresh.settings, meals: saved.meals ?? [], lastDelta: null };
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
    case 'clearPeriod': {
      const ids = new Set(calcBudget(state.settings, state.meals).periodMeals.map((m) => m.id));
      return { ...state, meals: state.meals.filter((m) => !ids.has(m.id)), lastDelta: null };
    }
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch }, lastDelta: null };
    case 'newPeriod':
      return { ...state, settings: { ...state.settings, startDate: toDateKey(new Date()) }, lastDelta: null };
  }
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

interface BudgetContextValue {
  settings: Settings;
  meals: Meal[];
  summary: BudgetSummary;
  lastDelta: Delta | null;
  /** 식당 메뉴를 먹은 것으로 기록하고, 예산 변화를 돌려준다 */
  eat: (place: Place, menu: Menu) => Delta | null;
  undo: () => Meal | null;
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: state.settings, meals: state.meals }));
    } catch {
      // 저장 공간이 막힌 브라우저(시크릿 모드 등)에서는 저장 없이 동작
    }
  }, [state.settings, state.meals]);

  const summary = useMemo(() => calcBudget(state.settings, state.meals), [state.settings, state.meals]);

  const value: BudgetContextValue = {
    settings: state.settings,
    meals: state.meals,
    summary,
    lastDelta: state.lastDelta,
    eat: (place, menu) => {
      if (summary.ended) return null;
      const now = new Date();
      const meal: Meal = {
        id: newId(),
        placeId: place.id,
        name: place.name,
        menu: menu.name,
        price: menu.price,
        date: toDateKey(now),
        at: now.getTime(),
      };
      const after = calcBudget(state.settings, [...state.meals, meal], now);
      const delta: Delta = { name: place.name, price: menu.price, before: summary.perMeal, after: after.perMeal };
      dispatch({ type: 'addMeal', meal, delta });
      return delta;
    },
    undo: () => {
      const last = state.meals[state.meals.length - 1] ?? null;
      if (last) dispatch({ type: 'undo' });
      return last;
    },
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
