import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { DietPlanQueries } from '../domain/diet-plan.queries';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import { CoachingForbiddenError } from './coaching-forbidden.error';
import { DietAssignPolicy } from './diet-assign.policy';
import { toDietPlanDtoFromSummary, type DietPlanDto } from './coaching.dto';

export class GetStaffDietPlanUseCase {
  constructor(
    private readonly policy: DietAssignPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly queries: DietPlanQueries,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    clientUserId: string,
  ): Promise<DietPlanDto | null> {
    const trainerId = await this.policy.requireStaffReader(actor, gymOrgId);
    const clientId = toUserId(clientUserId);

    const membership = await this.entitlement.findActiveMembership(clientId, gymOrgId);
    if (membership === null) {
      throw new NotFoundError('Active membership not found');
    }
    if (actor.roleCode === 'TRAINER' && membership.assignedTrainerId !== trainerId) {
      throw new CoachingForbiddenError('Only the assigned trainer can view this diet plan');
    }

    const summary = await this.queries.findActiveByClientAtGym(clientId, gymOrgId);
    if (summary === null) {
      return null;
    }
    return toDietPlanDtoFromSummary(summary, { writable: false, logDate: null });
  }
}
