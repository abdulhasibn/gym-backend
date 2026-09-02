import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Clock } from '../../../shared/clock/clock';
import type { ClientDataGrantGate } from '../domain/client-data-grant.gate';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import type { WorkoutScheduleCompletionQueries } from '../domain/workout-schedule-completion.queries';
import type { WorkoutScheduleQueries } from '../domain/workout-schedule.queries';
import type { WorkoutStreakDto } from './coaching.dto';
import { CoachingForbiddenError } from './coaching-forbidden.error';
import type { DietAssignPolicy } from './diet-assign.policy';
import { loadWorkoutStreakDto } from './load-workout-streak';

const WORKOUT_PLANS_GRANT = 'WORKOUT_PLANS';

export class GetStaffWorkoutStreakUseCase {
  constructor(
    private readonly policy: DietAssignPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly scheduleQueries: WorkoutScheduleQueries,
    private readonly completionQueries: WorkoutScheduleCompletionQueries,
    private readonly grants: ClientDataGrantGate,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    clientUserIdRaw: string,
  ): Promise<WorkoutStreakDto> {
    const trainerId = await this.policy.requireStaffReader(actor, gymOrgId);
    const clientUserId = toUserId(clientUserIdRaw);
    const membership = await this.entitlement.findActiveMembership(clientUserId, gymOrgId);
    if (membership === null) {
      throw new NotFoundError('Active membership not found');
    }
    if (actor.roleCode === 'TRAINER' && membership.assignedTrainerId !== trainerId) {
      throw new CoachingForbiddenError('Only the assigned trainer can read this streak');
    }

    const grantSnapshot = await this.grants.loadForActiveMembership(clientUserId, gymOrgId);
    if (grantSnapshot === null || !grantSnapshot.classGrants.includes(WORKOUT_PLANS_GRANT)) {
      throw new CoachingForbiddenError('WORKOUT_PLANS grant required to view workout streak');
    }

    const today = await this.gymClock.today(gymOrgId, this.clock.now());
    return loadWorkoutStreakDto({
      clientUserId,
      gymOrgId,
      asOf: today,
      scheduleQueries: this.scheduleQueries,
      completionQueries: this.completionQueries,
    });
  }
}
