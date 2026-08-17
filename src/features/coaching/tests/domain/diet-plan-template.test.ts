import { describe, expect, it } from 'vitest';

import { toFoodItemId } from '../../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../../domain/shared/food-serving-id';
import { toGymOrgId } from '../../../../domain/shared/gym-org-id';
import { ServingQuantity } from '../../../../domain/shared/serving-quantity.value-object';
import { DietPlanTemplate } from '../../domain/diet-plan-template.entity';
import { toDietPlanTemplateId } from '../../domain/diet-plan-template-id';
import { toDietPlanTemplateMealId } from '../../domain/diet-plan-template-meal-id';
import { toDietPlanTemplateMealItemId } from '../../domain/diet-plan-template-meal-item-id';
import { DietPlanTitle } from '../../domain/diet-plan-title.value-object';
import { InvalidDietPlanError } from '../../domain/invalid-diet-plan.error';
import { toTrainerProfileId } from '../../domain/trainer-profile-id';

const gymOrgId = toGymOrgId('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const trainerId = toTrainerProfileId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const now = new Date('2026-08-17T10:00:00.000Z');

function meal() {
  return {
    id: toDietPlanTemplateMealId('11111111-1111-4111-8111-111111111111'),
    mealSlot: 'BREAKFAST' as const,
    sortOrder: 0,
    items: [
      {
        id: toDietPlanTemplateMealItemId('22222222-2222-4222-8222-222222222222'),
        foodItemId: toFoodItemId('f00d0000-0000-4000-8000-000000000001'),
        servingId: toFoodServingId('f00d5e04-0000-4000-8000-000000010003'),
        quantity: ServingQuantity.create(1),
      },
    ],
  };
}

describe('DietPlanTemplate', () => {
  it('rejects an empty meal list', () => {
    expect(() =>
      DietPlanTemplate.create({
        id: toDietPlanTemplateId('33333333-3333-4333-8333-333333333333'),
        gymOrgId,
        trainerId,
        title: DietPlanTitle.create('Cut'),
        notes: null,
        clonedFromId: null,
        meals: [],
        now,
      }),
    ).toThrow(InvalidDietPlanError);
  });

  it('rejects duplicate meal slots', () => {
    expect(() =>
      DietPlanTemplate.create({
        id: toDietPlanTemplateId('33333333-3333-4333-8333-333333333333'),
        gymOrgId,
        trainerId,
        title: DietPlanTitle.create('Cut'),
        notes: null,
        clonedFromId: null,
        meals: [meal(), { ...meal(), mealSlot: 'BREAKFAST' }],
        now,
      }),
    ).toThrow(InvalidDietPlanError);
  });

  it('refuses replace after soft-delete', () => {
    const template = DietPlanTemplate.create({
      id: toDietPlanTemplateId('33333333-3333-4333-8333-333333333333'),
      gymOrgId,
      trainerId,
      title: DietPlanTitle.create('Cut'),
      notes: null,
      clonedFromId: null,
      meals: [meal()],
      now,
    });
    template.softDelete(now);
    expect(() =>
      template.replaceDefinition({
        title: DietPlanTitle.create('Bulk'),
        notes: null,
        meals: [meal()],
        now,
      }),
    ).toThrow(InvalidDietPlanError);
  });
});
