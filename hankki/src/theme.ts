import type { BudgetStatus } from '@/lib/budget';
import type { Category } from '@/data/places';

export const C = {
  ground: '#F5F6F1',
  card: '#FFFFFF',
  ink: '#1B1F1A',
  muted: '#5B6359',
  line: '#DDE0D6',
  divider: '#ECEEE6',
  green: '#1F6B43',
  greenDark: '#1F4D33',
  greenSoft: '#E2EFE6',
  warn: '#9A5B12',
  over: '#A93226',
  orangeSoft: '#FCE9D9',
} as const;

export const STATUS: Record<BudgetStatus, { label: string; color: string }> = {
  ok: { label: '여유', color: C.green },
  warn: { label: '주의', color: C.warn },
  over: { label: '초과', color: C.over },
};

export const CAT_COLORS: Record<Category, { bg: string; fg: string }> = {
  한식: { bg: '#FCE9D9', fg: '#B55A1E' },
  분식: { bg: '#E2EFE6', fg: '#1F6B43' },
  중식: { bg: '#F6E3E1', fg: '#A93226' },
  일식: { bg: '#E3EAF5', fg: '#2B5FA8' },
  양식: { bg: '#EFE7F3', fg: '#6D3F86' },
  아시안: { bg: '#FFF3C4', fg: '#7A5A00' },
};
