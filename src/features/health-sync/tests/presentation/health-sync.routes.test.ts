import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { ClientSelfPolicy } from '../../application/client-self.policy';
import { ConnectWearableUseCase } from '../../application/connect-wearable.use-case';
import { DisconnectWearableUseCase } from '../../application/disconnect-wearable.use-case';
import { ListMyWearableConnectionsUseCase } from '../../application/list-my-wearable-connections.use-case';
import { ListMyWearableMetricsUseCase } from '../../application/list-my-wearable-metrics.use-case';
import { ListStaffClientWearableMetricsUseCase } from '../../application/list-staff-client-wearable-metrics.use-case';
import { StaffWearableReadPolicy } from '../../application/staff-wearable-read.policy';
import { SyncWearableMetricsUseCase } from '../../application/sync-wearable-metrics.use-case';
import type { WearableConnectionRepository } from '../../domain/wearable-connection.repository';
import type { WearableConnectionQueries } from '../../domain/wearable-connection.queries';
import type { WearableDailyMetricQueries } from '../../domain/wearable-daily-metric.queries';
import type { WearableDailyMetricRepository } from '../../domain/wearable-daily-metric.repository';
import { HealthSyncController } from '../../presentation/health-sync.controller';
import { mapHealthSyncError } from '../../presentation/health-sync.error-mapper';
import { createMeWearableRouter } from '../../presentation/health-sync.routes';

class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): Logger {
    return this;
  }
}

const client: AuthenticatedActor = {
  userId: toUserId('11111111-1111-4111-8111-111111111111'),
  roleCode: 'CLIENT',
  lane: 'CLIENT',
  email: 'c@example.com',
  staffCode: null,
};

function createApp() {
  const connections: WearableConnectionRepository = {
    findLiveByClientAndProvider: async () => null,
    save: async () => undefined,
  };
  const connectionQueries: WearableConnectionQueries = {
    listLiveForClient: async () => [],
  };
  const metrics: WearableDailyMetricRepository = {
    upsertBatch: async () => undefined,
  };
  const metricQueries: WearableDailyMetricQueries = {
    listForClient: async () => ({ items: [], total: 0, limit: 20, offset: 0 }),
  };
  const self = new ClientSelfPolicy();
  const staff = new StaffWearableReadPolicy(
    { isLiveAdmin: async () => false },
    { isLiveTrainer: async () => false },
  );
  const now = new Date('2026-08-18T04:00:00.000Z');

  const controller = new HealthSyncController(
    new ListMyWearableConnectionsUseCase(self, connectionQueries),
    new ConnectWearableUseCase(
      self,
      connections,
      { now: () => now },
      {
        generate: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    ),
    new DisconnectWearableUseCase(self, connections, { now: () => now }),
    new SyncWearableMetricsUseCase(
      self,
      connections,
      metrics,
      { upsert: vi.fn() },
      {
        now: () => now,
      },
    ),
    new ListMyWearableMetricsUseCase(self, metricQueries),
    new ListStaffClientWearableMetricsUseCase(staff, metricQueries, {
      loadForActiveMembership: async () => null,
    }),
  );

  const authenticate: RequestHandler = (req, _res, next) => {
    setAuthenticatedActor(req, client);
    next();
  };
  const app = express();
  app.use(express.json());
  app.use('/me', createMeWearableRouter(controller, authenticate));
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapHealthSyncError]));
  return app;
}

describe('POST /me/wearable-connections', () => {
  it('creates a connection', async () => {
    const res = await request(createApp())
      .post('/me/wearable-connections')
      .send({ provider: 'HEALTH_CONNECT' });
    expect(res.status).toBe(201);
    expect(res.body.connection.provider).toBe('HEALTH_CONNECT');
  });

  it('rejects invalid provider', async () => {
    const res = await request(createApp())
      .post('/me/wearable-connections')
      .send({ provider: 'FITBIT' });
    expect(res.status).toBe(422);
  });
});

describe('POST /me/wearable-metrics/sync', () => {
  it('rejects sync without a live connection', async () => {
    const res = await request(createApp())
      .post('/me/wearable-metrics/sync')
      .send({
        provider: 'HEALTH_CONNECT',
        days: [{ metricOn: '2026-08-18', steps: 1000 }],
      });
    expect(res.status).toBe(404);
  });
});
