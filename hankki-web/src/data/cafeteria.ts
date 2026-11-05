// 인하대 교내 식당의 코너별 가격과 운영 시간
// 메뉴는 매일 바뀌어서 코너 단위로만 적고, 오늘 메뉴는 학교 홈페이지로 연결한다.
// 같은 코너도 메뉴에 따라 가격이 달라서, 그 주에 올라온 가장 싼 값과 비싼 값을 적는다.

export interface CafeteriaItem {
  name: string;
  price: number;
  /** 메뉴에 따라 가격이 다르면 가장 비싼 값 */
  maxPrice?: number;
}

export interface CafeteriaMeal {
  title: string;
  hours: string;
  items: CafeteriaItem[];
}

export interface Cafeteria {
  id: string;
  name: string;
  /** 오늘 메뉴를 볼 수 있는 학교 홈페이지 주소 */
  menuUrl: string;
  meals: CafeteriaMeal[];
}

export const CAFETERIA_SOURCE = '인하대학교 홈페이지 · 2026년 11월 2~6일 기준';

export const CAFETERIAS: Cafeteria[] = [
  {
    id: 'student',
    name: '학생식당(학생회관)',
    menuUrl: 'https://www.inha.ac.kr/kr/1072/subview.do',
    meals: [
      { title: '조식', hours: '08:00~09:00', items: [{ name: '천원의 조식', price: 1000 }] },
      {
        title: '중식',
        hours: '11:00~14:00',
        items: [
          { name: '한상한담', price: 6000 },
          { name: 'ONE PLATE', price: 5800, maxPrice: 6800 },
          { name: 'Noodle', price: 5800, maxPrice: 6000 },
          { name: '간편식', price: 6800 },
        ],
      },
      { title: '석식', hours: '17:00~18:30', items: [{ name: '오늘의 석식', price: 5800 }] },
      {
        title: '셀프라면',
        hours: '10:30~18:30',
        items: [
          { name: '신라면·너구리', price: 2500 },
          { name: '불닭볶음면·짜파게티', price: 3000 },
        ],
      },
    ],
  },
  {
    id: 'staff',
    name: '교직원식당',
    menuUrl: 'https://www.inha.ac.kr/kr/1073/subview.do',
    meals: [
      { title: '조식', hours: '08:20~09:20', items: [{ name: '오늘의 조식', price: 5200 }] },
      {
        title: '중식',
        hours: '11:20~13:30',
        items: [
          { name: '한상한담', price: 5700 },
          { name: '마르쉐프', price: 7500, maxPrice: 7800 },
        ],
      },
      { title: '석식', hours: '17:20~18:20', items: [{ name: '오늘의 석식', price: 5500 }] },
      { title: '스낵', hours: '조식·석식 시간', items: [{ name: '토핑라면', price: 4000 }] },
    ],
  },
];
