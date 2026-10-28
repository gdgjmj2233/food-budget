import { useToast } from '@/components/toast';
import { PLACES, type Menu, type Place } from '@/data/places';
import { won } from '@/lib/budget';
import { useBudget } from '@/store/budget-store';

/** 메뉴 선택(기록) + 자동 선택. 결과를 토스트로 알려준다. */
export function useEat() {
  const { eat, summary } = useBudget();
  const toast = useToast();

  const pick = (place: Place, menu: Menu) => {
    const delta = eat(place, menu);
    if (!delta) {
      toast('예산 기간이 끝났어요. 예산 탭에서 새 기간을 시작하세요.');
      return;
    }
    const dir = delta.after >= delta.before ? '늘었어요' : '줄었어요';
    toast(`${place.name} ${menu.name} ${won(menu.price)}원 차감 · 한 끼 권장 ${won(delta.after)}원으로 ${dir}`);
  };

  /** 지금 한 끼 권장 금액 이하 메뉴 중에서 무작위로 고른다. 없으면 가장 싼 메뉴. */
  const pickRandom = (places: Place[] = PLACES) => {
    const pairs = places.flatMap((p) => p.menus.map((m) => ({ p, m })));
    if (!pairs.length) return;
    const pool = pairs.filter((x) => x.m.price <= summary.perMeal);
    const choices = pool.length ? pool : [pairs.reduce((a, b) => (b.m.price < a.m.price ? b : a))];
    const { p, m } = choices[Math.floor(Math.random() * choices.length)];
    pick(p, m);
  };

  return { pick, pickRandom };
}
