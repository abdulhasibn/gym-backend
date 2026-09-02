import { describe, expect, it } from 'vitest';

import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { toExerciseItemId } from '../../domain/exercise-item-id';
import { InvalidWorkoutPlanError } from '../../domain/invalid-workout-plan.error';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';
import { WorkoutPlanTemplate } from '../../domain/workout-plan-template.entity';
import { toWorkoutPlanTemplateExerciseId } from '../../domain/workout-plan-template-exercise-id';
import { toWorkoutPlanTemplateId } from '../../domain/workout-plan-template-id';
import { WorkoutPlanTitle } from '../../domain/workout-plan-title.value-object';

const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const trainerId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const now = new Date('2026-09-02T10:00:00.000Z');

function exercise() {
  return {
    id: toWorkoutPlanTemplateExerciseId('11111111-1111-4111-8111-111111111111'),
    exerciseItemId: toExerciseItemId('e0e00000-0000-4000-8000-000000000001'),
    sets: 3,
    reps: '8-12',
    notes: null,
    sortOrder: 0,
  };
}

describe('WorkoutPlanTemplate', () => {
  it('rejects an empty exercise list', () => {
    expect(() =>
      WorkoutPlanTemplate.create({
        id: toWorkoutPlanTemplateId('33333333-3333-4333-8333-333333333333'),
        gymOrgId,
        trainerId,
        title: WorkoutPlanTitle.create('Circuit'),
        notes: null,
        clonedFromId: null,
        exercises: [],
        now,
      }),
    ).toThrow(InvalidWorkoutPlanError);
  });

  it('refuses replace after soft-delete', () => {
    const template = WorkoutPlanTemplate.create({
      id: toWorkoutPlanTemplateId('33333333-3333-4333-8333-333333333333'),
      gymOrgId,
      trainerId,
      title: WorkoutPlanTitle.create('Circuit'),
      notes: null,
      clonedFromId: null,
      exercises: [exercise()],
      now,
    });
    template.softDelete(now);
    expect(() =>
      template.replaceDefinition({
        title: WorkoutPlanTitle.create('Strength'),
        notes: null,
        exercises: [exercise()],
        now,
      }),
    ).toThrow(InvalidWorkoutPlanError);
  });
});
