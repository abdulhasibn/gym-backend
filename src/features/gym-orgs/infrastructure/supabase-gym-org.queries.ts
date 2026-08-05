import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { UserId } from '../../../domain/shared/user-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { GymOrgDetail, GymOrgQueries, GymOrgSummary } from '../domain/gym-org.queries';
import { toGymOrgId } from '../domain/gym-org-id';
import type { GymOrgId } from '../domain/gym-org-id';

export class SupabaseGymOrgQueries implements GymOrgQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForUser(userId: UserId): Promise<readonly GymOrgSummary[]> {
    const affiliation = await this.loadAffiliationMap(userId);
    if (affiliation.size === 0) {
      return [];
    }

    const gymOrgIds = [...affiliation.keys()];
    const { data: gymOrgs, error: gymOrgError } = await this.client
      .from('gym_orgs')
      .select('id, name, timezone')
      .in('id', gymOrgIds)
      .is('deleted_at', null);

    if (gymOrgError !== null) {
      throw new TransientDatabaseFailureError('Unable to read gym organizations', {
        cause: gymOrgError,
      });
    }

    return gymOrgs.map((gymOrg) => ({
      id: toGymOrgId(gymOrg.id),
      name: gymOrg.name,
      timezone: gymOrg.timezone,
      isOwner: affiliation.get(gymOrg.id)?.isOwner ?? false,
    }));
  }

  async getForUser(userId: UserId, gymOrgId: GymOrgId): Promise<GymOrgDetail | null> {
    const affiliation = await this.loadAffiliationMap(userId);
    const membership = affiliation.get(gymOrgId);
    if (membership === undefined) {
      return null;
    }

    const { data, error } = await this.client
      .from('gym_orgs')
      .select('*')
      .eq('id', gymOrgId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read gym organization', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }

    return {
      id: toGymOrgId(data.id),
      name: data.name,
      address: data.address,
      contactPhone: data.contact_phone,
      contactEmail: data.contact_email,
      logoUrl: data.logo_url,
      timezone: data.timezone,
      ownerUserId: toUserId(data.owner_user_id),
      isOwner: membership.isOwner,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private async loadAffiliationMap(
    userId: UserId,
  ): Promise<Map<string, { isOwner: boolean }>> {
    const [adminsResult, trainersResult] = await Promise.all([
      this.client
        .from('gym_admins')
        .select('gym_org_id, is_owner')
        .eq('user_id', userId)
        .is('deleted_at', null),
      this.client
        .from('trainer_profiles')
        .select('gym_org_id')
        .eq('user_id', userId)
        .is('deleted_at', null),
    ]);

    if (adminsResult.error !== null) {
      throw new TransientDatabaseFailureError('Unable to read gym affiliations', {
        cause: adminsResult.error,
      });
    }
    if (trainersResult.error !== null) {
      throw new TransientDatabaseFailureError('Unable to read trainer affiliations', {
        cause: trainersResult.error,
      });
    }

    const map = new Map<string, { isOwner: boolean }>();

    for (const trainer of trainersResult.data) {
      map.set(trainer.gym_org_id, { isOwner: false });
    }
    for (const admin of adminsResult.data) {
      map.set(admin.gym_org_id, { isOwner: admin.is_owner });
    }

    return map;
  }
}
