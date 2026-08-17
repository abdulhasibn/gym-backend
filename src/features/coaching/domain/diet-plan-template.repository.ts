import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { DietPlanTemplate } from './diet-plan-template.entity';
import type { DietPlanTemplateId } from './diet-plan-template-id';

export interface DietPlanTemplateRepository {
  findById(id: DietPlanTemplateId, gymOrgId: GymOrgId): Promise<DietPlanTemplate | null>;

  save(template: DietPlanTemplate): Promise<void>;

  replace(template: DietPlanTemplate): Promise<void>;
}
