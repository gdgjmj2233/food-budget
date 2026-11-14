import type { BudgetStatus, Meal, MealKind } from '@/lib/budget';
import { PLACES, type Category } from '@/data/places';

export const C = {
  ground: '#F3F6FB',
  card: '#FFFFFF',
  ink: '#12213F',
  muted: '#5B6577',
  line: '#E3E8F0',
  divider: '#EEF2F7',
  primary: '#0B3D91',
  primaryDark: '#072B66',
  primarySoft: '#E4EFFC',
  accent: '#FFC93C',
  accentDark: '#E0A800',
  accentSoft: '#FFF6DB',
  warn: '#C26A00',
  orange: '#E8590C',
  over: '#E5303F',
  orangeSoft: '#FFF0E0',
} as const;

/** 홈 예산 카드의 상태 배지 색 */
export const STATUS: Record<BudgetStatus, { label: string; bg: string; fg: string }> = {
  ok: { label: '여유', bg: C.accent, fg: C.primary },
  low: { label: '임박', bg: C.orange, fg: '#FFFFFF' },
  over: { label: '초과', bg: C.over, fg: '#FFFFFF' },
};

/** 기타 묶음(야식·간식·음료·이외, 예전 기타) 색 */
const ETC_COLOR = { bg: '#EFEBFA', fg: '#5B4B8A' };

/**
 * 끼니 색 (기록 탭·최근 기록의 항목 표시). 하루 흐름대로 아침은 앱의 노란색, 점심은 청록, 저녁은 앱의 남색,
 * 기타로 묶인 야식·간식·음료·이외는 모두 보라. fg 는 bg·흰 바탕 모두에서 글자가 잘 읽히는 진한 색(대비 4.5 이상)
 */
export const KIND_COLORS: Record<MealKind, { bg: string; fg: string }> = {
  breakfast: { bg: C.accentSoft, fg: '#8A5F00' },
  lunch: { bg: '#DDF4EF', fg: '#0F766E' },
  dinner: { bg: C.primarySoft, fg: C.primary },
  latenight: ETC_COLOR,
  snack: ETC_COLOR,
  drink: ETC_COLOR,
  other: ETC_COLOR,
  etc: ETC_COLOR,
};

export const CAT_COLORS: Record<Category, { bg: string; fg: string }> = {
  한식: { bg: '#FCE9D9', fg: '#B55A1E' },
  분식: { bg: '#E2EFE6', fg: '#1F6B43' },
  중식: { bg: '#F6E3E1', fg: '#A93226' },
  일식: { bg: '#E3EAF5', fg: '#2B5FA8' },
  양식: { bg: '#EFE7F3', fg: '#6D3F86' },
  아시안: { bg: '#FFF3C4', fg: '#7A5A00' },
};

/** 음식 종류를 한눈에 알아보게 하는 이모지 */
export const CAT_EMOJI: Record<Category | '전체', string> = {
  전체: '🍽️',
  한식: '🍚',
  분식: '🍢',
  중식: '🍜',
  일식: '🍣',
  양식: '🍝',
  아시안: '🍛',
};

const CAT_OF = new Map(PLACES.map((p) => [p.id, p.cat]));

/** 기록의 음식 종류. 직접 입력한 기록은 없다 */
export const catOfMeal = (m: Meal) => (m.placeId ? CAT_OF.get(m.placeId) : undefined);

export const mealColor = (m: Meal) => {
  // 스킵(0원)은 회색
  if (m.price === 0) return { bg: C.divider, fg: C.muted };
  const cat = catOfMeal(m);
  return cat ? CAT_COLORS[cat] : { bg: C.primarySoft, fg: C.primaryDark };
};
