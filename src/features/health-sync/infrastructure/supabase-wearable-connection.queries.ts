import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type {
  WearableConnectionQueries,
  WearableConnectionSummary,
} from '../domain/wearable-connection.queries';
import { toWearableConnectionSummary } from './health-sync.mapper';

export class SupabaseWearableConnectionQueries implements WearableConnectionQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listLiveForClient(clientUserId: UserId): Promise<readonly WearableConnectionSummary[]> {
    const { data, error } = await this.client
      .from('wearable_connections')
      .select('*')
      .eq('client_user_id', clientUserId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list wearable connections', {
        cause: error,
      });
    }

    return (data ?? []).map(toWearableConnectionSummary);
  }
}
