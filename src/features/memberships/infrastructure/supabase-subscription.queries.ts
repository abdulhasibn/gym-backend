import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { toPage, type Page, type Pagination } from '../../../shared/pagination/pagination';
import { toMembershipId } from '../domain/membership-id';
import type { MembershipId } from '../domain/membership-id';
import type {
  ListExpiringSoonCriteria,
  RenewalDueSummary,
  SubscriptionQueries,
  SubscriptionSummary,
} from '../domain/subscription.queries';
import { toSubscriptionSummary } from './subscription.mapper';

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];

type RenewalRow = SubscriptionRow & {
  client_memberships: { client_user_id: string } | null;
};

export class SupabaseSubscriptionQueries implements SubscriptionQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForMembership(
    gymOrgId: GymOrgId,
    membershipId: MembershipId,
  ): Promise<readonly SubscriptionSummary[]> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('gym_org_id', gymOrgId)
      .eq('client_membership_id', membershipId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list subscriptions', { cause: error });
    }

    return (data ?? []).map(toSubscriptionSummary);
  }

  async listForClientAtGym(
    gymOrgId: GymOrgId,
    clientUserId: UserId,
  ): Promise<readonly SubscriptionSummary[] | null> {
    const { data: membership, error: membershipError } = await this.client
      .from('client_memberships')
      .select('id')
      .eq('gym_org_id', gymOrgId)
      .eq('client_user_id', clientUserId)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .maybeSingle();

    if (membershipError !== null) {
      throw new TransientDatabaseFailureError('Unable to resolve active membership', {
        cause: membershipError,
      });
    }
    if (membership === null) {
      return null;
    }

    return this.listForMembership(gymOrgId, toMembershipId(membership.id));
  }

  async listExpiringSoon(
    criteria: ListExpiringSoonCriteria,
    page: Pagination,
  ): Promise<Page<RenewalDueSummary>> {
    const from = page.offset;
    const to = page.offset + page.limit - 1;

    let query = this.client
      .from('subscriptions')
      .select('*, client_memberships!inner(client_user_id)', { count: 'exact' })
      .eq('gym_org_id', criteria.gymOrgId)
      .is('deleted_at', null)
      .not('end_date', 'is', null)
      .lte('end_date', criteria.onOrBefore);

    if (criteria.onOrAfter !== undefined) {
      query = query.gte('end_date', criteria.onOrAfter);
    }

    const { data, error, count } = await query
      .order('end_date', { ascending: true })
      .range(from, to);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list expiring subscriptions', {
        cause: error,
      });
    }

    const items = ((data ?? []) as RenewalRow[]).map((row) => {
      const summary = toSubscriptionSummary(row);
      const clientUserId = row.client_memberships?.client_user_id;
      if (clientUserId === undefined || clientUserId === null) {
        throw new TransientDatabaseFailureError('Renewal row missing client membership');
      }
      return { ...summary, clientUserId };
    });

    return toPage(items, count ?? 0, page);
  }
}
