import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { UserId } from '../../../../domain/shared/user-id';
import type { WorkoutPlan } from '../../domain/workout-plan.entity';
import type { WorkoutPlanRepository } from '../../domain/workout-plan.repository';

export class InMemoryWorkoutPlanRepository implements WorkoutPlanRepository {
  last: WorkoutPlan | null = null;

  async findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<WorkoutPlan | null> {
    if (
      this.last === null ||
      this.last.clientUserId !== clientUserId ||
      this.last.gymOrgId !== gymOrgId ||
      !this.last.isActive
    ) {
      return null;
    }
    return this.last;
  }

  async assign(plan: WorkoutPlan): Promise<void> {
    if (this.last !== null && this.last.isActive) {
      this.last.archive(plan.updatedAt);
    }
    this.last = plan;
  }
}
