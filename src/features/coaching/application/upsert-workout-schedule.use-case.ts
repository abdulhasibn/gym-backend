import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import { InvalidWorkoutScheduleError } from '../domain/invalid-workout-schedule.error';
import { toWorkoutPlanTemplateId } from '../domain/workout-plan-template-id';
import type { WorkoutPlanTemplateRepository } from '../domain/workout-plan-template.repository';
import { WorkoutScheduleDay } from '../domain/workout-schedule-day.entity';
import type { WorkoutScheduleDayKind } from '../domain/workout-schedule-day-kind';
import { toWorkoutScheduleDayId } from '../domain/workout-schedule-day-id';
import { toWorkoutScheduleExerciseId } from '../domain/workout-schedule-exercise-id';
import { toWorkoutScheduleSessionId } from '../domain/workout-schedule-session-id';
import type { WorkoutScheduleRepository } from '../domain/workout-schedule.repository';
import type { WorkoutSessionSlot } from '../domain/workout-session-slot';
import { CoachingAddonRequiredError } from './coaching-addon-required.error';
import { CoachingForbiddenError } from './coaching-forbidden.error';
import {
  toWorkoutScheduleDayDtoFromEntity,
  type WorkoutScheduleDayDto,
} from './coaching.dto';
import type { DietAssignPolicy } from './diet-assign.policy';

export interface UpsertWorkoutScheduleRestEntry {
  readonly date: string;
  readonly kind: 'REST';
}

export interface UpsertWorkoutScheduleTrainingEntry {
  readonly date: string;
  readonly kind: 'TRAINING';
  readonly morningTemplateId?: string;
  readonly eveningTemplateId?: string;
}

export type UpsertWorkoutScheduleEntry =
  | UpsertWorkoutScheduleRestEntry
  | UpsertWorkoutScheduleTrainingEntry;

export interface UpsertWorkoutScheduleCommand {
  readonly gymOrgId: GymOrgId;
  readonly clientUserId: string;
  readonly entries: readonly UpsertWorkoutScheduleEntry[];
}

export class UpsertWorkoutScheduleUseCase {
  constructor(
    private readonly policy: DietAssignPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly templates: WorkoutPlanTemplateRepository,
    private readonly schedule: WorkoutScheduleRepository,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: UpsertWorkoutScheduleCommand,
  ): Promise<readonly WorkoutScheduleDayDto[]> {
    if (command.entries.length === 0) {
      throw new InvalidWorkoutScheduleError('Schedule upsert requires at least one entry');
    }

    const trainerId = await this.policy.requireAssigner(actor, command.gymOrgId);
    const clientUserId = toUserId(command.clientUserId);

    const membership = await this.entitlement.findActiveMembership(clientUserId, command.gymOrgId);
    if (membership === null) {
      throw new NotFoundError('Active membership not found');
    }
    if (actor.roleCode === 'TRAINER' && membership.assignedTrainerId !== trainerId) {
      throw new CoachingForbiddenError('Only the assigned trainer can author this schedule');
    }

    const now = this.clock.now();
    const today = await this.gymClock.today(command.gymOrgId, now);
    if (!(await this.entitlement.hasInDateCoachingAddon(clientUserId, command.gymOrgId, today))) {
      throw new CoachingAddonRequiredError();
    }

    const dates = new Set<string>();
    const days: WorkoutScheduleDay[] = [];

    for (const entry of command.entries) {
      const scheduleDate = CalendarDate.create(entry.date);
      if (dates.has(scheduleDate.value)) {
        throw new InvalidWorkoutScheduleError('Duplicate dates in schedule upsert');
      }
      dates.add(scheduleDate.value);

      if (entry.kind === 'REST') {
        days.push(
          WorkoutScheduleDay.create({
            id: toWorkoutScheduleDayId(this.ids.generate()),
            clientUserId,
            gymOrgId: command.gymOrgId,
            trainerId,
            scheduleDate,
            kind: 'REST',
            sessions: [],
            now,
          }),
        );
        continue;
      }

      const slots: { slot: WorkoutSessionSlot; templateId: string }[] = [];
      if (entry.morningTemplateId !== undefined) {
        slots.push({ slot: 'MORNING', templateId: entry.morningTemplateId });
      }
      if (entry.eveningTemplateId !== undefined) {
        slots.push({ slot: 'EVENING', templateId: entry.eveningTemplateId });
      }
      if (slots.length === 0) {
        throw new InvalidWorkoutScheduleError(
          'TRAINING days require morningTemplateId and/or eveningTemplateId',
        );
      }

      const sessions = [];
      for (const { slot, templateId } of slots) {
        const template = await this.templates.findById(
          toWorkoutPlanTemplateId(templateId),
          command.gymOrgId,
        );
        if (template === null || !template.isLive) {
          throw new NotFoundError('Workout plan template not found');
        }
        sessions.push({
          id: toWorkoutScheduleSessionId(this.ids.generate()),
          slot,
          title: template.title.value,
          clonedFromTemplateId: template.id,
          exercises: template.exercises.map((exercise, index) => ({
            id: toWorkoutScheduleExerciseId(this.ids.generate()),
            exerciseItemId: exercise.exerciseItemId,
            sets: exercise.sets,
            reps: exercise.reps,
            notes: exercise.notes,
            sortOrder: index,
          })),
        });
      }

      days.push(
        WorkoutScheduleDay.create({
          id: toWorkoutScheduleDayId(this.ids.generate()),
          clientUserId,
          gymOrgId: command.gymOrgId,
          trainerId,
          scheduleDate,
          kind: 'TRAINING' satisfies WorkoutScheduleDayKind,
          sessions,
          now,
        }),
      );
    }

    await this.schedule.upsertDays(days);
    return days.map((day) => toWorkoutScheduleDayDtoFromEntity(day));
  }
}
