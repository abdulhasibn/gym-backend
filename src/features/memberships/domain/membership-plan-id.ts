import type { Brand } from '../../../shared/primitives/brand';

export type MembershipPlanId = Brand<string, 'MembershipPlanId'>;

export function toMembershipPlanId(value: string): MembershipPlanId {
  return value as MembershipPlanId;
}
