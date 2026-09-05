import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { SearchFoodsUseCase } from '../../application/search-foods.use-case';
import type { FoodCatalogQueries, FoodSearchHit } from '../../domain/food-catalog.queries';
import { NutritionController } from '../../presentation/nutrition.controller';
import { mapNutritionError } from '../../presentation/nutrition.error-mapper';
import { createFoodsRouter } from '../../presentation/nutrition.routes';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { ClientSelfPolicy } from '../../application/client-self.policy';
import { GetMyCalorieLogUseCase } from '../../application/get-my-calorie-log.use-case';
import { GetStaffClientCalorieLogUseCase } from '../../application/get-staff-client-calorie-log.use-case';
import { LogExtraFoodUseCase } from '../../application/log-extra-food.use-case';
import { StaffCalorieReadPolicy } from '../../application/staff-calorie-read.policy';
import { UnlogCalorieItemUseCase } from '../../application/unlog-calorie-item.use-case';
import type { CalorieLogQueries } from '../../domain/calorie-log.queries';
import type { CalorieLogRepository } from '../../domain/calorie-log.repository';
import type { FoodCatalogRepository } from '../../domain/food-catalog.repository';
import { toFoodItemId } from '../../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../../domain/shared/food-serving-id';

class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): Logger {
    return this;
  }
}

const client: AuthenticatedActor = {
  userId: toUserId('11111111-1111-4111-8111-111111111111'),
  roleCode: 'CLIENT',
  lane: 'CLIENT',
  email: 'c@example.com',
  staffCode: null,
};

function createApp(actor: AuthenticatedActor) {
  const catalogQueries: FoodCatalogQueries = {
    async searchSeed(): Promise<readonly FoodSearchHit[]> {
      return [
        {
          id: toFoodItemId('f00d0000-0000-4000-8000-000000000001'),
          name: 'Idli',
          aliases: ['idly'],
          per100g: { calories: 135, proteinG: 4, carbsG: 27, fatG: 0.5 },
          servings: [
            {
              id: toFoodServingId('f00d5e04-0000-4000-8000-000000010003'),
              unit: 'PIECE',
              label: 'piece',
              grams: 30,
              isDefault: true,
              sortOrder: 2,
            },
          ],
        },
      ];
    },
  };

  const logs: CalorieLogRepository = {
    async findByClientAndDate() {
      return null;
    },
    async findByClientAndItem() {
      return null;
    },
    async save() {},
  };
  const catalog: FoodCatalogRepository = {
    async findLiveSeedServing() {
      return null;
    },
  };
  const queries: CalorieLogQueries = {
    async findDay() {
      return null;
    },
    async findLoggedPrescribedItemIds() {
      return [];
    },
  };
  const self = new ClientSelfPolicy();
  const staff = new StaffCalorieReadPolicy(
    { isLiveAdmin: async () => false },
    { isLiveTrainer: async () => false },
  );
  const controller = new NutritionController(
    new SearchFoodsUseCase(catalogQueries),
    new GetMyCalorieLogUseCase(self, queries, { now: () => new Date() }, () =>
      CalendarDate.create('2026-08-17'),
    ),
    new LogExtraFoodUseCase(
      self,
      catalog,
      logs,
      { now: () => new Date() },
      { generate: () => crypto.randomUUID() },
      () => CalendarDate.create('2026-08-17'),
    ),
    new UnlogCalorieItemUseCase(self, logs, { now: () => new Date() }),
    new GetStaffClientCalorieLogUseCase(
      staff,
      queries,
      { loadForActiveMembership: async () => null },
      { now: () => new Date() },
      () => CalendarDate.create('2026-08-17'),
    ),
  );

  const authenticate: RequestHandler = (req, _res, next) => {
    setAuthenticatedActor(req, actor);
    next();
  };
  const app = express();
  app.use(express.json());
  app.use('/foods', createFoodsRouter(controller, authenticate));
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapNutritionError]));
  return app;
}

describe('GET /foods/search', () => {
  it('returns catalog foods with the shared unit picker', async () => {
    const response = await request(createApp(client)).get('/foods/search?q=idli');
    expect(response.status).toBe(200);
    expect(response.body.foods[0]?.name).toBe('Idli');
    expect(response.body.foods[0]?.units[0]?.id).toBe('f00d5e04-0000-4000-8000-000000010003');
    expect(response.body.foods[0]?.units[0]?.unit).toBe('PIECE');
    expect(response.body.foods[0]?.defaultUnit).toBe('PIECE');
  });
});
