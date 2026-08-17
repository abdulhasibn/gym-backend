import { DietPlanTitle } from '../domain/diet-plan-title.value-object';

const TITLE_MAX = 120;

export function copyDietPlanTitle(source: DietPlanTitle): DietPlanTitle {
  const prefix = 'Copy of ';
  const raw = `${prefix}${source.value}`;
  if (raw.length <= TITLE_MAX) {
    return DietPlanTitle.create(raw);
  }
  return DietPlanTitle.create(raw.slice(0, TITLE_MAX));
}
