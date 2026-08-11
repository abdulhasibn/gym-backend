import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { UserId } from '../../../../domain/shared/user-id';
import type { ClientMembership } from '../../domain/client-membership.entity';
import { ClientMembership as ClientMembershipEntity } from '../../domain/client-membership.entity';
import type {
  ClientMembershipQueries,
  ListAssignedMembersQuery,
  ListGymMembersQuery,
  RosterMemberSummary,
} from '../../domain/client-membership.queries';
import type { ClientMembershipRepository } from '../../domain/client-membership.repository';
import { toMembershipId, type MembershipId } from '../../domain/membership-id';
import type { MembershipInviteId } from '../../domain/membership-invite-id';
import type { PaymentStatus } from '../../domain/payment-status';

export class InMemoryClientMembershipStore
  implements ClientMembershipRepository, ClientMembershipQueries
{
  private readonly byId = new Map<string, ClientMembership>();
  private readonly activeByClientGym = new Map<string, MembershipId>();
  private readonly rosterMeta = new Map<
    string,
    {
      clientName: string;
      clientEmail: string;
      clientPhone: string | null;
      basePaymentStatus: PaymentStatus | null;
      baseAmountPaid: number | null;
      basePriceAmount: number | null;
    }
  >();
  private counter = 0;

  seedActive(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
    sourceInviteId?: MembershipInviteId,
  ): ClientMembership {
    this.counter += 1;
    const membership = ClientMembershipEntity.create({
      id: toMembershipId(`eeeeeeee-eeee-4eee-8eee-${String(this.counter).padStart(12, '0')}`),
      clientUserId,
      gymOrgId,
      sourceInviteId:
        sourceInviteId ??
        (`dddddddd-dddd-4ddd-8ddd-${String(this.counter).padStart(12, '0')}` as MembershipInviteId),
      now: new Date('2026-08-08T00:00:00.000Z'),
    });
    this.byId.set(membership.id, membership);
    this.activeByClientGym.set(`${clientUserId}:${gymOrgId}`, membership.id);
    this.rosterMeta.set(membership.id, {
      clientName: `Client ${this.counter}`,
      clientEmail: `client${this.counter}@example.com`,
      clientPhone: null,
      basePaymentStatus: 'unpaid',
      baseAmountPaid: 0,
      basePriceAmount: 1000,
    });
    return membership;
  }

  async findById(gymOrgId: GymOrgId, membershipId: MembershipId): Promise<ClientMembership | null> {
    const membership = this.byId.get(membershipId) ?? null;
    if (membership === null || membership.gymOrgId !== gymOrgId || membership.isDeleted) {
      return null;
    }
    return membership;
  }

  async findActiveByClientAtGym(
    clientUserId: UserId,
    gymOrgId: GymOrgId,
  ): Promise<ClientMembership | null> {
    const id = this.activeByClientGym.get(`${clientUserId}:${gymOrgId}`);
    if (id === undefined) {
      return null;
    }
    const membership = await this.findById(gymOrgId, id);
    if (membership === null || !membership.isActive) {
      return null;
    }
    return membership;
  }

  async save(membership: ClientMembership): Promise<void> {
    this.byId.set(membership.id, membership);
    const key = `${membership.clientUserId}:${membership.gymOrgId}`;
    if (membership.isActive) {
      this.activeByClientGym.set(key, membership.id);
    } else {
      this.activeByClientGym.delete(key);
    }
  }

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

  private list(input: {
    readonly gymOrgId: GymOrgId;
    readonly status: string | null;
    readonly assignedTrainerId: string | null;
    readonly q: string | null;
  }): RosterMemberSummary[] {
    const q = input.q?.trim().toLowerCase() ?? '';
    return [...this.byId.values()]
      .filter((m) => m.gymOrgId === input.gymOrgId && !m.isDeleted)
      .filter((m) => input.status === null || m.status === input.status)
      .filter(
        (m) => input.assignedTrainerId === null || m.assignedTrainerId === input.assignedTrainerId,
      )
      .map((m) => this.toSummary(m))
      .filter(
        (row) =>
          q.length === 0 ||
          row.clientName.toLowerCase().includes(q) ||
          row.clientEmail.toLowerCase().includes(q) ||
          (row.clientPhone !== null && row.clientPhone.toLowerCase().includes(q)),
      );
  }

  private toSummary(membership: ClientMembership): RosterMemberSummary {
    const meta = this.rosterMeta.get(membership.id) ?? {
      clientName: 'Unknown',
      clientEmail: 'unknown@example.com',
      clientPhone: null,
      basePaymentStatus: null,
      baseAmountPaid: null,
      basePriceAmount: null,
    };
    return {
      membershipId: membership.id,
      clientUserId: membership.clientUserId,
      gymOrgId: membership.gymOrgId,
      status: membership.status,
      checkInBlocked: membership.checkInBlocked,
      assignedTrainerId: membership.assignedTrainerId,
      clientName: meta.clientName,
      clientEmail: meta.clientEmail,
      clientPhone: meta.clientPhone,
      joinedAt: membership.joinedAt.toISOString(),
      leftAt: membership.leftAt?.toISOString() ?? null,
      basePaymentStatus: meta.basePaymentStatus,
      baseAmountPaid: meta.baseAmountPaid,
      basePriceAmount: meta.basePriceAmount,
    };
  }
}
