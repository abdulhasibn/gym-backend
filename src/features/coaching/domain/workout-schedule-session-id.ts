import type { Brand } from '../../../shared/primitives/brand';

export type WorkoutScheduleSessionId = Brand<string, 'WorkoutScheduleSessionId'>;

export function toWorkoutScheduleSessionId(value: string): WorkoutScheduleSessionId {
  return value as WorkoutScheduleSessionId;
}
