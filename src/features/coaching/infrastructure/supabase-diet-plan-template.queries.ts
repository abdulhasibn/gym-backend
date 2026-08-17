import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import { toPage } from '../../../shared/pagination/pagination';
import type { DietPlanTemplateId } from '../domain/diet-plan-template-id';
import type {
  DietPlanTemplateQueries,
  DietPlanTemplateSummary,
  ListDietPlanTemplatesCriteria,
} from '../domain/diet-plan-template.queries';
import { toDietPlanTemplateSummary, type TemplateWithMeals } from './coaching.mapper';

const TEMPLATE_SELECT = '*, diet_plan_template_meals(*, diet_plan_template_meal_items(*))';

export class SupabaseDietPlanTemplateQueries implements DietPlanTemplateQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(
    id: DietPlanTemplateId,
    gymOrgId: GymOrgId,
  ): Promise<DietPlanTemplateSummary | null> {
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
    return toDietPlanTemplateSummary(data as TemplateWithMeals);
  }

  async list(
    criteria: ListDietPlanTemplatesCriteria,
    page: Pagination,
  ): Promise<Page<DietPlanTemplateSummary>> {
    let query = this.client
      .from('diet_plan_templates')
      .select(TEMPLATE_SELECT, { count: 'exact' })
      .eq('gym_org_id', criteria.gymOrgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(page.offset, page.offset + page.limit - 1);

    if (criteria.trainerId !== undefined) {
      query = query.eq('trainer_id', criteria.trainerId);
    }

    const { data, error, count } = await query;
    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list diet plan templates', {
        cause: error,
      });
    }

    return toPage(
      (data ?? []).map((row) => toDietPlanTemplateSummary(row as TemplateWithMeals)),
      count ?? 0,
      page,
    );
  }
}
