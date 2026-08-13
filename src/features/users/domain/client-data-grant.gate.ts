import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';

export const PROFILE_ATTRIBUTE_GRANTS = [
  'DOB',
  'HEIGHT',
  'WEIGHT',
  'GENDER',
  'MEDICAL_NOTES',
] as const;

export type ProfileAttributeGrant = (typeof PROFILE_ATTRIBUTE_GRANTS)[number];

export interface ClientDataGrantSnapshot {
  readonly profileAttributes: readonly ProfileAttributeGrant[];
  readonly classGrants: readonly string[];
}

/**
 * Feature-local grant gate (wired to memberships DataGrantQueries at composition-root).
 */
export interface ClientDataGrantGate {
  loadForActiveMembership(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<ClientDataGrantSnapshot | null>;
}
