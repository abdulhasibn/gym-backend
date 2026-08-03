import { z } from 'zod';

import { GymOrgName } from '../domain/gym-org-name.value-object';
import { IanaTimezone } from '../domain/iana-timezone.value-object';

const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value === '' ? null : value;

const optionalText = (maxLength: number) =>
  z
    .union([z.string().trim().max(maxLength), z.null()])
    .optional()
    .transform(emptyToNull);

const optionalEmail = z
  .union([z.string().trim().email().max(255), z.null()])
  .optional()
  .transform(emptyToNull);

const optionalUrl = z
  .union([z.string().trim().url().max(2048), z.null()])
  .optional()
  .transform(emptyToNull);

const gymOrgNameSchema = z.string().transform((value, context) => {
  try {
    return GymOrgName.create(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Gym organization name is invalid',
    });
    return z.NEVER;
  }
});

const timezoneSchema = z
  .string()
  .default('Asia/Kolkata')
  .transform((value, context) => {
    try {
      return IanaTimezone.create(value);
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : 'Timezone is invalid',
      });
      return z.NEVER;
    }
  });

export const createGymOrgSchema = z.object({
  name: gymOrgNameSchema,
  address: optionalText(2000),
  contactPhone: optionalText(50),
  contactEmail: optionalEmail,
  logoUrl: optionalUrl,
  timezone: timezoneSchema,
});
