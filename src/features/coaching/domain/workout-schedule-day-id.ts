import type { Brand } from '../../../shared/primitives/brand';

export type WorkoutScheduleDayId = Brand<string, 'WorkoutScheduleDayId'>;

export function toWorkoutScheduleDayId(value: string): WorkoutScheduleDayId {
  return value as WorkoutScheduleDayId;
}
