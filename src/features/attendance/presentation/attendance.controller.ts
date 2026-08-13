import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { DeskMarkAttendanceUseCase } from '../application/desk-mark-attendance.use-case';
import type { ListClientAttendancesUseCase } from '../application/list-client-attendances.use-case';
import type { ListGymDayAttendancesUseCase } from '../application/list-gym-day-attendances.use-case';
import type { ListMyAttendancesUseCase } from '../application/list-my-attendances.use-case';
import type { SelfCheckInUseCase } from '../application/self-check-in.use-case';
import {
  deskMarkBodySchema,
  gymAndClientUserIdParamSchema,
  gymOrgIdParamSchema,
  listAttendancesQuerySchema,
  listGymDayQuerySchema,
} from './attendance.schemas';

export class AttendanceController {
  constructor(
    private readonly selfCheckIn: SelfCheckInUseCase,
    private readonly deskMark: DeskMarkAttendanceUseCase,
    private readonly listGymDay: ListGymDayAttendancesUseCase,
    private readonly listClient: ListClientAttendancesUseCase,
    private readonly listMyAttendances: ListMyAttendancesUseCase,
  ) {}

  checkIn: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const attendance = await this.selfCheckIn.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
      );
      res.status(201).json({ attendance });
    } catch (error) {
      next(error);
    }
  };

  deskMarkPresent: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const body = deskMarkBodySchema.parse(req.body);
      const attendance = await this.deskMark.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        clientUserId: toUserId(body.clientUserId),
      });
      res.status(201).json({ attendance });
    } catch (error) {
      next(error);
    }
  };

  listToday: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = listGymDayQuerySchema.parse(req.query);
      const attendances = await this.listGymDay.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        query.day,
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ attendances });
    } catch (error) {
      next(error);
    }
  };

  listForClient: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const query = listAttendancesQuerySchema.parse(req.query);
      const attendances = await this.listClient.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        clientUserId,
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ attendances });
    } catch (error) {
      next(error);
    }
  };

  listMine: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = listAttendancesQuerySchema.parse(req.query);
      const attendances = await this.listMyAttendances.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ attendances });
    } catch (error) {
      next(error);
    }
  };
}
