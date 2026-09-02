import { describe, expect, it } from 'vitest';

import { NotFoundError } from '../../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { CoachingAddonRequiredError } from '../../application/coaching-addon-required.error';
import { CoachingForbiddenError } from '../../application/coaching-forbidden.error';
import { CompleteScheduleExerciseUseCase } from '../../application/complete-schedule-exercise.use-case';
import { DietAssignPolicy } from '../../application/diet-assign.policy';
import { DietClientPolicy } from '../../application/diet-client.policy';
import { GetMyWorkoutScheduleUseCase } from '../../application/get-my-workout-schedule.use-case';
import { GetMyWorkoutStreakUseCase } from '../../application/get-my-workout-streak.use-case';
import { GetStaffWorkoutScheduleUseCase } from '../../application/get-staff-workout-schedule.use-case';
import { GetStaffWorkoutStreakUseCase } from '../../application/get-staff-workout-streak.use-case';
import { SearchExercisesUseCase } from '../../application/search-exercises.use-case';
import { UncompleteScheduleExerciseUseCase } from '../../application/uncomplete-schedule-exercise.use-case';
import { UpsertWorkoutScheduleUseCase } from '../../application/upsert-workout-schedule.use-case';
import { AlreadyCompletedWorkoutExerciseError } from '../../domain/already-completed-workout-exercise.error';
import type { CoachingEntitlementPort } from '../../domain/coaching-entitlement.port';
import { toExerciseItemId } from '../../domain/exercise-item-id';
import type { GymLocalClock } from '../../domain/gym-local-clock.port';
import { InvalidWorkoutScheduleError } from '../../domain/invalid-workout-schedule.error';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';
import { WorkoutPlanTemplate } from '../../domain/workout-plan-template.entity';
import { toWorkoutPlanTemplateExerciseId } from '../../domain/workout-plan-template-exercise-id';
import { toWorkoutPlanTemplateId } from '../../domain/workout-plan-template-id';
import type { WorkoutPlanTemplateRepository } from '../../domain/workout-plan-template.repository';
import { WorkoutPlanTitle } from '../../domain/workout-plan-title.value-object';
import { InMemoryExerciseCatalog } from '../fakes/in-memory-exercise-catalog';
import { InMemoryWorkoutScheduleCompletions } from '../fakes/in-memory-workout-schedule-completions';
import {
  InMemoryWorkoutScheduleQueries,
  InMemoryWorkoutScheduleRepository,
} from '../fakes/in-memory-workout-schedule';

const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const clientId = toUserId('11111111-1111-4111-8111-111111111111');
const trainerUserId = toUserId('22222222-2222-4222-8222-222222222222');
const trainerProfileId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const exerciseId = toExerciseItemId('e0e00000-0000-4000-8000-000000000001');
const templateId = toWorkoutPlanTemplateId('t0000000-0000-4000-8000-000000000001');

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

function seedTemplate(): WorkoutPlanTemplateRepository {
  const template = WorkoutPlanTemplate.create({
    id: templateId,
    gymOrgId,
    trainerId: trainerProfileId,
    title: WorkoutPlanTitle.create('Push AM'),
    notes: null,
    clonedFromId: null,
    exercises: [
      {
        id: toWorkoutPlanTemplateExerciseId('te000000-0000-4000-8000-000000000001'),
        exerciseItemId: exerciseId,
        sets: 3,
        reps: '8-12',
        notes: null,
        sortOrder: 0,
      },
    ],
    now: clock.now(),
  });
  return {
    async findById(id, gym) {
      if (id !== template.id || gym !== gymOrgId || !template.isLive) {
        return null;
      }
      return template;
    },
    async save() {},
    async replace() {},
  };
}

describe('SearchExercisesUseCase', () => {
  it('filters the seed catalog by name and alias', async () => {
    const catalog = seedCatalog();
    const useCase = new SearchExercisesUseCase(catalog);
    const hits = await useCase.execute('bench');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.name).toBe('Barbell Bench Press');
  });
});

