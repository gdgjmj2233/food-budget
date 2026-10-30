import { useToast } from '@/components/toast';
import { PLACES, mainMenu, type Menu, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { useBudget, type Delta } from '@/store/budget-store';

const ENDED = '예산 기간이 끝났어요. 예산 탭에서 새 기간을 시작하세요.';

const change = (d: Delta) => `한 끼 권장 ${won(d.after)}원으로 ${d.after >= d.before ? '늘었어요' : '줄었어요'}`;

/** 메뉴 선택(기록) + 직접 입력 + 스킵 + 자동 선택. 결과를 토스트로 알려준다. */
export function useEat() {
  const { eat, record, summary } = useBudget();
  const toast = useToast();

  const pick = (place: Place, menu: Menu) => {
    const delta = eat(place, menu);
    if (!delta) {
      toast(ENDED);
      return;
    }
    toast(`${place.name} ${menu.name} ${won(menu.price)}원 차감 · ${change(delta)}`);
  };

  /** 목록에 없는 메뉴를 이름·가격 직접 입력으로 기록한다 */
  const eatCustom = (menu: string, price: number) => {
    const delta = record(menu || '식사', '직접 입력', price);
    if (!delta) {
      toast(ENDED);
      return;
    }
    toast(`${delta.name} ${won(price)}원 차감 · ${change(delta)}`);
  };

  /** 이번 끼니를 0원으로 기록해 건너뛴다. 남은 끼니가 줄어서 한 끼 권장 금액이 올라간다 */
  const skip = () => {
    if (summary.ended) {
      toast(ENDED);
      return;
    }
    if (summary.mealsLeftToday === 0) {
      toast('오늘은 건너뛸 끼니가 남아 있지 않아요');
      return;
    }
    const delta = record('스킵', '끼니 건너뜀', 0);
    if (delta) toast(`이번 끼니를 건너뛰었어요 · ${change(delta)}`);
  };

  /** 대표 메뉴가 한 끼 권장 금액 이하인 식당을 고른다. 없으면 대표 메뉴 가격이 가장 낮은 곳. */
  const pickRandom = (places: Place[] = PLACES) => {
    const pairs = places.map((p) => ({ p, m: mainMenu(p) }));
    if (!pairs.length) return;
    const pool = pairs.filter((x) => x.m.price <= summary.perMeal);
    const choices = pool.length ? pool : [pairs.reduce((a, b) => (b.m.price < a.m.price ? b : a))];
    const { p, m } = choices[Math.floor(Math.random() * choices.length)];
    pick(p, m);
  };

  return { pick, eatCustom, skip, pickRandom };
}
