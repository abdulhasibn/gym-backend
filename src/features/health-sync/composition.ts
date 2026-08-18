import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../infrastructure/supabase/database.types';
import { SystemClock } from '../../shared/clock/clock';
import { UuidIdGenerator } from '../../shared/ids/id-generator';
import { ConnectWearableUseCase } from './application/connect-wearable.use-case';
import { ClientSelfPolicy } from './application/client-self.policy';
import { DisconnectWearableUseCase } from './application/disconnect-wearable.use-case';
import { ListMyWearableConnectionsUseCase } from './application/list-my-wearable-connections.use-case';
import { ListMyWearableMetricsUseCase } from './application/list-my-wearable-metrics.use-case';
import { ListStaffClientWearableMetricsUseCase } from './application/list-staff-client-wearable-metrics.use-case';
import { StaffWearableReadPolicy } from './application/staff-wearable-read.policy';
import { SyncWearableMetricsUseCase } from './application/sync-wearable-metrics.use-case';
import type { ClientDataGrantGate } from './domain/client-data-grant.gate';
import type { LiveGymAdminPort, LiveTrainerPort } from './domain/live-staff.port';
import type { SyncWearableWeight } from './domain/sync-wearable-weight.port';
import { SupabaseWearableConnectionQueries } from './infrastructure/supabase-wearable-connection.queries';
import { SupabaseWearableConnectionRepository } from './infrastructure/supabase-wearable-connection.repository';
import { SupabaseWearableDailyMetricQueries } from './infrastructure/supabase-wearable-daily-metric.queries';
import { SupabaseWearableDailyMetricRepository } from './infrastructure/supabase-wearable-daily-metric.repository';
import { HealthSyncController } from './presentation/health-sync.controller';
import { mapHealthSyncError } from './presentation/health-sync.error-mapper';
import {
  createMeWearableRouter,
  createStaffClientWearableRouter,
} from './presentation/health-sync.routes';

export interface HealthSyncStaffPorts {
  readonly liveGymAdmin: LiveGymAdminPort;
  readonly liveTrainer: LiveTrainerPort;
  readonly dataGrantGate: ClientDataGrantGate;
}

export interface HealthSyncCrossFeaturePorts {
  readonly syncWearableWeight: SyncWearableWeight;
}

export function composeHealthSyncFeature(
  dataClient: SupabaseClient<Database>,
  authenticate: RequestHandler,
  staffPorts: HealthSyncStaffPorts,
  crossFeature: HealthSyncCrossFeaturePorts,
) {
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const connections = new SupabaseWearableConnectionRepository(dataClient);
  const connectionQueries = new SupabaseWearableConnectionQueries(dataClient);
  const metrics = new SupabaseWearableDailyMetricRepository(dataClient);
  const metricQueries = new SupabaseWearableDailyMetricQueries(dataClient);
  const selfPolicy = new ClientSelfPolicy();
  const staffPolicy = new StaffWearableReadPolicy(staffPorts.liveGymAdmin, staffPorts.liveTrainer);

  const controller = new HealthSyncController(
    new ListMyWearableConnectionsUseCase(selfPolicy, connectionQueries),
    new ConnectWearableUseCase(selfPolicy, connections, clock, ids),
    new DisconnectWearableUseCase(selfPolicy, connections, clock),
    new SyncWearableMetricsUseCase(
      selfPolicy,
      connections,
      metrics,
      crossFeature.syncWearableWeight,
      clock,
    ),
    new ListMyWearableMetricsUseCase(selfPolicy, metricQueries),
    new ListStaffClientWearableMetricsUseCase(staffPolicy, metricQueries, staffPorts.dataGrantGate),
  );

  return {
    meWearableRouter: createMeWearableRouter(controller, authenticate),
    staffClientWearableRouter: createStaffClientWearableRouter(controller, authenticate),
    errorMapper: mapHealthSyncError,
  };
}
