import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { UserId } from '../../../../domain/shared/user-id';
import type { WorkoutPlanQueries, WorkoutPlanSummary } from '../../domain/workout-plan.queries';
import type { InMemoryWorkoutPlanRepository } from './in-memory-workout-plan.repository';

export class InMemoryWorkoutPlanQueries implements WorkoutPlanQueries {
  constructor(
    private readonly store: InMemoryWorkoutPlanRepository,
    private readonly names = new Map<string, string>(),
  ) {}

  seedName(exerciseItemId: string, name: string): void {
    this.names.set(exerciseItemId, name);
  }

  async findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<WorkoutPlanSummary | null> {
    const plan = await this.store.findActiveByClientAtGym(clientUserId, gymOrgId);
    if (plan === null) {
      return null;
    }
    return {
      id: plan.id,
      clientUserId: plan.clientUserId,
      trainerId: plan.trainerId,
      gymOrgId: plan.gymOrgId,
      title: plan.title.value,
      notes: plan.notes,
      status: plan.status,
      days: plan.days.map((day) => ({
        id: day.id,
        dayLabel: day.dayLabel.value,
        sortOrder: day.sortOrder,
        exercises: day.exercises.map((exercise) => ({
          id: exercise.id,
          exerciseItemId: exercise.exerciseItemId,
          name: this.names.get(exercise.exerciseItemId) ?? 'Unknown movement',
          sets: exercise.sets,
          reps: exercise.reps,
          notes: exercise.notes,
        })),
      })),
      clonedFromId: plan.clonedFromId,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }
}
