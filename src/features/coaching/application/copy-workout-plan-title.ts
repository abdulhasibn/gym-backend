import { WorkoutPlanTitle } from '../domain/workout-plan-title.value-object';

const TITLE_MAX = 120;

export function copyWorkoutPlanTitle(source: WorkoutPlanTitle): WorkoutPlanTitle {
  const prefix = 'Copy of ';
  const raw = `${prefix}${source.value}`;
  if (raw.length <= TITLE_MAX) {
    return WorkoutPlanTitle.create(raw);
  }
  return WorkoutPlanTitle.create(raw.slice(0, TITLE_MAX));
}
