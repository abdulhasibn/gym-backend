import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import { UniqueViolationError } from '../../../domain/errors/unique-violation.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { WearableConnection } from '../domain/wearable-connection.entity';
import type { WearableConnectionRepository } from '../domain/wearable-connection.repository';
import type { WearableProvider } from '../domain/wearable-provider';
import {
  toWearableConnection,
  toWearableConnectionInsert,
  toWearableConnectionUpdate,
} from './health-sync.mapper';

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}

export class SupabaseWearableConnectionRepository implements WearableConnectionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findLiveByClientAndProvider(
    clientUserId: UserId,
    provider: WearableProvider,
  ): Promise<WearableConnection | null> {
    const { data, error } = await this.client
      .from('wearable_connections')
      .select('*')
      .eq('client_user_id', clientUserId)
      .eq('provider', provider.code)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read wearable connection', {
        cause: error,
      });
    }
    if (data === null) {
      return null;
    }
    return toWearableConnection(data);
  }

  async save(connection: WearableConnection): Promise<void> {
    const existing = await this.findLiveByClientAndProvider(
      connection.clientUserId,
      connection.provider,
    );

    if (existing === null) {
      const { error } = await this.client
        .from('wearable_connections')
        .insert(toWearableConnectionInsert(connection));
      if (error !== null) {
        if (isUniqueViolation(error)) {
          throw new UniqueViolationError('wearable connection');
        }
        throw new TransientDatabaseFailureError('Unable to create wearable connection', {
          cause: error,
        });
      }
      return;
    }

    const { error } = await this.client
      .from('wearable_connections')
      .update(toWearableConnectionUpdate(connection))
      .eq('id', existing.id)
      .eq('client_user_id', connection.clientUserId)
      .is('deleted_at', null);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to update wearable connection', {
        cause: error,
      });
    }
  }
}
