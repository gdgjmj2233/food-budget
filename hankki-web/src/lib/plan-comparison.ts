import type { Meal } from './budget';

interface Plan { id: string; price: number; }

/** 완료한 계획만 같은 식사의 실제 지출과 비교한다. 미완료 계획을 절약으로 계산하지 않는다. */
export function comparePlans(plans: Plan[], meals: Meal[]) {
  const completed = plans.flatMap(plan => {
    const meal = meals.find(m => m.planId === plan.id);
    return meal ? [{ plan, meal }] : [];
  });
  const linkedIds = new Set(completed.map(x => x.meal.id));
  const completedBudget = completed.reduce((sum, x) => sum + x.plan.price, 0);
  const completedActual = completed.reduce((sum, x) => sum + x.meal.price, 0);
  return {
    actual: meals.reduce((sum, m) => sum + m.price, 0),
    completedCount: completed.length,
    difference: completedActual - completedBudget,
    unplanned: meals.filter(m => !linkedIds.has(m.id)).reduce((sum, m) => sum + m.price, 0),
  };
}
