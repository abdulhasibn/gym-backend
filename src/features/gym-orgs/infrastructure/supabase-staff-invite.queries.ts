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
import type {
  StaffInviteGymSummary,
  StaffInviteInboxItem,
  StaffInviteQueries,
  StaffInviteSummary,
} from '../domain/staff-invite.queries';
import type { StaffInviteStatus } from '../domain/staff-invite-status';
import type { StaffInviteTargetRole } from '../domain/staff-invite-target-role';

type StaffInviteRow = Database['public']['Tables']['staff_invites']['Row'];

type GymOrgEmbedRow = {
  id: string;
  name: string;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  logo_url: string | null;
  timezone: string;
};

type StaffInviteInboxRow = StaffInviteRow & {
  gym_orgs: GymOrgEmbedRow | GymOrgEmbedRow[] | null;
};

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

  async listInboxForUser(userId: UserId, page: Pagination): Promise<Page<StaffInviteInboxItem>> {
    const now = new Date();
    const { data, error, count } = await this.client
      .from('staff_invites')
      .select(
        '*, gym_orgs!inner ( id, name, address, contact_phone, contact_email, logo_url, timezone )',
        { count: 'exact' },
      )
      .eq('invited_user_id', userId)
      .is('deleted_at', null)
      .is('gym_orgs.deleted_at', null)
      .order('created_at', { ascending: false })
      .range(page.offset, page.offset + page.limit - 1);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list staff invite inbox', {
        cause: error,
      });
    }

    return toPage(
      ((data ?? []) as StaffInviteInboxRow[]).map((row) => toInboxItem(row, now)),
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

function toInboxItem(row: StaffInviteInboxRow, now: Date): StaffInviteInboxItem {
  return {
    ...toSummary(row, now),
    gym: toGymSummary(row.gym_orgs),
  };
}

function toGymSummary(embed: GymOrgEmbedRow | GymOrgEmbedRow[] | null): StaffInviteGymSummary {
  const gym = Array.isArray(embed) ? (embed[0] ?? null) : embed;
  if (gym === null) {
    throw new TransientDatabaseFailureError('Staff invite inbox row missing gym_orgs embed');
  }

  return {
    id: toGymOrgId(gym.id),
    name: gym.name,
    address: gym.address,
    contactPhone: gym.contact_phone,
    contactEmail: gym.contact_email,
    logoUrl: gym.logo_url,
    timezone: gym.timezone,
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
