import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { toDietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import { toFoodItemId } from '../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../domain/shared/food-serving-id';
import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { parseMealSlot } from '../../../domain/shared/meal-slot';
import { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { DietPlan } from '../domain/diet-plan.entity';
import { toDietPlanId } from '../domain/diet-plan-id';
import { toDietPlanMealId } from '../domain/diet-plan-meal-id';
import { toDietPlanTemplateId } from '../domain/diet-plan-template-id';
import { toDietPlanTemplateMealId } from '../domain/diet-plan-template-meal-id';
import { toDietPlanTemplateMealItemId } from '../domain/diet-plan-template-meal-item-id';
import { DietPlanTemplate } from '../domain/diet-plan-template.entity';
import type { DietPlanTemplateSummary } from '../domain/diet-plan-template.queries';
import type { DietPlanSummary } from '../domain/diet-plan.queries';
import { DietPlanTitle } from '../domain/diet-plan-title.value-object';
import { toTrainerProfileId } from '../domain/trainer-profile-id';

type PlanRow = Database['public']['Tables']['diet_plans']['Row'];
type MealRow = Database['public']['Tables']['diet_plan_meals']['Row'];
type ItemRow = Database['public']['Tables']['diet_plan_meal_items']['Row'];

export type MealWithItems = MealRow & {
  diet_plan_meal_items: ItemRow[] | null;
};

export type PlanWithMeals = PlanRow & {
  diet_plan_meals: MealWithItems[] | null;
};

export function toDietPlan(row: PlanWithMeals): DietPlan {
  try {
    const meals = (row.diet_plan_meals ?? [])
      .filter((meal) => meal.deleted_at === null)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((meal) => ({
        id: toDietPlanMealId(meal.id),
        mealSlot: parseMealSlot(meal.meal_slot),
        sortOrder: meal.sort_order,
        items: (meal.diet_plan_meal_items ?? [])
          .filter((item) => item.deleted_at === null)
          .map((item) => ({
            id: toDietPlanMealItemId(item.id),
            foodItemId: toFoodItemId(item.food_item_id),
            servingId: toFoodServingId(item.serving_id),
            quantity: ServingQuantity.create(Number(item.quantity)),
          })),
      }));
    return DietPlan.reconstitute({
      id: toDietPlanId(row.id),
      clientUserId: toUserId(row.client_user_id),
      trainerId: toTrainerProfileId(row.trainer_id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      title: DietPlanTitle.create(row.title),
      notes: row.notes,
      status: row.status,
      meals,
      clonedFromTemplateId:
        row.cloned_from_template_id === null
          ? null
          : toDietPlanTemplateId(row.cloned_from_template_id),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored diet plan is invalid', { cause: error });
  }
}

export function toDietPlanSummary(row: PlanWithMeals): DietPlanSummary {
  const meals = (row.diet_plan_meals ?? [])
    .filter((meal) => meal.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((meal) => ({
      id: meal.id,
      mealSlot: parseMealSlot(meal.meal_slot),
      sortOrder: meal.sort_order,
      items: (meal.diet_plan_meal_items ?? [])
        .filter((item) => item.deleted_at === null)
        .map((item) => ({
          id: toDietPlanMealItemId(item.id),
          foodItemId: item.food_item_id,
          servingId: item.serving_id,
          quantity: Number(item.quantity),
        })),
    }));
  return {
    id: toDietPlanId(row.id),
    clientUserId: toUserId(row.client_user_id),
    trainerId: row.trainer_id,
    gymOrgId: toGymOrgId(row.gym_org_id),
    title: row.title,
    notes: row.notes,
    status: row.status,
    meals,
    clonedFromTemplateId: row.cloned_from_template_id,
    createdAt: toValidDate(row.created_at).toISOString(),
    updatedAt: toValidDate(row.updated_at).toISOString(),
  };
}

export function toDietPlanInsert(
  plan: DietPlan,
): Database['public']['Tables']['diet_plans']['Insert'] {
  return {
    id: plan.id,
    client_user_id: plan.clientUserId,
    trainer_id: plan.trainerId,
    gym_org_id: plan.gymOrgId,
    title: plan.title.value,
    notes: plan.notes,
    status: plan.status,
    cloned_from_template_id: plan.clonedFromTemplateId,
    created_at: plan.createdAt.toISOString(),
    updated_at: plan.updatedAt.toISOString(),
  };
}

type TemplateRow = Database['public']['Tables']['diet_plan_templates']['Row'];
type TemplateMealRow = Database['public']['Tables']['diet_plan_template_meals']['Row'];
type TemplateItemRow = Database['public']['Tables']['diet_plan_template_meal_items']['Row'];

export type TemplateMealWithItems = TemplateMealRow & {
  diet_plan_template_meal_items: TemplateItemRow[] | null;
};

export type TemplateWithMeals = TemplateRow & {
  diet_plan_template_meals: TemplateMealWithItems[] | null;
};

export function toDietPlanTemplate(row: TemplateWithMeals): DietPlanTemplate {
  try {
    return DietPlanTemplate.reconstitute({
      id: toDietPlanTemplateId(row.id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      trainerId: toTrainerProfileId(row.trainer_id),
      title: DietPlanTitle.create(row.title),
      notes: row.notes,
      clonedFromId: row.cloned_from_id === null ? null : toDietPlanTemplateId(row.cloned_from_id),
      meals: toTemplateMeals(row),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored diet plan template is invalid', { cause: error });
  }
}

export function toDietPlanTemplateSummary(row: TemplateWithMeals): DietPlanTemplateSummary {
  return {
    id: toDietPlanTemplateId(row.id),
    gymOrgId: toGymOrgId(row.gym_org_id),
    trainerId: toTrainerProfileId(row.trainer_id),
    title: row.title,
    notes: row.notes,
    clonedFromId: row.cloned_from_id === null ? null : toDietPlanTemplateId(row.cloned_from_id),
    meals: toTemplateMeals(row).map((meal) => ({
      id: meal.id,
      mealSlot: meal.mealSlot,
      sortOrder: meal.sortOrder,
      items: meal.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        servingId: item.servingId,
        quantity: item.quantity.value,
      })),
    })),
    createdAt: toValidDate(row.created_at).toISOString(),
    updatedAt: toValidDate(row.updated_at).toISOString(),
  };
}

export function toDietPlanTemplateInsert(
  template: DietPlanTemplate,
): Database['public']['Tables']['diet_plan_templates']['Insert'] {
  return {
    id: template.id,
    gym_org_id: template.gymOrgId,
    trainer_id: template.trainerId,
    title: template.title.value,
    notes: template.notes,
    cloned_from_id: template.clonedFromId,
    deleted_at: template.deletedAt === null ? null : template.deletedAt.toISOString(),
    created_at: template.createdAt.toISOString(),
    updated_at: template.updatedAt.toISOString(),
  };
}

function toTemplateMeals(row: TemplateWithMeals) {
  return (row.diet_plan_template_meals ?? [])
    .filter((meal) => meal.deleted_at === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((meal) => ({
      id: toDietPlanTemplateMealId(meal.id),
      mealSlot: parseMealSlot(meal.meal_slot),
      sortOrder: meal.sort_order,
      items: (meal.diet_plan_template_meal_items ?? [])
        .filter((item) => item.deleted_at === null)
        .map((item) => ({
          id: toDietPlanTemplateMealItemId(item.id),
          foodItemId: toFoodItemId(item.food_item_id),
          servingId: toFoodServingId(item.serving_id),
          quantity: ServingQuantity.create(Number(item.quantity)),
        })),
    }));
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}