describe('UpsertWorkoutScheduleUseCase', () => {
  it('snapshots template exercises onto TRAINING slots and allows REST', async () => {
    const schedule = new InMemoryWorkoutScheduleRepository();
    const useCase = new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      schedule,
      gymClock,
      clock,
      ids,
    );

    const days = await useCase.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [
        { date: '2026-08-17', kind: 'TRAINING', morningTemplateId: templateId },
        { date: '2026-08-18', kind: 'REST' },
      ],
    });

    expect(days).toHaveLength(2);
    expect(days[0]?.kind).toBe('TRAINING');
    expect(days[0]?.sessions[0]?.title).toBe('Push AM');
    expect(days[0]?.sessions[0]?.exercises).toHaveLength(1);
    expect(days[1]?.kind).toBe('REST');
    expect(days[1]?.sessions).toHaveLength(0);
  });

  it('overwrites a prior day when the same date is upserted again', async () => {
    const schedule = new InMemoryWorkoutScheduleRepository();
    const useCase = new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      schedule,
      gymClock,
      clock,
      ids,
    );

    await useCase.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [{ date: '2026-08-17', kind: 'TRAINING', morningTemplateId: templateId }],
    });
    const replaced = await useCase.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [{ date: '2026-08-17', kind: 'REST' }],
    });

    expect(replaced[0]?.kind).toBe('REST');
    expect(schedule.days.filter((day) => day.isLive)).toHaveLength(1);
  });

  it('rejects a soft-deleted / missing template', async () => {
    const useCase = new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      {
        async findById() {
          return null;
        },
        async save() {},
        async replace() {},
      },
      new InMemoryWorkoutScheduleRepository(),
      gymClock,
      clock,
      ids,
    );

    await expect(
      useCase.execute(trainer, {
        gymOrgId,
        clientUserId: clientId,
        entries: [{ date: '2026-08-17', kind: 'TRAINING', morningTemplateId: templateId }],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
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
    const useCase = new UpsertWorkoutScheduleUseCase(
      policy,
      unassigned,
      seedTemplate(),
      new InMemoryWorkoutScheduleRepository(),
      gymClock,
      clock,
      ids,
    );

    await expect(
      useCase.execute(trainer, {
        gymOrgId,
        clientUserId: clientId,
        entries: [{ date: '2026-08-17', kind: 'REST' }],
      }),
    ).rejects.toBeInstanceOf(CoachingForbiddenError);
  });

  it('freezes upsert when the coaching addon is expired', async () => {
    const useCase = new UpsertWorkoutScheduleUseCase(
      policy,
      frozenEntitlement,
      seedTemplate(),
      new InMemoryWorkoutScheduleRepository(),
      gymClock,
      clock,
      ids,
    );

    await expect(
      useCase.execute(trainer, {
        gymOrgId,
        clientUserId: clientId,
        entries: [{ date: '2026-08-17', kind: 'REST' }],
      }),
    ).rejects.toBeInstanceOf(CoachingAddonRequiredError);
  });
});

