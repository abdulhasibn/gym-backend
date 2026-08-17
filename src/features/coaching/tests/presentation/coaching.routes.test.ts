import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { setAuthenticatedActor } from '../../../../presentation/http/context/request-actor';
import { createErrorHandlerMiddleware } from '../../../../presentation/http/errors/error-handler.middleware';
import type { Logger } from '../../../../shared/logging/logger.port';
import { AssignDietPlanFromTemplateUseCase } from '../../application/assign-diet-plan-from-template.use-case';
import { AssignDietPlanUseCase } from '../../application/assign-diet-plan.use-case';
import { CompleteDietItemUseCase } from '../../application/complete-diet-item.use-case';
import { CreateDietPlanTemplateUseCase } from '../../application/create-diet-plan-template.use-case';
import { DeleteDietPlanTemplateUseCase } from '../../application/delete-diet-plan-template.use-case';
import { DietAssignPolicy } from '../../application/diet-assign.policy';
import { DietClientPolicy } from '../../application/diet-client.policy';
import { DietTemplatePolicy } from '../../application/diet-template.policy';
import { DuplicateDietPlanTemplateUseCase } from '../../application/duplicate-diet-plan-template.use-case';
import { GetDietPlanTemplateUseCase } from '../../application/get-diet-plan-template.use-case';
import { GetMyDietPlanUseCase } from '../../application/get-my-diet-plan.use-case';
import { GetStaffDietPlanUseCase } from '../../application/get-staff-diet-plan.use-case';
import { ListDietPlanTemplatesUseCase } from '../../application/list-diet-plan-templates.use-case';
import { UncompleteDietItemUseCase } from '../../application/uncomplete-diet-item.use-case';
import { UpdateDietPlanTemplateUseCase } from '../../application/update-diet-plan-template.use-case';
import type { CoachingEntitlementPort } from '../../domain/coaching-entitlement.port';
import type { DietPlan } from '../../domain/diet-plan.entity';
import type { DietPlanQueries } from '../../domain/diet-plan.queries';
import type { DietPlanRepository } from '../../domain/diet-plan.repository';
import type { DietPlanTemplate } from '../../domain/diet-plan-template.entity';
import type { DietPlanTemplateId } from '../../domain/diet-plan-template-id';
import type {
  DietPlanTemplateQueries,
  DietPlanTemplateSummary,
  ListDietPlanTemplatesCriteria,
} from '../../domain/diet-plan-template.queries';
import type { DietPlanTemplateRepository } from '../../domain/diet-plan-template.repository';
import type { GymLocalClock } from '../../domain/gym-local-clock.port';
import type { LogPrescribedFood } from '../../domain/log-prescribed-food.port';
import type { PrescribedDiaryQueries } from '../../domain/prescribed-diary.queries';
import type { SeedCatalogPort } from '../../domain/seed-catalog.port';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';
import { CoachingController } from '../../presentation/coaching.controller';
import { mapCoachingError } from '../../presentation/coaching.error-mapper';
import {
  createStaffDietPlanRouter,
  createStaffDietTemplateRouter,
} from '../../presentation/coaching.routes';
import type { Page, Pagination } from '../../../../shared/pagination/pagination';
import { toPage } from '../../../../shared/pagination/pagination';
import type { GymOrgId } from '../../../../domain/shared/gym-org-id';

class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): Logger {
    return this;
  }
}

const gymOrgId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const clientUserId = '11111111-1111-4111-8111-111111111111';
const trainerUserId = '22222222-2222-4222-8222-222222222222';
const trainerProfileId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const otherTrainerProfileId = toTrainerProfileId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const foodId = 'f00d0000-0000-4000-8000-000000000001';
const servingId = 'f00d5e04-0000-4000-8000-000000010003';
const mealsBody = {
  title: 'Cut week',
  meals: [
    {
      mealSlot: 'BREAKFAST',
      items: [{ foodItemId: foodId, servingId, quantity: 2 }],
    },
  ],
};

const trainer: AuthenticatedActor = {
  userId: toUserId(trainerUserId),
  roleCode: 'TRAINER',
  lane: 'STAFF',
  email: 't@example.com',
  staffCode: 'T1',
};

class MemoryTemplates implements DietPlanTemplateRepository {
  readonly rows = new Map<string, DietPlanTemplate>();

