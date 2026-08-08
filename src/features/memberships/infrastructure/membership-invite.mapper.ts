import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { InviteeEmail } from '../domain/invitee-email.value-object';
import { InviteeName } from '../domain/invitee-name.value-object';
import { InviteePhone } from '../domain/invitee-phone.value-object';
import { MembershipInvite } from '../domain/membership-invite.entity';
import { toMembershipInviteId } from '../domain/membership-invite-id';
import {
  isMembershipInviteStatus,
  type MembershipInviteStatus,
} from '../domain/membership-invite-status';
import { toMembershipPlanId } from '../domain/membership-plan-id';
import { isPaymentStatus } from '../domain/payment-status';

type MembershipInviteRow = Database['public']['Tables']['membership_invites']['Row'];

export function toMembershipInvite(row: MembershipInviteRow): MembershipInvite {
  try {
    if (!isMembershipInviteStatus(row.status)) {
      throw new Error('Stored invite status is invalid');
    }
    if (!isPaymentStatus(row.base_payment_status)) {
      throw new Error('Stored base payment status is invalid');
    }
    if (row.addon_payment_status !== null && !isPaymentStatus(row.addon_payment_status)) {
      throw new Error('Stored addon payment status is invalid');
    }

    return MembershipInvite.reconstitute({
      id: toMembershipInviteId(row.id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      invitedEmail: InviteeEmail.create(row.invited_email),
      invitedUserId: row.invited_user_id === null ? null : toUserId(row.invited_user_id),
      inviteeName: InviteeName.create(row.invitee_name),
      inviteePhone: row.invitee_phone === null ? null : InviteePhone.create(row.invitee_phone),
      basePlanId: toMembershipPlanId(row.base_plan_id),
      basePaymentStatus: row.base_payment_status,
      addonPlanId: row.addon_plan_id === null ? null : toMembershipPlanId(row.addon_plan_id),
      addonPaymentStatus: row.addon_payment_status,
      status: row.status as MembershipInviteStatus,
      expiresAt: row.expires_at === null ? null : toValidDate(row.expires_at),
      createdBy: toUserId(row.created_by),
      acceptedAt: row.accepted_at === null ? null : toValidDate(row.accepted_at),
      acceptedMembershipId: row.accepted_membership_id,
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored membership invite is invalid', { cause: error });
  }
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}
