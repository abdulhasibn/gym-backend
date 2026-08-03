import type { SupabaseClient } from '@supabase/supabase-js';

import { ConflictError } from '../../../domain/errors/conflict.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { Database } from '../../../infrastructure/supabase/database.types';
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
}
