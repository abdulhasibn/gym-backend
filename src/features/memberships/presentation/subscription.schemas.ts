import { z } from 'zod';

import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import { PAYMENT_STATUSES } from '../domain/payment-status';
import { PlanPrice } from '../domain/plan-price.value-object';

export const gymOrgIdParamSchema = z.object({
  gymOrgId: z.string().uuid(),
});

export const gymAndClientUserIdParamSchema = gymOrgIdParamSchema.extend({
  clientUserId: z.string().uuid(),
});

export const gymAndSubscriptionIdParamSchema = gymOrgIdParamSchema.extend({
  subscriptionId: z.string().uuid(),
});

const calendarDateSchema = z.string().transform((value, context) => {
  try {
    return CalendarDate.create(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Calendar date is invalid',
    });
    return z.NEVER;
  }
});

const planPriceSchema = z.number().transform((value, context) => {
  try {
    return PlanPrice.create(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Amount paid is invalid',
    });
    return z.NEVER;
  }
});

export const updateSubscriptionPaymentSchema = z
  .object({
    paymentStatus: z.enum(PAYMENT_STATUSES),
    amountPaid: planPriceSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.paymentStatus === 'partial' && value.amountPaid === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amountPaid'],
        message: 'Partial payment requires amountPaid',
      });
    }
  });

export const overrideSubscriptionStartSchema = z.object({
  startDate: calendarDateSchema,
});

export const renewalsDueQuerySchema = z.object({
  onOrBefore: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  onOrAfter: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
