import { z } from 'zod';

import { AccountLane } from '../domain/account-lane.value-object';
import { EmailAddress } from '../domain/email-address.value-object';

const accountLaneSchema = z.string().transform((value, context) => {
  try {
    return AccountLane.create(value);
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'lane must be CLIENT or STAFF' });
    return z.NEVER;
  }
});

const emailSchema = z.string().transform((value, context) => {
  try {
    return EmailAddress.create(value);
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'email address is invalid' });
    return z.NEVER;
  }
});
const nameSchema = z.string().trim().min(1).max(120);

export const requestEmailOtpSchema = z.object({
  email: emailSchema,
});

export const verifyEmailOtpSchema = z.object({
  email: emailSchema,
  token: z.string().trim().min(6).max(12),
  lane: accountLaneSchema,
  name: nameSchema.optional(),
});

export const completeGoogleSchema = z.object({
  lane: accountLaneSchema,
  name: nameSchema.optional(),
});
