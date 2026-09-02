import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { TrainerProfileId } from './trainer-profile-id';
import type { WorkoutPlanTemplateExerciseId } from './workout-plan-template-exercise-id';
import type { WorkoutPlanTemplateId } from './workout-plan-template-id';

export interface WorkoutPlanTemplateExerciseSummary {
  readonly id: WorkoutPlanTemplateExerciseId;
  readonly exerciseItemId: string;
  readonly name?: string;
  readonly sets: number | null;
  readonly reps: string | null;
  readonly notes: string | null;
  readonly sortOrder: number;
}

export interface WorkoutPlanTemplateSummary {
  readonly id: WorkoutPlanTemplateId;
  readonly gymOrgId: GymOrgId;
  readonly trainerId: TrainerProfileId;
  readonly title: string;
  readonly notes: string | null;
  readonly clonedFromId: WorkoutPlanTemplateId | null;
  readonly exercises: readonly WorkoutPlanTemplateExerciseSummary[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListWorkoutPlanTemplatesCriteria {
  readonly gymOrgId: GymOrgId;
}

export interface WorkoutPlanTemplateQueries {
  findById(
    id: WorkoutPlanTemplateId,
    gymOrgId: GymOrgId,
  ): Promise<WorkoutPlanTemplateSummary | null>;

  list(
    criteria: ListWorkoutPlanTemplatesCriteria,
    page: Pagination,
  ): Promise<Page<WorkoutPlanTemplateSummary>>;
}
