import { describe, expect, it } from 'vitest';

import type { AuthenticatedActor } from '../../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { CoachingAddonRequiredError } from '../../application/coaching-addon-required.error';
import { CoachingForbiddenError } from '../../application/coaching-forbidden.error';
import {
  toWorkoutPlanTemplateDtoFromSummary,
  toWorkoutScheduleDayDtoFromSummary,
} from '../../application/coaching.dto';
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
import type { WorkoutScheduleDayKind } from '../../domain/workout-schedule-day-kind';
import { toWorkoutScheduleDayId } from '../../domain/workout-schedule-day-id';
import { toWorkoutScheduleExerciseId } from '../../domain/workout-schedule-exercise-id';
import type { WorkoutScheduleDaySummary } from '../../domain/workout-schedule.queries';
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
    illustrationSlug: 'bench-press',
  });
  return catalog;
}

const benchLine = {
  exerciseItemId: exerciseId,
  sets: 3,
  reps: '8-12',
  notes: null,
};

function trainingEntry(
  date: string,
  extra?: { title?: string; clonedFromTemplateId?: string | null },
) {
  return {
    date,
    kind: 'TRAINING' as const,
    title: extra?.title ?? 'Push AM',
    clonedFromTemplateId: extra?.clonedFromTemplateId,
    exercises: [benchLine],
  };
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
    expect(hits[0]?.illustration?.frames).toEqual([
      'https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/bench-press/frame-1.png',
      'https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/bench-press/frame-2.png',
      'https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/bench-press/frame-3.png',
    ]);
  });
});

