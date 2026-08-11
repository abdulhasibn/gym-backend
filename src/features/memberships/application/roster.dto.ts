import type { ClientMembership } from '../domain/client-membership.entity';
import type { RosterMemberSummary } from '../domain/client-membership.queries';
import type { MembershipStatus } from '../domain/membership-status';
import type { PaymentStatus } from '../domain/payment-status';

export interface RosterMemberDto {
  readonly membershipId: string;
  readonly clientUserId: string;
  readonly gymOrgId: string;
  readonly status: MembershipStatus;
  readonly checkInBlocked: boolean;
  readonly assignedTrainerId: string | null;
  readonly clientName: string;
  readonly clientEmail: string;
  readonly clientPhone: string | null;
  readonly joinedAt: string;
  readonly leftAt: string | null;
  readonly basePaymentStatus: PaymentStatus | null;
  readonly baseAmountPaid: number | null;
  readonly basePriceAmount: number | null;
}

export interface MembershipMutationDto {
  readonly membershipId: string;
  readonly clientUserId: string;
  readonly gymOrgId: string;
  readonly status: MembershipStatus;
  readonly checkInBlocked: boolean;
  readonly assignedTrainerId: string | null;
  readonly joinedAt: string;
  readonly leftAt: string | null;
  readonly updatedAt: string;
}

export function toRosterMemberDto(summary: RosterMemberSummary): RosterMemberDto {
  return { ...summary };
}

export function toMembershipMutationDto(membership: ClientMembership): MembershipMutationDto {
  return {
    membershipId: membership.id,
    clientUserId: membership.clientUserId,
    gymOrgId: membership.gymOrgId,
    status: membership.status,
    checkInBlocked: membership.checkInBlocked,
    assignedTrainerId: membership.assignedTrainerId,
    joinedAt: membership.joinedAt.toISOString(),
    leftAt: membership.leftAt?.toISOString() ?? null,
    updatedAt: membership.updatedAt.toISOString(),
  };
}
