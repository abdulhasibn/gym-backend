import type { Brand } from '../../../shared/primitives/brand';

export type ExerciseItemId = Brand<string, 'ExerciseItemId'>;

export function toExerciseItemId(value: string): ExerciseItemId {
  return value as ExerciseItemId;
}
