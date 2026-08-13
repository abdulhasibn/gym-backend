import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { GetMyProfileUseCase } from '../application/get-my-profile.use-case';
import type { GetStaffClientProfileUseCase } from '../application/get-staff-client-profile.use-case';
import type { ListMyProgressLogsUseCase } from '../application/list-my-progress-logs.use-case';
import type { ListStaffClientProgressLogsUseCase } from '../application/list-staff-client-progress-logs.use-case';
import type { UpdateMyProfileUseCase } from '../application/update-my-profile.use-case';
import type { UpsertMyProgressLogUseCase } from '../application/upsert-my-progress-log.use-case';
import {
  gymAndClientUserIdParamSchema,
  listProgressQuerySchema,
  updateMyProfileSchema,
  upsertProgressLogSchema,
} from './users.schemas';

export class UsersController {
  constructor(
    private readonly getMyProfile: GetMyProfileUseCase,
    private readonly updateMyProfile: UpdateMyProfileUseCase,
    private readonly listMyProgressLogs: ListMyProgressLogsUseCase,
    private readonly upsertMyProgressLog: UpsertMyProgressLogUseCase,
    private readonly getStaffClientProfile: GetStaffClientProfileUseCase,
    private readonly listStaffClientProgress: ListStaffClientProgressLogsUseCase,
  ) {}

  getProfile: RequestHandler = async (req, res, next) => {
    try {
      const profile = await this.getMyProfile.execute(requireAuthenticatedActor(req));
      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  };

  patchProfile: RequestHandler = async (req, res, next) => {
    try {
      const body = updateMyProfileSchema.parse(req.body);
      const profile = await this.updateMyProfile.execute(requireAuthenticatedActor(req), body);
      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  };

  listProgress: RequestHandler = async (req, res, next) => {
    try {
      const query = listProgressQuerySchema.parse(req.query);
      const progressLogs = await this.listMyProgressLogs.execute(requireAuthenticatedActor(req), {
        limit: query.limit,
        offset: query.offset,
      });
      res.status(200).json({ progressLogs });
    } catch (error) {
      next(error);
    }
  };

  upsertProgress: RequestHandler = async (req, res, next) => {
    try {
      const body = upsertProgressLogSchema.parse(req.body);
      const progressLog = await this.upsertMyProgressLog.execute(
        requireAuthenticatedActor(req),
        body,
      );
      res.status(200).json({ progressLog });
    } catch (error) {
      next(error);
    }
  };

  staffGetProfile: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const profile = await this.getStaffClientProfile.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        clientUserId,
      );
      res.status(200).json({ profile });
    } catch (error) {
      next(error);
    }
  };

  staffListProgress: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const query = listProgressQuerySchema.parse(req.query);
      const progressLogs = await this.listStaffClientProgress.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        clientUserId,
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ progressLogs });
    } catch (error) {
      next(error);
    }
  };
}
