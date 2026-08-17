import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { ExerciseItemId } from './exercise-item-id';
import type { WorkoutPlanDayId } from './workout-plan-day-id';
import type { WorkoutPlanExerciseId } from './workout-plan-exercise-id';
import type { WorkoutPlanId } from './workout-plan-id';

export interface WorkoutPlanExerciseSummary {
  readonly id: WorkoutPlanExerciseId;
  readonly exerciseItemId: ExerciseItemId;
  readonly name: string;
  readonly sets: number | null;
  readonly reps: string | null;
  readonly notes: string | null;
}

export interface WorkoutPlanDaySummary {
  readonly id: WorkoutPlanDayId;
  readonly dayLabel: string;
  readonly sortOrder: number;
  readonly exercises: readonly WorkoutPlanExerciseSummary[];
}

export interface WorkoutPlanSummary {
  readonly id: WorkoutPlanId;
  readonly clientUserId: UserId;
  readonly trainerId: string;
  readonly gymOrgId: GymOrgId;
  readonly title: string;
  readonly notes: string | null;
  readonly status: string;
  readonly days: readonly WorkoutPlanDaySummary[];
  readonly clonedFromId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WorkoutPlanQueries {
  findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<WorkoutPlanSummary | null>;
}
