import { z } from 'zod';

import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../../shared/pagination/pagination';
import { parseWearableProvider, WEARABLE_PROVIDERS } from '../domain/wearable-provider';

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

const wearableProviderSchema = z.enum(WEARABLE_PROVIDERS).transform((value, context) => {
  try {
    return parseWearableProvider(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Wearable provider is invalid',
    });
    return z.NEVER;
  }
});

export const connectWearableSchema = z.object({
  provider: wearableProviderSchema,
  authRef: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const wearableProviderParamSchema = z.object({
  provider: wearableProviderSchema,
});

export const syncWearableDaySchema = z
  .object({
    metricOn: calendarDateSchema,
    steps: z.number().int().min(0).max(1_000_000).nullable().optional(),
    activeKcal: z.number().min(0).max(50_000).nullable().optional(),
    workoutMinutes: z
      .number()
      .int()
      .min(0)
      .max(24 * 60)
      .nullable()
      .optional(),
    weightKg: z.number().min(0).max(500).nullable().optional(),
  })
  .refine(
    (day) =>
      day.steps !== undefined ||
      day.activeKcal !== undefined ||
      day.workoutMinutes !== undefined ||
      day.weightKg !== undefined,
    { message: 'Each day must include at least one metric field' },
  );

export const syncWearableMetricsSchema = z.object({
  provider: wearableProviderSchema,
  days: z.array(syncWearableDaySchema).min(1).max(31),
});

export const listWearableMetricsQuerySchema = z.object({
  provider: wearableProviderSchema.optional(),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});

export const gymOrgIdParamSchema = z.object({
  gymOrgId: z.string().uuid(),
});

export const gymAndClientUserIdParamSchema = gymOrgIdParamSchema.extend({
  clientUserId: z.string().uuid(),
});