describe('schedule complete overlay', () => {
  async function scheduledToday() {
    const schedule = new InMemoryWorkoutScheduleRepository();
    const upsert = new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      schedule,
      gymClock,
      clock,
      ids,
    );
    const days = await upsert.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [{ date: '2026-08-17', kind: 'TRAINING', morningTemplateId: templateId }],
    });
    return {
      schedule,
      itemId: days[0]?.sessions[0]?.exercises[0]?.id ?? '',
    };
  }

  it('marks gym-today completion on the client GET overlay', async () => {
    const { schedule, itemId } = await scheduledToday();
    const completions = new InMemoryWorkoutScheduleCompletions();
    await new CompleteScheduleExerciseUseCase(
      new DietClientPolicy(),
      entitlement,
      schedule,
      completions,
      gymClock,
      clock,
    ).execute(client, gymOrgId, itemId);

    const mine = await new GetMyWorkoutScheduleUseCase(
      new DietClientPolicy(),
      entitlement,
      new InMemoryWorkoutScheduleQueries(schedule),
      completions,
      gymClock,
      clock,
    ).execute(client, gymOrgId, '2026-08-17', '2026-08-17');

    expect(mine.days[0]?.sessions[0]?.exercises[0]?.completed).toBe(true);
    expect(mine.days[0]?.dayDone).toBe(true);
    expect(mine.days[0]?.adherencePercent).toBe(100);
    expect(mine.writable).toBe(true);
    expect(mine.today).toBe('2026-08-17');
  });

  it('allows catch-up complete within D..D+2 keyed by schedule date', async () => {
    const schedule = new InMemoryWorkoutScheduleRepository();
    const days = await new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      schedule,
      gymClock,
      clock,
      ids,
    ).execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [{ date: '2026-08-15', kind: 'TRAINING', morningTemplateId: templateId }],
    });
    const itemId = days[0]?.sessions[0]?.exercises[0]?.id ?? '';
    const completions = new InMemoryWorkoutScheduleCompletions();

    await new CompleteScheduleExerciseUseCase(
      new DietClientPolicy(),
      entitlement,
      schedule,
      completions,
      gymClock,
      clock,
    ).execute(client, gymOrgId, itemId);

    const mine = await new GetMyWorkoutScheduleUseCase(
      new DietClientPolicy(),
      entitlement,
      new InMemoryWorkoutScheduleQueries(schedule),
      completions,
      gymClock,
      clock,
    ).execute(client, gymOrgId, '2026-08-15', '2026-08-17');

    expect(mine.days[0]?.sessions[0]?.exercises[0]?.completed).toBe(true);
    expect(mine.days[0]?.dayDone).toBe(true);
  });

  it('rejects complete for a future schedule date', async () => {
    const schedule = new InMemoryWorkoutScheduleRepository();
    const days = await new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      schedule,
      gymClock,
      clock,
      ids,
    ).execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [{ date: '2026-08-18', kind: 'TRAINING', morningTemplateId: templateId }],
    });
    const itemId = days[0]?.sessions[0]?.exercises[0]?.id ?? '';

    await expect(
      new CompleteScheduleExerciseUseCase(
        new DietClientPolicy(),
        entitlement,
        schedule,
        new InMemoryWorkoutScheduleCompletions(),
        gymClock,
        clock,
      ).execute(client, gymOrgId, itemId),
    ).rejects.toBeInstanceOf(InvalidWorkoutScheduleError);
  });

  it('rejects complete when today is past D+2', async () => {
    const schedule = new InMemoryWorkoutScheduleRepository();
    const days = await new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      schedule,
      gymClock,
      clock,
      ids,
    ).execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [{ date: '2026-08-14', kind: 'TRAINING', morningTemplateId: templateId }],
    });
    const itemId = days[0]?.sessions[0]?.exercises[0]?.id ?? '';

    await expect(
      new CompleteScheduleExerciseUseCase(
        new DietClientPolicy(),
        entitlement,
        schedule,
        new InMemoryWorkoutScheduleCompletions(),
        gymClock,
        clock,
      ).execute(client, gymOrgId, itemId),
    ).rejects.toBeInstanceOf(InvalidWorkoutScheduleError);
  });

  it('rejects a second complete for the same day', async () => {
    const { schedule, itemId } = await scheduledToday();
    const completions = new InMemoryWorkoutScheduleCompletions();
    const complete = new CompleteScheduleExerciseUseCase(
      new DietClientPolicy(),
      entitlement,
      schedule,
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
    const { schedule, itemId } = await scheduledToday();
    const completions = new InMemoryWorkoutScheduleCompletions();
    await new CompleteScheduleExerciseUseCase(
      new DietClientPolicy(),
      entitlement,
      schedule,
      completions,
      gymClock,
      clock,
    ).execute(client, gymOrgId, itemId);
    await new UncompleteScheduleExerciseUseCase(
      new DietClientPolicy(),
      entitlement,
      schedule,
      completions,
      gymClock,
      clock,
    ).execute(client, gymOrgId, itemId);

    await expect(
      new CompleteScheduleExerciseUseCase(
        new DietClientPolicy(),
        frozenEntitlement,
        schedule,
        completions,
        gymClock,
        clock,
      ).execute(client, gymOrgId, itemId),
    ).rejects.toBeInstanceOf(CoachingAddonRequiredError);
  });

  it('staff GET omits adherence without WORKOUT_PLANS and includes it with the grant', async () => {
    const { schedule, itemId } = await scheduledToday();
    const completions = new InMemoryWorkoutScheduleCompletions();
    await new CompleteScheduleExerciseUseCase(
      new DietClientPolicy(),
      entitlement,
      schedule,
      completions,
      gymClock,
      clock,
    ).execute(client, gymOrgId, itemId);

    const withoutGrant = await new GetStaffWorkoutScheduleUseCase(
      policy,
      entitlement,
      new InMemoryWorkoutScheduleQueries(schedule),
      completions,
      { async loadForActiveMembership() { return { classGrants: [] }; } },
    ).execute(trainer, gymOrgId, clientId, '2026-08-17', '2026-08-17');

    expect(withoutGrant[0]?.sessions[0]?.exercises[0]?.completed).toBeUndefined();
    expect(withoutGrant[0]?.dayDone).toBeUndefined();

    const withGrant = await new GetStaffWorkoutScheduleUseCase(
      policy,
      entitlement,
      new InMemoryWorkoutScheduleQueries(schedule),
      completions,
      { async loadForActiveMembership() { return { classGrants: ['WORKOUT_PLANS'] }; } },
    ).execute(trainer, gymOrgId, clientId, '2026-08-17', '2026-08-17');

    expect(withGrant[0]?.sessions[0]?.exercises[0]?.completed).toBe(true);
    expect(withGrant[0]?.dayDone).toBe(true);
    expect(withGrant[0]?.adherencePercent).toBe(100);
  });
});

