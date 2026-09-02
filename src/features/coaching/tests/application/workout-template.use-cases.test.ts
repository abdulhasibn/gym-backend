import { describe, expect, it } from 'vitest';

import { NotFoundError } from '../../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { CoachingForbiddenError } from '../../application/coaching-forbidden.error';
import { CreateWorkoutPlanTemplateUseCase } from '../../application/create-workout-plan-template.use-case';
import { DeleteWorkoutPlanTemplateUseCase } from '../../application/delete-workout-plan-template.use-case';
import { DietAssignPolicy } from '../../application/diet-assign.policy';
import { DuplicateWorkoutPlanTemplateUseCase } from '../../application/duplicate-workout-plan-template.use-case';
import { GetWorkoutPlanTemplateUseCase } from '../../application/get-workout-plan-template.use-case';
import { ListWorkoutPlanTemplatesUseCase } from '../../application/list-workout-plan-templates.use-case';
import { UpdateWorkoutPlanTemplateUseCase } from '../../application/update-workout-plan-template.use-case';
import { WorkoutTemplatePolicy } from '../../application/workout-template.policy';
import { toExerciseItemId } from '../../domain/exercise-item-id';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';
import type { WorkoutPlanTemplate } from '../../domain/workout-plan-template.entity';
import type { WorkoutPlanTemplateId } from '../../domain/workout-plan-template-id';
import type {
  ListWorkoutPlanTemplatesCriteria,
  WorkoutPlanTemplateQueries,
  WorkoutPlanTemplateSummary,
} from '../../domain/workout-plan-template.queries';
import type { WorkoutPlanTemplateRepository } from '../../domain/workout-plan-template.repository';
import type { Page, Pagination } from '../../../../shared/pagination/pagination';
import { toPage } from '../../../../shared/pagination/pagination';
import { InMemoryExerciseCatalog } from '../fakes/in-memory-exercise-catalog';

const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const trainerUserId = toUserId('22222222-2222-4222-8222-222222222222');
const trainerProfileId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const otherTrainerProfileId = toTrainerProfileId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const exerciseId = 'e0e00000-0000-4000-8000-000000000001';

const trainer: AuthenticatedActor = {
  userId: trainerUserId,
  roleCode: 'TRAINER',
  lane: 'STAFF',
  email: 't@example.com',
  staffCode: 'T1',
};

const admin: AuthenticatedActor = {
  userId: toUserId('44444444-4444-4444-8444-444444444444'),
  roleCode: 'ADMIN',
  lane: 'STAFF',
  email: 'a@example.com',
  staffCode: 'A1',
};

class MemoryTemplates implements WorkoutPlanTemplateRepository {
  readonly rows = new Map<string, WorkoutPlanTemplate>();

  async findById(id: WorkoutPlanTemplateId, gymOrgIdToFind: typeof gymOrgId) {
    const row = this.rows.get(id);
    if (row === undefined || row.gymOrgId !== gymOrgIdToFind || !row.isLive) {
      return null;
    }
    return row;
  }

  async save(template: WorkoutPlanTemplate): Promise<void> {
    this.rows.set(template.id, template);
  }

  async replace(template: WorkoutPlanTemplate): Promise<void> {
    this.rows.set(template.id, template);
  }
}

class MemoryTemplateQueries implements WorkoutPlanTemplateQueries {
  constructor(private readonly store: MemoryTemplates) {}

  async findById(id: WorkoutPlanTemplateId, gymOrgIdToFind: typeof gymOrgId) {
    const row = await this.store.findById(id, gymOrgIdToFind);
    return row === null ? null : toTemplateSummary(row);
  }

  async list(
    criteria: ListWorkoutPlanTemplatesCriteria,
    page: Pagination,
  ): Promise<Page<WorkoutPlanTemplateSummary>> {
    const items = [...this.store.rows.values()]
      .filter((row) => row.gymOrgId === criteria.gymOrgId && row.isLive)
      .map(toTemplateSummary);
    return toPage(items.slice(page.offset, page.offset + page.limit), items.length, page);
  }
}

