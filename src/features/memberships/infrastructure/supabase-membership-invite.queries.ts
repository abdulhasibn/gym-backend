import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import { toPage } from '../../../shared/pagination/pagination';
import { toMembershipId } from '../domain/membership-id';
import { toMembershipInviteId } from '../domain/membership-invite-id';
import type {
  MembershipInviteGymSummary,
  MembershipInviteInboxItem,
  MembershipInviteQueries,
  MembershipInviteSummary,
} from '../domain/membership-invite.queries';
import type { MembershipInviteStatus } from '../domain/membership-invite-status';
import { toMembershipPlanId } from '../domain/membership-plan-id';
import type { PaymentStatus } from '../domain/payment-status';

type MembershipInviteRow = Database['public']['Tables']['membership_invites']['Row'];

type GymOrgEmbedRow = {
  id: string;
  name: string;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  logo_url: string | null;
  timezone: string;
};

type MembershipInviteInboxRow = MembershipInviteRow & {
  gym_orgs: GymOrgEmbedRow | GymOrgEmbedRow[] | null;
};

export class SupabaseMembershipInviteQueries implements MembershipInviteQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForGym(gymOrgId: GymOrgId, page: Pagination): Promise<Page<MembershipInviteSummary>> {
    const now = new Date();
    const { data, error, count } = await this.client
      .from('membership_invites')
      .select('*', { count: 'exact' })
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(page.offset, page.offset + page.limit - 1);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list membership invites', {
        cause: error,
      });
    }

    return toPage(
      (data ?? []).map((row) => toSummary(row, now)),
      count ?? 0,
      page,
    );
  }

  async listInboxForUser(
    userId: UserId,
    email: string,
    page: Pagination,
  ): Promise<Page<MembershipInviteInboxItem>> {
    const now = new Date();
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error, count } = await this.client
      .from('membership_invites')
      .select(
        '*, gym_orgs!inner ( id, name, address, contact_phone, contact_email, logo_url, timezone )',
        { count: 'exact' },
      )
      .or(
        `invited_user_id.eq.${userId},and(invited_user_id.is.null,invited_email.eq."${normalizedEmail}")`,
      )
      .is('deleted_at', null)
      .is('gym_orgs.deleted_at', null)
      .order('created_at', { ascending: false })
      .range(page.offset, page.offset + page.limit - 1);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list membership invite inbox', {
        cause: error,
      });
    }

    return toPage(
      ((data ?? []) as MembershipInviteInboxRow[]).map((row) => toInboxItem(row, now)),
      count ?? 0,
      page,
    );
  }
}

function toSummary(row: MembershipInviteRow, now: Date): MembershipInviteSummary {
  return {
    id: toMembershipInviteId(row.id),
    gymOrgId: toGymOrgId(row.gym_org_id),
    invitedEmail: row.invited_email,
    invitedUserId: row.invited_user_id === null ? null : toUserId(row.invited_user_id),
    inviteeName: row.invitee_name,
    inviteePhone: row.invitee_phone,
    basePlanId: toMembershipPlanId(row.base_plan_id),
    basePaymentStatus: row.base_payment_status as PaymentStatus,
    addonPlanId: row.addon_plan_id === null ? null : toMembershipPlanId(row.addon_plan_id),
    addonPaymentStatus: row.addon_payment_status as PaymentStatus | null,
    status: effectiveStatus(row.status as MembershipInviteStatus, row.expires_at, now),
    expiresAt: row.expires_at,
    createdBy: toUserId(row.created_by),
    acceptedAt: row.accepted_at,
    acceptedMembershipId:
      row.accepted_membership_id === null ? null : toMembershipId(row.accepted_membership_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInboxItem(row: MembershipInviteInboxRow, now: Date): MembershipInviteInboxItem {
  return {
    ...toSummary(row, now),
    gym: toGymSummary(row.gym_orgs),
  };
}

function toGymSummary(embed: GymOrgEmbedRow | GymOrgEmbedRow[] | null): MembershipInviteGymSummary {
  const row = Array.isArray(embed) ? (embed[0] ?? null) : embed;
  if (row === null) {
    throw new TransientDatabaseFailureError('Membership invite inbox missing gym profile');
  }

  return {
    id: toGymOrgId(row.id),
    name: row.name,
    address: row.address,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    logoUrl: row.logo_url,
    timezone: row.timezone,
  };
}

function effectiveStatus(
  status: MembershipInviteStatus,
  expiresAt: string | null,
  now: Date,
): MembershipInviteStatus {
  if (status !== 'PENDING' || expiresAt === null) {
    return status;
  }
  const expiry = new Date(expiresAt);
  if (!Number.isNaN(expiry.getTime()) && expiry.getTime() <= now.getTime()) {
    return 'EXPIRED';
  }
  return status;
}
