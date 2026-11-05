import { useToast } from '@/components/toast';
import { won, type MissingMeal } from '@/lib/budget';
import { useBudget, type Delta } from '@/store/budget-store';

const ENDED = '예산 기간이 끝났어요. 예산 탭에서 새 기간을 시작하세요.';

const change = (d: Delta) => `한 끼 권장 ${won(d.after)}원으로 ${d.after >= d.before ? '늘었어요' : '줄었어요'}`;

/** 직접 입력 + 스킵 + 어제 끼니 채우기. 결과를 토스트로 알려준다. */
export function useEat() {
  const { record, summary } = useBudget();
  const toast = useToast();

  /** 먹은 메뉴를 이름·가격 직접 입력으로 기록한다 */
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

  /** 어제 비어 있던 끼니를 채운다. price 0 은 안 먹은 끼니 */
  const fillMissing = (slot: MissingMeal, name: string, menu: string, price: number, placeId?: string) => {
    const delta = record(name, menu, price, { placeId, at: slot.at });
    if (!delta) {
      toast(ENDED);
      return;
    }
    toast(`어제 ${slot.slot} 기록을 채웠어요 · ${change(delta)}`);
  };

  return { eatCustom, skip, fillMissing };
}
