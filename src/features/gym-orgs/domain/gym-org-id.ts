import type { Brand } from '../../../shared/primitives/brand';

export type GymOrgId = Brand<string, 'GymOrgId'>;

export function toGymOrgId(value: string): GymOrgId {
  return value as GymOrgId;
}
