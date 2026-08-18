import type { UserId } from '../../../domain/shared/user-id';
import type { WearableConnection } from './wearable-connection.entity';
import type { WearableProvider } from './wearable-provider';

export interface WearableConnectionRepository {
  findLiveByClientAndProvider(
    clientUserId: UserId,
    provider: WearableProvider,
  ): Promise<WearableConnection | null>;

  save(connection: WearableConnection): Promise<void>;
}
