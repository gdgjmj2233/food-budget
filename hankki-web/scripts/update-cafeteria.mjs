// 인하대 홈페이지의 학생식당 주간 메뉴를 읽어 src/data/cafeteria-menu.json 에 저장한다.
// 앱은 GitHub Pages 에서 돌아서 브라우저가 학교 사이트를 직접 읽지 못하기 때문에 미리 받아 둔다.
// 실행: npm run update:cafeteria

import fs from 'node:fs';

const MENU_URL = 'https://www.inha.ac.kr/kr/1072/subview.do';
const OUT = new URL('../src/data/cafeteria-menu.json', import.meta.url);

const text = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** 표의 칸이 아니라 코너 이름으로 나눈다. 금요일 석식처럼 다른 시간대 표에 들어가 있는 경우가 있다 */
const mealOf = (name) => (/조식/.test(name) ? '조식' : /석식/.test(name) ? '석식' : /라면/.test(name) ? '라면' : '중식');

/** "11.02." 에는 연도가 없어서 지금과 가장 가까운 해로 본다 */
function toDate(month, day, now = new Date()) {
  const year = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].sort(
    (a, b) => Math.abs(new Date(a, month - 1, day) - now) - Math.abs(new Date(b, month - 1, day) - now),
  )[0];
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "신라면/너구리" 처럼 메뉴마다 가격이 따로 있으면 메뉴별로 나눈다 */
function toCorners(meal, name, items, prices) {
  const names = items.length === 1 ? items[0].split('/').map((s) => s.trim()) : [];
  if (prices.length > 1 && names.length === prices.length) {
    return names.map((n, i) => ({ meal, name: n, items: [], prices: [prices[i]] }));
  }
  return [{ meal, name, items, prices }];
}

function parseMenu(html) {
  const week = text(html.match(/<strong>([^<]*\(월\)[^<]*)<\/strong>/)?.[1] ?? '');
  const hours = {};
  const days = [];
  const token =
    /<h2 class="objHeading_h2">(.*?)<\/h2>|<h3 [^>]*objHeading_h3[^>]*>(.*?)<\/h3>|<tr>\s*<th scope="row">(.*?)<\/th>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>/gs;

  for (const [, dayHead, mealHead, corner, menu, price] of html.matchAll(token)) {
    if (dayHead) {
      const m = text(dayHead).match(/\((\d+)\.(\d+)\.\)/);
      const date = m && toDate(Number(m[1]), Number(m[2]));
      if (date && days.at(-1)?.date !== date) days.push({ date, corners: [] });
    } else if (mealHead) {
      const head = text(mealHead);
      const time = head.match(/(\d\d:\d\d)\s*~\s*(\d\d:\d\d)/);
      if (time) hours[mealOf(head)] = `${time[1]}~${time[2]}`;
    } else if (corner && days.length) {
      const name = text(corner);
      const items = menu.split(/<br\s*\/?>/i).map(text).filter(Boolean);
      const prices = text(price).split('/').map((p) => Number(p.replace(/\D/g, ''))).filter((p) => p > 0);
      days.at(-1).corners.push(...toCorners(mealOf(name), name, items, prices));
    }
  }
  // 공휴일처럼 메뉴가 없는 날은 뺀다
  return { week, hours, days: days.filter((d) => d.corners.length) };
}

const res = await fetch(MENU_URL, { headers: { 'User-Agent': 'hankki-web menu updater' }, signal: AbortSignal.timeout(30_000) });
if (!res.ok) throw new Error(`메뉴 페이지를 읽지 못했어요: ${res.status}`);

const menu = parseMenu(await res.text());
if (!menu.week || !menu.days.length) {
  throw new Error('메뉴 표를 찾지 못했어요. 페이지 구조가 바뀌었을 수 있어서 저장하지 않았어요.');
}

fs.writeFileSync(OUT, `${JSON.stringify(menu, null, 2)}\n`);
console.log(`${menu.week} 메뉴 ${menu.days.length}일치를 저장했어요.`);
