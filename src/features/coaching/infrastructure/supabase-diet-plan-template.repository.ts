import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { DietPlanTemplate } from '../domain/diet-plan-template.entity';
import type { DietPlanTemplateId } from '../domain/diet-plan-template-id';
import type { DietPlanTemplateRepository } from '../domain/diet-plan-template.repository';
import {
  toDietPlanTemplate,
  toDietPlanTemplateInsert,
  type TemplateWithMeals,
} from './coaching.mapper';

const TEMPLATE_SELECT = '*, diet_plan_template_meals(*, diet_plan_template_meal_items(*))';

export class SupabaseDietPlanTemplateRepository implements DietPlanTemplateRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(id: DietPlanTemplateId, gymOrgId: GymOrgId): Promise<DietPlanTemplate | null> {
    const { data, error } = await this.client
      .from('diet_plan_templates')
      .select(TEMPLATE_SELECT)
      .eq('id', id)
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read diet plan template', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }
    return toDietPlanTemplate(data as TemplateWithMeals);
  }

  async save(template: DietPlanTemplate): Promise<void> {
    const { error } = await this.client
      .from('diet_plan_templates')
      .insert(toDietPlanTemplateInsert(template));
    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to create diet plan template', {
        cause: error,
      });
    }
    await this.insertMeals(template);
  }

  async replace(template: DietPlanTemplate): Promise<void> {
    const { error: headerError } = await this.client
      .from('diet_plan_templates')
      .update({
        title: template.title.value,
        notes: template.notes,
        deleted_at: template.deletedAt === null ? null : template.deletedAt.toISOString(),
        updated_at: template.updatedAt.toISOString(),
      })
      .eq('id', template.id)
      .eq('gym_org_id', template.gymOrgId)
      .is('deleted_at', null);

    if (headerError !== null) {
      throw new TransientDatabaseFailureError('Unable to update diet plan template', {
        cause: headerError,
      });
    }

    await this.softDeleteLiveMeals(template.id, template.updatedAt.toISOString());
    if (template.deletedAt === null) {
      await this.insertMeals(template);
    }
  }

  private async softDeleteLiveMeals(
    templateId: DietPlanTemplateId,
    deletedAt: string,
  ): Promise<void> {
    const { data: meals, error: mealReadError } = await this.client
      .from('diet_plan_template_meals')
      .select('id')
      .eq('diet_plan_template_id', templateId)
      .is('deleted_at', null);

    if (mealReadError !== null) {
      throw new TransientDatabaseFailureError('Unable to read diet plan template meals', {
        cause: mealReadError,
      });
    }

    const mealIds = (meals ?? []).map((meal) => meal.id);
    if (mealIds.length === 0) {
      return;
    }

    const { error: itemError } = await this.client
      .from('diet_plan_template_meal_items')
      .update({ deleted_at: deletedAt })
      .in('diet_plan_template_meal_id', mealIds)
      .is('deleted_at', null);
    if (itemError !== null) {
      throw new TransientDatabaseFailureError('Unable to archive diet plan template items', {
        cause: itemError,
      });
    }

    const { error: mealError } = await this.client
      .from('diet_plan_template_meals')
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .in('id', mealIds)
      .is('deleted_at', null);
    if (mealError !== null) {
      throw new TransientDatabaseFailureError('Unable to archive diet plan template meals', {
        cause: mealError,
      });
    }
  }

  private async insertMeals(template: DietPlanTemplate): Promise<void> {
    const meals = template.meals.map((meal) => ({
      id: meal.id,
      diet_plan_template_id: template.id,
      meal_slot: meal.mealSlot,
      sort_order: meal.sortOrder,
    }));
    const { error: mealError } = await this.client.from('diet_plan_template_meals').insert(meals);
    if (mealError !== null) {
      throw new TransientDatabaseFailureError('Unable to create diet plan template meals', {
        cause: mealError,
      });
    }

    const items = template.meals.flatMap((meal) =>
      meal.items.map((item) => ({
        id: item.id,
        diet_plan_template_meal_id: meal.id,
        food_item_id: item.foodItemId,
        serving_id: item.servingId,
        quantity: item.quantity.value,
      })),
    );
    if (items.length === 0) {
      return;
    }
    const { error: itemError } = await this.client
      .from('diet_plan_template_meal_items')
      .insert(items);
    if (itemError !== null) {
      throw new TransientDatabaseFailureError('Unable to create diet plan template items', {
        cause: itemError,
      });
    }
  }
}
