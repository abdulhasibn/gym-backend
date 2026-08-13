import type { ClientProfileSummary } from '../domain/client-profile.queries';
import type {
  ClientDataGrantSnapshot,
  ProfileAttributeGrant,
} from '../domain/client-data-grant.gate';
import type { ClientProfileDto } from './users.dto';

/**
 * Filter Client-owned profile fields to those granted for (client, gym).
 * BMI only when HEIGHT and WEIGHT both granted.
 */
export function filterProfileByGrants(
  summary: ClientProfileSummary,
  grants: ClientDataGrantSnapshot,
): ClientProfileDto {
  const attrs = new Set<ProfileAttributeGrant>(grants.profileAttributes);
  const heightCm = attrs.has('HEIGHT') ? summary.heightCm : null;
  const weightKg = attrs.has('WEIGHT') ? summary.weightKg : null;
  const bmi = attrs.has('HEIGHT') && attrs.has('WEIGHT') ? summary.bmi : null;

  return {
    userId: summary.userId,
    heightCm,
    weightKg,
    dob: attrs.has('DOB') ? summary.dob : null,
    gender: attrs.has('GENDER') ? summary.gender : null,
    medicalNotes: attrs.has('MEDICAL_NOTES') ? summary.medicalNotes : null,
    bmi,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export function hasProgressGrant(grants: ClientDataGrantSnapshot): boolean {
  return grants.classGrants.includes('PROGRESS');
}
