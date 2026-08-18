import { describe, expect, it } from 'vitest';

import { toUserId } from '../../../../domain/shared/user-id';
import { WearableProvider } from '../../domain/wearable-provider';
import { WearableConnection } from '../../domain/wearable-connection.entity';
import { toWearableConnectionId } from '../../domain/wearable-connection-id';

const now = new Date('2026-08-18T00:00:00.000Z');
const userId = toUserId('11111111-1111-4111-8111-111111111111');

describe('WearableProvider', () => {
  it('accepts HEALTH_CONNECT', () => {
    expect(WearableProvider.create('HEALTH_CONNECT').code).toBe('HEALTH_CONNECT');
  });

  it('rejects unknown providers', () => {
    expect(() => WearableProvider.create('FITBIT')).toThrow();
  });
});

describe('WearableConnection', () => {
  it('disconnect soft-ends a live connection', () => {
    const connection = WearableConnection.create({
      id: toWearableConnectionId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      clientUserId: userId,
      provider: WearableProvider.create('HEALTH_CONNECT'),
      authRef: null,
      now,
    });

    connection.disconnect(now);
    expect(connection.active).toBe(false);
    expect(connection.isDeleted).toBe(true);
  });

  it('records sync timestamps on active connections', () => {
    const connection = WearableConnection.create({
      id: toWearableConnectionId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      clientUserId: userId,
      provider: WearableProvider.create('APPLE_HEALTH'),
      authRef: null,
      now,
    });

    const syncedAt = new Date('2026-08-18T12:00:00.000Z');
    connection.recordSync(syncedAt);
    expect(connection.lastSyncedAt?.toISOString()).toBe(syncedAt.toISOString());
  });
});
