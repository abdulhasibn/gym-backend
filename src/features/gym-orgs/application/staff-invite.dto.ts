import type { StaffInvite } from '../domain/staff-invite.entity';
import type { StaffInviteInboxItem, StaffInviteSummary } from '../domain/staff-invite.queries';
import type { StaffInviteDto, StaffInviteInboxItemDto } from './gym-org.dto';

export function toStaffInviteDto(invite: StaffInvite): StaffInviteDto {
  return {
    id: invite.id,
    gymOrgId: invite.gymOrgId,
    invitedUserId: invite.invitedUserId,
    targetRole: invite.targetRole,
    status: invite.status,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    createdBy: invite.createdBy,
    acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString(),
  };
}

export function toStaffInviteDtoFromSummary(summary: StaffInviteSummary): StaffInviteDto {
  return {
    id: summary.id,
    gymOrgId: summary.gymOrgId,
    invitedUserId: summary.invitedUserId,
    targetRole: summary.targetRole,
    status: summary.status,
    expiresAt: summary.expiresAt,
    createdBy: summary.createdBy,
    acceptedAt: summary.acceptedAt,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export function toStaffInviteInboxItemDto(item: StaffInviteInboxItem): StaffInviteInboxItemDto {
  return {
    ...toStaffInviteDtoFromSummary(item),
    gym: {
      id: item.gym.id,
      name: item.gym.name,
      address: item.gym.address,
      contactPhone: item.gym.contactPhone,
      contactEmail: item.gym.contactEmail,
      logoUrl: item.gym.logoUrl,
      timezone: item.gym.timezone,
    },
  };
}