describe('workout streak', () => {
  it('returns current streak for the client after completed TRAINING days', async () => {
    const schedule = new InMemoryWorkoutScheduleRepository();
    const upsert = new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      schedule,
      gymClock,
      clock,
      ids,
    );
    const days = await upsert.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [
        { date: '2026-08-15', kind: 'TRAINING', morningTemplateId: templateId },
        { date: '2026-08-16', kind: 'REST' },
        { date: '2026-08-17', kind: 'TRAINING', morningTemplateId: templateId },
      ],
    });
    const completions = new InMemoryWorkoutScheduleCompletions();
    const complete = new CompleteScheduleExerciseUseCase(
      new DietClientPolicy(),
      entitlement,
      schedule,
      completions,
      gymClock,
      clock,
    );
    for (const day of days) {
      for (const session of day.sessions) {
        for (const exercise of session.exercises) {
          await complete.execute(client, gymOrgId, exercise.id);
        }
      }
    }

    const streak = await new GetMyWorkoutStreakUseCase(
      new DietClientPolicy(),
      entitlement,
      new InMemoryWorkoutScheduleQueries(schedule),
      completions,
      gymClock,
      clock,
    ).execute(client, gymOrgId);

    expect(streak.asOf).toBe('2026-08-17');
    expect(streak.currentStreak).toBe(2);
    expect(streak.longestStreak).toBe(2);
    expect(streak.lookbackDays).toBe(366);
  });

  it('forbids staff streak without WORKOUT_PLANS and allows with the grant', async () => {
    const schedule = new InMemoryWorkoutScheduleRepository();
    await new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      schedule,
      gymClock,
      clock,
      ids,
    ).execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [{ date: '2026-08-17', kind: 'REST' }],
    });
    const completions = new InMemoryWorkoutScheduleCompletions();
    const queries = new InMemoryWorkoutScheduleQueries(schedule);

    await expect(
      new GetStaffWorkoutStreakUseCase(
        policy,
        entitlement,
        queries,
        completions,
        { async loadForActiveMembership() { return { classGrants: [] }; } },
        gymClock,
        clock,
      ).execute(trainer, gymOrgId, clientId),
    ).rejects.toBeInstanceOf(CoachingForbiddenError);

    const allowed = await new GetStaffWorkoutStreakUseCase(
      policy,
      entitlement,
      queries,
      completions,
      { async loadForActiveMembership() { return { classGrants: ['WORKOUT_PLANS'] }; } },
      gymClock,
      clock,
    ).execute(trainer, gymOrgId, clientId);

    expect(allowed.currentStreak).toBe(0);
    expect(allowed.asOf).toBe('2026-08-17');
  });
});
