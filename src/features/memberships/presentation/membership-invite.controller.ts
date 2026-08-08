import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { AcceptMembershipInviteUseCase } from '../application/accept-membership-invite.use-case';
import type { CreateMembershipInviteUseCase } from '../application/create-membership-invite.use-case';
import type { GetMyDataGrantsUseCase } from '../application/get-my-data-grants.use-case';
import type { ListMembershipInvitesUseCase } from '../application/list-membership-invites.use-case';
import type { ListMyMembershipInviteInboxUseCase } from '../application/list-my-membership-invite-inbox.use-case';
import type { RevokeMembershipInviteUseCase } from '../application/revoke-membership-invite.use-case';
import type { UpdateMyDataGrantsUseCase } from '../application/update-my-data-grants.use-case';
import { toMembershipInviteId } from '../domain/membership-invite-id';
import { toMembershipPlanId } from '../domain/membership-plan-id';
import {
  acceptMembershipInviteSchema,
  createMembershipInviteSchema,
  gymAndInviteIdParamSchema,
  gymOrgIdParamSchema,
  inviteIdParamSchema,
  listMembershipInvitesQuerySchema,
  updateMyDataGrantsSchema,
} from './membership-invite.schemas';

export class MembershipInviteController {
  constructor(
    private readonly createInvite: CreateMembershipInviteUseCase,
    private readonly listInvites: ListMembershipInvitesUseCase,
    private readonly revokeInvite: RevokeMembershipInviteUseCase,
    private readonly listInboxUseCase: ListMyMembershipInviteInboxUseCase,
    private readonly acceptInviteUseCase: AcceptMembershipInviteUseCase,
    private readonly getMyDataGrantsUseCase: GetMyDataGrantsUseCase,
    private readonly updateMyDataGrantsUseCase: UpdateMyDataGrantsUseCase,
  ) {}

  create: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const body = createMembershipInviteSchema.parse(req.body);
      const membershipInvite = await this.createInvite.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        inviteeName: body.inviteeName,
        invitedEmail: body.invitedEmail,
        inviteePhone: body.inviteePhone,
        basePlanId: toMembershipPlanId(body.basePlanId),
        basePaymentStatus: body.basePaymentStatus,
        addonPlanId: body.addonPlanId === null ? null : toMembershipPlanId(body.addonPlanId),
        addonPaymentStatus: body.addonPaymentStatus,
        expiresAt: body.expiresAt,
      });
      res.status(201).json({ membershipInvite });
    } catch (error) {
      next(error);
    }
  };

  list: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = listMembershipInvitesQuerySchema.parse(req.query);
      const membershipInvites = await this.listInvites.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ membershipInvites });
    } catch (error) {
      next(error);
    }
  };

  revoke: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, inviteId } = gymAndInviteIdParamSchema.parse(req.params);
      const membershipInvite = await this.revokeInvite.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        toMembershipInviteId(inviteId),
      );
      res.status(200).json({ membershipInvite });
    } catch (error) {
      next(error);
    }
  };

  listInbox: RequestHandler = async (req, res, next) => {
    try {
      const query = listMembershipInvitesQuerySchema.parse(req.query);
      const membershipInvites = await this.listInboxUseCase.execute(
        requireAuthenticatedActor(req),
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ membershipInvites });
    } catch (error) {
      next(error);
    }
  };

  accept: RequestHandler = async (req, res, next) => {
    try {
      const { inviteId } = inviteIdParamSchema.parse(req.params);
      const body = acceptMembershipInviteSchema.parse(req.body ?? {});
      const result = await this.acceptInviteUseCase.execute(
        requireAuthenticatedActor(req),
        toMembershipInviteId(inviteId),
        {
          optionalProfileAttributes: body.optionalProfileAttributes,
          optionalClassGrants: body.optionalClassGrants,
        },
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getMyDataGrants: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const dataGrants = await this.getMyDataGrantsUseCase.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
      );
      res.status(200).json({ dataGrants });
    } catch (error) {
      next(error);
    }
  };

  updateMyDataGrants: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const body = updateMyDataGrantsSchema.parse(req.body ?? {});
      const dataGrants = await this.updateMyDataGrantsUseCase.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        {
          optionalProfileAttributes: body.optionalProfileAttributes,
          optionalClassGrants: body.optionalClassGrants,
        },
      );
      res.status(200).json({ dataGrants });
    } catch (error) {
      next(error);
    }
  };
}
