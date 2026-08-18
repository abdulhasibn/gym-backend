import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../../shared/pagination/pagination';
import { LEAD_CONVERT_PAYMENT_STATUSES } from '../application/convert-lead.use-case';
import { LeadEmail } from '../domain/lead-email.value-object';
import { LeadName } from '../domain/lead-name.value-object';
import { LeadPhone } from '../domain/lead-phone.value-object';
import { LEAD_STATUSES } from '../domain/lead-status';

const leadNameSchema = z.string().transform((value, context) => {
  try {
    return LeadName.create(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Lead name is invalid',
    });
    return z.NEVER;
  }
});

const leadPhoneSchema = z.string().transform((value, context) => {
  try {
    return LeadPhone.create(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Lead phone is invalid',
    });
    return z.NEVER;
  }
});

const leadEmailValueSchema = z.string().transform((value, context) => {
  try {
    return LeadEmail.create(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Lead email is invalid',
    });
    return z.NEVER;
  }
});

function optionalText(max: number) {
  return z
    .union([z.string().max(max), z.null()])
    .optional()
    .transform((value) => value ?? null);
}

const followUpDateSchema = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Follow-up date must be YYYY-MM-DD'), z.null()])
  .optional()
  .transform((value) => (value === undefined ? undefined : value));

const createLeadEmailSchema = z
  .union([leadEmailValueSchema, z.null()])
  .optional()
  .transform((value) => value ?? null);

const updateLeadEmailSchema = z
  .union([leadEmailValueSchema, z.null()])
  .optional()
  .transform((value) => (value === undefined ? undefined : value));

export const gymOrgIdParamSchema = z.object({
  gymOrgId: z.string().uuid(),
});

export const leadIdParamSchema = z.object({
  leadId: z.string().uuid(),
});

export const gymAndLeadIdParamSchema = gymOrgIdParamSchema.merge(leadIdParamSchema);

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});

export const listLeadsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(LEAD_STATUSES).optional(),
});

export const dueFollowUpsQuerySchema = paginationQuerySchema.extend({
  onOrBefore: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'onOrBefore must be YYYY-MM-DD')
    .optional(),
});

export const createLeadSchema = z.object({
  name: leadNameSchema,
  phone: leadPhoneSchema,
  email: createLeadEmailSchema,
  source: optionalText(255),
  interest: optionalText(2000),
  notes: optionalText(5000),
});

export const updateLeadSchema = z.object({
  name: leadNameSchema,
  phone: leadPhoneSchema,
  email: updateLeadEmailSchema,
  source: optionalText(255),
  interest: optionalText(2000),
  notes: optionalText(5000),
  followUpDate: followUpDateSchema,
});

export const changeLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

export const convertLeadSchema = z
  .object({
    invitedEmail: leadEmailValueSchema.optional(),
    basePlanId: z.string().uuid(),
    basePaymentStatus: z.enum(LEAD_CONVERT_PAYMENT_STATUSES),
    addonPlanId: z.string().uuid().optional(),
    addonPaymentStatus: z.enum(LEAD_CONVERT_PAYMENT_STATUSES).optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .superRefine((value, context) => {
    const hasAddonPlan = value.addonPlanId !== undefined;
    const hasAddonPayment = value.addonPaymentStatus !== undefined;
    if (hasAddonPlan !== hasAddonPayment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasAddonPlan ? ['addonPaymentStatus'] : ['addonPlanId'],
        message: 'Addon plan and addon payment status must both be set or both be omitted',
      });
    }
  })
  .transform((value) => ({
    invitedEmail: value.invitedEmail,
    basePlanId: value.basePlanId,
    basePaymentStatus: value.basePaymentStatus,
    addonPlanId: value.addonPlanId ?? null,
    addonPaymentStatus: value.addonPaymentStatus ?? null,
    expiresAt: value.expiresAt,
  }));
