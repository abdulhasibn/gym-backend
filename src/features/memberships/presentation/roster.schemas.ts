import { z } from 'zod';

import { MEMBERSHIP_STATUSES } from '../domain/membership-status';

export const gymOrgIdParamSchema = z.object({
  gymOrgId: z.string().uuid(),
});

export const gymAndMembershipIdParamSchema = gymOrgIdParamSchema.extend({
  membershipId: z.string().uuid(),
});

export const listGymMembersQuerySchema = z.object({
  status: z.enum(MEMBERSHIP_STATUSES).default('ACTIVE'),
  q: z.string().trim().min(1).max(255).optional(),
});

export const listAssignedMembersQuerySchema = z.object({
  status: z.enum(MEMBERSHIP_STATUSES).optional(),
  q: z.string().trim().min(1).max(255).optional(),
});

export const assignTrainerBodySchema = z.object({
  trainerProfileId: z.string().uuid(),
});

export const checkInBlockBodySchema = z.object({
  blocked: z.boolean(),
});
