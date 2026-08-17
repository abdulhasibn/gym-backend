import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import type { WorkoutCompletionQueries } from '../domain/workout-completion.queries';
import type { WorkoutPlanQueries } from '../domain/workout-plan.queries';
import { toWorkoutPlanDtoFromSummary, type WorkoutPlanDto } from './coaching.dto';
import { DietClientPolicy } from './diet-client.policy';

export class GetMyWorkoutPlanUseCase {
  constructor(
    private readonly policy: DietClientPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly queries: WorkoutPlanQueries,
    private readonly completions: WorkoutCompletionQueries,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<WorkoutPlanDto | null> {
    this.policy.requireClientSelf(actor);

    const membership = await this.entitlement.findActiveMembership(actor.userId, gymOrgId);
    if (membership === null) {
      return null;
    }

    const summary = await this.queries.findActiveByClientAtGym(actor.userId, gymOrgId);
    if (summary === null) {
      return null;
    }

    const today = await this.gymClock.today(gymOrgId, this.clock.now());
    const writable = await this.entitlement.hasInDateCoachingAddon(actor.userId, gymOrgId, today);
    const exerciseIds = summary.days.flatMap((day) => day.exercises.map((exercise) => exercise.id));
    const completed = await this.completions.findCompletedExerciseIds(
      actor.userId,
      today,
      exerciseIds,
    );

    return toWorkoutPlanDtoFromSummary(summary, {
      writable,
      completionDate: today.value,
      completedExerciseIds: new Set(completed),
    });
  }
}
