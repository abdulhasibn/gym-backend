export const WORKOUT_SCHEDULE_DAY_KINDS = ['TRAINING', 'REST'] as const;

export type WorkoutScheduleDayKind = (typeof WORKOUT_SCHEDULE_DAY_KINDS)[number];

export function parseWorkoutScheduleDayKind(value: string): WorkoutScheduleDayKind {
  if ((WORKOUT_SCHEDULE_DAY_KINDS as readonly string[]).includes(value)) {
    return value as WorkoutScheduleDayKind;
  }
  throw new Error(`Invalid workout schedule day kind: ${value}`);
}
