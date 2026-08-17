import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toFoodItemId } from '../../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../../domain/shared/food-serving-id';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { AssignDietPlanFromTemplateUseCase } from '../../application/assign-diet-plan-from-template.use-case';
import { AssignDietPlanUseCase } from '../../application/assign-diet-plan.use-case';
import { CoachingAddonRequiredError } from '../../application/coaching-addon-required.error';
import { CoachingForbiddenError } from '../../application/coaching-forbidden.error';
import { CompleteDietItemUseCase } from '../../application/complete-diet-item.use-case';
import { CreateDietPlanTemplateUseCase } from '../../application/create-diet-plan-template.use-case';
import { DietAssignPolicy } from '../../application/diet-assign.policy';
import { DietClientPolicy } from '../../application/diet-client.policy';
import { DietTemplatePolicy } from '../../application/diet-template.policy';
import { DuplicateDietPlanTemplateUseCase } from '../../application/duplicate-diet-plan-template.use-case';
import { GetDietPlanTemplateUseCase } from '../../application/get-diet-plan-template.use-case';
import { ListDietPlanTemplatesUseCase } from '../../application/list-diet-plan-templates.use-case';
import { UpdateDietPlanTemplateUseCase } from '../../application/update-diet-plan-template.use-case';
import type { CoachingEntitlementPort } from '../../domain/coaching-entitlement.port';
import type { DietPlan } from '../../domain/diet-plan.entity';
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
import type { SeedCatalogPort } from '../../domain/seed-catalog.port';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';
import type { Page, Pagination } from '../../../../shared/pagination/pagination';
import { toPage } from '../../../../shared/pagination/pagination';

const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const clientId = toUserId('11111111-1111-4111-8111-111111111111');
const trainerUserId = toUserId('22222222-2222-4222-8222-222222222222');
const trainerProfileId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const foodId = 'f00d0000-0000-4000-8000-000000000001';
const servingId = 'f00d5e04-0000-4000-8000-000000010003';

const otherTrainerProfileId = toTrainerProfileId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const adminUserId = toUserId('44444444-4444-4444-8444-444444444444');
const adminProfileId = toTrainerProfileId('dddddddd-dddd-4ddd-8ddd-dddddddddddd');

const trainer: AuthenticatedActor = {
  userId: trainerUserId,
  roleCode: 'TRAINER',
  lane: 'STAFF',
  email: 't@example.com',
  staffCode: 'T1',
};

const client: AuthenticatedActor = {
  userId: clientId,
  roleCode: 'CLIENT',
  lane: 'CLIENT',
  email: 'c@example.com',
  staffCode: null,
};

const admin: AuthenticatedActor = {
  userId: adminUserId,
  roleCode: 'ADMIN',
  lane: 'STAFF',
  email: 'a@example.com',
  staffCode: 'A1',
};

class MemoryTemplates implements DietPlanTemplateRepository {
  readonly rows = new Map<string, DietPlanTemplate>();

