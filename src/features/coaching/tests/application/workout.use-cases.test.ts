import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { AssignWorkoutPlanUseCase } from '../../application/assign-workout-plan.use-case';
import { CoachingAddonRequiredError } from '../../application/coaching-addon-required.error';
import { CoachingForbiddenError } from '../../application/coaching-forbidden.error';
import { CompleteWorkoutExerciseUseCase } from '../../application/complete-workout-exercise.use-case';
import { DietAssignPolicy } from '../../application/diet-assign.policy';
import { DietClientPolicy } from '../../application/diet-client.policy';
import { GetMyWorkoutPlanUseCase } from '../../application/get-my-workout-plan.use-case';
import { SearchExercisesUseCase } from '../../application/search-exercises.use-case';
import { UncompleteWorkoutExerciseUseCase } from '../../application/uncomplete-workout-exercise.use-case';
import { AlreadyCompletedWorkoutExerciseError } from '../../domain/already-completed-workout-exercise.error';
import type { CoachingEntitlementPort } from '../../domain/coaching-entitlement.port';
import { toExerciseItemId } from '../../domain/exercise-item-id';
import type { GymLocalClock } from '../../domain/gym-local-clock.port';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';
import { InMemoryExerciseCatalog } from '../fakes/in-memory-exercise-catalog';
import { InMemoryWorkoutCompletions } from '../fakes/in-memory-workout-completions';
import { InMemoryWorkoutPlanQueries } from '../fakes/in-memory-workout-plan.queries';
import { InMemoryWorkoutPlanRepository } from '../fakes/in-memory-workout-plan.repository';

const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const clientId = toUserId('11111111-1111-4111-8111-111111111111');
const trainerUserId = toUserId('22222222-2222-4222-8222-222222222222');
const trainerProfileId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const exerciseId = toExerciseItemId('e0e00000-0000-4000-8000-000000000001');

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

const gymClock: GymLocalClock = {
  async today() {
    return CalendarDate.create('2026-08-17');
  },
};

const clock = { now: () => new Date('2026-08-17T10:00:00.000Z') };
const ids = { generate: () => crypto.randomUUID() };

const policy = new DietAssignPolicy(
  { isLiveAdmin: async () => false },
  { findLiveProfileId: async () => trainerProfileId },
);

function seedCatalog() {
  const catalog = new InMemoryExerciseCatalog();
  catalog.seedExercise({
    id: exerciseId,
    name: 'Barbell Bench Press',
    aliases: ['bench'],
    primaryMuscle: 'CHEST',
    equipment: 'BARBELL',
    measurement: 'WEIGHT_REPS',
  });
  return catalog;
}

const days = [
  {
    dayLabel: 'Push',
    exercises: [{ exerciseItemId: exerciseId, sets: 3, reps: '8-12', notes: null }],
  },
];

describe('SearchExercisesUseCase', () => {
  it('filters the seed catalog by name and alias', async () => {
    const catalog = seedCatalog();
    const useCase = new SearchExercisesUseCase(catalog);
    const hits = await useCase.execute('bench');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.name).toBe('Barbell Bench Press');
  });
});

