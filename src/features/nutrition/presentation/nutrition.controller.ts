import type { RequestHandler } from 'express';

import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { requireAuthenticatedActor } from '../../../presentation/http/context/request-actor';
import type { GetMyCalorieLogUseCase } from '../application/get-my-calorie-log.use-case';
import type { GetStaffClientCalorieLogUseCase } from '../application/get-staff-client-calorie-log.use-case';
import type { LogExtraFoodUseCase } from '../application/log-extra-food.use-case';
import type { SearchFoodsUseCase } from '../application/search-foods.use-case';
import type { UnlogCalorieItemUseCase } from '../application/unlog-calorie-item.use-case';
import {
  calorieLogDateQuerySchema,
  calorieLogItemIdParamSchema,
  gymAndClientUserIdParamSchema,
  logExtraFoodSchema,
  searchFoodsQuerySchema,
} from './nutrition.schemas';

export class NutritionController {
  constructor(
    private readonly searchFoods: SearchFoodsUseCase,
    private readonly getMyCalorieLog: GetMyCalorieLogUseCase,
    private readonly logExtraFood: LogExtraFoodUseCase,
    private readonly unlogCalorieItem: UnlogCalorieItemUseCase,
    private readonly getStaffClientCalorieLog: GetStaffClientCalorieLogUseCase,
  ) {}

  search: RequestHandler = async (req, res, next) => {
    try {
      requireAuthenticatedActor(req);
      const query = searchFoodsQuerySchema.parse(req.query);
      const foods = await this.searchFoods.execute(query.q);
      res.status(200).json({ foods });
    } catch (error) {
      next(error);
    }
  };

  getMyLog: RequestHandler = async (req, res, next) => {
    try {
      const query = calorieLogDateQuerySchema.parse(req.query);
      const calorieLog = await this.getMyCalorieLog.execute(
        requireAuthenticatedActor(req),
        query.date,
      );
      res.status(200).json({ calorieLog });
    } catch (error) {
      next(error);
    }
  };

  logExtra: RequestHandler = async (req, res, next) => {
    try {
      const body = logExtraFoodSchema.parse(req.body);
      const calorieLog = await this.logExtraFood.execute(requireAuthenticatedActor(req), body);
      res.status(201).json({ calorieLog });
    } catch (error) {
      next(error);
    }
  };

  unlogItem: RequestHandler = async (req, res, next) => {
    try {
      const { itemId } = calorieLogItemIdParamSchema.parse(req.params);
      const calorieLog = await this.unlogCalorieItem.execute(
        requireAuthenticatedActor(req),
        itemId,
      );
      res.status(200).json({ calorieLog });
    } catch (error) {
      next(error);
    }
  };

  staffGetLog: RequestHandler = async (req, res, next) => {
    try {
      const { gymOrgId, clientUserId } = gymAndClientUserIdParamSchema.parse(req.params);
      const query = calorieLogDateQuerySchema.parse(req.query);
      const calorieLog = await this.getStaffClientCalorieLog.execute(
        requireAuthenticatedActor(req),
        toGymOrgId(gymOrgId),
        clientUserId,
        query.date,
      );
      res.status(200).json({ calorieLog });
    } catch (error) {
      next(error);
    }
  };
}
