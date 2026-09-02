import type { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../../domain/shared/user-id';
import { AlreadyCompletedWorkoutExerciseError } from '../../domain/already-completed-workout-exercise.error';
import type { WorkoutScheduleCompletionQueries } from '../../domain/workout-schedule-completion.queries';
import type { WorkoutScheduleCompletionRepository } from '../../domain/workout-schedule-completion.repository';
import type { WorkoutScheduleExerciseId } from '../../domain/workout-schedule-exercise-id';

export class InMemoryWorkoutScheduleCompletions
  implements WorkoutScheduleCompletionRepository, WorkoutScheduleCompletionQueries
{
  private readonly rows = new Set<string>();

  private key(
    exerciseId: WorkoutScheduleExerciseId,
    clientUserId: UserId,
    completedOn: CalendarDate,
  ): string {
    return `${exerciseId}|${clientUserId}|${completedOn.value}`;
  }

  async complete(input: {
    readonly exerciseId: WorkoutScheduleExerciseId;
    readonly clientUserId: UserId;
    readonly completedOn: CalendarDate;
  }): Promise<void> {
    const key = this.key(input.exerciseId, input.clientUserId, input.completedOn);
    if (this.rows.has(key)) {
      throw new AlreadyCompletedWorkoutExerciseError();
    }
    this.rows.add(key);
  }

  async uncomplete(input: {
    readonly exerciseId: WorkoutScheduleExerciseId;
    readonly clientUserId: UserId;
    readonly completedOn: CalendarDate;
  }): Promise<void> {
    this.rows.delete(this.key(input.exerciseId, input.clientUserId, input.completedOn));
  }

  async findCompletedExerciseIds(
    clientUserId: UserId,
    completedOn: CalendarDate,
    exerciseIds: readonly WorkoutScheduleExerciseId[],
  ): Promise<readonly WorkoutScheduleExerciseId[]> {
    return exerciseIds.filter((exerciseId) =>
      this.rows.has(this.key(exerciseId, clientUserId, completedOn)),
    );
  }
}
