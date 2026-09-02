import type { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { UserId } from '../../../../domain/shared/user-id';
import type { WorkoutScheduleDay } from '../../domain/workout-schedule-day.entity';
import type { WorkoutScheduleExerciseId } from '../../domain/workout-schedule-exercise-id';
import type {
  ListWorkoutScheduleRangeCriteria,
  WorkoutScheduleDaySummary,
  WorkoutScheduleQueries,
} from '../../domain/workout-schedule.queries';
import type { WorkoutScheduleRepository } from '../../domain/workout-schedule.repository';

export class InMemoryWorkoutScheduleRepository implements WorkoutScheduleRepository {
  readonly days: WorkoutScheduleDay[] = [];

  async findByClientGymAndDate(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
    scheduleDate: CalendarDate,
  ): Promise<WorkoutScheduleDay | null> {
    return (
      this.days.find(
        (day) =>
          day.isLive &&
          day.clientUserId === clientUserId &&
          day.gymOrgId === gymOrgId &&
          day.scheduleDate.value === scheduleDate.value,
      ) ?? null
    );
  }

  async findExerciseContext(
    exerciseId: WorkoutScheduleExerciseId,
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<WorkoutScheduleDay | null> {
    return (
      this.days.find(
        (day) =>
          day.isLive &&
          day.clientUserId === clientUserId &&
          day.gymOrgId === gymOrgId &&
          day.findExercise(exerciseId) !== null,
      ) ?? null
    );
  }

  async upsertDays(days: readonly WorkoutScheduleDay[]): Promise<void> {
    for (const day of days) {
      for (const existing of this.days) {
        if (
          existing.isLive &&
          existing.clientUserId === day.clientUserId &&
          existing.gymOrgId === day.gymOrgId &&
          existing.scheduleDate.value === day.scheduleDate.value
        ) {
          existing.softDelete(day.updatedAt);
        }
      }
      this.days.push(day);
    }
  }
}

export class InMemoryWorkoutScheduleQueries implements WorkoutScheduleQueries {
  constructor(private readonly store: InMemoryWorkoutScheduleRepository) {}

  async listRange(
    criteria: ListWorkoutScheduleRangeCriteria,
  ): Promise<readonly WorkoutScheduleDaySummary[]> {
    return this.store.days
      .filter(
        (day) =>
          day.isLive &&
          day.clientUserId === criteria.clientUserId &&
          day.gymOrgId === criteria.gymOrgId &&
          day.scheduleDate.value >= criteria.from &&
          day.scheduleDate.value <= criteria.to,
      )
      .sort((a, b) => a.scheduleDate.value.localeCompare(b.scheduleDate.value))
      .map((day) => ({
        id: day.id,
        clientUserId: day.clientUserId,
        gymOrgId: day.gymOrgId,
        trainerId: day.trainerId,
        scheduleDate: day.scheduleDate.value,
        kind: day.kind,
        sessions: day.sessions.map((session) => ({
          id: session.id,
          slot: session.slot,
          title: session.title,
          clonedFromTemplateId: session.clonedFromTemplateId,
          exercises: session.exercises.map((exercise) => ({
            id: exercise.id,
            exerciseItemId: exercise.exerciseItemId,
            name: exercise.exerciseItemId,
            sets: exercise.sets,
            reps: exercise.reps,
            notes: exercise.notes,
            sortOrder: exercise.sortOrder,
          })),
        })),
        createdAt: day.createdAt.toISOString(),
        updatedAt: day.updatedAt.toISOString(),
      }));
  }
}