function toTemplateSummary(row: WorkoutPlanTemplate): WorkoutPlanTemplateSummary {
  return {
    id: row.id,
    gymOrgId: row.gymOrgId,
    trainerId: row.trainerId,
    title: row.title.value,
    notes: row.notes,
    clonedFromId: row.clonedFromId,
    exercises: row.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseItemId: exercise.exerciseItemId,
      sets: exercise.sets,
      reps: exercise.reps,
      notes: exercise.notes,
      sortOrder: exercise.sortOrder,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const clock = { now: () => new Date('2026-09-02T10:00:00.000Z') };
const ids = { generate: () => crypto.randomUUID() };
const policy = new WorkoutTemplatePolicy(
  new DietAssignPolicy(
    { isLiveAdmin: async () => false },
    { findLiveProfileId: async () => trainerProfileId },
  ),
);
const catalog = new InMemoryExerciseCatalog();
catalog.seedExercise({
  id: toExerciseItemId(exerciseId),
  name: 'Barbell Bench Press',
  aliases: ['bench'],
  primaryMuscle: 'CHEST',
  equipment: 'BARBELL',
  measurement: 'WEIGHT_REPS',
});

const exercises = [
  {
    exerciseItemId: exerciseId,
    sets: 3,
    reps: '8-12',
    notes: null,
  },
];

describe('WorkoutPlanTemplate use cases', () => {
  it('lets a trainer create a template without a coaching addon', async () => {
    const store = new MemoryTemplates();
    const useCase = new CreateWorkoutPlanTemplateUseCase(policy, catalog, store, clock, ids);

    const created = await useCase.execute(trainer, {
      gymOrgId,
      title: 'Circuit library',
      notes: null,
      exercises,
    });

    expect(created.title).toBe('Circuit library');
    expect(created.trainerId).toBe(trainerProfileId);
    expect(store.rows.size).toBe(1);
  });

  it('lists all gym templates for any trainer', async () => {
    const store = new MemoryTemplates();
    const queries = new MemoryTemplateQueries(store);
    await new CreateWorkoutPlanTemplateUseCase(policy, catalog, store, clock, ids).execute(
      trainer,
      { gymOrgId, title: 'Mine', notes: null, exercises },
    );

    const otherPolicy = new WorkoutTemplatePolicy(
      new DietAssignPolicy(
        { isLiveAdmin: async () => false },
        { findLiveProfileId: async () => otherTrainerProfileId },
      ),
    );
    const otherTrainer: AuthenticatedActor = {
      ...trainer,
      userId: toUserId('55555555-5555-4555-8555-555555555555'),
    };
    await new CreateWorkoutPlanTemplateUseCase(otherPolicy, catalog, store, clock, ids).execute(
      otherTrainer,
      { gymOrgId, title: 'Theirs', notes: null, exercises },
    );

    const trainerList = await new ListWorkoutPlanTemplatesUseCase(policy, queries).execute(
      trainer,
      gymOrgId,
      { limit: 20, offset: 0 },
    );
    expect(trainerList.items).toHaveLength(2);
  });

  it('allows a trainer to read another trainer template', async () => {
    const store = new MemoryTemplates();
    const queries = new MemoryTemplateQueries(store);
    const otherPolicy = new WorkoutTemplatePolicy(
      new DietAssignPolicy(
        { isLiveAdmin: async () => false },
        { findLiveProfileId: async () => otherTrainerProfileId },
      ),
    );
    const otherTrainer: AuthenticatedActor = {
      ...trainer,
      userId: toUserId('55555555-5555-4555-8555-555555555555'),
    };
    const created = await new CreateWorkoutPlanTemplateUseCase(
      otherPolicy,
      catalog,
      store,
      clock,
      ids,
    ).execute(otherTrainer, { gymOrgId, title: 'Theirs', notes: null, exercises });

    const got = await new GetWorkoutPlanTemplateUseCase(policy, queries).execute(
      trainer,
      gymOrgId,
      created.id,
    );
    expect(got.title).toBe('Theirs');
  });

  it('lets a peer trainer duplicate into their own library', async () => {
    const store = new MemoryTemplates();
    const otherPolicy = new WorkoutTemplatePolicy(
      new DietAssignPolicy(
        { isLiveAdmin: async () => false },
        { findLiveProfileId: async () => otherTrainerProfileId },
      ),
    );
    const otherTrainer: AuthenticatedActor = {
      ...trainer,
      userId: toUserId('55555555-5555-4555-8555-555555555555'),
    };
    const created = await new CreateWorkoutPlanTemplateUseCase(
      otherPolicy,
      catalog,
      store,
      clock,
      ids,
    ).execute(otherTrainer, { gymOrgId, title: 'Theirs', notes: null, exercises });

    const copy = await new DuplicateWorkoutPlanTemplateUseCase(policy, store, clock, ids).execute(
      trainer,
      gymOrgId,
      created.id,
    );
    expect(copy.trainerId).toBe(trainerProfileId);
    expect(copy.clonedFromId).toBe(created.id);
    expect(copy.title).toBe('Copy of Theirs');
  });

  it('forbids a non-owner trainer from updating another template', async () => {
    const store = new MemoryTemplates();
    const otherPolicy = new WorkoutTemplatePolicy(
      new DietAssignPolicy(
        { isLiveAdmin: async () => false },
        { findLiveProfileId: async () => otherTrainerProfileId },
      ),
    );
    const otherTrainer: AuthenticatedActor = {
      ...trainer,
      userId: toUserId('55555555-5555-4555-8555-555555555555'),
    };
    const created = await new CreateWorkoutPlanTemplateUseCase(
      otherPolicy,
      catalog,
      store,
      clock,
      ids,
    ).execute(otherTrainer, { gymOrgId, title: 'Theirs', notes: null, exercises });

    await expect(
      new UpdateWorkoutPlanTemplateUseCase(policy, catalog, store, clock, ids).execute(trainer, {
        gymOrgId,
        templateId: created.id,
        title: 'Hijacked',
        notes: null,
        exercises,
      }),
    ).rejects.toBeInstanceOf(CoachingForbiddenError);
  });

  it('forbids a non-owner trainer from deleting another template', async () => {
    const store = new MemoryTemplates();
    const otherPolicy = new WorkoutTemplatePolicy(
      new DietAssignPolicy(
        { isLiveAdmin: async () => false },
        { findLiveProfileId: async () => otherTrainerProfileId },
      ),
    );
    const otherTrainer: AuthenticatedActor = {
      ...trainer,
      userId: toUserId('55555555-5555-4555-8555-555555555555'),
    };
    const created = await new CreateWorkoutPlanTemplateUseCase(
      otherPolicy,
      catalog,
      store,
      clock,
      ids,
    ).execute(otherTrainer, { gymOrgId, title: 'Theirs', notes: null, exercises });

    await expect(
      new DeleteWorkoutPlanTemplateUseCase(policy, store, clock).execute(
        trainer,
        gymOrgId,
        created.id,
      ),
    ).rejects.toBeInstanceOf(CoachingForbiddenError);
  });

  it('rejects unknown seed exercises', async () => {
    const store = new MemoryTemplates();
    await expect(
      new CreateWorkoutPlanTemplateUseCase(policy, catalog, store, clock, ids).execute(trainer, {
        gymOrgId,
        title: 'Bad',
        notes: null,
        exercises: [
          {
            exerciseItemId: 'e0e00000-0000-4000-8000-000000009999',
            sets: 1,
            reps: '10',
            notes: null,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lets admin update any template', async () => {
    const store = new MemoryTemplates();
    const created = await new CreateWorkoutPlanTemplateUseCase(
      policy,
      catalog,
      store,
      clock,
      ids,
    ).execute(trainer, { gymOrgId, title: 'Mine', notes: null, exercises });

    const adminPolicy = new WorkoutTemplatePolicy(
      new DietAssignPolicy(
        { isLiveAdmin: async () => true },
        { findLiveProfileId: async () => toTrainerProfileId('dddddddd-dddd-4ddd-8ddd-dddddddddddd') },
      ),
    );
    const updated = await new UpdateWorkoutPlanTemplateUseCase(
      adminPolicy,
      catalog,
      store,
      clock,
      ids,
    ).execute(admin, {
      gymOrgId,
      templateId: created.id,
      title: 'Admin edit',
      notes: null,
      exercises,
    });
    expect(updated.title).toBe('Admin edit');
  });
});