  async findById(id: DietPlanTemplateId, gymOrgIdToFind: GymOrgId) {
    const row = this.rows.get(id);
    if (row === undefined || row.gymOrgId !== gymOrgIdToFind || row.deletedAt !== null) {
      return null;
    }
    return row;
  }

  async save(template: DietPlanTemplate): Promise<void> {
    this.rows.set(template.id, template);
  }

  async replace(template: DietPlanTemplate): Promise<void> {
    this.rows.set(template.id, template);
  }
}

class MemoryTemplateQueries implements DietPlanTemplateQueries {
  constructor(private readonly store: MemoryTemplates) {}

  async findById(id: DietPlanTemplateId, gymOrgIdToFind: GymOrgId) {
    const row = await this.store.findById(id, gymOrgIdToFind);
    if (row === null) {
      return null;
    }
    return toSummary(row);
  }

  async list(
    criteria: ListDietPlanTemplatesCriteria,
    page: Pagination,
  ): Promise<Page<DietPlanTemplateSummary>> {
    const items = [...this.store.rows.values()]
      .filter((row) => row.deletedAt === null && row.gymOrgId === criteria.gymOrgId)
      .filter((row) => criteria.trainerId === undefined || row.trainerId === criteria.trainerId)
      .map(toSummary);
    return toPage(items.slice(page.offset, page.offset + page.limit), items.length, page);
  }
}

