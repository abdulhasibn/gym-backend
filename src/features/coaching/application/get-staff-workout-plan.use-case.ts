import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import type { WorkoutPlanQueries } from '../domain/workout-plan.queries';
import { CoachingForbiddenError } from './coaching-forbidden.error';
import { toWorkoutPlanDtoFromSummary, type WorkoutPlanDto } from './coaching.dto';
import { DietAssignPolicy } from './diet-assign.policy';

export class GetStaffWorkoutPlanUseCase {
  constructor(
    private readonly policy: DietAssignPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly queries: WorkoutPlanQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    clientUserId: string,
  ): Promise<WorkoutPlanDto | null> {
    const trainerId = await this.policy.requireStaffReader(actor, gymOrgId);
    const clientId = toUserId(clientUserId);

    const membership = await this.entitlement.findActiveMembership(clientId, gymOrgId);
    if (membership === null) {
      throw new NotFoundError('Active membership not found');
    }
    if (actor.roleCode === 'TRAINER' && membership.assignedTrainerId !== trainerId) {
      throw new CoachingForbiddenError('Only the assigned trainer can view this workout plan');
    }

    const summary = await this.queries.findActiveByClientAtGym(clientId, gymOrgId);
    if (summary === null) {
      return null;
    }
    return toWorkoutPlanDtoFromSummary(summary, { writable: false, completionDate: null });
  }
}