describe('UpsertWorkoutScheduleUseCase', () => {
  it('snapshots a trainer-edited list onto TRAINING and allows REST', async () => {
    const schedule = new InMemoryWorkoutScheduleRepository();
    const useCase = new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      seedCatalog(),
      schedule,
      gymClock,
      clock,
      ids,
    );

    const days = await useCase.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [
        trainingEntry('2026-08-17', { clonedFromTemplateId: templateId }),
        { date: '2026-08-18', kind: 'REST' },
      ],
    });

    expect(days).toHaveLength(2);
    expect(days[0]?.kind).toBe('TRAINING');
    expect(days[0]?.title).toBe('Push AM');
    expect(days[0]?.exercises).toHaveLength(1);
    expect(days[0]?.clonedFromTemplateId).toBe(templateId);
    expect(days[1]?.kind).toBe('REST');
    expect(days[1]?.exercises).toHaveLength(0);
    expect(days[1]?.title).toBeNull();
    expect(days[1]?.clonedFromTemplateId).toBeNull();
  });

  it('overwrites a prior day when the same date is upserted again', async () => {
    const schedule = new InMemoryWorkoutScheduleRepository();
    const useCase = new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      seedCatalog(),
      schedule,
      gymClock,
      clock,
      ids,
    );

    await useCase.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [trainingEntry('2026-08-17')],
    });
    const replaced = await useCase.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [{ date: '2026-08-17', kind: 'REST' }],
    });

    expect(replaced[0]?.kind).toBe('REST');
    expect(schedule.days.filter((day) => day.isLive)).toHaveLength(1);
  });

  it('nullifies unknown provenance and still saves the list', async () => {
    let replaceCalled = false;
    const useCase = new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      {
        async findById() {
          return null;
        },
        async save() {},
        async replace() {
          replaceCalled = true;
        },
      },
      seedCatalog(),
      new InMemoryWorkoutScheduleRepository(),
      gymClock,
      clock,
      ids,
    );

    const days = await useCase.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [trainingEntry('2026-08-17', { clonedFromTemplateId: templateId })],
    });

    expect(days[0]?.clonedFromTemplateId).toBeNull();
    expect(days[0]?.exercises).toHaveLength(1);
    expect(replaceCalled).toBe(false);
  });

  it('rejects an unknown catalog exercise', async () => {
    const useCase = new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      seedCatalog(),
      new InMemoryWorkoutScheduleRepository(),
      gymClock,
      clock,
      ids,
    );

    await expect(
      useCase.execute(trainer, {
        gymOrgId,
        clientUserId: clientId,
        entries: [
          {
            date: '2026-08-17',
            kind: 'TRAINING',
            exercises: [{ exerciseItemId: 'e0e00000-0000-4000-8000-000000000099' }],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidWorkoutScheduleError);
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
      seedCatalog(),
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
      seedCatalog(),
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
      seedCatalog(),
      schedule,
      gymClock,
      clock,
      ids,
    );
    const days = await upsert.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [trainingEntry('2026-08-17')],
    });
    return {
      schedule,
      itemId: days[0]?.exercises[0]?.id ?? '',
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

    expect(mine.days[0]?.exercises[0]?.completed).toBe(true);
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
      seedCatalog(),
      schedule,
      gymClock,
      clock,
      ids,
    ).execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [trainingEntry('2026-08-15')],
    });
    const itemId = days[0]?.exercises[0]?.id ?? '';
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

    expect(mine.days[0]?.exercises[0]?.completed).toBe(true);
    expect(mine.days[0]?.dayDone).toBe(true);
  });

  it('rejects complete for a future schedule date', async () => {
    const schedule = new InMemoryWorkoutScheduleRepository();
    const days = await new UpsertWorkoutScheduleUseCase(
      policy,
      entitlement,
      seedTemplate(),
      seedCatalog(),
      schedule,
      gymClock,
      clock,
      ids,
    ).execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [trainingEntry('2026-08-18')],
    });
    const itemId = days[0]?.exercises[0]?.id ?? '';

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
      seedCatalog(),
      schedule,
      gymClock,
      clock,
      ids,
    ).execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [trainingEntry('2026-08-14')],
    });
    const itemId = days[0]?.exercises[0]?.id ?? '';

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
      {
        async loadForActiveMembership() {
          return { classGrants: [] };
        },
      },
    ).execute(trainer, gymOrgId, clientId, '2026-08-17', '2026-08-17');

    expect(withoutGrant[0]?.exercises[0]?.completed).toBeUndefined();
    expect(withoutGrant[0]?.dayDone).toBeUndefined();

    const withGrant = await new GetStaffWorkoutScheduleUseCase(
      policy,
      entitlement,
      new InMemoryWorkoutScheduleQueries(schedule),
      completions,
      {
        async loadForActiveMembership() {
          return { classGrants: ['WORKOUT_PLANS'] };
        },
      },
    ).execute(trainer, gymOrgId, clientId, '2026-08-17', '2026-08-17');

    expect(withGrant[0]?.exercises[0]?.completed).toBe(true);
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
      seedCatalog(),
      schedule,
      gymClock,
      clock,
      ids,
    );
    const days = await upsert.execute(trainer, {
      gymOrgId,
      clientUserId: clientId,
      entries: [
        trainingEntry('2026-08-15'),
        { date: '2026-08-16', kind: 'REST' },
        trainingEntry('2026-08-17'),
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
      for (const exercise of day.exercises) {
        await complete.execute(client, gymOrgId, exercise.id);
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
      seedCatalog(),
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
        {
          async loadForActiveMembership() {
            return { classGrants: [] };
          },
        },
        gymClock,
        clock,
      ).execute(trainer, gymOrgId, clientId),
    ).rejects.toBeInstanceOf(CoachingForbiddenError);

    const allowed = await new GetStaffWorkoutStreakUseCase(
      policy,
      entitlement,
      queries,
      completions,
      {
        async loadForActiveMembership() {
          return { classGrants: ['WORKOUT_PLANS'] };
        },
      },
      gymClock,
      clock,
    ).execute(trainer, gymOrgId, clientId);

    expect(allowed.currentStreak).toBe(0);
    expect(allowed.asOf).toBe('2026-08-17');
  });
});

// ─── G1: Template DTO catalog embed ──────────────────────────────────────────

