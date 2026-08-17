import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { AssignDietPlanUseCase } from '../application/assign-diet-plan.use-case';
import type { CompleteDietItemUseCase } from '../application/complete-diet-item.use-case';
import type { GetMyDietPlanUseCase } from '../application/get-my-diet-plan.use-case';
import type { GetStaffDietPlanUseCase } from '../application/get-staff-diet-plan.use-case';
import type { UncompleteDietItemUseCase } from '../application/uncomplete-diet-item.use-case';
import {
  assignDietPlanSchema,
  dietItemParamSchema,
  gymAndClientUserIdParamSchema,
  gymOrgIdParamSchema,
} from './coaching.schemas';

export class CoachingController {
  constructor(
    private readonly assignDietPlan: AssignDietPlanUseCase,
    private readonly getStaffDietPlan: GetStaffDietPlanUseCase,
    private readonly getMyDietPlan: GetMyDietPlanUseCase,
    private readonly completeDietItem: CompleteDietItemUseCase,
    private readonly uncompleteDietItem: UncompleteDietItemUseCase,
  ) {}

  assign: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const body = assignDietPlanSchema.parse(req.body);
      const dietPlan = await this.assignDietPlan.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        clientUserId,
        title: body.title,
        notes: body.notes ?? null,
        meals: body.meals,
      });
      res.status(201).json({ dietPlan });
    } catch (error) {
      next(error);
    }
  };

  staffGet: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const dietPlan = await this.getStaffDietPlan.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        clientUserId,
      );
      res.status(200).json({ dietPlan });
    } catch (error) {
      next(error);
    }
  };

  myPlan: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const dietPlan = await this.getMyDietPlan.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
      );
      res.status(200).json({ dietPlan });
    } catch (error) {
      next(error);
    }
  };

  complete: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, itemId } = dietItemParamSchema.parse(req.params);
      await this.completeDietItem.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        itemId,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  uncomplete: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, itemId } = dietItemParamSchema.parse(req.params);
      await this.uncompleteDietItem.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        itemId,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
