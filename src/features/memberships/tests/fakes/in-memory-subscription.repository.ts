import type { GymOrgId } from '../../../../domain/shared/gym-org-id';
import type { UserId } from '../../../../domain/shared/user-id';
import { toSubscriptionDto } from '../../application/subscription.dto';
import type { CalendarDate } from '../../../../domain/shared/calendar-date.value-object';
import type { MembershipId } from '../../domain/membership-id';
import type { Subscription } from '../../domain/subscription.entity';
import type { SubscriptionId } from '../../domain/subscription-id';
import type { SubscriptionQueries, SubscriptionSummary } from '../../domain/subscription.queries';
import type { SubscriptionRepository } from '../../domain/subscription.repository';

export class InMemorySubscriptionStore implements SubscriptionRepository, SubscriptionQueries {
  private readonly byId = new Map<string, Subscription>();
  private readonly membershipByClientGym = new Map<string, MembershipId>();

  seed(subscription: Subscription, clientUserId?: UserId): void {
    this.byId.set(subscription.id, subscription);
    if (clientUserId !== undefined) {
      this.membershipByClientGym.set(
        `${clientUserId}:${subscription.gymOrgId}`,
        subscription.clientMembershipId,
      );
    }
  }

  linkClient(clientUserId: UserId, gymOrgId: GymOrgId, membershipId: MembershipId): void {
    this.membershipByClientGym.set(`${clientUserId}:${gymOrgId}`, membershipId);
  }

  async findById(gymOrgId: GymOrgId, subscriptionId: SubscriptionId): Promise<Subscription | null> {
    const subscription = this.byId.get(subscriptionId) ?? null;
    if (subscription === null || subscription.gymOrgId !== gymOrgId || subscription.isDeleted) {
      return null;
    }
    return subscription;
  }

  async findBaseForMembership(
    gymOrgId: GymOrgId,
    membershipId: MembershipId,
  ): Promise<Subscription | null> {
    return (
      [...this.byId.values()].find(
        (s) =>
          s.gymOrgId === gymOrgId &&
          s.clientMembershipId === membershipId &&
          !s.isDeleted &&
          s.kind === 'BASE',
      ) ?? null
    );
  }

  async findInDateCoachingAddon(
    gymOrgId: GymOrgId,
    membershipId: MembershipId,
    today: CalendarDate,
  ): Promise<Subscription | null> {
    return (
      [...this.byId.values()].find(
        (s) =>
          s.gymOrgId === gymOrgId &&
          s.clientMembershipId === membershipId &&
          !s.isDeleted &&
          s.kind === 'ADDON' &&
          s.capability === 'TRAINER_COACHING' &&
          s.isInDate(today),
      ) ?? null
    );
  }

  async save(subscription: Subscription): Promise<void> {
    this.byId.set(subscription.id, subscription);
  }

  async listForMembership(
    gymOrgId: GymOrgId,
    membershipId: MembershipId,
  ): Promise<readonly SubscriptionSummary[]> {
    return [...this.byId.values()]
      .filter(
        (s) => s.gymOrgId === gymOrgId && s.clientMembershipId === membershipId && !s.isDeleted,
      )
      .map((s) => summaryFromEntity(s));
  }

  async listForClientAtGym(
    gymOrgId: GymOrgId,
    clientUserId: UserId,
    _options?: { readonly requireActive?: boolean },
  ): Promise<readonly SubscriptionSummary[] | null> {
    const membershipId = this.membershipByClientGym.get(`${clientUserId}:${gymOrgId}`);
    if (membershipId === undefined) {
      return null;
    }
    return this.listForMembership(gymOrgId, membershipId);
  }

  async listExpiringSoon(
    criteria: {
      gymOrgId: GymOrgId;
      onOrBefore: string;
      onOrAfter?: string;
    },
    page: { limit: number; offset: number },
  ): Promise<{
    items: readonly (SubscriptionSummary & { clientUserId: string })[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const clientByMembership = new Map<string, UserId>();
    for (const [key, membershipId] of this.membershipByClientGym) {
      const [clientUserId] = key.split(':');
      clientByMembership.set(membershipId, clientUserId as UserId);
    }

    const filtered = [...this.byId.values()]
      .filter((s) => {
        if (s.gymOrgId !== criteria.gymOrgId || s.isDeleted || s.endDate === null) {
          return false;
        }
        if (s.endDate.value > criteria.onOrBefore) {
          return false;
        }
        if (criteria.onOrAfter !== undefined && s.endDate.value < criteria.onOrAfter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aEnd = a.endDate?.value ?? '';
        const bEnd = b.endDate?.value ?? '';
        return aEnd < bEnd ? -1 : aEnd > bEnd ? 1 : 0;
      });

    const sliced = filtered.slice(page.offset, page.offset + page.limit);
    return {
      items: sliced.map((s) => ({
        ...summaryFromEntity(s),
        clientUserId: clientByMembership.get(s.clientMembershipId) ?? 'unknown',
      })),
      total: filtered.length,
      limit: page.limit,
      offset: page.offset,
    };
  }
}

function summaryFromEntity(subscription: Subscription): SubscriptionSummary {
  const dto = toSubscriptionDto(subscription);
  return {
    id: dto.id,
    clientMembershipId: dto.clientMembershipId,
    gymOrgId: dto.gymOrgId,
    planId: dto.planId,
    kind: dto.kind,
    capability: dto.capability,
    priceAmount: dto.priceAmount,
    durationDays: dto.durationDays,
    startDate: dto.startDate,
    endDate: dto.endDate,
    startSource: dto.startSource,
    paymentStatus: dto.paymentStatus,
    amountPaid: dto.amountPaid,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
