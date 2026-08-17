import type { Brand } from '../../../shared/primitives/brand';

export type TrainerProfileId = Brand<string, 'CoachingTrainerProfileId'>;

export function toTrainerProfileId(value: string): TrainerProfileId {
  return value as TrainerProfileId;
}
