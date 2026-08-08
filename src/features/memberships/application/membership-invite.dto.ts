import type { MembershipInvite } from '../domain/membership-invite.entity';
import type { MembershipInviteSummary } from '../domain/membership-invite.queries';
import type { MembershipInviteStatus } from '../domain/membership-invite-status';
import type { PaymentStatus } from '../domain/payment-status';

export interface MembershipInviteDto {
  readonly id: string;
  readonly gymOrgId: string;
  readonly invitedEmail: string;
  readonly invitedUserId: string | null;
  readonly inviteeName: string;
  readonly inviteePhone: string | null;
  readonly basePlanId: string;
  readonly basePaymentStatus: PaymentStatus;
  readonly addonPlanId: string | null;
  readonly addonPaymentStatus: PaymentStatus | null;
  readonly status: MembershipInviteStatus;
  readonly expiresAt: string | null;
  readonly createdBy: string;
  readonly acceptedAt: string | null;
  readonly acceptedMembershipId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toMembershipInviteDto(invite: MembershipInvite): MembershipInviteDto {
  return {
    id: invite.id,
    gymOrgId: invite.gymOrgId,
    invitedEmail: invite.invitedEmail.value,
    invitedUserId: invite.invitedUserId,
    inviteeName: invite.inviteeName.value,
    inviteePhone: invite.inviteePhone?.value ?? null,
    basePlanId: invite.basePlanId,
    basePaymentStatus: invite.basePaymentStatus,
    addonPlanId: invite.addonPlanId,
    addonPaymentStatus: invite.addonPaymentStatus,
    status: invite.status,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    createdBy: invite.createdBy,
    acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    acceptedMembershipId: invite.acceptedMembershipId,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString(),
  };
}

export function toMembershipInviteDtoFromSummary(
  summary: MembershipInviteSummary,
): MembershipInviteDto {
  return {
    id: summary.id,
    gymOrgId: summary.gymOrgId,
    invitedEmail: summary.invitedEmail,
    invitedUserId: summary.invitedUserId,
    inviteeName: summary.inviteeName,
    inviteePhone: summary.inviteePhone,
    basePlanId: summary.basePlanId,
    basePaymentStatus: summary.basePaymentStatus,
    addonPlanId: summary.addonPlanId,
    addonPaymentStatus: summary.addonPaymentStatus,
    status: summary.status,
    expiresAt: summary.expiresAt,
    createdBy: summary.createdBy,
    acceptedAt: summary.acceptedAt,
    acceptedMembershipId: summary.acceptedMembershipId,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}
