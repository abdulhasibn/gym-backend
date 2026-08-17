import type { DietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import type { FoodItemId } from '../../../domain/shared/food-item-id';
import type { FoodServingId } from '../../../domain/shared/food-serving-id';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { MealSlot } from '../../../domain/shared/meal-slot';
import type { UserId } from '../../../domain/shared/user-id';
import type { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';
import type { CoachingPlanStatus } from './coaching-plan-status';
import type { DietPlanId } from './diet-plan-id';
import type { DietPlanMealId } from './diet-plan-meal-id';
import type { DietPlanTemplateId } from './diet-plan-template-id';
import type { DietPlanTitle } from './diet-plan-title.value-object';
import { InvalidDietPlanError } from './invalid-diet-plan.error';
import type { TrainerProfileId } from './trainer-profile-id';

export interface DietPlanMealItemData {
  readonly id: DietPlanMealItemId;
  readonly foodItemId: FoodItemId;
  readonly servingId: FoodServingId;
  readonly quantity: ServingQuantity;
}

export interface DietPlanMealData {
  readonly id: DietPlanMealId;
  readonly mealSlot: MealSlot;
  readonly sortOrder: number;
  readonly items: readonly DietPlanMealItemData[];
}

export interface DietPlanData {
  readonly id: DietPlanId;
  readonly clientUserId: UserId;
  readonly trainerId: TrainerProfileId;
  readonly gymOrgId: GymOrgId;
  readonly title: DietPlanTitle;
  readonly notes: string | null;
  readonly status: CoachingPlanStatus;
  readonly meals: readonly DietPlanMealData[];
  readonly clonedFromTemplateId: DietPlanTemplateId | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateDietPlanProps {
  readonly id: DietPlanId;
  readonly clientUserId: UserId;
  readonly trainerId: TrainerProfileId;
  readonly gymOrgId: GymOrgId;
  readonly title: DietPlanTitle;
  readonly notes: string | null;
  readonly meals: readonly DietPlanMealData[];
  readonly clonedFromTemplateId?: DietPlanTemplateId | null;
  readonly now: Date;
}

export class DietPlan {
  private constructor(private data: DietPlanData) {}

  static create(props: CreateDietPlanProps): DietPlan {
    if (props.meals.length === 0) {
      throw new InvalidDietPlanError('Diet plan must include at least one meal');
    }
    const slots = new Set<MealSlot>();
    for (const meal of props.meals) {
      if (slots.has(meal.mealSlot)) {
        throw new InvalidDietPlanError('Meal slots must be unique');
      }
      slots.add(meal.mealSlot);
      if (meal.items.length === 0) {
        throw new InvalidDietPlanError('Each meal must include at least one food item');
      }
    }
    return new DietPlan({
      ...props,
      notes: normalizeNotes(props.notes),
      clonedFromTemplateId: props.clonedFromTemplateId ?? null,
      status: 'ACTIVE',
      deletedAt: null,
      createdAt: props.now,
      updatedAt: props.now,
    });
  }

  static reconstitute(data: DietPlanData): DietPlan {
    return new DietPlan(data);
  }

  get id(): DietPlanId {
    return this.data.id;
  }

  get clientUserId(): UserId {
    return this.data.clientUserId;
  }

  get trainerId(): TrainerProfileId {
    return this.data.trainerId;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get title(): DietPlanTitle {
    return this.data.title;
  }

  get notes(): string | null {
    return this.data.notes;
  }

  get status(): CoachingPlanStatus {
    return this.data.status;
  }

  get meals(): readonly DietPlanMealData[] {
    return this.data.meals;
  }

  get clonedFromTemplateId(): DietPlanTemplateId | null {
    return this.data.clonedFromTemplateId;
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

  get isActive(): boolean {
    return this.data.status === 'ACTIVE' && this.data.deletedAt === null;
  }

  findItem(
    itemId: DietPlanMealItemId,
  ): { meal: DietPlanMealData; item: DietPlanMealItemData } | null {
    for (const meal of this.data.meals) {
      const item = meal.items.find((row) => row.id === itemId);
      if (item !== undefined) {
        return { meal, item };
      }
    }
    return null;
  }

  archive(now: Date): void {
    if (this.data.status === 'ARCHIVED') {
      return;
    }
    this.data = {
      ...this.data,
      status: 'ARCHIVED',
      updatedAt: now,
    };
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
