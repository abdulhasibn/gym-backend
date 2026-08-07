import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { ChangeLeadStatusUseCase } from '../application/change-lead-status.use-case';
import type { CreateLeadUseCase } from '../application/create-lead.use-case';
import type { GetLeadUseCase } from '../application/get-lead.use-case';
import type { ListDueFollowUpsUseCase } from '../application/list-due-follow-ups.use-case';
import type { ListLeadsUseCase } from '../application/list-leads.use-case';
import type { SoftDeleteLeadUseCase } from '../application/soft-delete-lead.use-case';
import type { UpdateLeadUseCase } from '../application/update-lead.use-case';
import { toLeadId } from '../domain/lead-id';
import {
  changeLeadStatusSchema,
  createLeadSchema,
  dueFollowUpsQuerySchema,
  gymAndLeadIdParamSchema,
  gymOrgIdParamSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from './lead.schemas';

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class LeadController {
  constructor(
    private readonly createLead: CreateLeadUseCase,
    private readonly listLeads: ListLeadsUseCase,
    private readonly getLead: GetLeadUseCase,
    private readonly updateLead: UpdateLeadUseCase,
    private readonly changeLeadStatus: ChangeLeadStatusUseCase,
    private readonly softDeleteLead: SoftDeleteLeadUseCase,
    private readonly listDueFollowUps: ListDueFollowUpsUseCase,
  ) {}

  create: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const body = createLeadSchema.parse(req.body);
      const result = await this.createLead.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        name: body.name,
        phone: body.phone,
        source: body.source,
        interest: body.interest,
        notes: body.notes,
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  list: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = listLeadsQuerySchema.parse(req.query);
      const leads = await this.listLeads.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        { limit: query.limit, offset: query.offset },
        query.status,
      );
      res.status(200).json({ leads });
    } catch (error) {
      next(error);
    }
  };

  listDue: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId } = gymOrgIdParamSchema.parse(req.params);
      const query = dueFollowUpsQuerySchema.parse(req.query);
      const onOrBefore = query.onOrBefore ?? utcDateString(new Date());
      const leads = await this.listDueFollowUps.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        onOrBefore,
        { limit: query.limit, offset: query.offset },
      );
      res.status(200).json({ leads });
    } catch (error) {
      next(error);
    }
  };

  getOne: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, leadId } = gymAndLeadIdParamSchema.parse(req.params);
      const lead = await this.getLead.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        toLeadId(leadId),
      );
      res.status(200).json({ lead });
    } catch (error) {
      next(error);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, leadId } = gymAndLeadIdParamSchema.parse(req.params);
      const body = updateLeadSchema.parse(req.body);
      const result = await this.updateLead.execute(requireAuthenticatedActor(req), {
        gymOrgId: toGymOrgId(gymOrgId),
        leadId: toLeadId(leadId),
        name: body.name,
        phone: body.phone,
        source: body.source,
        interest: body.interest,
        notes: body.notes,
        followUpDate: body.followUpDate,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  changeStatus: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, leadId } = gymAndLeadIdParamSchema.parse(req.params);
      const body = changeLeadStatusSchema.parse(req.body);
      const lead = await this.changeLeadStatus.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        toLeadId(leadId),
        body.status,
      );
      res.status(200).json({ lead });
    } catch (error) {
      next(error);
    }
  };

  softDelete: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, leadId } = gymAndLeadIdParamSchema.parse(req.params);
      await this.softDeleteLead.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        toLeadId(leadId),
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
