import type { RequestHandler } from 'express';

import type { CreateGymOrgUseCase } from '../application/create-gym-org.use-case';
import type { ListMyGymOrgsUseCase } from '../application/list-my-gym-orgs.use-case';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import { createGymOrgSchema } from './gym-org.schemas';

export class GymOrgController {
  constructor(
    private readonly createGymOrg: CreateGymOrgUseCase,
    private readonly listMyGymOrgs: ListMyGymOrgsUseCase,
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
}
