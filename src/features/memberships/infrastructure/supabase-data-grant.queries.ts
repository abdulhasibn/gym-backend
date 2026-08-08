import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { DataGrantClass } from '../domain/data-grant-class';
import { isDataGrantClass } from '../domain/data-grant-class';
import type { DataGrantQueries, DataGrantsSnapshot } from '../domain/data-grant.queries';
import type { ProfileAttribute } from '../domain/profile-attribute';
import { isProfileAttribute } from '../domain/profile-attribute';

export class SupabaseDataGrantQueries implements DataGrantQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForActiveMembership(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<DataGrantsSnapshot | null> {
    const { data: membership, error: membershipError } = await this.client
      .from('client_memberships')
      .select('id')
      .eq('client_user_id', clientUserId)
      .eq('gym_org_id', gymOrgId)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .maybeSingle();

    if (membershipError !== null) {
      throw new TransientDatabaseFailureError('Unable to verify active membership for grants', {
        cause: membershipError,
      });
    }
    if (membership === null) {
      return null;
    }

    return loadGrantsSnapshot(this.client, clientUserId, gymOrgId);
  }
}

export async function loadGrantsSnapshot(
  client: SupabaseClient<Database>,
  clientUserId: UserId,
  gymOrgId: GymOrgId,
): Promise<DataGrantsSnapshot> {
  const [profileResult, classResult] = await Promise.all([
    client
      .from('profile_attribute_grants')
      .select('attribute')
      .eq('client_user_id', clientUserId)
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null),
    client
      .from('data_grants')
      .select('class')
      .eq('client_user_id', clientUserId)
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null),
  ]);

  if (profileResult.error !== null || classResult.error !== null) {
    throw new TransientDatabaseFailureError('Unable to list data grants', {
      cause: profileResult.error ?? classResult.error,
    });
  }

  const profileAttributes = (profileResult.data ?? [])
    .map((row) => row.attribute)
    .filter((value): value is ProfileAttribute => isProfileAttribute(value));

  const classGrants = (classResult.data ?? [])
    .map((row) => row.class)
    .filter((value): value is DataGrantClass => isDataGrantClass(value));

  return {
    gymOrgId,
    clientUserId,
    profileAttributes,
    classGrants,
  };
}
