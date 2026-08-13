import type { SupabaseClient } from '@supabase/supabase-js';

import { NotFoundError } from '../../../domain/errors/not-found.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { ClientProfile } from '../domain/client-profile.entity';
import type { ClientProfileRepository } from '../domain/client-profile.repository';
import { toClientProfile, toClientProfileUpdate } from './users.mapper';

export class SupabaseClientProfileRepository implements ClientProfileRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findByUserId(userId: UserId): Promise<ClientProfile | null> {
    const { data, error } = await this.client
      .from('client_profiles')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read client profile', { cause: error });
    }
    if (data === null) {
      return null;
    }
    return toClientProfile(data);
  }

  async save(profile: ClientProfile): Promise<void> {
    const { data, error } = await this.client
      .from('client_profiles')
      .update(toClientProfileUpdate(profile))
      .eq('user_id', profile.userId)
      .is('deleted_at', null)
      .select('user_id')
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to save client profile', { cause: error });
    }
    if (data === null) {
      throw new NotFoundError('Client profile not found');
    }
  }
}
