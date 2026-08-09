import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { ClientMembership } from '../domain/client-membership.entity';
import type { ClientMembershipRepository } from '../domain/client-membership.repository';
import type { MembershipId } from '../domain/membership-id';
import { toClientMembership } from './client-membership.mapper';

export class SupabaseClientMembershipRepository implements ClientMembershipRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(gymOrgId: GymOrgId, membershipId: MembershipId): Promise<ClientMembership | null> {
    const { data, error } = await this.client
      .from('client_memberships')
      .select('*')
      .eq('gym_org_id', gymOrgId)
      .eq('id', membershipId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read client membership', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }

    return toClientMembership(data);
  }

  async findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<ClientMembership | null> {
    const { data, error } = await this.client
      .from('client_memberships')
      .select('*')
      .eq('client_user_id', clientUserId)
      .eq('gym_org_id', gymOrgId)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read client membership', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }

    return toClientMembership(data);
  }
}
