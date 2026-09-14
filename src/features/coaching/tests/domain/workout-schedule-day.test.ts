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

const sessionId = toWorkoutScheduleSessionId('s0000000-0000-4000-8000-000000000001');

describe('WorkoutScheduleDay', () => {
  it('allows REST with no workout list', () => {
    const day = WorkoutScheduleDay.create({
      ...base,
      kind: 'REST',
      title: null,
      clonedFromTemplateId: null,
      sessionId: null,
      exercises: [],
    });
    expect(day.kind).toBe('REST');
    expect(day.exercises).toHaveLength(0);
    expect(day.title).toBeNull();
  });

  it('rejects REST with exercises', () => {
    expect(() =>
      WorkoutScheduleDay.create({
        ...base,
        kind: 'REST',
        title: null,
        clonedFromTemplateId: null,
        sessionId: null,
        exercises: [exercise],
      }),
    ).toThrow(InvalidWorkoutScheduleError);
  });

  it('requires TRAINING exercises and a session container', () => {
    expect(() =>
      WorkoutScheduleDay.create({
        ...base,
        kind: 'TRAINING',
        title: 'Push',
        clonedFromTemplateId: null,
        sessionId,
        exercises: [],
      }),
    ).toThrow(InvalidWorkoutScheduleError);

    const day = WorkoutScheduleDay.create({
      ...base,
      kind: 'TRAINING',
      title: 'Push',
      clonedFromTemplateId: toWorkoutPlanTemplateId('t0000000-0000-4000-8000-000000000001'),
      sessionId,
      exercises: [exercise],
    });
    expect(day.exercises).toHaveLength(1);
    expect(day.title?.value).toBe('Push');
  });

  it('allows TRAINING without a title', () => {
    const day = WorkoutScheduleDay.create({
      ...base,
      kind: 'TRAINING',
      title: null,
      clonedFromTemplateId: null,
      sessionId,
      exercises: [exercise],
    });
    expect(day.title).toBeNull();
  });
});
