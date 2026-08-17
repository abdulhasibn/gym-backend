import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { WorkoutPlan } from './workout-plan.entity';

export interface WorkoutPlanRepository {
  findActiveByClientAtGym(clientUserId: UserId, gymOrgId: GymOrgId): Promise<WorkoutPlan | null>;

  /**
   * Archives any live ACTIVE plan for (client, gym), then inserts the new ACTIVE plan.
   */
  assign(plan: WorkoutPlan): Promise<void>;
}