describe('AssignWorkoutPlanUseCase', () => {
  it('assigns an ACTIVE plan and replaces a previous one', async () => {
    const plans = new InMemoryWorkoutPlanRepository();
    const useCase = new AssignWorkoutPlanUseCase(
      policy,
      entitlement,
      seedCatalog(),
      plans,
      gymClock,
      clock,
      ids,
    );

    const first = await useCase.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      title: 'PPL A',
      notes: null,
      days,
    });
    const second = await useCase.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      title: 'PPL B',
      notes: null,
      days,
    });

    expect(first.title).toBe('PPL A');
    expect(second.title).toBe('PPL B');
    expect(plans.last?.title.value).toBe('PPL B');
    expect(plans.last?.isActive).toBe(true);
  });

  it('rejects a missing seed exercise', async () => {
    const useCase = new AssignWorkoutPlanUseCase(
      policy,
      entitlement,
      seedCatalog(),
      new InMemoryWorkoutPlanRepository(),
      gymClock,
      clock,
      ids,
    );

    await expect(
      useCase.execute(trainer, {
        gymOrgId,
        clientUserId: clientId,
        title: 'PPL',
        notes: null,
        days: [
          {
            dayLabel: 'Push',
            exercises: [
              {
                exerciseItemId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
                sets: 3,
                reps: '8',
                notes: null,
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow('Seed catalog exercise not found');
  });

  it('forbids a trainer who is not assigned to the client', async () => {
    const unassigned: CoachingEntitlementPort = {
      async findActiveMembership() {
        return { assignedTrainerId: toTrainerProfileId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') };
      },
      async hasInDateCoachingAddon() {
        return true;
      },
    };
    const useCase = new AssignWorkoutPlanUseCase(
      policy,
      unassigned,
      seedCatalog(),
      new InMemoryWorkoutPlanRepository(),
      gymClock,
      clock,
      ids,
    );

    await expect(
      useCase.execute(trainer, {
        gymOrgId,
        clientUserId: clientId,
        title: 'PPL',
        notes: null,
        days,
      }),
    ).rejects.toBeInstanceOf(CoachingForbiddenError);
  });

  it('freezes assign when the coaching addon is expired', async () => {
    const useCase = new AssignWorkoutPlanUseCase(
      policy,
      frozenEntitlement,
      seedCatalog(),
      new InMemoryWorkoutPlanRepository(),
      gymClock,
      clock,
      ids,
    );

    await expect(
      useCase.execute(trainer, {
        gymOrgId,
        clientUserId: clientId,
        title: 'PPL',
        notes: null,
        days,
      }),
    ).rejects.toBeInstanceOf(CoachingAddonRequiredError);
  });
});

describe('workout complete overlay', () => {
  async function assignedPlan() {
    const plans = new InMemoryWorkoutPlanRepository();
    const assign = new AssignWorkoutPlanUseCase(
      policy,
      entitlement,
      seedCatalog(),
      plans,
      gymClock,
      clock,
      ids,
    );
    const created = await assign.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      title: 'PPL',
      notes: null,
      days,
    });
    return { plans, itemId: created.days[0]?.exercises[0]?.id ?? '' };
  }

  it('marks gym-today completion on the client GET overlay', async () => {
    const { plans, itemId } = await assignedPlan();
    const completions = new InMemoryWorkoutCompletions();
    const complete = new CompleteWorkoutExerciseUseCase(
      new DietClientPolicy(),
      entitlement,
      plans,
      completions,
      gymClock,
      clock,
    );
    await complete.execute(client, gymOrgId, itemId);

    const queries = new InMemoryWorkoutPlanQueries(plans);
    queries.seedName(exerciseId, 'Barbell Bench Press');
    const mine = await new GetMyWorkoutPlanUseCase(
      new DietClientPolicy(),
      entitlement,
      queries,
      completions,
      gymClock,
      clock,
    ).execute(client, gymOrgId);

    expect(mine?.days[0]?.exercises[0]?.completed).toBe(true);
    expect(mine?.days[0]?.exercises[0]?.name).toBe('Barbell Bench Press');
    expect(mine?.writable).toBe(true);
  });

  it('rejects a second complete for the same day', async () => {
    const { plans, itemId } = await assignedPlan();
    const completions = new InMemoryWorkoutCompletions();
    const complete = new CompleteWorkoutExerciseUseCase(
      new DietClientPolicy(),
      entitlement,
      plans,
      completions,
      gymClock,
      clock,
    );
    await complete.execute(client, gymOrgId, itemId);
    await expect(complete.execute(client, gymOrgId, itemId)).rejects.toBeInstanceOf(
      AlreadyCompletedWorkoutExerciseError,
    );
  });

  it('uncompletes today and freezes when the addon expires', async () => {
    const { plans, itemId } = await assignedPlan();
    const completions = new InMemoryWorkoutCompletions();
    const complete = new CompleteWorkoutExerciseUseCase(
      new DietClientPolicy(),
      entitlement,
      plans,
      completions,
      gymClock,
      clock,
    );
    await complete.execute(client, gymOrgId, itemId);
    await new UncompleteWorkoutExerciseUseCase(
      new DietClientPolicy(),
      entitlement,
      plans,
      completions,
      gymClock,
      clock,
    ).execute(client, gymOrgId, itemId);

    const frozen = new CompleteWorkoutExerciseUseCase(
      new DietClientPolicy(),
      frozenEntitlement,
      plans,
      completions,
      gymClock,
      clock,
    );
    await expect(frozen.execute(client, gymOrgId, itemId)).rejects.toBeInstanceOf(
      CoachingAddonRequiredError,
    );

    await expect(
      new CompleteWorkoutExerciseUseCase(
        new DietClientPolicy(),
        entitlement,
        plans,
        completions,
        gymClock,
        clock,
      ).execute(client, gymOrgId, crypto.randomUUID()),
    ).rejects.toThrow('Workout plan exercise not found');
  });
});
