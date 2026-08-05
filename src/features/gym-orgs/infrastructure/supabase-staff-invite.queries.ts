import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { UserId } from '../../../domain/shared/user-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import { toPage } from '../../../shared/pagination/pagination';
import { toGymOrgId } from '../domain/gym-org-id';
import type { GymOrgId } from '../domain/gym-org-id';
import { toStaffInviteId } from '../domain/staff-invite-id';
import type { StaffInviteQueries, StaffInviteSummary } from '../domain/staff-invite.queries';
import type { StaffInviteStatus } from '../domain/staff-invite-status';
import type { StaffInviteTargetRole } from '../domain/staff-invite-target-role';

type StaffInviteRow = Database['public']['Tables']['staff_invites']['Row'];

export class SupabaseStaffInviteQueries implements StaffInviteQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForGym(gymOrgId: GymOrgId, page: Pagination): Promise<Page<StaffInviteSummary>> {
    const now = new Date();
    const { data, error, count } = await this.client
      .from('staff_invites')
      .select('*', { count: 'exact' })
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(page.offset, page.offset + page.limit - 1);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list gym staff invites', {
        cause: error,
      });
    }

    return toPage(
      (data ?? []).map((row) => toSummary(row, now)),
      count ?? 0,
      page,
    );
  }

  async listInboxForUser(userId: UserId, page: Pagination): Promise<Page<StaffInviteSummary>> {
    const now = new Date();
    const { data, error, count } = await this.client
      .from('staff_invites')
      .select('*', { count: 'exact' })
      .eq('invited_user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(page.offset, page.offset + page.limit - 1);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list staff invite inbox', {
        cause: error,
      });
    }

    return toPage(
      (data ?? []).map((row) => toSummary(row, now)),
      count ?? 0,
      page,
    );
  }
}

function toSummary(row: StaffInviteRow, now: Date): StaffInviteSummary {
  const status = effectiveStatus(row.status as StaffInviteStatus, row.expires_at, now);

  return {
    id: toStaffInviteId(row.id),
    gymOrgId: toGymOrgId(row.gym_org_id),
    invitedUserId: toUserId(row.invited_user_id),
    targetRole: row.target_role as StaffInviteTargetRole,
    status,
    expiresAt: row.expires_at,
    createdBy: toUserId(row.created_by),
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function effectiveStatus(
  status: StaffInviteStatus,
  expiresAt: string | null,
  now: Date,
): StaffInviteStatus {
  if (status !== 'PENDING' || expiresAt === null) {
    return status;
  }
  const expiry = new Date(expiresAt);
  if (!Number.isNaN(expiry.getTime()) && expiry.getTime() <= now.getTime()) {
    return 'EXPIRED';
  }
  return status;
}
