import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import { toPage } from '../../../shared/pagination/pagination';
import type { LeadId } from '../domain/lead-id';
import { OPEN_LEAD_STATUSES } from '../domain/lead-status';
import type {
  LeadQueries,
  LeadSummary,
  ListDueFollowUpsCriteria,
  ListLeadsCriteria,
} from '../domain/lead.queries';
import { toLeadSummary } from './lead.mapper';

export class SupabaseLeadQueries implements LeadQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async get(gymOrgId: GymOrgId, leadId: LeadId): Promise<LeadSummary | null> {
    const { data, error } = await this.client
      .from('leads')
      .select('*')
      .eq('gym_org_id', gymOrgId)
      .eq('id', leadId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read lead', { cause: error });
    }
    if (data === null) {
      return null;
    }

    return toLeadSummary(data);
  }

  async list(criteria: ListLeadsCriteria, page: Pagination): Promise<Page<LeadSummary>> {
    let query = this.client
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('gym_org_id', criteria.gymOrgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(page.offset, page.offset + page.limit - 1);

    if (criteria.status !== undefined) {
      query = query.eq('status', criteria.status);
    }

    const { data, error, count } = await query;

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list leads', { cause: error });
    }

    return toPage((data ?? []).map(toLeadSummary), count ?? 0, page);
  }

  async listDueFollowUps(
    criteria: ListDueFollowUpsCriteria,
    page: Pagination,
  ): Promise<Page<LeadSummary>> {
    const { data, error, count } = await this.client
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('gym_org_id', criteria.gymOrgId)
      .in('status', [...OPEN_LEAD_STATUSES])
      .not('follow_up_date', 'is', null)
      .lte('follow_up_date', criteria.onOrBefore)
      .is('deleted_at', null)
      .order('follow_up_date', { ascending: true })
      .range(page.offset, page.offset + page.limit - 1);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list due follow-ups', { cause: error });
    }

    return toPage((data ?? []).map(toLeadSummary), count ?? 0, page);
  }
}
