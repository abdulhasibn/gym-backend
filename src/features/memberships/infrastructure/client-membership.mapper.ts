import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { ClientMembership } from '../domain/client-membership.entity';
import { toMembershipId } from '../domain/membership-id';
import { toMembershipInviteId } from '../domain/membership-invite-id';
import { isMembershipStatus, type MembershipStatus } from '../domain/membership-status';
import { toTrainerProfileId } from '../domain/trainer-profile-id';

type ClientMembershipRow = Database['public']['Tables']['client_memberships']['Row'];
type ClientMembershipUpdate = Database['public']['Tables']['client_memberships']['Update'];

export function toClientMembership(row: ClientMembershipRow): ClientMembership {
  try {
    if (!isMembershipStatus(row.status)) {
      throw new Error('Stored membership status is invalid');
    }

    return ClientMembership.reconstitute({
      id: toMembershipId(row.id),
      clientUserId: toUserId(row.client_user_id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      status: row.status as MembershipStatus,
      checkInBlocked: row.check_in_blocked,
      assignedTrainerId:
        row.assigned_trainer_id === null ? null : toTrainerProfileId(row.assigned_trainer_id),
      sourceInviteId:
        row.source_invite_id === null ? null : toMembershipInviteId(row.source_invite_id),
      joinedAt: toValidDate(row.joined_at),
      leftAt: row.left_at === null ? null : toValidDate(row.left_at),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored client membership is invalid', { cause: error });
  }
}

export function toClientMembershipUpdate(membership: ClientMembership): ClientMembershipUpdate {
  return {
    status: membership.status,
    check_in_blocked: membership.checkInBlocked,
    assigned_trainer_id: membership.assignedTrainerId,
    left_at: membership.leftAt?.toISOString() ?? null,
    updated_at: membership.updatedAt.toISOString(),
  };
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}
