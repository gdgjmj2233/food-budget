// 인하대 학생식당(학생회관) 주간 메뉴
// cafeteria-menu.json 은 npm run update:cafeteria 로 학교 홈페이지에서 받아 온다.

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

/** 화면에 보여 주는 순서와 이모지 */
export const MEALS = [
  { key: '조식', title: '조식', emoji: '🌅' },
  { key: '중식', title: '중식', emoji: '☀️' },
  { key: '석식', title: '석식', emoji: '🌙' },
  { key: '라면', title: '셀프라면', emoji: '🍜' },
];
