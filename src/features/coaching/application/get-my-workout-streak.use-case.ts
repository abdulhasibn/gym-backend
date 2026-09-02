import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import type { WorkoutScheduleCompletionQueries } from '../domain/workout-schedule-completion.queries';
import type { WorkoutScheduleQueries } from '../domain/workout-schedule.queries';
import type { WorkoutStreakDto } from './coaching.dto';
import { DietClientPolicy } from './diet-client.policy';
import { emptyWorkoutStreakDto, loadWorkoutStreakDto } from './load-workout-streak';

export class GetMyWorkoutStreakUseCase {
  constructor(
    private readonly policy: DietClientPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly scheduleQueries: WorkoutScheduleQueries,
    private readonly completionQueries: WorkoutScheduleCompletionQueries,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<WorkoutStreakDto> {
    this.policy.requireClientSelf(actor);

    const today = await this.gymClock.today(gymOrgId, this.clock.now());
    const membership = await this.entitlement.findActiveMembership(actor.userId, gymOrgId);
    if (membership === null) {
      return emptyWorkoutStreakDto(today);
    }

    return loadWorkoutStreakDto({
      clientUserId: actor.userId,
      gymOrgId,
      asOf: today,
      scheduleQueries: this.scheduleQueries,
      completionQueries: this.completionQueries,
    });
  }
}
