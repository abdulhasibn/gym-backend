import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../../shared/pagination/pagination';
import { DurationDays } from '../domain/duration-days.value-object';
import { PLAN_CAPABILITIES } from '../domain/plan-capability';
import { PLAN_KINDS } from '../domain/plan-kind';
import { PlanName } from '../domain/plan-name.value-object';
import { PlanPrice } from '../domain/plan-price.value-object';

const planNameSchema = z.string().transform((value, context) => {
  try {
    return PlanName.create(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Plan name is invalid',
    });
    return z.NEVER;
  }
});

const durationDaysSchema = z.number().transform((value, context) => {
  try {
    return DurationDays.create(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Duration days is invalid',
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
      message: error instanceof Error ? error.message : 'Plan price is invalid',
    });
    return z.NEVER;
  }
});

export const gymOrgIdParamSchema = z.object({
  gymOrgId: z.string().uuid(),
});

export const planIdParamSchema = z.object({
  planId: z.string().uuid(),
});

export const gymAndPlanIdParamSchema = gymOrgIdParamSchema.merge(planIdParamSchema);

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});

export const listMembershipPlansQuerySchema = paginationQuerySchema.extend({
  kind: z.enum(PLAN_KINDS).optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

export const createMembershipPlanSchema = z
  .object({
    name: planNameSchema,
    kind: z.enum(PLAN_KINDS),
    capability: z.enum(PLAN_CAPABILITIES).nullable().optional(),
    durationDays: durationDaysSchema,
    price: planPriceSchema,
  })
  .superRefine((value, context) => {
    const capability = value.capability ?? null;
    if (value.kind === 'BASE' && capability !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['capability'],
        message: 'BASE plans cannot have a capability',
      });
    }
    if (value.kind === 'ADDON' && capability === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['capability'],
        message: 'ADDON plans require a capability',
      });
    }
  })
  .transform((value) => ({
    name: value.name,
    kind: value.kind,
    capability: value.capability ?? null,
    durationDays: value.durationDays,
    price: value.price,
  }));

export const updateMembershipPlanSchema = z.object({
  name: planNameSchema,
  durationDays: durationDaysSchema,
  price: planPriceSchema,
  active: z.boolean(),
});
