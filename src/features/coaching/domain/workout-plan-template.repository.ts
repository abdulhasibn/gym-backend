import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { WorkoutPlanTemplate } from './workout-plan-template.entity';
import type { WorkoutPlanTemplateId } from './workout-plan-template-id';

export interface WorkoutPlanTemplateRepository {
  findById(id: WorkoutPlanTemplateId, gymOrgId: GymOrgId): Promise<WorkoutPlanTemplate | null>;

  save(template: WorkoutPlanTemplate): Promise<void>;

  replace(template: WorkoutPlanTemplate): Promise<void>;
}
