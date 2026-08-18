import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';

export interface CreateMembershipInviteFromLeadCommand {
  readonly gymOrgId: GymOrgId;
  readonly inviteeName: string;
  readonly invitedEmail: string;
  readonly inviteePhone: string;
  readonly basePlanId: string;
  readonly basePaymentStatus: string;
  readonly addonPlanId: string | null;
  readonly addonPaymentStatus: string | null;
  readonly expiresAt?: Date;
}

export interface CreatedMembershipInviteFromLead {
  readonly id: string;
  readonly gymOrgId: string;
  readonly invitedEmail: string;
  readonly invitedUserId: string | null;
  readonly inviteeName: string;
  readonly inviteePhone: string | null;
  readonly basePlanId: string;
  readonly basePaymentStatus: string;
  readonly addonPlanId: string | null;
  readonly addonPaymentStatus: string | null;
  readonly status: string;
  readonly expiresAt: string | null;
  readonly createdBy: string;
  readonly acceptedAt: string | null;
  readonly acceptedMembershipId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateMembershipInviteFromLead {
  execute(
    actor: AuthenticatedActor,
    command: CreateMembershipInviteFromLeadCommand,
  ): Promise<CreatedMembershipInviteFromLead>;
}
