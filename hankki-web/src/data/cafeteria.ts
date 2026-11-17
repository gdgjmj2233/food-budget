// 인하대 학생식당(학생회관) 주간 메뉴
// cafeteria-menu.json 은 npm run update:cafeteria 로 학교 홈페이지에서 받아 온다.

import type { MealKind } from '@/lib/budget';
import menu from './cafeteria-menu.json';

export interface CafeteriaCorner {
  /** 조식 · 중식 · 석식 · 라면 */
  meal: string;
  name: string;
  items: string[];
  /** 메뉴에 따라 가격이 여러 개일 수 있다. 플러스코너처럼 가격이 없으면 빈 배열 */
  prices: number[];
}

export interface CafeteriaDay {
  /** YYYY-MM-DD */
  date: string;
  corners: CafeteriaCorner[];
}

export const CAFETERIA: { week: string; hours: Record<string, string>; days: CafeteriaDay[] } = menu;

export const CAFETERIA_URL = 'https://www.inha.ac.kr/kr/1072/subview.do';

/** 학식 탭에서 기록할 때 남기는 가게 이름. 오늘의 한마디가 학식 기록을 알아볼 때도 쓴다 */
export const CAFETERIA_NAME = '학생식당';

/**
 * 화면에 보여 주는 순서와 이모지.
 * kind 는 이 끼니 메뉴를 담을 때 정해지는 기록 항목이다. 셀프라면은 끼니가 정해져 있지 않아서 없다
 */
export const MEALS: { key: string; title: string; emoji: string; kind?: MealKind }[] = [
  { key: '조식', title: '조식', emoji: '🌅', kind: 'breakfast' },
  { key: '중식', title: '중식', emoji: '☀️', kind: 'lunch' },
  { key: '석식', title: '석식', emoji: '🌙', kind: 'dinner' },
  { key: '라면', title: '셀프라면', emoji: '🍜' },
];
