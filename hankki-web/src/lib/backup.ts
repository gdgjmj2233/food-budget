// 브라우저(localStorage)에만 있는 기록·설정을 파일로 내보내고 다시 불러온다

import { toDateKey, type Meal, type Settings } from '@/lib/budget';
import { STORAGE_KEY as BUDGET_KEY } from '@/store/budget-store';
import { STORAGE_KEY as PROFILE_KEY } from '@/store/profile-store';
import { RATINGS_KEY } from '@/store/rating-store';

const APP = 'hankki';
const VERSION = 1;
const LAST_BACKUP_KEY = 'hankki/last-backup/v1';
/** 이보다 큰 파일은 백업 파일이 아니라고 본다 */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface BudgetData {
  settings: Settings;
  meals: Meal[];
  dismissedDate?: string | null;
}

export interface Backup {
  app: typeof APP;
  version: number;
  savedAt: number;
  budget: BudgetData;
  profile: unknown;
  ratings: Record<string, number>;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function isMeal(v: unknown): v is Meal {
  const m = v as Partial<Meal> | null;
  return (
    !!m &&
    typeof m.id === 'string' &&
    m.id !== '' &&
    typeof m.name === 'string' &&
    typeof m.menu === 'string' &&
    isCount(m.price) &&
    isCount(m.at) &&
    typeof m.date === 'string' &&
    DATE_KEY.test(m.date) &&
    (m.placeId === undefined || typeof m.placeId === 'string')
  );
}

function isSettings(v: unknown): v is Settings {
  const s = v as Partial<Settings> | null;
  return (
    !!s &&
    (s.period === 'week' || s.period === 'month') &&
    isCount(s.amount) &&
    isCount(s.mealsPerDay) &&
    typeof s.skipWeekend === 'boolean' &&
    typeof s.startDate === 'string' &&
    DATE_KEY.test(s.startDate)
  );
}

const readJson = <T,>(key: string): T | null => {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
};

/** 파일을 내려받게 한다 */
function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** 기록·예산 설정·내 정보·별점을 모두 담은 백업 파일을 저장한다 */
export function saveBackup(settings: Settings, meals: Meal[]) {
  const backup: Backup = {
    app: APP,
    version: VERSION,
    savedAt: Date.now(),
    budget: { ...readJson<BudgetData>(BUDGET_KEY), settings, meals },
    profile: readJson(PROFILE_KEY),
    ratings: readJson<Record<string, number>>(RATINGS_KEY) ?? {},
  };
  download(`한끼예산-백업-${toDateKey(new Date())}.json`, 'application/json', JSON.stringify(backup, null, 2));
  localStorage.setItem(LAST_BACKUP_KEY, String(backup.savedAt));
  return backup.savedAt;
}

/** 마지막으로 백업한 시각. 한 적 없으면 null */
export function lastBackupAt(): number | null {
  try {
    return Number(localStorage.getItem(LAST_BACKUP_KEY)) || null;
  } catch {
    return null;
  }
}

/** 백업 파일 내용을 읽는다. 이 앱의 백업이 아니거나 깨졌으면 null */
export function parseBackup(text: string): Backup | null {
  try {
    const b = JSON.parse(text) as Partial<Backup>;
    if (b.app !== APP || b.version !== VERSION) return null;
    if (!isSettings(b.budget?.settings)) return null;
    if (!Array.isArray(b.budget.meals) || !b.budget.meals.every(isMeal)) return null;
    return b as Backup;
  } catch {
    return null;
  }
}

/**
 * 백업을 이 브라우저에 넣고, 새로 들어온 기록 수를 돌려준다.
 * 기록은 합쳐서 지금 기록이 사라지지 않게 하고, 같은 기록은 지금 것을 남긴다. 예산 설정과 내 정보는 백업으로 바뀐다.
 * 화면에 반영하려면 넣은 뒤 페이지를 새로 불러와야 한다.
 */
export function restoreBackup(b: Backup): number {
  const now = readJson<BudgetData>(BUDGET_KEY);
  const byId = new Map(b.budget.meals.map((m) => [m.id, m]));
  const before = now?.meals ?? [];
  const added = b.budget.meals.filter((m) => !before.some((x) => x.id === m.id)).length;
  before.forEach((m) => byId.set(m.id, m));
  const meals = [...byId.values()].sort((x, y) => x.at - y.at);

  localStorage.setItem(BUDGET_KEY, JSON.stringify({ ...b.budget, meals }));
  if (b.profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(b.profile));
  localStorage.setItem(RATINGS_KEY, JSON.stringify({ ...b.ratings, ...readJson<Record<string, number>>(RATINGS_KEY) }));
  return added;
}

/** 엑셀이 수식으로 읽지 않도록 글자를 감싼다 */
const cell = (v: string | number) => {
  const text = String(v);
  const safe = typeof v === 'string' && /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** 기록을 엑셀에서 열 수 있는 표 파일로 저장한다 */
export function saveMealsCsv(meals: Meal[]) {
  const rows = [...meals]
    .sort((a, b) => a.at - b.at)
    .map((m) => [m.date, m.name, m.menu, m.price].map(cell).join(','));
  // 앞의 ﻿ 가 있어야 엑셀에서 한글이 깨지지 않는다
  const text = `﻿${['날짜,가게,메뉴,가격', ...rows].join('\r\n')}`;
  download(`한끼예산-기록-${toDateKey(new Date())}.csv`, 'text/csv', text);
}
