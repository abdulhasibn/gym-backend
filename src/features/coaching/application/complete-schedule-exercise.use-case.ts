import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import { assertScheduleCompletionWindow } from '../domain/schedule-completion-window';
import type { WorkoutScheduleCompletionRepository } from '../domain/workout-schedule-completion.repository';
import { toWorkoutScheduleExerciseId } from '../domain/workout-schedule-exercise-id';
import type { WorkoutScheduleRepository } from '../domain/workout-schedule.repository';
import { CoachingAddonRequiredError } from './coaching-addon-required.error';
import { DietClientPolicy } from './diet-client.policy';

export class CompleteScheduleExerciseUseCase {
  constructor(
    private readonly policy: DietClientPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly schedule: WorkoutScheduleRepository,
    private readonly completions: WorkoutScheduleCompletionRepository,
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
        'Workout schedule is read-only after the coaching addon expires',
      );
    }

    const day = await this.schedule.findExerciseContext(
      toWorkoutScheduleExerciseId(itemId),
      actor.userId,
      gymOrgId,
    );
    if (day === null) {
      throw new NotFoundError('Scheduled workout exercise not found');
    }

    assertScheduleCompletionWindow(day.scheduleDate, today);

    const found = day.findExercise(toWorkoutScheduleExerciseId(itemId));
    if (found === null) {
      throw new NotFoundError('Scheduled workout exercise not found');
    }

    await this.completions.complete({
      exerciseId: found.exercise.id,
      clientUserId: actor.userId,
      completedOn: day.scheduleDate,
    });
  }
}
