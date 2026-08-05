import type { RequestHandler } from 'express';

import type { AcceptStaffInviteUseCase } from '../application/accept-staff-invite.use-case';
import type { CreateGymOrgUseCase } from '../application/create-gym-org.use-case';
import type { CreateStaffInviteUseCase } from '../application/create-staff-invite.use-case';
import type { GetGymOrgUseCase } from '../application/get-gym-org.use-case';
import type { ListGymStaffInvitesUseCase } from '../application/list-gym-staff-invites.use-case';
import type { ListMyGymOrgsUseCase } from '../application/list-my-gym-orgs.use-case';
import type { ListMyStaffInviteInboxUseCase } from '../application/list-my-staff-invite-inbox.use-case';
import type { RevokeStaffInviteUseCase } from '../application/revoke-staff-invite.use-case';
import type { UpdateGymOrgUseCase } from '../application/update-gym-org.use-case';
import { toGymOrgId } from '../domain/gym-org-id';
import { toStaffInviteId } from '../domain/staff-invite-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import {
  createGymOrgSchema,
  createStaffInviteSchema,
  gymOrgIdParamSchema,
  paginationQuerySchema,
  staffInviteIdParamSchema,
  updateGymOrgSchema,
} from './gym-org.schemas';

export class GymOrgController {
  constructor(
    private readonly createGymOrg: CreateGymOrgUseCase,
    private readonly listMyGymOrgs: ListMyGymOrgsUseCase,
    private readonly getGymOrg: GetGymOrgUseCase,
    private readonly updateGymOrg: UpdateGymOrgUseCase,
    private readonly createStaffInvite: CreateStaffInviteUseCase,
    private readonly listGymStaffInvites: ListGymStaffInvitesUseCase,
    private readonly listMyStaffInviteInbox: ListMyStaffInviteInboxUseCase,
    private readonly acceptStaffInvite: AcceptStaffInviteUseCase,
    private readonly revokeStaffInvite: RevokeStaffInviteUseCase,
  ) {}

  create: RequestHandler = async (req, res, next) => {
    try {
      const command = createGymOrgSchema.parse(req.body);
      const gymOrg = await this.createGymOrg.execute(requireAuthenticatedActor(req), command);
      res.status(201).json({ gymOrg });
    } catch (error) {
      next(error);
    }
  };

  listMine: RequestHandler = async (req, res, next) => {
    try {
      const gymOrgs = await this.listMyGymOrgs.execute(requireAuthenticatedActor(req));
      res.status(200).json({ gymOrgs });
    } catch (error) {
      next(error);
    }
  };

  getOne: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const gymOrg = await this.getGymOrg.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
      );
      res.status(200).json({ gymOrg });
    } catch (error) {
      next(error);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const body = updateGymOrgSchema.parse(req.body);
      const gymOrg = await this.updateGymOrg.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        ...body,
      });
      res.status(200).json({ gymOrg });
    } catch (error) {
      next(error);
    }
  };

  createInvite: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const body = createStaffInviteSchema.parse(req.body);
      const staffInvite = await this.createStaffInvite.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        staffCode: body.staffCode,
        targetRole: body.targetRole,
        expiresAt: body.expiresAt,
      });
      res.status(201).json({ staffInvite });
    } catch (error) {
      next(error);
    }
  };

  listInvitesForGym: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const page = paginationQuerySchema.parse(req.query);
      const staffInvites = await this.listGymStaffInvites.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        page,
      );
      res.status(200).json({ staffInvites });
    } catch (error) {
      next(error);
    }
  };

  listInviteInbox: RequestHandler = async (req, res, next) => {
    try {
      const page = paginationQuerySchema.parse(req.query);
      const staffInvites = await this.listMyStaffInviteInbox.execute(
        requireAuthenticatedActor(req),
        page,
      );
      res.status(200).json({ staffInvites });
    } catch (error) {
      next(error);
    }
  };

  acceptInvite: RequestHandler = async (req, res, next) => {
    try {
      const { inviteId } = staffInviteIdParamSchema.parse(req.params);
      const staffInvite = await this.acceptStaffInvite.execute(
        requireAuthenticatedActor(req),
        toStaffInviteId(inviteId),
      );
      res.status(200).json({ staffInvite });
    } catch (error) {
      next(error);
    }
  };

  revokeInvite: RequestHandler = async (req, res, next) => {
    try {
      const { inviteId } = staffInviteIdParamSchema.parse(req.params);
      const staffInvite = await this.revokeStaffInvite.execute(
        requireAuthenticatedActor(req),
        toStaffInviteId(inviteId),
      );
      res.status(200).json({ staffInvite });
    } catch (error) {
      next(error);
    }
  };
}
