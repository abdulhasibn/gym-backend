import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import type { WorkoutCompletionRepository } from '../domain/workout-completion.repository';
import { toWorkoutPlanExerciseId } from '../domain/workout-plan-exercise-id';
import type { WorkoutPlanRepository } from '../domain/workout-plan.repository';
import { CoachingAddonRequiredError } from './coaching-addon-required.error';
import { DietClientPolicy } from './diet-client.policy';

export class UncompleteWorkoutExerciseUseCase {
  constructor(
    private readonly policy: DietClientPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly plans: WorkoutPlanRepository,
    private readonly completions: WorkoutCompletionRepository,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, gymOrgId: GymOrgId, itemId: string): Promise<void> {
    this.policy.requireClientSelf(actor);

    const membership = await this.entitlement.findActiveMembership(actor.userId, gymOrgId);
    if (membership === null) {
      throw new NotFoundError('Active membership not found');
    }

    const today = await this.gymClock.today(gymOrgId, this.clock.now());
    if (!(await this.entitlement.hasInDateCoachingAddon(actor.userId, gymOrgId, today))) {
      throw new CoachingAddonRequiredError(
        'Workout plan is read-only after the coaching addon expires',
      );
    }

    const plan = await this.plans.findActiveByClientAtGym(actor.userId, gymOrgId);
    if (plan === null || !plan.isActive) {
      throw new NotFoundError('Active workout plan not found');
    }

    const found = plan.findExercise(toWorkoutPlanExerciseId(itemId));
    if (found === null) {
      throw new NotFoundError('Workout plan exercise not found');
    }

    await this.completions.uncomplete({
      exerciseId: found.exercise.id,
      clientUserId: actor.userId,
      completedOn: today,
    });
  }
}
