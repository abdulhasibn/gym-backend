import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { AssignTrainerUseCase } from '../application/assign-trainer.use-case';
import type { ListGymMembersUseCase } from '../application/list-gym-members.use-case';
import type { ListMyAssignedMembersUseCase } from '../application/list-my-assigned-members.use-case';
import type { OffboardClientUseCase } from '../application/offboard-client.use-case';
import type { SetCheckInBlockedUseCase } from '../application/set-check-in-blocked.use-case';
import { toMembershipId } from '../domain/membership-id';
import { toTrainerProfileId } from '../domain/trainer-profile-id';
import {
  assignTrainerBodySchema,
  checkInBlockBodySchema,
  gymAndMembershipIdParamSchema,
  gymOrgIdParamSchema,
  listAssignedMembersQuerySchema,
  listGymMembersQuerySchema,
} from './roster.schemas';

export class RosterController {
  constructor(
    private readonly listGymMembers: ListGymMembersUseCase,
    private readonly listMyAssignedMembers: ListMyAssignedMembersUseCase,
    private readonly assignTrainer: AssignTrainerUseCase,
    private readonly offboardClient: OffboardClientUseCase,
    private readonly setCheckInBlocked: SetCheckInBlockedUseCase,
  ) {}

  listMembers: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = listGymMembersQuerySchema.parse(req.query);
      const members = await this.listGymMembers.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        status: query.status,
        q: query.q ?? null,
      });
      res.status(200).json({ members });
    } catch (error) {
      next(error);
    }
  };

  listAssigned: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = listAssignedMembersQuerySchema.parse(req.query);
      const members = await this.listMyAssignedMembers.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        status: query.status ?? null,
        q: query.q ?? null,
      });
      res.status(200).json({ members });
    } catch (error) {
      next(error);
    }
  };

  assignTrainerHandler: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, membershipId } = gymAndMembershipIdParamSchema.parse(req.params);
      const body = assignTrainerBodySchema.parse(req.body);
      const membership = await this.assignTrainer.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        membershipId: toMembershipId(membershipId),
        trainerProfileId: toTrainerProfileId(body.trainerProfileId),
      });
      res.status(200).json({ membership });
    } catch (error) {
      next(error);
    }
  };

  offboardHandler: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, membershipId } = gymAndMembershipIdParamSchema.parse(req.params);
      const membership = await this.offboardClient.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        membershipId: toMembershipId(membershipId),
      });
      res.status(200).json({ membership });
    } catch (error) {
      next(error);
    }
  };

  checkInBlockHandler: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, membershipId } = gymAndMembershipIdParamSchema.parse(req.params);
      const body = checkInBlockBodySchema.parse(req.body);
      const membership = await this.setCheckInBlocked.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        membershipId: toMembershipId(membershipId),
        blocked: body.blocked,
      });
      res.status(200).json({ membership });
    } catch (error) {
      next(error);
    }
  };
}
