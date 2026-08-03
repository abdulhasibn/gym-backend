import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { GymOrgQueries, GymOrgSummary } from '../domain/gym-org.queries';
import { toGymOrgId } from '../domain/gym-org-id';

export class SupabaseGymOrgQueries implements GymOrgQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForUser(userId: UserId): Promise<readonly GymOrgSummary[]> {
    const { data: affiliations, error: affiliationError } = await this.client
      .from('gym_admins')
      .select('gym_org_id, is_owner')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (affiliationError !== null) {
      throw new TransientDatabaseFailureError('Unable to read gym affiliations', {
        cause: affiliationError,
      });
    }
    if (affiliations.length === 0) {
      return [];
    }

    const { data: gymOrgs, error: gymOrgError } = await this.client
      .from('gym_orgs')
      .select('id, name, timezone')
      .in(
        'id',
        affiliations.map((affiliation) => affiliation.gym_org_id),
      )
      .is('deleted_at', null);

    if (gymOrgError !== null) {
      throw new TransientDatabaseFailureError('Unable to read gym organizations', {
        cause: gymOrgError,
      });
    }

    const ownershipByGymOrgId = new Map(
      affiliations.map((affiliation) => [affiliation.gym_org_id, affiliation.is_owner]),
    );

    return gymOrgs.map((gymOrg) => ({
      id: toGymOrgId(gymOrg.id),
      name: gymOrg.name,
      timezone: gymOrg.timezone,
      isOwner: ownershipByGymOrgId.get(gymOrg.id) ?? false,
    }));
  }
}
