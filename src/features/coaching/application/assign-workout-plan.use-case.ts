import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import type { ExerciseCatalogRepository } from '../domain/exercise-catalog.repository';
import { toExerciseItemId } from '../domain/exercise-item-id';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import { InvalidWorkoutPlanError } from '../domain/invalid-workout-plan.error';
import { WorkoutPlan } from '../domain/workout-plan.entity';
import { toWorkoutPlanDayId } from '../domain/workout-plan-day-id';
import { toWorkoutPlanExerciseId } from '../domain/workout-plan-exercise-id';
import { toWorkoutPlanId } from '../domain/workout-plan-id';
import type { WorkoutPlanRepository } from '../domain/workout-plan.repository';
import { WorkoutDayLabel } from '../domain/workout-day-label.value-object';
import { WorkoutPlanTitle } from '../domain/workout-plan-title.value-object';
import { CoachingAddonRequiredError } from './coaching-addon-required.error';
import { CoachingForbiddenError } from './coaching-forbidden.error';
import { toWorkoutPlanDtoFromEntity, type WorkoutPlanDto } from './coaching.dto';
import { DietAssignPolicy } from './diet-assign.policy';

export interface AssignWorkoutPlanExerciseInput {
  readonly exerciseItemId: string;
  readonly sets: number | null;
  readonly reps: string | null;
  readonly notes: string | null;
}

export interface AssignWorkoutPlanDayInput {
  readonly dayLabel: string;
  readonly exercises: readonly AssignWorkoutPlanExerciseInput[];
}

export interface AssignWorkoutPlanCommand {
  readonly gymOrgId: GymOrgId;
  readonly clientUserId: string;
  readonly title: string;
  readonly notes: string | null;
  readonly days: readonly AssignWorkoutPlanDayInput[];
}

export class AssignWorkoutPlanUseCase {
  constructor(
    private readonly policy: DietAssignPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly catalog: ExerciseCatalogRepository,
    private readonly plans: WorkoutPlanRepository,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: AssignWorkoutPlanCommand,
  ): Promise<WorkoutPlanDto> {
    const trainerId = await this.policy.requireAssigner(actor, command.gymOrgId);
    const clientUserId = toUserId(command.clientUserId);

    const membership = await this.entitlement.findActiveMembership(clientUserId, command.gymOrgId);
    if (membership === null) {
      throw new NotFoundError('Active membership not found');
    }
    if (actor.roleCode === 'TRAINER' && membership.assignedTrainerId !== trainerId) {
      throw new CoachingForbiddenError('Only the assigned trainer can author this workout plan');
    }

    const now = this.clock.now();
    const today = await this.gymClock.today(command.gymOrgId, now);
    if (!(await this.entitlement.hasInDateCoachingAddon(clientUserId, command.gymOrgId, today))) {
      throw new CoachingAddonRequiredError();
    }

    const days = [];
    for (const [dayIndex, day] of command.days.entries()) {
      const exercises = [];
      for (const [exerciseIndex, exercise] of day.exercises.entries()) {
        const exerciseItemId = toExerciseItemId(exercise.exerciseItemId);
        const exists = await this.catalog.hasLiveSeed(exerciseItemId);
        if (!exists) {
          throw new NotFoundError('Seed catalog exercise not found');
        }
        exercises.push({
          id: toWorkoutPlanExerciseId(this.ids.generate()),
          exerciseItemId,
          sets: exercise.sets,
          reps: exercise.reps,
          notes: exercise.notes,
          sortOrder: exerciseIndex,
        });
      }
      days.push({
        id: toWorkoutPlanDayId(this.ids.generate()),
        dayLabel: WorkoutDayLabel.create(day.dayLabel),
        sortOrder: dayIndex,
        exercises,
      });
    }

    if (days.length === 0) {
      throw new InvalidWorkoutPlanError('Workout plan must include at least one day');
    }

    const plan = WorkoutPlan.create({
      id: toWorkoutPlanId(this.ids.generate()),
      clientUserId,
      trainerId,
      gymOrgId: command.gymOrgId,
      title: WorkoutPlanTitle.create(command.title),
      notes: command.notes,
      days,
      now,
    });
    await this.plans.assign(plan);

    return toWorkoutPlanDtoFromEntity(plan, { writable: true, completionDate: today.value });
  }
}
