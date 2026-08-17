import { z } from 'zod';

import { MEAL_SLOTS, parseMealSlot } from '../../../domain/shared/meal-slot';
import { DietPlanTitle } from '../domain/diet-plan-title.value-object';
import { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../../shared/pagination/pagination';

const titleSchema = z.string().transform((value, context) => {
  try {
    return DietPlanTitle.create(value).value;
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Title is invalid',
    });
    return z.NEVER;
  }
});

const quantitySchema = z.number().transform((value, context) => {
  try {
    return ServingQuantity.create(value).value;
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Quantity is invalid',
    });
    return z.NEVER;
  }
});

const mealSlotSchema = z.enum(MEAL_SLOTS).transform((value, context) => {
  try {
    return parseMealSlot(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Meal slot is invalid',
    });
    return z.NEVER;
  }
});

const mealsSchema = z
  .array(
    z.object({
      mealSlot: mealSlotSchema,
      items: z
        .array(
          z.object({
            foodItemId: z.string().uuid(),
            servingId: z.string().uuid(),
            quantity: quantitySchema,
          }),
        )
        .min(1),
    }),
  )
  .min(1);

const notesSchema = z.string().max(5000).nullable().optional();

export const gymOrgIdParamSchema = z.object({
  gymOrgId: z.string().uuid(),
});

export const gymAndClientUserIdParamSchema = gymOrgIdParamSchema.extend({
  clientUserId: z.string().uuid(),
});

export const dietItemParamSchema = gymOrgIdParamSchema.extend({
  itemId: z.string().uuid(),
});

export const dietTemplateIdParamSchema = gymOrgIdParamSchema.extend({
  templateId: z.string().uuid(),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});

export const assignDietPlanMealsSchema = z
  .object({
    title: titleSchema,
    notes: notesSchema,
    meals: mealsSchema,
  })
  .strict();

export const assignDietPlanFromTemplateSchema = z
  .object({
    templateId: z.string().uuid(),
    title: titleSchema.optional(),
    notes: notesSchema,
  })
  .strict();

export const assignDietPlanSchema = z.union([
  assignDietPlanFromTemplateSchema,
  assignDietPlanMealsSchema,
]);

export const dietPlanTemplateBodySchema = assignDietPlanMealsSchema;
