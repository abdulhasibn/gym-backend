import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import { toPage } from '../../../shared/pagination/pagination';
import { measureSpan } from '../../../shared/timing/request-spans';
import type { MembershipPlanId } from '../domain/membership-plan-id';
import type {
  ListMembershipPlansCriteria,
  MembershipPlanQueries,
  MembershipPlanSummary,
} from '../domain/membership-plan.queries';
import { toMembershipPlanSummary } from './membership-plan.mapper';

export class SupabaseMembershipPlanQueries implements MembershipPlanQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async get(gymOrgId: GymOrgId, planId: MembershipPlanId): Promise<MembershipPlanSummary | null> {
    return measureSpan('query', async () => {
      const { data, error } = await this.client
        .from('membership_plans')
        .select('*')
        .eq('gym_org_id', gymOrgId)
        .eq('id', planId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error !== null) {
        throw new TransientDatabaseFailureError('Unable to read membership plan', { cause: error });
      }
      if (data === null) {
        return null;
      }

      return toMembershipPlanSummary(data);
    });
  }

  async list(
    criteria: ListMembershipPlansCriteria,
    page: Pagination,
  ): Promise<Page<MembershipPlanSummary>> {
    return measureSpan('query', async () => {
      let query = this.client
        .from('membership_plans')
        .select('*', { count: 'exact' })
        .eq('gym_org_id', criteria.gymOrgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(page.offset, page.offset + page.limit - 1);

      if (criteria.kind !== undefined) {
        query = query.eq('kind', criteria.kind);
      }
      if (criteria.active !== undefined) {
        query = query.eq('active', criteria.active);
      }

      const { data, error, count } = await query;

      if (error !== null) {
        throw new TransientDatabaseFailureError('Unable to list membership plans', {
          cause: error,
        });
      }

      return toPage((data ?? []).map(toMembershipPlanSummary), count ?? 0, page);
    });
  }
}
