import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { ClientProfileQueries, ClientProfileSummary } from '../domain/client-profile.queries';
import { toClientProfileSummary } from './users.mapper';

export class SupabaseClientProfileQueries implements ClientProfileQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async get(userId: UserId): Promise<ClientProfileSummary | null> {
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
    return toClientProfileSummary(data);
  }
}
