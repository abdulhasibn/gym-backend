import type { FoodItemId } from '../../../domain/shared/food-item-id';
import type { FoodServingId } from '../../../domain/shared/food-serving-id';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import type { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';
import type { DietPlanTemplateId } from './diet-plan-template-id';
import type { DietPlanTemplateMealId } from './diet-plan-template-meal-id';
import type { DietPlanTemplateMealItemId } from './diet-plan-template-meal-item-id';
import type { DietPlanTitle } from './diet-plan-title.value-object';
import { InvalidDietPlanError } from './invalid-diet-plan.error';
import type { TrainerProfileId } from './trainer-profile-id';

export interface DietPlanTemplateMealItemData {
  readonly id: DietPlanTemplateMealItemId;
  readonly foodItemId: FoodItemId;
  readonly servingId: FoodServingId;
  readonly quantity: ServingQuantity;
}

export interface DietPlanTemplateMealData {
  readonly id: DietPlanTemplateMealId;
  readonly mealSlot: MealSlot;
  readonly sortOrder: number;
  readonly items: readonly DietPlanTemplateMealItemData[];
}

export interface DietPlanTemplateData {
  readonly id: DietPlanTemplateId;
  readonly gymOrgId: GymOrgId;
  readonly trainerId: TrainerProfileId;
  readonly title: DietPlanTitle;
  readonly notes: string | null;
  readonly clonedFromId: DietPlanTemplateId | null;
  readonly meals: readonly DietPlanTemplateMealData[];
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateDietPlanTemplateProps {
  readonly id: DietPlanTemplateId;
  readonly gymOrgId: GymOrgId;
  readonly trainerId: TrainerProfileId;
  readonly title: DietPlanTitle;
  readonly notes: string | null;
  readonly clonedFromId: DietPlanTemplateId | null;
  readonly meals: readonly DietPlanTemplateMealData[];
  readonly now: Date;
}

export interface ReplaceDietPlanTemplateDefinitionProps {
  readonly title: DietPlanTitle;
  readonly notes: string | null;
  readonly meals: readonly DietPlanTemplateMealData[];
  readonly now: Date;
}

export class DietPlanTemplate {
  private constructor(private data: DietPlanTemplateData) {}

  static create(props: CreateDietPlanTemplateProps): DietPlanTemplate {
    assertMeals(props.meals);
    return new DietPlanTemplate({
      ...props,
      notes: normalizeNotes(props.notes),
      deletedAt: null,
      createdAt: props.now,
      updatedAt: props.now,
    });
  }

  static reconstitute(data: DietPlanTemplateData): DietPlanTemplate {
    return new DietPlanTemplate(data);
  }

  get id(): DietPlanTemplateId {
    return this.data.id;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get trainerId(): TrainerProfileId {
    return this.data.trainerId;
  }

  get title(): DietPlanTitle {
    return this.data.title;
  }

  get notes(): string | null {
    return this.data.notes;
  }

  get clonedFromId(): DietPlanTemplateId | null {
    return this.data.clonedFromId;
  }

  get meals(): readonly DietPlanTemplateMealData[] {
    return this.data.meals;
  }

  get deletedAt(): Date | null {
    return this.data.deletedAt;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  get isLive(): boolean {
    return this.data.deletedAt === null;
  }

  replaceDefinition(props: ReplaceDietPlanTemplateDefinitionProps): void {
    if (this.data.deletedAt !== null) {
      throw new InvalidDietPlanError('Cannot edit a deleted diet plan template');
    }
    assertMeals(props.meals);
    this.data = {
      ...this.data,
      title: props.title,
      notes: normalizeNotes(props.notes),
      meals: props.meals,
      updatedAt: props.now,
    };
  }

  softDelete(now: Date): void {
    if (this.data.deletedAt !== null) {
      return;
    }
    this.data = {
      ...this.data,
      deletedAt: now,
      updatedAt: now,
    };
  }
}

function assertMeals(meals: readonly DietPlanTemplateMealData[]): void {
  if (meals.length === 0) {
    throw new InvalidDietPlanError('Diet plan must include at least one meal');
  }
  const slots = new Set<MealSlot>();
  for (const meal of meals) {
    if (slots.has(meal.mealSlot)) {
      throw new InvalidDietPlanError('Meal slots must be unique');
    }
    slots.add(meal.mealSlot);
    if (meal.items.length === 0) {
      throw new InvalidDietPlanError('Each meal must include at least one food item');
    }
  }
}

function normalizeNotes(notes: string | null): string | null {
  if (notes === null) {
    return null;
  }
  const trimmed = notes.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > 5000) {
    throw new InvalidDietPlanError('Diet plan notes max 5000 chars');
  }
  return trimmed;
}
