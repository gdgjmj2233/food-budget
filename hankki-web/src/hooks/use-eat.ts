import { useToast } from '@/components/toast';
import type { Place } from '@/data/places';
import { won, type MissingDay } from '@/lib/budget';
import { useBudget, type Delta } from '@/store/budget-store';

const ENDED = '예산 기간이 끝났어요. 예산 탭에서 새 기간을 시작하세요.';

const change = (d: Delta) => `오늘 남은 금액 ${won(d.after)}원`;

/** 직접 입력 + 식당 카드의 "여기서 밥먹기" + 어제 기록 채우기. 결과를 토스트로 알려준다. */
export function useEat() {
  const { record } = useBudget();
  const toast = useToast();

  // 식당을 골랐으면 가게 이름·메뉴로, 안 골랐으면 적은 메뉴를 이름으로 남긴다
  const save = (menu: string, price: number, place?: Place, at?: number) =>
    place ? record(place.name, menu, price, { placeId: place.id, at }) : record(menu || '식사', '', price, { at });

  /** 먹은 것을 기록한다. place 는 지도에서 고른 식당 */
  const eatCustom = (menu: string, price: number, place?: Place) => {
    const delta = save(menu, price, place);
    if (!delta) {
      toast(ENDED);
      return;
    }
    toast(`${delta.name} ${won(price)}원 차감 · ${change(delta)}`);
  };

  /**
   * 가게 이름과 메뉴 이름을 나눠서 기록한다 (예: 학생식당 · 한상한담).
   * placeId 는 추천 탭 식당 카드에서 기록할 때 넘긴다. 기록했으면 true
   */
  const eatAt = (name: string, menu: string, price: number, placeId?: string) => {
    const delta = record(name, menu, price, placeId ? { placeId } : undefined);
    if (!delta) {
      toast(ENDED);
      return false;
    }
    toast(`${delta.name} ${won(price)}원 차감 · ${change(delta)}`);
    return true;
  };

  /** 어제 비어 있던 기록을 채운다 */
  const fillMissing = (day: MissingDay, menu: string, price: number, place?: Place) => {
    const delta = save(menu, price, place, day.at);
    if (!delta) {
      toast(ENDED);
      return;
    }
    toast(`어제 기록을 채웠어요 · ${change(delta)}`);
  };

  return { eatCustom, eatAt, fillMissing };
}
