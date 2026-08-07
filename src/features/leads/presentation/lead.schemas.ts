import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../../shared/pagination/pagination';
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
  source: optionalText(255),
  interest: optionalText(2000),
  notes: optionalText(5000),
});

export const updateLeadSchema = z.object({
  name: leadNameSchema,
  phone: leadPhoneSchema,
  source: optionalText(255),
  interest: optionalText(2000),
  notes: optionalText(5000),
  followUpDate: followUpDateSchema,
});

export const changeLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});
