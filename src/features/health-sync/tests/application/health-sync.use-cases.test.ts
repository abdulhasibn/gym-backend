import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../../../../domain/errors/not-found.error';
import { UniqueViolationError } from '../../../../domain/errors/unique-violation.error';
import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { ClientSelfPolicy } from '../../application/client-self.policy';
import { ConnectWearableUseCase } from '../../application/connect-wearable.use-case';
import { HealthSyncForbiddenError } from '../../application/health-sync-forbidden.error';
import { ListStaffClientWearableMetricsUseCase } from '../../application/list-staff-client-wearable-metrics.use-case';
import { StaffWearableReadPolicy } from '../../application/staff-wearable-read.policy';
import { SyncWearableMetricsUseCase } from '../../application/sync-wearable-metrics.use-case';
import { WearableConnection } from '../../domain/wearable-connection.entity';
import type { WearableConnectionRepository } from '../../domain/wearable-connection.repository';
import { toWearableConnectionId } from '../../domain/wearable-connection-id';
import { WearableProvider } from '../../domain/wearable-provider';
import type { WearableDailyMetricRepository } from '../../domain/wearable-daily-metric.repository';
import type { SyncWearableWeight } from '../../domain/sync-wearable-weight.port';

const clientId = toUserId('11111111-1111-4111-8111-111111111111');
const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const now = new Date('2026-08-18T04:00:00.000Z');

const client: AuthenticatedActor = {
  userId: clientId,
  roleCode: 'CLIENT',
  lane: 'CLIENT',
  email: 'c@example.com',
  staffCode: null,
};

const trainer: AuthenticatedActor = {
  userId: toUserId('22222222-2222-4222-8222-222222222222'),
  roleCode: 'TRAINER',
  lane: 'STAFF',
  email: 't@example.com',
  staffCode: 'T1',
};

class InMemoryConnections implements WearableConnectionRepository {
  live: WearableConnection | null = null;

  async findLiveByClientAndProvider(
    clientUserId: typeof clientId,
    provider: WearableProvider,
  ): Promise<WearableConnection | null> {
    if (this.live === null) {
      return null;
    }
    if (this.live.clientUserId !== clientUserId || this.live.provider.code !== provider.code) {
      return null;
    }
    return this.live.isDeleted ? null : this.live;
  }

  async save(connection: WearableConnection): Promise<void> {
    this.live = connection;
  }
}

describe('ConnectWearableUseCase', () => {
  it('returns 409 when a live connection already exists', async () => {
    const connections = new InMemoryConnections();
    connections.live = WearableConnection.create({
      id: toWearableConnectionId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      clientUserId: clientId,
      provider: WearableProvider.create('HEALTH_CONNECT'),
      authRef: null,
      now,
    });

    const useCase = new ConnectWearableUseCase(
      new ClientSelfPolicy(),
      connections,
      { now: () => now },
      { generate: () => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    );

    await expect(useCase.execute(client, { provider: 'HEALTH_CONNECT' })).rejects.toBeInstanceOf(
      UniqueViolationError,
    );
  });
});

describe('SyncWearableMetricsUseCase', () => {
  it('upserts metrics and calls weight sync when weightKg is present', async () => {
    const connections = new InMemoryConnections();
    connections.live = WearableConnection.create({
      id: toWearableConnectionId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      clientUserId: clientId,
      provider: WearableProvider.create('HEALTH_CONNECT'),
      authRef: null,
      now,
    });

    const upsertBatch = vi.fn(async () => undefined);
    const metrics: WearableDailyMetricRepository = { upsertBatch };

    const syncWeight: SyncWearableWeight = {
      upsert: vi.fn(async () => undefined),
    };

    const useCase = new SyncWearableMetricsUseCase(
      new ClientSelfPolicy(),
      connections,
      metrics,
      syncWeight,
      { now: () => now },
    );

    const result = await useCase.execute(client, {
      provider: 'HEALTH_CONNECT',
      days: [
        {
          metricOn: '2026-08-18',
          steps: 8000,
          weightKg: 72.5,
        },
      ],
    });

    expect(result.syncedDays).toBe(1);
    expect(upsertBatch).toHaveBeenCalledOnce();
    expect(syncWeight.upsert).toHaveBeenCalledWith(
      clientId,
      CalendarDate.create('2026-08-18'),
      72.5,
    );
    expect(connections.live?.lastSyncedAt?.toISOString()).toBe(now.toISOString());
  });

  it('requires a live connection', async () => {
    const useCase = new SyncWearableMetricsUseCase(
      new ClientSelfPolicy(),
      new InMemoryConnections(),
      { upsertBatch: async () => undefined },
      { upsert: async () => undefined },
      { now: () => now },
    );

    await expect(
      useCase.execute(client, {
        provider: 'HEALTH_CONNECT',
        days: [{ metricOn: '2026-08-18', steps: 100 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ListStaffClientWearableMetricsUseCase', () => {
  it('requires the WEARABLES grant', async () => {
    const useCase = new ListStaffClientWearableMetricsUseCase(
      new StaffWearableReadPolicy(
        { isLiveAdmin: async () => false },
        { isLiveTrainer: async () => true },
      ),
      {
        async listForClient() {
          return { items: [], total: 0, limit: 20, offset: 0 };
        },
      },
      { loadForActiveMembership: async () => ({ classGrants: ['PROGRESS'] }) },
    );

    await expect(
      useCase.execute(trainer, gymOrgId, clientId, {}, { limit: 20, offset: 0 }),
    ).rejects.toBeInstanceOf(HealthSyncForbiddenError);
  });
});
