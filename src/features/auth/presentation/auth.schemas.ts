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
  // Supabase OTP length is project-configured (6–10). Strip paste noise.
  token: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .pipe(z.string().min(6).max(10)),
  // Required only on first provision; omit for returning sign-ins.
  lane: accountLaneSchema.optional(),
  name: nameSchema.optional(),
});

export const completeGoogleSchema = z.object({
  lane: accountLaneSchema,
  name: nameSchema.optional(),
});

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(1),
});
