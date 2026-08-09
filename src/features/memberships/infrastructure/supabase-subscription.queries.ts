import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { toMembershipId } from '../domain/membership-id';
import type { MembershipId } from '../domain/membership-id';
import type { SubscriptionQueries, SubscriptionSummary } from '../domain/subscription.queries';
import { toSubscriptionSummary } from './subscription.mapper';

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
}
