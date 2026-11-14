'use client';

// 앱 전체 상태(예산 설정 + 먹은 기록)와 브라우저 저장(localStorage)

import React, { createContext, useContext, useEffect, useMemo, useReducer, useSyncExternalStore } from 'react';

import {
  addDays,
  calcBudget,
  DEFAULT_AMOUNT,
  findMissingDay,
  fromDateKey,
  rollPeriod,
  toDateKey,
  type BudgetSummary,
  type Meal,
  type MealKind,
  type MissingDay,
  type Settings,
} from '@/lib/budget';

const STORAGE_KEY = 'hankki/v1';

export interface Delta {
  name: string;
  price: number;
  /** 기록한 뒤 오늘 남은 금액 */
  after: number;
  /** 오늘이 예산이 편성되지 않은 주말이면 true (알림에 오늘 남은 금액 대신 남은 예산을 보여 준다) */
  restDay: boolean;
  /** 기록한 뒤 이번 기간 남은 예산 */
  remain: number;
}

/** 기록에서 고칠 수 있는 내용 */
export type MealPatch = Pick<Meal, 'name' | 'menu' | 'price'> & Partial<Pick<Meal, 'kind'>>;

/** 계정에 저장했다가 불러오는 내용 */
export type SavedData = Pick<State, 'settings' | 'meals' | 'dismissedDate'>;

interface State {
  settings: Settings;
  meals: Meal[];
  lastDelta: Delta | null;
  /** 어제 기록 카드에서 "지출 없음"을 누른 날짜. 그 날의 기록은 다시 묻지 않는다 */
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
  | { type: 'rollPeriod'; now: number }
  | { type: 'dismissMissing'; date: string }
  | { type: 'replaceData'; data: SavedData };

const initialSettings = (): Settings => ({
  period: 'week',
  amount: DEFAULT_AMOUNT.week,
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
      // 지난번에 연 뒤로 기간이 끝났으면 같은 예산으로 다음 기간을 이어 간다
      settings: saved.settings ? rollPeriod(saved.settings) : fresh.settings,
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
    case 'newPeriod': {
      const startDate = toDateKey(new Date());
      const { settings } = state;
      // 직접 설정한 기간은 같은 길이로 오늘부터 다시 잡는다
      const days = settings.period === 'custom' && settings.endDate ? Math.round((fromDateKey(settings.endDate).getTime() - fromDateKey(settings.startDate).getTime()) / 86400000) : 0;
      const endDate = settings.period === 'custom' ? toDateKey(addDays(fromDateKey(startDate), Math.max(0, days))) : settings.endDate;
      return { ...state, settings: { ...settings, startDate, endDate }, lastDelta: null };
    }
    case 'rollPeriod': {
      const settings = rollPeriod(state.settings, new Date(action.now));
      return settings === state.settings ? state : { ...state, settings };
    }
    case 'dismissMissing':
      return { ...state, dismissedDate: action.date };
    case 'replaceData':
      return { settings: rollPeriod(action.data.settings), meals: action.data.meals, dismissedDate: action.data.dismissedDate, lastDelta: null };
  }
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

interface BudgetContextValue {
  settings: Settings;
  meals: Meal[];
  dismissedDate: string | null;
  summary: BudgetSummary;
  lastDelta: Delta | null;
  /** 기록이 하나도 없는 어제. 없거나 넘어가기로 했으면 null */
  missing: MissingDay | null;
  /** 먹은 것을 기록하고, 예산 변화를 돌려준다 */
  record: (name: string, menu: string, price: number, extra?: { placeId?: string; at?: number; kind?: MealKind }) => Delta | null;
  /** 이 금액을 먹고 나면 오늘 남는 금액 */
  todayLeftAfter: (price: number) => number;
  dismissMissing: (date: string) => void;
  undo: () => Meal | null;
  /** 기록 하나를 지운다 */
  removeMeal: (id: string) => void;
  /** 기록 하나의 이름·메뉴·가격을 고친다 */
  updateMeal: (id: string, patch: MealPatch) => void;
  clearPeriod: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  startNewPeriod: () => void;
  /** 계정에서 불러온 내용으로 바꾼다 */
  replaceData: (data: SavedData) => void;
  /** 로그아웃할 때 이 브라우저의 기록과 설정을 처음 상태로 되돌린다 */
  resetData: () => void;
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

  // 앱을 켜 둔 채 기간이 끝나도(날이 바뀌어도) 다시 볼 때 다음 기간으로 이어 간다
  useEffect(() => {
    const roll = () => {
      if (document.visibilityState === 'visible') dispatch({ type: 'rollPeriod', now: Date.now() });
    };
    document.addEventListener('visibilitychange', roll);
    window.addEventListener('focus', roll);
    return () => {
      document.removeEventListener('visibilitychange', roll);
      window.removeEventListener('focus', roll);
    };
  }, []);

  const summary = useMemo(() => calcBudget(state.settings, state.meals), [state.settings, state.meals]);
  const missing = useMemo(() => {
    const found = summary.ended ? null : findMissingDay(state.settings, state.meals);
    return found?.date === state.dismissedDate ? null : found;
  }, [summary.ended, state.settings, state.meals, state.dismissedDate]);

  // 기록 하나를 남기고(at 이 없으면 지금), 오늘 남은 금액 변화를 돌려준다
  const addMeal = ({ at, ...fields }: Pick<Meal, 'placeId' | 'name' | 'menu' | 'price' | 'kind'> & { at?: number }): Delta | null => {
    const now = new Date();
    // 켜 둔 사이 기간이 끝났으면 먼저 다음 기간으로 넘기고 기록한다
    const settings = rollPeriod(state.settings, now);
    if (settings !== state.settings) dispatch({ type: 'rollPeriod', now: now.getTime() });
    if (calcBudget(settings, state.meals, now).ended) return null;
    const when = at === undefined ? now : new Date(at);
    const meal: Meal = { id: newId(), ...fields, date: toDateKey(when), at: when.getTime() };
    const after = calcBudget(settings, [...state.meals, meal], now);
    const delta: Delta = { name: meal.name, price: meal.price, after: after.todayLeft, restDay: after.restDay, remain: after.remain };
    dispatch({ type: 'addMeal', meal, delta });
    return delta;
  };

  const value: BudgetContextValue = {
    settings: state.settings,
    meals: state.meals,
    dismissedDate: state.dismissedDate,
    summary,
    lastDelta: state.lastDelta,
    missing,
    record: (name, menu, price, extra) => addMeal({ name, menu, price, ...extra }),
    todayLeftAfter: (price) => {
      const now = new Date();
      const meal: Meal = { id: '', name: '', menu: '', price, date: toDateKey(now), at: now.getTime() };
      return calcBudget(state.settings, [...state.meals, meal], now).todayLeft;
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
    replaceData: (data) => dispatch({ type: 'replaceData', data }),
    resetData: () => dispatch({ type: 'replaceData', data: { settings: initialSettings(), meals: [], dismissedDate: null } }),
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used inside BudgetProvider');
  return ctx;
}
