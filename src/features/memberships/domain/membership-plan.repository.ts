import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { MembershipPlan } from './membership-plan.entity';
import type { MembershipPlanId } from './membership-plan-id';

export interface MembershipPlanRepository {
  findById(gymOrgId: GymOrgId, planId: MembershipPlanId): Promise<MembershipPlan | null>;
  save(plan: MembershipPlan): Promise<void>;
}
