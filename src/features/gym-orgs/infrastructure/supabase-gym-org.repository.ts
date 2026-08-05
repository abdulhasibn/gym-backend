import type { SupabaseClient } from '@supabase/supabase-js';

import { ConflictError } from '../../../domain/errors/conflict.error';
import { NotFoundError } from '../../../domain/errors/not-found.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { GymOrg } from '../domain/gym-org.entity';
import type { GymOrgId } from '../domain/gym-org-id';
import type { CreateOwnedGymOrg, GymOrgRepository } from '../domain/gym-org.repository';
import { toGymOrg } from './gym-org.mapper';

export class SupabaseGymOrgRepository implements GymOrgRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async createOwnedGymOrg(command: CreateOwnedGymOrg) {
    const { data, error } = await this.client.rpc('create_owned_gym_org', {
      p_owner_user_id: command.ownerUserId,
      p_name: command.name.value,
      p_address: command.address ?? undefined,
      p_contact_phone: command.contactPhone ?? undefined,
      p_contact_email: command.contactEmail ?? undefined,
      p_logo_url: command.logoUrl ?? undefined,
      p_timezone: command.timezone.value,
    });

    if (error !== null) {
      if (error.code === 'P0001') {
        throw new ConflictError('The account cannot create a gym organization');
      }
      throw new TransientDatabaseFailureError('Unable to create gym organization', {
        cause: error,
      });
    }
    if (data === null) {
      throw new TransientDatabaseFailureError('Gym organization creation returned no result');
    }

    return toGymOrg(data);
  }

  async findById(id: GymOrgId): Promise<GymOrg | null> {
    const { data, error } = await this.client
      .from('gym_orgs')
      .select('*')
      .eq('id', id)
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

    return toGymOrg(data);
  }

  async save(gymOrg: GymOrg): Promise<void> {
    const { data, error } = await this.client
      .from('gym_orgs')
      .update({
        name: gymOrg.name.value,
        address: gymOrg.address,
        contact_phone: gymOrg.contactPhone,
        contact_email: gymOrg.contactEmail,
        logo_url: gymOrg.logoUrl,
        timezone: gymOrg.timezone.value,
        updated_at: gymOrg.updatedAt.toISOString(),
      })
      .eq('id', gymOrg.id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to save gym organization', {
        cause: error,
      });
    }
    if (data === null) {
      throw new NotFoundError('Gym organization not found');
    }
  }

  async isLiveAdmin(userId: UserId, gymOrgId: GymOrgId): Promise<boolean> {
    const { data, error } = await this.client
      .from('gym_admins')
      .select('id')
      .eq('user_id', userId)
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read gym admin affiliation', {
        cause: error,
      });
    }

    return data !== null;
  }
}
