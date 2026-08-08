import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../../shared/pagination/pagination';
import { DATA_GRANT_CLASSES, isDataGrantClass } from '../domain/data-grant-class';
import { InviteeEmail } from '../domain/invitee-email.value-object';
import { InviteeName } from '../domain/invitee-name.value-object';
import { InviteePhone } from '../domain/invitee-phone.value-object';
import { PAYMENT_STATUSES } from '../domain/payment-status';
import {
  isOptionalProfileAttribute,
  OPTIONAL_PROFILE_ATTRIBUTES,
} from '../domain/profile-attribute';

const inviteeNameSchema = z.string().transform((value, context) => {
  try {
    return InviteeName.create(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Invitee name is invalid',
    });
    return z.NEVER;
  }
});

const inviteeEmailSchema = z.string().transform((value, context) => {
  try {
    return InviteeEmail.create(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Invitee email is invalid',
    });
    return z.NEVER;
  }
});

const inviteePhoneSchema = z.string().transform((value, context) => {
  try {
    return InviteePhone.create(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Invitee phone is invalid',
    });
    return z.NEVER;
  }
});

export const gymOrgIdParamSchema = z.object({
  gymOrgId: z.string().uuid(),
});

export const inviteIdParamSchema = z.object({
  inviteId: z.string().uuid(),
});

export const gymAndInviteIdParamSchema = gymOrgIdParamSchema.merge(inviteIdParamSchema);

export const listMembershipInvitesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createMembershipInviteSchema = z
  .object({
    inviteeName: inviteeNameSchema,
    invitedEmail: inviteeEmailSchema,
    inviteePhone: inviteePhoneSchema.optional(),
    basePlanId: z.string().uuid(),
    basePaymentStatus: z.enum(PAYMENT_STATUSES),
    addonPlanId: z.string().uuid().optional(),
    addonPaymentStatus: z.enum(PAYMENT_STATUSES).optional(),
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
    inviteeName: value.inviteeName,
    invitedEmail: value.invitedEmail,
    inviteePhone: value.inviteePhone ?? null,
    basePlanId: value.basePlanId,
    basePaymentStatus: value.basePaymentStatus,
    addonPlanId: value.addonPlanId ?? null,
    addonPaymentStatus: value.addonPaymentStatus ?? null,
    expiresAt: value.expiresAt,
  }));

const optionalProfileAttributesSchema = z
  .array(z.enum(OPTIONAL_PROFILE_ATTRIBUTES))
  .default([])
  .transform((values, context) => {
    const unique = [...new Set(values)];
    for (const value of unique) {
      if (!isOptionalProfileAttribute(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid optional profile attribute: ${value}`,
        });
        return z.NEVER;
      }
    }
    return unique;
  });

const optionalClassGrantsSchema = z
  .array(z.enum(DATA_GRANT_CLASSES))
  .default([])
  .transform((values, context) => {
    const unique = [...new Set(values)];
    for (const value of unique) {
      if (!isDataGrantClass(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid class grant: ${value}`,
        });
        return z.NEVER;
      }
    }
    return unique;
  });

export const acceptMembershipInviteSchema = z.object({
  optionalProfileAttributes: optionalProfileAttributesSchema,
  optionalClassGrants: optionalClassGrantsSchema,
});

export const updateMyDataGrantsSchema = z.object({
  optionalProfileAttributes: optionalProfileAttributesSchema,
  optionalClassGrants: optionalClassGrantsSchema,
});
