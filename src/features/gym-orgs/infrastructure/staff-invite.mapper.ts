import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { toGymOrgId } from '../domain/gym-org-id';
import { StaffInvite } from '../domain/staff-invite.entity';
import { toStaffInviteId } from '../domain/staff-invite-id';
import type { StaffInviteStatus } from '../domain/staff-invite-status';
import type { StaffInviteTargetRole } from '../domain/staff-invite-target-role';

type StaffInviteRow = Database['public']['Tables']['staff_invites']['Row'];

export function toStaffInvite(row: StaffInviteRow): StaffInvite {
  try {
    return StaffInvite.reconstitute({
      id: toStaffInviteId(row.id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      invitedUserId: toUserId(row.invited_user_id),
      targetRole: row.target_role as StaffInviteTargetRole,
      status: row.status as StaffInviteStatus,
      expiresAt: row.expires_at === null ? null : toValidDate(row.expires_at),
      createdBy: toUserId(row.created_by),
      acceptedAt: row.accepted_at === null ? null : toValidDate(row.accepted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored staff invite is invalid', { cause: error });
  }
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}
