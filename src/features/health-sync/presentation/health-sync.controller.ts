import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { ConnectWearableUseCase } from '../application/connect-wearable.use-case';
import type { DisconnectWearableUseCase } from '../application/disconnect-wearable.use-case';
import type { ListMyWearableConnectionsUseCase } from '../application/list-my-wearable-connections.use-case';
import type { ListMyWearableMetricsUseCase } from '../application/list-my-wearable-metrics.use-case';
import type { ListStaffClientWearableMetricsUseCase } from '../application/list-staff-client-wearable-metrics.use-case';
import type { SyncWearableMetricsUseCase } from '../application/sync-wearable-metrics.use-case';
import {
  connectWearableSchema,
  gymAndClientUserIdParamSchema,
  listWearableMetricsQuerySchema,
  syncWearableMetricsSchema,
  wearableProviderParamSchema,
} from './health-sync.schemas';

export class HealthSyncController {
  constructor(
    private readonly listMyConnections: ListMyWearableConnectionsUseCase,
    private readonly connectWearable: ConnectWearableUseCase,
    private readonly disconnectWearable: DisconnectWearableUseCase,
    private readonly syncWearableMetrics: SyncWearableMetricsUseCase,
    private readonly listMyWearableMetrics: ListMyWearableMetricsUseCase,
    private readonly listStaffClientMetrics: ListStaffClientWearableMetricsUseCase,
  ) {}

  listConnections: RequestHandler = async (req, res, next) => {
    try {
      const connections = await this.listMyConnections.execute(requireAuthenticatedActor(req));
      res.status(200).json({ connections });
    } catch (error) {
      next(error);
    }
  };

  connect: RequestHandler = async (req, res, next) => {
    try {
      const body = connectWearableSchema.parse(req.body);
      const connection = await this.connectWearable.execute(requireAuthenticatedActor(req), body);
      res.status(201).json({ connection });
    } catch (error) {
      next(error);
    }
  };

  disconnect: RequestHandler = async (req, res, next) => {
    try {
      const { provider } = wearableProviderParamSchema.parse(req.params);
      const connection = await this.disconnectWearable.execute(
        requireAuthenticatedActor(req),
        provider,
      );
      res.status(200).json({ connection });
    } catch (error) {
      next(error);
    }
  };

  syncMetricsHandler: RequestHandler = async (req, res, next) => {
    try {
      const body = syncWearableMetricsSchema.parse(req.body);
      const result = await this.syncWearableMetrics.execute(requireAuthenticatedActor(req), body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  listMyMetricsHandler: RequestHandler = async (req, res, next) => {
    try {
      const query = listWearableMetricsQuerySchema.parse(req.query);
      const wearableMetrics = await this.listMyWearableMetrics.execute(
        requireAuthenticatedActor(req),
        {
          provider: query.provider,
          from: query.from,
          to: query.to,
        },
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ wearableMetrics });
    } catch (error) {
      next(error);
    }
  };

  staffListMetrics: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const query = listWearableMetricsQuerySchema.parse(req.query);
      const wearableMetrics = await this.listStaffClientMetrics.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        clientUserId,
        {
          provider: query.provider,
          from: query.from,
          to: query.to,
        },
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ wearableMetrics });
    } catch (error) {
      next(error);
    }
  };
}
