import type { StaticImageData } from 'next/image';

import jjajangmyeon from '@/assets/food/jjajangmyeon.svg';
import tteokbokki from '@/assets/food/tteokbokki.svg';
import { kindOf, type BudgetStatus, type Meal, type MealKind } from '@/lib/budget';
import type { Category } from '@/data/places';

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

/**
 * 항목 색. 기록 탭 그래프 범례와 같은 색을 어디서나 쓴다 (그래프·달력·기록 목록·항목 고르기).
 * 아침·점심·저녁은 "식사"로 한 색, 야식·간식·음료·이외는 각각 다른 색.
 * base: 막대·테두리·범례 칸 색 / bg: 연한 바탕 / fg: bg·흰 바탕 모두에서 읽히는 글자색 (대비 5 이상)
 */
export type KindColor = { base: string; bg: string; fg: string };
const MEAL_COLOR: KindColor = { base: '#2A78D6', bg: '#E3EEFB', fg: '#1A5BB0' };
const OTHER_COLOR: KindColor = { base: '#E87BA4', bg: '#FCE6EF', fg: '#AD3566' };

export const KIND_COLORS: Record<MealKind, KindColor> = {
  breakfast: MEAL_COLOR,
  lunch: MEAL_COLOR,
  dinner: MEAL_COLOR,
  latenight: { base: '#EB6834', bg: '#FDE9E0', fg: '#AE4116' },
  snack: { base: '#1BAF7A', bg: '#DDF4EA', fg: '#0D7049' },
  drink: { base: '#EDA100', bg: '#FFF1D1', fg: '#865B00' },
  other: OTHER_COLOR,
  // 하위 항목이 생기기 전의 "기타" 기록은 이외와 같은 색
  etc: OTHER_COLOR,
};

export const CAT_COLORS: Record<Category, { bg: string; fg: string }> = {
  한식: { bg: '#FCE9D9', fg: '#B55A1E' },
  분식: { bg: '#E2EFE6', fg: '#1F6B43' },
  중식: { bg: '#F6E3E1', fg: '#A93226' },
  일식: { bg: '#E3EAF5', fg: '#2B5FA8' },
  양식: { bg: '#EFE7F3', fg: '#6D3F86' },
  아시안: { bg: '#FFF3C4', fg: '#7A5A00' },
};

/** 음식 종류를 한눈에 알아보게 하는 이모지. 화면에는 CatIcon 으로 그린다 (그림이 있는 종류는 그림) */
export const CAT_EMOJI: Record<Category | '전체', string> = {
  전체: '🍽️',
  한식: '🍚',
  분식: '🍢',
  중식: '🍜',
  일식: '🍣',
  양식: '🍝',
  아시안: '🍛',
};

/** 이모지가 없는 대표 음식은 직접 그린 그림을 쓴다: 분식 = 떡볶이, 중식 = 짜장면 (src/assets/food) */
export const CAT_IMAGE: Partial<Record<Category | '전체', StaticImageData>> = {
  분식: tteokbokki as StaticImageData,
  중식: jjajangmyeon as StaticImageData,
};

/** 기록 하나의 색 (기록 탭 달력·목록). 항목 색을 따르고, 0원 기록은 회색 */
export const mealColor = (m: Meal): KindColor =>
  m.price === 0 ? { base: C.line, bg: C.divider, fg: C.muted } : KIND_COLORS[kindOf(m)];
