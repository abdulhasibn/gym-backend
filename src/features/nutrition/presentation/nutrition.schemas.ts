import { z } from 'zod';

import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import { MEAL_SLOTS, parseMealSlot } from '../../../domain/shared/meal-slot';
import { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';

const calendarDateSchema = z.string().transform((value, context) => {
  try {
    return CalendarDate.create(value).value;
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Calendar date is invalid',
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

export const searchFoodsQuerySchema = z.object({
  q: z.string().max(120).optional().default(''),
});

export const calorieLogDateQuerySchema = z.object({
  date: calendarDateSchema.optional(),
});

export const logExtraFoodSchema = z.object({
  foodItemId: z.string().uuid(),
  servingId: z.string().uuid(),
  quantity: quantitySchema,
  mealSlot: mealSlotSchema,
  logDate: calendarDateSchema.optional(),
});

export const calorieLogItemIdParamSchema = z.object({
  itemId: z.string().uuid(),
});

export const gymOrgIdParamSchema = z.object({
  gymOrgId: z.string().uuid(),
});

export const gymAndClientUserIdParamSchema = gymOrgIdParamSchema.extend({
  clientUserId: z.string().uuid(),
});
