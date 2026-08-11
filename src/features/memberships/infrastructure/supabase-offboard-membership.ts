import type { SupabaseClient } from '@supabase/supabase-js';

import { ConflictError } from '../../../domain/errors/conflict.error';
import { NotFoundError } from '../../../domain/errors/not-found.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { ClientMembership } from '../domain/client-membership.entity';
import type { MembershipId } from '../domain/membership-id';
import type { OffboardMembershipPort } from '../domain/offboard-membership.port';
import { toClientMembership } from './client-membership.mapper';

export class SupabaseOffboardMembership implements OffboardMembershipPort {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async offboard(
    gymOrgId: GymOrgId,
    membershipId: MembershipId,
    now: Date,
  ): Promise<ClientMembership> {
    const { data, error } = await this.client.rpc('offboard_client_membership', {
      p_membership_id: membershipId,
      p_gym_org_id: gymOrgId,
      p_now: now.toISOString(),
    });

    if (error !== null) {
      const message = error.message ?? '';
      if (message.includes('not found')) {
        throw new NotFoundError('Client membership not found');
      }
      if (message.includes('not active')) {
        throw new ConflictError('Client membership is not active');
      }
      throw new TransientDatabaseFailureError('Unable to offboard client membership', {
        cause: error,
      });
    }
    if (data === null) {
      throw new TransientDatabaseFailureError('Offboard returned no result');
    }

    return toClientMembership(data);
  }
}
