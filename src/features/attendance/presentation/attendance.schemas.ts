import { z } from 'zod';

import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../../shared/pagination/pagination';

export const gymOrgIdParamSchema = z.object({
  gymOrgId: z.string().uuid(),
});

export const gymAndClientUserIdParamSchema = gymOrgIdParamSchema.extend({
  clientUserId: z.string().uuid(),
});

export const deskMarkBodySchema = z.object({
  clientUserId: z.string().uuid(),
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

export const listGymDayQuerySchema = z.object({
  day: calendarDateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});

export const listAttendancesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});
