import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { AssignDietPlanFromTemplateUseCase } from '../application/assign-diet-plan-from-template.use-case';
import type { AssignDietPlanUseCase } from '../application/assign-diet-plan.use-case';
import type { CompleteDietItemUseCase } from '../application/complete-diet-item.use-case';
import type { CreateDietPlanTemplateUseCase } from '../application/create-diet-plan-template.use-case';
import type { DeleteDietPlanTemplateUseCase } from '../application/delete-diet-plan-template.use-case';
import type { DuplicateDietPlanTemplateUseCase } from '../application/duplicate-diet-plan-template.use-case';
import type { GetDietPlanTemplateUseCase } from '../application/get-diet-plan-template.use-case';
import type { GetMyDietPlanUseCase } from '../application/get-my-diet-plan.use-case';
import type { GetStaffDietPlanUseCase } from '../application/get-staff-diet-plan.use-case';
import type { ListDietPlanTemplatesUseCase } from '../application/list-diet-plan-templates.use-case';
import type { UncompleteDietItemUseCase } from '../application/uncomplete-diet-item.use-case';
import type { UpdateDietPlanTemplateUseCase } from '../application/update-diet-plan-template.use-case';
import {
  assignDietPlanSchema,
  dietItemParamSchema,
  dietPlanTemplateBodySchema,
  dietTemplateIdParamSchema,
  gymAndClientUserIdParamSchema,
  gymOrgIdParamSchema,
  paginationQuerySchema,
} from './coaching.schemas';

export class CoachingController {
  constructor(
    private readonly assignDietPlan: AssignDietPlanUseCase,
    private readonly assignDietPlanFromTemplate: AssignDietPlanFromTemplateUseCase,
    private readonly getStaffDietPlan: GetStaffDietPlanUseCase,
    private readonly getMyDietPlan: GetMyDietPlanUseCase,
    private readonly completeDietItem: CompleteDietItemUseCase,
    private readonly uncompleteDietItem: UncompleteDietItemUseCase,
    private readonly createDietPlanTemplate: CreateDietPlanTemplateUseCase,
    private readonly listDietPlanTemplates: ListDietPlanTemplatesUseCase,
    private readonly getDietPlanTemplate: GetDietPlanTemplateUseCase,
    private readonly duplicateDietPlanTemplate: DuplicateDietPlanTemplateUseCase,
    private readonly updateDietPlanTemplate: UpdateDietPlanTemplateUseCase,
    private readonly deleteDietPlanTemplate: DeleteDietPlanTemplateUseCase,
  ) {}

  assign: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const body = assignDietPlanSchema.parse(req.body);
      const actor = requireAuthenticatedActor(req);
      if ('templateId' in body) {
        const dietPlan = await this.assignDietPlanFromTemplate.execute(actor, {
          gymOrgId: toGymOrgId(gymOrgId),
          clientUserId,
          templateId: body.templateId,
          title: body.title,
          notes: body.notes,
        });
        res.status(201).json({ dietPlan });
        return;
      }
      const dietPlan = await this.assignDietPlan.execute(actor, {
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

  createTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const body = dietPlanTemplateBodySchema.parse(req.body);
      const dietPlanTemplate = await this.createDietPlanTemplate.execute(
        requireAuthenticatedActor(req),
        {
          gymOrgId: toGymOrgId(gymOrgId),
          title: body.title,
          notes: body.notes ?? null,
          meals: body.meals,
        },
      );
      res.status(201).json({ dietPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  listTemplates: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = paginationQuerySchema.parse(req.query);
      const dietPlanTemplates = await this.listDietPlanTemplates.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ dietPlanTemplates });
    } catch (error) {
      next(error);
    }
  };

  getTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = dietTemplateIdParamSchema.parse(req.params);
      const dietPlanTemplate = await this.getDietPlanTemplate.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        templateId,
      );
      res.status(200).json({ dietPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  duplicateTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = dietTemplateIdParamSchema.parse(req.params);
      const dietPlanTemplate = await this.duplicateDietPlanTemplate.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        templateId,
      );
      res.status(201).json({ dietPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  updateTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = dietTemplateIdParamSchema.parse(req.params);
      const body = dietPlanTemplateBodySchema.parse(req.body);
      const dietPlanTemplate = await this.updateDietPlanTemplate.execute(
        requireAuthenticatedActor(req),
        {
          gymOrgId: toGymOrgId(gymOrgId),
          templateId,
          title: body.title,
          notes: body.notes ?? null,
          meals: body.meals,
        },
      );
      res.status(200).json({ dietPlanTemplate });
    } catch (error) {
      next(error);
    }
  };

  deleteTemplate: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, templateId } = dietTemplateIdParamSchema.parse(req.params);
      await this.deleteDietPlanTemplate.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        templateId,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
