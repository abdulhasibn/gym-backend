import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { CreateMembershipPlanUseCase } from '../application/create-membership-plan.use-case';
import type { GetMembershipPlanUseCase } from '../application/get-membership-plan.use-case';
import type { ListMembershipPlansUseCase } from '../application/list-membership-plans.use-case';
import type { SoftDeleteMembershipPlanUseCase } from '../application/soft-delete-membership-plan.use-case';
import type { UpdateMembershipPlanUseCase } from '../application/update-membership-plan.use-case';
import { toMembershipPlanId } from '../domain/membership-plan-id';
import {
  createMembershipPlanSchema,
  gymAndPlanIdParamSchema,
  gymOrgIdParamSchema,
  listMembershipPlansQuerySchema,
  updateMembershipPlanSchema,
} from './membership-plan.schemas';

export class MembershipPlanController {
  constructor(
    private readonly createPlan: CreateMembershipPlanUseCase,
    private readonly listPlans: ListMembershipPlansUseCase,
    private readonly getPlan: GetMembershipPlanUseCase,
    private readonly updatePlan: UpdateMembershipPlanUseCase,
    private readonly softDeletePlan: SoftDeleteMembershipPlanUseCase,
  ) {}

  create: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const body = createMembershipPlanSchema.parse(req.body);
      const plan = await this.createPlan.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        name: body.name,
        kind: body.kind,
        capability: body.capability,
        durationDays: body.durationDays,
        price: body.price,
      });
      res.status(201).json({ plan });
    } catch (error) {
      next(error);
    }
  };

  list: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = listMembershipPlansQuerySchema.parse(req.query);
      const plans = await this.listPlans.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        { limit: query.limit, offset: query.offset },
        { kind: query.kind, active: query.active },
      );
      res.status(200).json({ plans });
    } catch (error) {
      next(error);
    }
  };

  getOne: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, planId } = gymAndPlanIdParamSchema.parse(req.params);
      const plan = await this.getPlan.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        toMembershipPlanId(planId),
      );
      res.status(200).json({ plan });
    } catch (error) {
      next(error);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, planId } = gymAndPlanIdParamSchema.parse(req.params);
      const body = updateMembershipPlanSchema.parse(req.body);
      const plan = await this.updatePlan.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        planId: toMembershipPlanId(planId),
        name: body.name,
        durationDays: body.durationDays,
        price: body.price,
        active: body.active,
      });
      res.status(200).json({ plan });
    } catch (error) {
      next(error);
    }
  };

  softDelete: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, planId } = gymAndPlanIdParamSchema.parse(req.params);
      await this.softDeletePlan.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        toMembershipPlanId(planId),
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
