import type { GymOrg } from '../domain/gym-org.entity';
import type { GymOrgSummary } from '../domain/gym-org.queries';

export interface GymOrgDto {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly contactPhone: string | null;
  readonly contactEmail: string | null;
  readonly logoUrl: string | null;
  readonly timezone: string;
  readonly ownerUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GymOrgSummaryDto {
  readonly id: string;
  readonly name: string;
  readonly timezone: string;
  readonly isOwner: boolean;
}

export interface StaffInviteDto {
  readonly id: string;
  readonly gymOrgId: string;
  readonly invitedUserId: string;
  readonly targetRole: string;
  readonly status: string;
  readonly expiresAt: string | null;
  readonly createdBy: string;
  readonly acceptedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StaffInviteGymDto {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly contactPhone: string | null;
  readonly contactEmail: string | null;
  readonly logoUrl: string | null;
  readonly timezone: string;
}

export interface StaffInviteInboxItemDto extends StaffInviteDto {
  readonly gym: StaffInviteGymDto;
}

export function toGymOrgDto(gymOrg: GymOrg): GymOrgDto {
  return {
    id: gymOrg.id,
    name: gymOrg.name.value,
    address: gymOrg.address,
    contactPhone: gymOrg.contactPhone,
    contactEmail: gymOrg.contactEmail,
    logoUrl: gymOrg.logoUrl,
    timezone: gymOrg.timezone.value,
    ownerUserId: gymOrg.ownerUserId,
    createdAt: gymOrg.createdAt.toISOString(),
    updatedAt: gymOrg.updatedAt.toISOString(),
  };
}

export function toGymOrgSummaryDto(summary: GymOrgSummary): GymOrgSummaryDto {
  return {
    id: summary.id,
    name: summary.name,
    timezone: summary.timezone,
    isOwner: summary.isOwner,
  };
}
