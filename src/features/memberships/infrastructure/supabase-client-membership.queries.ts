import type { SupabaseClient } from '@supabase/supabase-js';

import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type {
  ClientMembershipQueries,
  ListAssignedMembersQuery,
  ListGymMembersQuery,
  RosterMemberSummary,
} from '../domain/client-membership.queries';
import { isMembershipStatus, type MembershipStatus } from '../domain/membership-status';
import { isPaymentStatus } from '../domain/payment-status';

type MembershipRow = Database['public']['Tables']['client_memberships']['Row'];
type UserEmbed = Pick<Database['public']['Tables']['users']['Row'], 'name' | 'email' | 'phone'>;
type SubscriptionEmbed = Pick<
  Database['public']['Tables']['subscriptions']['Row'],
  'kind' | 'payment_status' | 'amount_paid' | 'price_amount' | 'deleted_at'
>;

interface RosterRow extends MembershipRow {
  users: UserEmbed | UserEmbed[] | null;
  subscriptions: SubscriptionEmbed[] | null;
}

export class SupabaseClientMembershipQueries implements ClientMembershipQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForGym(query: ListGymMembersQuery): Promise<readonly RosterMemberSummary[]> {
    return this.list({
      gymOrgId: query.gymOrgId,
      status: query.status,
      assignedTrainerId: null,
      q: query.q,
    });
  }

  async listAssigned(query: ListAssignedMembersQuery): Promise<readonly RosterMemberSummary[]> {
    return this.list({
      gymOrgId: query.gymOrgId,
      status: query.status,
      assignedTrainerId: query.assignedTrainerId,
      q: query.q,
    });
  }

  private async list(input: {
    readonly gymOrgId: string;
    readonly status: MembershipStatus | null;
    readonly assignedTrainerId: string | null;
    readonly q: string | null;
  }): Promise<readonly RosterMemberSummary[]> {
    let builder = this.client
      .from('client_memberships')
      .select(
        `
        *,
        users!client_memberships_client_user_id_fkey ( name, email, phone ),
        subscriptions!subscriptions_client_membership_id_fkey (
          kind, payment_status, amount_paid, price_amount, deleted_at
        )
      `,
      )
      .eq('gym_org_id', input.gymOrgId)
      .is('deleted_at', null)
      .order('joined_at', { ascending: false });

    if (input.status !== null) {
      builder = builder.eq('status', input.status);
    }
    if (input.assignedTrainerId !== null) {
      builder = builder.eq('assigned_trainer_id', input.assignedTrainerId);
    }

    const { data, error } = await builder;

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list gym members', { cause: error });
    }

    const rows = (data ?? []) as unknown as RosterRow[];
    const mapped = rows.map((row) => toRosterMemberSummary(row));

    const q = input.q?.trim().toLowerCase() ?? '';
    if (q.length === 0) {
      return mapped;
    }

    return mapped.filter(
      (member) =>
        member.clientName.toLowerCase().includes(q) ||
        member.clientEmail.toLowerCase().includes(q) ||
        (member.clientPhone !== null && member.clientPhone.toLowerCase().includes(q)),
    );
  }
}

function toRosterMemberSummary(row: RosterRow): RosterMemberSummary {
  if (!isMembershipStatus(row.status)) {
    throw new DataIntegrityError('Stored membership status is invalid');
  }

  const user = Array.isArray(row.users) ? (row.users[0] ?? null) : row.users;
  if (user === null) {
    throw new DataIntegrityError('Roster membership is missing client user');
  }

  const subscriptions = (row.subscriptions ?? []).filter((s) => s.deleted_at === null);
  const base = subscriptions.find((s) => s.kind === 'BASE') ?? null;
  if (base !== null && !isPaymentStatus(base.payment_status)) {
    throw new DataIntegrityError('Stored base payment status is invalid');
  }

  return {
    membershipId: row.id,
    clientUserId: row.client_user_id,
    gymOrgId: row.gym_org_id,
    status: row.status,
    checkInBlocked: row.check_in_blocked,
    assignedTrainerId: row.assigned_trainer_id,
    clientName: user.name,
    clientEmail: user.email,
    clientPhone: user.phone,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    basePaymentStatus: base?.payment_status ?? null,
    baseAmountPaid: base === null ? null : Number(base.amount_paid),
    basePriceAmount: base === null ? null : Number(base.price_amount),
  };
}
