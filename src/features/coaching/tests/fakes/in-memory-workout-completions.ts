import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../../domain/shared/user-id';
import { AlreadyCompletedWorkoutExerciseError } from '../../domain/already-completed-workout-exercise.error';
import type { WorkoutCompletionQueries } from '../../domain/workout-completion.queries';
import type { WorkoutCompletionRepository } from '../../domain/workout-completion.repository';
import type { WorkoutPlanExerciseId } from '../../domain/workout-plan-exercise-id';

function key(
  exerciseId: WorkoutPlanExerciseId,
  clientUserId: UserId,
  completedOn: CalendarDate,
): string {
  return `${exerciseId}:${clientUserId}:${completedOn.value}`;
}

export class InMemoryWorkoutCompletions
  implements WorkoutCompletionRepository, WorkoutCompletionQueries
{
  private readonly rows = new Set<string>();

  async complete(input: {
    readonly exerciseId: WorkoutPlanExerciseId;
    readonly clientUserId: UserId;
    readonly completedOn: CalendarDate;
  }): Promise<void> {
    const id = key(input.exerciseId, input.clientUserId, input.completedOn);
    if (this.rows.has(id)) {
      throw new AlreadyCompletedWorkoutExerciseError();
    }
    this.rows.add(id);
  }

  async uncomplete(input: {
    readonly exerciseId: WorkoutPlanExerciseId;
    readonly clientUserId: UserId;
    readonly completedOn: CalendarDate;
  }): Promise<void> {
    this.rows.delete(key(input.exerciseId, input.clientUserId, input.completedOn));
  }

  async findCompletedExerciseIds(
    clientUserId: UserId,
    completedOn: CalendarDate,
    exerciseIds: readonly WorkoutPlanExerciseId[],
  ): Promise<readonly WorkoutPlanExerciseId[]> {
    return exerciseIds.filter((exerciseId) =>
      this.rows.has(key(exerciseId, clientUserId, completedOn)),
    );
  }
}
