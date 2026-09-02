import { describe, expect, it } from 'vitest';

import { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { toExerciseItemId } from '../../domain/exercise-item-id';
import { InvalidWorkoutScheduleError } from '../../domain/invalid-workout-schedule.error';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';
import { toWorkoutPlanTemplateId } from '../../domain/workout-plan-template-id';
import { WorkoutScheduleDay } from '../../domain/workout-schedule-day.entity';
import { toWorkoutScheduleDayId } from '../../domain/workout-schedule-day-id';
import { toWorkoutScheduleExerciseId } from '../../domain/workout-schedule-exercise-id';
import { toWorkoutScheduleSessionId } from '../../domain/workout-schedule-session-id';

const now = new Date('2026-08-17T10:00:00.000Z');
const base = {
  id: toWorkoutScheduleDayId('d0000000-0000-4000-8000-000000000001'),
  clientUserId: toUserId('11111111-1111-4111-8111-111111111111'),
  gymOrgId: toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  trainerId: toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  scheduleDate: CalendarDate.create('2026-08-17'),
  now,
};

const exercise = {
  id: toWorkoutScheduleExerciseId('e0000000-0000-4000-8000-000000000001'),
  exerciseItemId: toExerciseItemId('e0e00000-0000-4000-8000-000000000001'),
  sets: 3,
  reps: '8-12',
  notes: null,
  sortOrder: 0,
};

const morning = {
  id: toWorkoutScheduleSessionId('s0000000-0000-4000-8000-000000000001'),
  slot: 'MORNING' as const,
  title: 'Push',
  clonedFromTemplateId: toWorkoutPlanTemplateId('t0000000-0000-4000-8000-000000000001'),
  exercises: [exercise],
};

describe('WorkoutScheduleDay', () => {
  it('allows REST with no sessions', () => {
    const day = WorkoutScheduleDay.create({ ...base, kind: 'REST', sessions: [] });
    expect(day.kind).toBe('REST');
    expect(day.sessions).toHaveLength(0);
  });

  it('rejects REST with sessions', () => {
    expect(() =>
      WorkoutScheduleDay.create({ ...base, kind: 'REST', sessions: [morning] }),
    ).toThrow(InvalidWorkoutScheduleError);
  });

  it('requires 1–2 TRAINING sessions with unique slots', () => {
    expect(() =>
      WorkoutScheduleDay.create({ ...base, kind: 'TRAINING', sessions: [] }),
    ).toThrow(InvalidWorkoutScheduleError);

    const day = WorkoutScheduleDay.create({
      ...base,
      kind: 'TRAINING',
      sessions: [morning],
    });
    expect(day.sessions).toHaveLength(1);

    expect(() =>
      WorkoutScheduleDay.create({
        ...base,
        kind: 'TRAINING',
        sessions: [morning, { ...morning, id: toWorkoutScheduleSessionId(crypto.randomUUID()) }],
      }),
    ).toThrow(InvalidWorkoutScheduleError);
  });

  it('rejects empty exercise lists on a session', () => {
    expect(() =>
      WorkoutScheduleDay.create({
        ...base,
        kind: 'TRAINING',
        sessions: [{ ...morning, exercises: [] }],
      }),
    ).toThrow(InvalidWorkoutScheduleError);
  });
});
