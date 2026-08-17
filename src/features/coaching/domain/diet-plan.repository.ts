import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { DietPlan } from './diet-plan.entity';

export interface DietPlanRepository {
  findActiveByClientAtGym(clientUserId: UserId, gymOrgId: GymOrgId): Promise<DietPlan | null>;

  /**
   * Archives any live ACTIVE plan for (client, gym), then inserts the new ACTIVE plan.
   */
  assign(plan: DietPlan): Promise<void>;
}
