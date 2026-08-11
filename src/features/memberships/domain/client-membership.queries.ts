import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { MembershipStatus } from './membership-status';
import type { PaymentStatus } from './payment-status';
import type { TrainerProfileId } from './trainer-profile-id';

export interface RosterMemberSummary {
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

export interface ListGymMembersQuery {
  readonly gymOrgId: GymOrgId;
  readonly status: MembershipStatus;
  readonly q: string | null;
}

export interface ListAssignedMembersQuery {
  readonly gymOrgId: GymOrgId;
  readonly assignedTrainerId: TrainerProfileId;
  readonly status: MembershipStatus | null;
  readonly q: string | null;
}

export interface ClientMembershipQueries {
  listForGym(query: ListGymMembersQuery): Promise<readonly RosterMemberSummary[]>;

  listAssigned(query: ListAssignedMembersQuery): Promise<readonly RosterMemberSummary[]>;
}
