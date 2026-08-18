import type { UserId } from '../../../domain/shared/user-id';
import type { WearableProviderCode } from './wearable-provider';

export interface WearableConnectionSummary {
  readonly id: string;
  readonly provider: WearableProviderCode;
  readonly lastSyncedAt: string | null;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface WearableConnectionQueries {
  listLiveForClient(clientUserId: UserId): Promise<readonly WearableConnectionSummary[]>;
}