  async findById(id: DietPlanTemplateId, gymOrgIdToFind: typeof gymOrgId) {
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

  async findById(id: DietPlanTemplateId, gymOrgIdToFind: typeof gymOrgId) {
    const row = await this.store.findById(id, gymOrgIdToFind);
    return row === null ? null : toTemplateSummary(row);
  }

  async list(
    criteria: ListDietPlanTemplatesCriteria,
    page: Pagination,
  ): Promise<Page<DietPlanTemplateSummary>> {
    const items = [...this.store.rows.values()]
      .filter((row) => row.deletedAt === null && row.gymOrgId === criteria.gymOrgId)
      .filter((row) => criteria.trainerId === undefined || row.trainerId === criteria.trainerId)
      .map(toTemplateSummary);
    return toPage(items.slice(page.offset, page.offset + page.limit), items.length, page);
  }
}

function toTemplateSummary(row: DietPlanTemplate): DietPlanTemplateSummary {
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

class MemoryPlans implements DietPlanRepository {
  last: DietPlan | null = null;

  async findActiveByClientAtGym(): Promise<DietPlan | null> {
    return this.last;
  }

  async assign(plan: DietPlan): Promise<void> {
    if (this.last !== null) {
      this.last.archive(plan.updatedAt);
    }
    this.last = plan;
  }
}

const entitlement: CoachingEntitlementPort = {
  async findActiveMembership() {
    return { assignedTrainerId: trainerProfileId };
  },
  async hasInDateCoachingAddon() {
    return true;
  },
};

const frozenEntitlement: CoachingEntitlementPort = {
  async findActiveMembership() {
    return { assignedTrainerId: trainerProfileId };
  },
  async hasInDateCoachingAddon() {
    return false;
  },
};

const catalog: SeedCatalogPort = {
  async hasLiveSeedServing(foodItemId, servingIdToFind) {
    return foodItemId === toFoodItemId(foodId) && servingIdToFind === toFoodServingId(servingId);
  },
};

const gymClock: GymLocalClock = {
  async today() {
    return CalendarDate.create('2026-08-17');
  },
};

const policy = new DietAssignPolicy(
  { isLiveAdmin: async () => false },
  { findLiveProfileId: async () => trainerProfileId },
);

describe('AssignDietPlanUseCase', () => {
  it('archives the previous active plan conceptually by assigning a new one', async () => {
    const plans = new MemoryPlans();
    const useCase = new AssignDietPlanUseCase(
      policy,
      entitlement,
      catalog,
      plans,
      gymClock,
      { now: () => new Date('2026-08-17T10:00:00.000Z') },
      { generate: () => crypto.randomUUID() },
    );

    const created = await useCase.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      title: 'Cut week',
      notes: null,
      meals: [
        {
          mealSlot: 'BREAKFAST',
          items: [{ foodItemId: foodId, servingId, quantity: 2 }],
        },
      ],
    });

    expect(created.title).toBe('Cut week');
    expect(created.meals[0]?.items).toHaveLength(1);
    expect(plans.last?.isActive).toBe(true);
  });

  it('freezes assign when the coaching addon is expired', async () => {
    const useCase = new AssignDietPlanUseCase(
      policy,
      frozenEntitlement,
      catalog,
      new MemoryPlans(),
      gymClock,
      { now: () => new Date('2026-08-17T10:00:00.000Z') },
      { generate: () => crypto.randomUUID() },
    );

    await expect(
      useCase.execute(trainer, {
        gymOrgId,
        clientUserId: clientId,
        title: 'Cut week',
        notes: null,
        meals: [
          {
            mealSlot: 'BREAKFAST',
            items: [{ foodItemId: foodId, servingId, quantity: 2 }],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(CoachingAddonRequiredError);
  });
});

describe('CompleteDietItemUseCase', () => {
  it('freezes complete when the coaching addon is expired', async () => {
    const logPrescribed: LogPrescribedFood = {
      async log() {},
      async unlog() {},
    };
    const useCase = new CompleteDietItemUseCase(
      new DietClientPolicy(),
      frozenEntitlement,
      new MemoryPlans(),
      logPrescribed,
      gymClock,
      { now: () => new Date('2026-08-17T10:00:00.000Z') },
    );

    await expect(useCase.execute(client, gymOrgId, crypto.randomUUID())).rejects.toBeInstanceOf(
      CoachingAddonRequiredError,
    );
  });
});

const clock = { now: () => new Date('2026-08-17T10:00:00.000Z') };
const ids = { generate: () => crypto.randomUUID() };
const templatePolicy = new DietTemplatePolicy(policy);
const meals = [
  {
    mealSlot: 'BREAKFAST' as const,
    items: [{ foodItemId: foodId, servingId, quantity: 2 }],
  },
];

describe('DietPlanTemplate use cases', () => {
  it('lets a trainer create a template without a coaching addon', async () => {
    const store = new MemoryTemplates();
    const useCase = new CreateDietPlanTemplateUseCase(templatePolicy, catalog, store, clock, ids);

    const created = await useCase.execute(trainer, {
      gymOrgId,
      title: 'Cut library',
      notes: null,
      meals,
    });

    expect(created.title).toBe('Cut library');
    expect(created.trainerId).toBe(trainerProfileId);
    expect(store.rows.size).toBe(1);
  });

  it('lists only the trainer library, while admin sees all at the gym', async () => {
    const store = new MemoryTemplates();
    const queries = new MemoryTemplateQueries(store);
    const create = new CreateDietPlanTemplateUseCase(templatePolicy, catalog, store, clock, ids);
    await create.execute(trainer, { gymOrgId, title: 'Mine', notes: null, meals });

    const otherPolicy = new DietTemplatePolicy(
      new DietAssignPolicy(
        { isLiveAdmin: async () => false },
        { findLiveProfileId: async () => otherTrainerProfileId },
      ),
    );
    const otherTrainer: AuthenticatedActor = {
      ...trainer,
      userId: toUserId('55555555-5555-4555-8555-555555555555'),
    };
    await new CreateDietPlanTemplateUseCase(otherPolicy, catalog, store, clock, ids).execute(
      otherTrainer,
      { gymOrgId, title: 'Theirs', notes: null, meals },
    );

    const trainerList = await new ListDietPlanTemplatesUseCase(templatePolicy, queries).execute(
      trainer,
      gymOrgId,
      { limit: 20, offset: 0 },
    );
    expect(trainerList.items.map((row) => row.title)).toEqual(['Mine']);

    const adminPolicy = new DietTemplatePolicy(
      new DietAssignPolicy(
        { isLiveAdmin: async () => true },
        { findLiveProfileId: async () => adminProfileId },
      ),
    );
    const adminList = await new ListDietPlanTemplatesUseCase(adminPolicy, queries).execute(
      admin,
      gymOrgId,
      { limit: 20, offset: 0 },
    );
    expect(adminList.items).toHaveLength(2);
  });

  it('forbids a trainer from reading another trainer template', async () => {
    const store = new MemoryTemplates();
    const queries = new MemoryTemplateQueries(store);
    const otherPolicy = new DietTemplatePolicy(
      new DietAssignPolicy(
        { isLiveAdmin: async () => false },
        { findLiveProfileId: async () => otherTrainerProfileId },
      ),
    );
    const otherTrainer: AuthenticatedActor = {
      ...trainer,
      userId: toUserId('55555555-5555-4555-8555-555555555555'),
    };
    const created = await new CreateDietPlanTemplateUseCase(
      otherPolicy,
      catalog,
      store,
      clock,
      ids,
    ).execute(otherTrainer, { gymOrgId, title: 'Theirs', notes: null, meals });

    await expect(
      new GetDietPlanTemplateUseCase(templatePolicy, queries).execute(
        trainer,
        gymOrgId,
        created.id,
      ),
    ).rejects.toBeInstanceOf(CoachingForbiddenError);
  });

  it('duplicates into the duplicator library with new ids', async () => {
    const store = new MemoryTemplates();
    const created = await new CreateDietPlanTemplateUseCase(
      templatePolicy,
      catalog,
      store,
      clock,
      ids,
    ).execute(trainer, { gymOrgId, title: 'Cut library', notes: 'keep', meals });

    const adminPolicy = new DietTemplatePolicy(
      new DietAssignPolicy(
        { isLiveAdmin: async () => true },
        { findLiveProfileId: async () => adminProfileId },
      ),
    );
    const copy = await new DuplicateDietPlanTemplateUseCase(adminPolicy, store, clock, ids).execute(
      admin,
      gymOrgId,
      created.id,
    );

    expect(copy.title).toBe('Copy of Cut library');
    expect(copy.trainerId).toBe(adminProfileId);
    expect(copy.clonedFromId).toBe(created.id);
    expect(copy.id).not.toBe(created.id);
    expect(copy.meals[0]?.id).not.toBe(created.meals[0]?.id);
  });

  it('assigns a snapshot that later template edits do not rewrite', async () => {
    const store = new MemoryTemplates();
    const plans = new MemoryPlans();
    const created = await new CreateDietPlanTemplateUseCase(
      templatePolicy,
      catalog,
      store,
      clock,
      ids,
    ).execute(trainer, { gymOrgId, title: 'Cut library', notes: null, meals });

    const assigned = await new AssignDietPlanFromTemplateUseCase(
      policy,
      templatePolicy,
      entitlement,
      catalog,
      store,
      plans,
      gymClock,
      clock,
      ids,
    ).execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      templateId: created.id,
    });

    expect(assigned.title).toBe('Cut library');
    expect(assigned.clonedFromTemplateId).toBe(created.id);
    expect(assigned.meals[0]?.items[0]?.id).not.toBe(created.meals[0]?.items[0]?.id);

    await new UpdateDietPlanTemplateUseCase(templatePolicy, catalog, store, clock, ids).execute(
      trainer,
      {
        gymOrgId,
        templateId: created.id,
        title: 'Edited library',
        notes: null,
        meals: [
          {
            mealSlot: 'LUNCH',
            items: [{ foodItemId: foodId, servingId, quantity: 1 }],
          },
        ],
      },
    );

    expect(plans.last?.title.value).toBe('Cut library');
    expect(plans.last?.meals[0]?.mealSlot).toBe('BREAKFAST');
  });
});