describe('toWorkoutPlanTemplateDtoFromSummary', () => {
  it('embeds primaryMuscle, equipment, illustration and sortOrder on exercise lines', () => {
    const summary = {
      id: templateId,
      gymOrgId,
      trainerId: trainerProfileId,
      title: 'Push AM',
      notes: null,
      clonedFromId: null,
      exercises: [
        {
          id: toWorkoutPlanTemplateExerciseId('te000000-0000-4000-8000-000000000001'),
          exerciseItemId: exerciseId,
          name: 'Barbell Bench Press',
          primaryMuscle: 'CHEST',
          equipment: 'BARBELL',
          illustrationSlug: 'bench-press',
          sets: 3,
          reps: '8-10',
          notes: null,
          sortOrder: 0,
        },
      ],
      createdAt: '2026-08-17T00:00:00.000Z',
      updatedAt: '2026-08-17T00:00:00.000Z',
    } as const;

    const dto = toWorkoutPlanTemplateDtoFromSummary(summary);
    const ex = dto.exercises[0];
    expect(ex).toBeDefined();
    expect(ex?.name).toBe('Barbell Bench Press');
    expect(ex?.primaryMuscle).toBe('CHEST');
    expect(ex?.equipment).toBe('BARBELL');
    expect(ex?.sortOrder).toBe(0);
    expect(ex?.illustration).not.toBeNull();
    expect(ex?.illustration?.frames).toHaveLength(3);
    expect(ex?.illustration?.frames[0]).toMatch(/bench-press\/frame-1\.png$/);
    expect(ex?.illustration?.attribution).toContain('CC BY-SA');
  });

  it('sets illustration to null when no slug is mapped', () => {
    const summary = {
      id: templateId,
      gymOrgId,
      trainerId: trainerProfileId,
      title: 'Cardio',
      notes: null,
      clonedFromId: null,
      exercises: [
        {
          id: toWorkoutPlanTemplateExerciseId('te000000-0000-4000-8000-000000000002'),
          exerciseItemId: exerciseId,
          name: 'Jump Rope',
          primaryMuscle: 'CARDIO',
          equipment: 'NONE',
          illustrationSlug: null,
          sets: null,
          reps: '60s',
          notes: null,
          sortOrder: 0,
        },
      ],
      createdAt: '2026-08-17T00:00:00.000Z',
      updatedAt: '2026-08-17T00:00:00.000Z',
    } as const;

    const dto = toWorkoutPlanTemplateDtoFromSummary(summary);
    expect(dto.exercises[0]?.illustration).toBeNull();
  });
});

// ─── Schedule day DTO (ADR-0014) + G10 date normalization ────────────────────

function makeScheduleSummary(opts: {
  title?: string | null;
  clonedFromTemplateId?: string | null;
  kind?: WorkoutScheduleDayKind;
  scheduleDate?: string;
}): WorkoutScheduleDaySummary {
  const kind = (opts.kind ?? 'TRAINING') as WorkoutScheduleDayKind;
  return {
    id: toWorkoutScheduleDayId('d0000000-0000-4000-8000-000000000001'),
    clientUserId: clientId,
    gymOrgId,
    trainerId: trainerProfileId,
    scheduleDate: opts.scheduleDate ?? '2026-08-17',
    kind,
    title: kind === 'REST' ? null : (opts.title ?? 'Push AM'),
    clonedFromTemplateId:
      kind === 'REST' || opts.clonedFromTemplateId === undefined
        ? null
        : opts.clonedFromTemplateId === null
          ? null
          : toWorkoutPlanTemplateId(opts.clonedFromTemplateId),
    exercises:
      kind === 'REST'
        ? []
        : [
            {
              id: toWorkoutScheduleExerciseId('e1000000-0000-4000-8000-000000000001'),
              exerciseItemId: exerciseId,
              name: 'Barbell Bench Press',
              sets: 3,
              reps: '8-12',
              notes: null,
              sortOrder: 0,
            },
          ],
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
  };
}

describe('toWorkoutScheduleDayDtoFromSummary', () => {
  it('returns one exercise list and optional provenance', () => {
    const summary = makeScheduleSummary({ clonedFromTemplateId: templateId });

    const dto = toWorkoutScheduleDayDtoFromSummary(summary);
    expect(dto.title).toBe('Push AM');
    expect(dto.clonedFromTemplateId).toBe(templateId);
    expect(dto.exercises).toHaveLength(1);
    expect(dto.exercises[0]?.name).toBe('Barbell Bench Press');
    expect(dto).not.toHaveProperty('sessions');
    expect(dto).not.toHaveProperty('morningTemplateId');
  });

  it('sets title and provenance to null for a REST day', () => {
    const summary = makeScheduleSummary({ kind: 'REST' });

    const dto = toWorkoutScheduleDayDtoFromSummary(summary);
    expect(dto.title).toBeNull();
    expect(dto.clonedFromTemplateId).toBeNull();
    expect(dto.exercises).toHaveLength(0);
    expect(dto.kind).toBe('REST');
  });

  it('passes scheduleDate through unchanged when already YYYY-MM-DD (G10)', () => {
    const summary = makeScheduleSummary({ scheduleDate: '2026-09-07' });

    const dto = toWorkoutScheduleDayDtoFromSummary(summary);
    expect(dto.scheduleDate).toBe('2026-09-07');
  });
});
