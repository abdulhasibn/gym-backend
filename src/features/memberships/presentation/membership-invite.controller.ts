import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { CreateMembershipInviteUseCase } from '../application/create-membership-invite.use-case';
import type { ListMembershipInvitesUseCase } from '../application/list-membership-invites.use-case';
import type { RevokeMembershipInviteUseCase } from '../application/revoke-membership-invite.use-case';
import { toMembershipInviteId } from '../domain/membership-invite-id';
import { toMembershipPlanId } from '../domain/membership-plan-id';
import {
  createMembershipInviteSchema,
  gymAndInviteIdParamSchema,
  gymOrgIdParamSchema,
  listMembershipInvitesQuerySchema,
} from './membership-invite.schemas';

export class MembershipInviteController {
  constructor(
    private readonly createInvite: CreateMembershipInviteUseCase,
    private readonly listInvites: ListMembershipInvitesUseCase,
    private readonly revokeInvite: RevokeMembershipInviteUseCase,
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
}