function toSummary(row: DietPlanTemplate): DietPlanTemplateSummary {
  return {
    id: row.id,
    gymOrgId: row.gymOrgId,
    trainerId: row.trainerId,
    title: row.title.value,
    notes: row.notes,
    clonedFromId: row.clonedFromId,
    meals: row.meals.map((meal) => ({
      id: meal.id,
      mealSlot: meal.mealSlot,
      sortOrder: meal.sortOrder,
      items: meal.items.map((item) => ({
        id: item.id,
        foodItemId: item.foodItemId,
        servingId: item.servingId,
        quantity: item.quantity.value,
      })),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function createApp(
  actor: AuthenticatedActor,
  options?: {
    liveProfileId?: ReturnType<typeof toTrainerProfileId>;
    templates?: MemoryTemplates;
  },
) {
  const plans: DietPlanRepository = {
    async findActiveByClientAtGym(): Promise<DietPlan | null> {
      return null;
    },
    async assign() {},
  };
  const queries: DietPlanQueries = {
    async findActiveByClientAtGym() {
      return null;
    },
  };
  const templates = options?.templates ?? new MemoryTemplates();
  const templateQueries = new MemoryTemplateQueries(templates);
  const entitlement: CoachingEntitlementPort = {
    async findActiveMembership() {
      return { assignedTrainerId: trainerProfileId };
    },
    async hasInDateCoachingAddon() {
      return true;
    },
  };
  const catalog: SeedCatalogPort = {
    async hasLiveSeedServing() {
      return true;
    },
  };
  const diary: PrescribedDiaryQueries = {
    async findLoggedItemIds() {
      return [];
    },
  };
  const gymClock: GymLocalClock = {
    async today() {
      return CalendarDate.create('2026-08-17');
    },
  };
  const logPrescribed: LogPrescribedFood = {
    async log() {},
    async unlog() {},
  };
  const liveProfileId = options?.liveProfileId ?? trainerProfileId;
  const assignPolicy = new DietAssignPolicy(
    { isLiveAdmin: async () => actor.roleCode === 'ADMIN' },
    { findLiveProfileId: async () => liveProfileId },
  );
  const templatePolicy = new DietTemplatePolicy(assignPolicy);
  const clock = { now: () => new Date('2026-08-17T10:00:00.000Z') };
  const ids = { generate: () => crypto.randomUUID() };
  const controller = new CoachingController(
    new AssignDietPlanUseCase(assignPolicy, entitlement, catalog, plans, gymClock, clock, ids),
    new AssignDietPlanFromTemplateUseCase(
      assignPolicy,
      templatePolicy,
      entitlement,
      catalog,
      templates,
      plans,
      gymClock,
      clock,
      ids,
    ),
    new GetStaffDietPlanUseCase(assignPolicy, entitlement, queries),
    new GetMyDietPlanUseCase(new DietClientPolicy(), entitlement, queries, diary, gymClock, clock),
    new CompleteDietItemUseCase(
      new DietClientPolicy(),
      entitlement,
      plans,
      logPrescribed,
      gymClock,
      clock,
    ),
    new UncompleteDietItemUseCase(
      new DietClientPolicy(),
      entitlement,
      plans,
      logPrescribed,
      gymClock,
      clock,
    ),
    new CreateDietPlanTemplateUseCase(templatePolicy, catalog, templates, clock, ids),
    new ListDietPlanTemplatesUseCase(templatePolicy, templateQueries),
    new GetDietPlanTemplateUseCase(templatePolicy, templateQueries),
    new DuplicateDietPlanTemplateUseCase(templatePolicy, templates, clock, ids),
    new UpdateDietPlanTemplateUseCase(templatePolicy, catalog, templates, clock, ids),
    new DeleteDietPlanTemplateUseCase(templatePolicy, templates, clock),
  );

  const authenticate: RequestHandler = (req, _res, next) => {
    setAuthenticatedActor(req, actor);
    next();
  };
  const app = express();
  app.use(express.json());
  app.use(
    '/gym-orgs/:gymOrgId/clients/:clientUserId',
    createStaffDietPlanRouter(controller, authenticate),
  );
  app.use('/gym-orgs/:gymOrgId', createStaffDietTemplateRouter(controller, authenticate));
  app.use(createErrorHandlerMiddleware(new SilentLogger(), [mapCoachingError]));
  return { app, templates };
}

describe('POST diet-plans', () => {
  it('rejects a validation error when meals are missing', async () => {
    const { app } = createApp(trainer);
    const response = await request(app)
      .post(`/gym-orgs/${gymOrgId}/clients/${clientUserId}/diet-plans`)
      .send({ title: 'Cut' });
    expect(response.status).toBe(422);
  });

  it('rejects both templateId and meals', async () => {
    const { app } = createApp(trainer);
    const response = await request(app)
      .post(`/gym-orgs/${gymOrgId}/clients/${clientUserId}/diet-plans`)
      .send({ ...mealsBody, templateId: crypto.randomUUID() });
    expect(response.status).toBe(422);
  });

  it('assigns a catalog diet plan', async () => {
    const { app } = createApp(trainer);
    const response = await request(app)
      .post(`/gym-orgs/${toGymOrgId(gymOrgId)}/clients/${clientUserId}/diet-plans`)
      .send(mealsBody);
    expect(response.status).toBe(201);
    expect(response.body.dietPlan.title).toBe('Cut week');
    expect(response.body.dietPlan.clonedFromTemplateId).toBeNull();
  });

  it('assigns from a template', async () => {
    const { app } = createApp(trainer);
    const created = await request(app)
      .post(`/gym-orgs/${gymOrgId}/diet-plan-templates`)
      .send(mealsBody);
    expect(created.status).toBe(201);
    const response = await request(app)
      .post(`/gym-orgs/${gymOrgId}/clients/${clientUserId}/diet-plans`)
      .send({ templateId: created.body.dietPlanTemplate.id });
    expect(response.status).toBe(201);
    expect(response.body.dietPlan.clonedFromTemplateId).toBe(created.body.dietPlanTemplate.id);
  });
});

describe('diet-plan-templates', () => {
  it('creates, lists, and forbids another trainer from reading', async () => {
    const { app, templates } = createApp(trainer);
    const created = await request(app)
      .post(`/gym-orgs/${gymOrgId}/diet-plan-templates`)
      .send(mealsBody);
    expect(created.status).toBe(201);

    const listed = await request(app).get(`/gym-orgs/${gymOrgId}/diet-plan-templates`);
    expect(listed.status).toBe(200);
    expect(listed.body.dietPlanTemplates.items).toHaveLength(1);

    const otherTrainer: AuthenticatedActor = {
      ...trainer,
      userId: toUserId('55555555-5555-4555-8555-555555555555'),
    };
    const { app: otherApp } = createApp(otherTrainer, {
      liveProfileId: otherTrainerProfileId,
      templates,
    });
    const forbidden = await request(otherApp).get(
      `/gym-orgs/${gymOrgId}/diet-plan-templates/${created.body.dietPlanTemplate.id}`,
    );
    expect(forbidden.status).toBe(403);
  });

  it('rejects an empty template body', async () => {
    const { app } = createApp(trainer);
    const response = await request(app)
      .post(`/gym-orgs/${gymOrgId}/diet-plan-templates`)
      .send({ title: 'Cut' });
    expect(response.status).toBe(422);
  });
});
