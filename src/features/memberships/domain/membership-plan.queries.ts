import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { MembershipPlanId } from './membership-plan-id';
import type { PlanCapability } from './plan-capability';
import type { PlanKind } from './plan-kind';

export interface MembershipPlanSummary {
  readonly id: MembershipPlanId;
  readonly gymOrgId: GymOrgId;
  readonly name: string;
  readonly kind: PlanKind;
  readonly capability: PlanCapability | null;
  readonly durationDays: number;
  readonly price: number;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListMembershipPlansCriteria {
  readonly gymOrgId: GymOrgId;
  readonly kind?: PlanKind;
  readonly active?: boolean;
}

export interface MembershipPlanQueries {
  get(gymOrgId: GymOrgId, planId: MembershipPlanId): Promise<MembershipPlanSummary | null>;
  list(
    criteria: ListMembershipPlansCriteria,
    page: Pagination,
  ): Promise<Page<MembershipPlanSummary>>;
}
