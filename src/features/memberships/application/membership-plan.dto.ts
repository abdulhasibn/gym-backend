import type { MembershipPlan } from '../domain/membership-plan.entity';
import type { MembershipPlanSummary } from '../domain/membership-plan.queries';
import type { PlanCapability } from '../domain/plan-capability';
import type { PlanKind } from '../domain/plan-kind';

export interface MembershipPlanDto {
  readonly id: string;
  readonly gymOrgId: string;
  readonly name: string;
  readonly kind: PlanKind;
  readonly capability: PlanCapability | null;
  readonly durationDays: number;
  readonly price: number;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toMembershipPlanDto(plan: MembershipPlan): MembershipPlanDto {
  return {
    id: plan.id,
    gymOrgId: plan.gymOrgId,
    name: plan.name.value,
    kind: plan.kind,
    capability: plan.capability,
    durationDays: plan.durationDays.value,
    price: plan.price.value,
    active: plan.active,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function toMembershipPlanDtoFromSummary(summary: MembershipPlanSummary): MembershipPlanDto {
  return {
    id: summary.id,
    gymOrgId: summary.gymOrgId,
    name: summary.name,
    kind: summary.kind,
    capability: summary.capability,
    durationDays: summary.durationDays,
    price: summary.price,
    active: summary.active,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}
