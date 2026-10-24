// 앱 전체 상태(예산 설정 + 먹은 기록)와 기기 저장(AsyncStorage)

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

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
  ready: boolean;
  settings: Settings;
  meals: Meal[];
  lastDelta: Delta | null;
}

type Action =
  | { type: 'hydrate'; settings?: Settings; meals?: Meal[] }
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

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        ready: true,
        settings: action.settings ?? state.settings,
        meals: action.meals ?? state.meals,
      };
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
  ready: boolean;
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

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    ready: false,
    settings: initialSettings(),
    meals: [],
    lastDelta: null,
  });

  // 저장된 데이터 불러오기
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return dispatch({ type: 'hydrate' });
        const saved = JSON.parse(raw) as { settings?: Settings; meals?: Meal[] };
        dispatch({ type: 'hydrate', settings: saved.settings, meals: saved.meals });
      })
      .catch(() => dispatch({ type: 'hydrate' }));
  }, []);

  // 바뀔 때마다 저장
  useEffect(() => {
    if (!state.ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: state.settings, meals: state.meals })).catch(() => {});
  }, [state.ready, state.settings, state.meals]);

  const summary = useMemo(() => calcBudget(state.settings, state.meals), [state.settings, state.meals]);

  const value: BudgetContextValue = {
    ready: state.ready,
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
