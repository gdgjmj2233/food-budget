import { useToast } from '@/components/toast';
import { won, type MissingDay } from '@/lib/budget';
import { useBudget, type Delta } from '@/store/budget-store';

const ENDED = '예산 기간이 끝났어요. 예산 탭에서 새 기간을 시작하세요.';

const change = (d: Delta) => `오늘 남은 금액 ${won(d.after)}원`;

/** 직접 입력 + 어제 기록 채우기. 결과를 토스트로 알려준다. */
export function useEat() {
  const { record } = useBudget();
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

  /** 가게 이름과 메뉴 이름을 나눠서 기록한다 (예: 학생식당 · 한상한담) */
  const eatAt = (name: string, menu: string, price: number) => {
    const delta = record(name, menu, price);
    if (!delta) {
      toast(ENDED);
      return;
    }
    toast(`${delta.name} ${won(price)}원 차감 · ${change(delta)}`);
  };

  /** 어제 비어 있던 기록을 채운다 */
  const fillMissing = (day: MissingDay, name: string, menu: string, price: number, placeId?: string) => {
    const delta = record(name, menu, price, { placeId, at: day.at });
    if (!delta) {
      toast(ENDED);
      return;
    }
    toast(`어제 기록을 채웠어요 · ${change(delta)}`);
  };

  return { eatCustom, eatAt, fillMissing };
}
