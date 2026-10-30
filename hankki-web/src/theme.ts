import type { BudgetStatus } from '@/lib/budget';
import type { Category } from '@/data/places';

export const C = {
  ground: '#F2F4F6',
  card: '#FFFFFF',
  ink: '#191F28',
  muted: '#6B7684',
  line: '#E5E8EB',
  divider: '#F2F4F6',
  primary: '#3182F6',
  primaryDark: '#1B64DA',
  primarySoft: '#E8F3FF',
  warn: '#C26A00',
  orange: '#E8590C',
  over: '#E5303F',
  orangeSoft: '#FFF0E0',
} as const;

export const STATUS: Record<BudgetStatus, { label: string; color: string }> = {
  ok: { label: '여유', color: C.primary },
  warn: { label: '주의', color: C.warn },
  low: { label: '임박', color: C.orange },
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
