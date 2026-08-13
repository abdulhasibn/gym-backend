import { z } from 'zod';

import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../../shared/pagination/pagination';
import { GENDERS } from '../domain/gender';
import { HeightCm } from '../domain/height-cm.value-object';
import { WeightKg } from '../domain/weight-kg.value-object';

export const gymOrgIdParamSchema = z.object({
  gymOrgId: z.string().uuid(),
});

export const gymAndClientUserIdParamSchema = gymOrgIdParamSchema.extend({
  clientUserId: z.string().uuid(),
});

const heightSchema = z.number().transform((value, context) => {
  try {
    return HeightCm.create(value).value;
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Height is invalid',
    });
    return z.NEVER;
  }
});

const weightSchema = z.number().transform((value, context) => {
  try {
    return WeightKg.create(value).value;
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Weight is invalid',
    });
    return z.NEVER;
  }
});

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

export const updateMyProfileSchema = z.object({
  heightCm: heightSchema.nullable(),
  weightKg: weightSchema.nullable(),
  dob: calendarDateSchema.nullable(),
  gender: z.enum(GENDERS).nullable(),
  medicalNotes: z.string().max(5000).nullable(),
});

export const upsertProgressLogSchema = z.object({
  logDate: calendarDateSchema,
  weightKg: weightSchema.nullable(),
  notes: z.string().max(2000).nullable(),
});

export const listProgressQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});
