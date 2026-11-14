import { useToast } from '@/components/toast';
import type { Place } from '@/data/places';
import { addDays, formatDate, fromDateKey, KIND_LABEL, toDateKey, won, type MealKind } from '@/lib/budget';
import { useBudget, type Delta } from '@/store/budget-store';

const ENDED = '예산 기간이 끝났어요. 예산 탭에서 새 기간을 시작하세요.';

// 주말(예산이 편성되지 않은 날)에는 오늘 남은 금액이 없어서 이번 기간 남은 예산을 알려 준다
const change = (d: Delta) => (d.restDay ? `남은 예산 ${won(d.remain)}원` : `오늘 남은 금액 ${won(d.after)}원`);

/** 알림 앞에 붙이는 항목 이름 ("점심 · "). 금액만 적은 기타처럼 이름이 곧 항목이면 붙이지 않는다 */
const kindPrefix = (name: string, kind?: MealKind) => (kind && KIND_LABEL[kind] !== name ? `${KIND_LABEL[kind]} · ` : '');

/** 토스트에 쓰는 날짜 이름: 오늘·어제는 그대로, 나머지는 "11월 12일 (목)" */
function dayLabel(date: string) {
  const today = new Date();
  if (date === toDateKey(today)) return '오늘';
  if (date === toDateKey(addDays(today, -1))) return '어제';
  return formatDate(fromDateKey(date));
}

/** 직접 입력 + 식당 카드의 "여기서 밥먹기" + 지난 날 기록 채우기. 결과를 토스트로 알려준다. */
export function useEat() {
  const { record } = useBudget();
  const toast = useToast();

  // 식당을 골랐으면 가게 이름·메뉴로, 안 골랐으면 적은 메뉴를 이름으로 남긴다. kind 는 고른 항목(아침·점심 …)
  const save = (menu: string, price: number, place?: Place, at?: number, kind?: MealKind) =>
    place
      ? record(place.name, menu, price, { placeId: place.id, at, kind })
      : record(menu || '식사', '', price, { at, kind });

  /** 먹은 것을 기록한다. place 는 목록에서 고른 식당, kind 는 고른 항목 */
  const eatCustom = (menu: string, price: number, place?: Place, kind?: MealKind) => {
    const delta = save(menu, price, place, undefined, kind);
    if (!delta) {
      toast(ENDED);
      return;
    }
    toast(`${kindPrefix(delta.name, kind)}${delta.name} ${won(price)}원 차감 · ${change(delta)}`);
  };

  /**
   * 가게 이름과 메뉴 이름을 나눠서 기록한다 (예: 학생식당 · 한상한담).
   * placeId 는 주변 식당 탭 식당 카드에서 기록할 때 넘긴다. kind 는 고른 항목. 기록했으면 true
   */
  const eatAt = (name: string, menu: string, price: number, placeId?: string, kind?: MealKind) => {
    const delta = record(name, menu, price, { placeId, kind });
    if (!delta) {
      toast(ENDED);
      return false;
    }
    toast(`${kindPrefix(delta.name, kind)}${delta.name} ${won(price)}원 차감 · ${change(delta)}`);
    return true;
  };

  /** 고른 날(YYYY-MM-DD)에 먹은 것으로 기록한다. 어제 기록 카드의 "직접 입력"에서 쓴다 */
  const fillDay = (date: string, menu: string, price: number, place?: Place, kind?: MealKind) => {
    const d = fromDateKey(date);
    // 그 날 낮 12시에 먹은 것으로 남긴다
    const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
    const delta = save(menu, price, place, at, kind);
    if (!delta) {
      toast(ENDED);
      return;
    }
    toast(`${dayLabel(date)}${kind ? ` ${KIND_LABEL[kind]}` : ''} 기록을 채웠어요 · ${change(delta)}`);
  };

  return { eatCustom, eatAt, fillDay };
}
