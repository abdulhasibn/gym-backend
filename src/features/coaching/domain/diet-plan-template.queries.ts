import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { DietPlanTemplateId } from './diet-plan-template-id';
import type { DietPlanTemplateMealId } from './diet-plan-template-meal-id';
import type { DietPlanTemplateMealItemId } from './diet-plan-template-meal-item-id';
import type { TrainerProfileId } from './trainer-profile-id';

export interface DietPlanTemplateItemSummary {
  readonly id: DietPlanTemplateMealItemId;
  readonly foodItemId: string;
  readonly servingId: string;
  readonly quantity: number;
}

export interface DietPlanTemplateMealSummary {
  readonly id: DietPlanTemplateMealId;
  readonly mealSlot: MealSlot;
  readonly sortOrder: number;
  readonly items: readonly DietPlanTemplateItemSummary[];
}

export interface DietPlanTemplateSummary {
  readonly id: DietPlanTemplateId;
  readonly gymOrgId: GymOrgId;
  readonly trainerId: TrainerProfileId;
  readonly title: string;
  readonly notes: string | null;
  readonly clonedFromId: DietPlanTemplateId | null;
  readonly meals: readonly DietPlanTemplateMealSummary[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListDietPlanTemplatesCriteria {
  readonly gymOrgId: GymOrgId;
  readonly trainerId?: TrainerProfileId;
}

export interface DietPlanTemplateQueries {
  findById(id: DietPlanTemplateId, gymOrgId: GymOrgId): Promise<DietPlanTemplateSummary | null>;

  list(
    criteria: ListDietPlanTemplatesCriteria,
    page: Pagination,
  ): Promise<Page<DietPlanTemplateSummary>>;
}
