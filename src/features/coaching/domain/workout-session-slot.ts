export const WORKOUT_SESSION_SLOTS = ['MORNING', 'EVENING'] as const;

export type WorkoutSessionSlot = (typeof WORKOUT_SESSION_SLOTS)[number];

export function parseWorkoutSessionSlot(value: string): WorkoutSessionSlot {
  if ((WORKOUT_SESSION_SLOTS as readonly string[]).includes(value)) {
    return value as WorkoutSessionSlot;
  }
  throw new Error(`Invalid workout session slot: ${value}`);
}
