import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toUserId } from '../../../../domain/shared/user-id';
import { toExerciseItemId } from '../../domain/exercise-item-id';
import { InvalidWorkoutPlanError } from '../../domain/invalid-workout-plan.error';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';
import { WorkoutPlan } from '../../domain/workout-plan.entity';
import { toWorkoutPlanDayId } from '../../domain/workout-plan-day-id';
import { toWorkoutPlanExerciseId } from '../../domain/workout-plan-exercise-id';
import { toWorkoutPlanId } from '../../domain/workout-plan-id';
import { WorkoutDayLabel } from '../../domain/workout-day-label.value-object';
import { WorkoutPlanTitle } from '../../domain/workout-plan-title.value-object';

const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const clientId = toUserId('11111111-1111-4111-8111-111111111111');
const trainerId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const now = new Date('2026-08-17T10:00:00.000Z');
const exerciseItemId = toExerciseItemId('e0e00000-0000-4000-8000-000000000001');

function day(exercises = [exercise()]) {
  return {
    id: toWorkoutPlanDayId('11111111-1111-4111-8111-111111111111'),
    dayLabel: WorkoutDayLabel.create('Push'),
    sortOrder: 0,
    exercises,
  };
}

function exercise() {
  return {
    id: toWorkoutPlanExerciseId('22222222-2222-4222-8222-222222222222'),
    exerciseItemId,
    sets: 3,
    reps: '8-12',
    notes: null as string | null,
    sortOrder: 0,
  };
}

describe('WorkoutPlan', () => {
  it('rejects an empty day list', () => {
    expect(() =>
      WorkoutPlan.create({
        id: toWorkoutPlanId('33333333-3333-4333-8333-333333333333'),
        clientUserId: clientId,
        trainerId,
        gymOrgId,
        title: WorkoutPlanTitle.create('PPL'),
        notes: null,
        days: [],
        now,
      }),
    ).toThrow(InvalidWorkoutPlanError);
  });

  it('rejects a day with no exercises', () => {
    expect(() =>
      WorkoutPlan.create({
        id: toWorkoutPlanId('33333333-3333-4333-8333-333333333333'),
        clientUserId: clientId,
        trainerId,
        gymOrgId,
        title: WorkoutPlanTitle.create('PPL'),
        notes: null,
        days: [{ ...day([]), exercises: [] }],
        now,
      }),
    ).toThrow(InvalidWorkoutPlanError);
  });

  it('rejects non-positive sets', () => {
    expect(() =>
      WorkoutPlan.create({
        id: toWorkoutPlanId('33333333-3333-4333-8333-333333333333'),
        clientUserId: clientId,
        trainerId,
        gymOrgId,
        title: WorkoutPlanTitle.create('PPL'),
        notes: null,
        days: [day([{ ...exercise(), sets: 0 }])],
        now,
      }),
    ).toThrow(InvalidWorkoutPlanError);
  });

  it('finds a prescribed exercise by id', () => {
    const plan = WorkoutPlan.create({
      id: toWorkoutPlanId('33333333-3333-4333-8333-333333333333'),
      clientUserId: clientId,
      trainerId,
      gymOrgId,
      title: WorkoutPlanTitle.create('PPL'),
      notes: null,
      days: [day()],
      now,
    });
    const found = plan.findExercise(
      toWorkoutPlanExerciseId('22222222-2222-4222-8222-222222222222'),
    );
    expect(found?.exercise.exerciseItemId).toBe(exerciseItemId);
  });
});
