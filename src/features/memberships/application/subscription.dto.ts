import type { Subscription } from '../domain/subscription.entity';
import type { SubscriptionSummary } from '../domain/subscription.queries';
import type { PaymentStatus } from '../domain/payment-status';
import type { PlanCapability } from '../domain/plan-capability';
import type { PlanKind } from '../domain/plan-kind';
import type { SubscriptionStartSource } from '../domain/subscription-start-source';

export interface SubscriptionDto {
  readonly id: string;
  readonly clientMembershipId: string;
  readonly gymOrgId: string;
  readonly planId: string;
  readonly kind: PlanKind;
  readonly capability: PlanCapability | null;
  readonly priceAmount: number;
  readonly durationDays: number;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly startSource: SubscriptionStartSource | null;
  readonly paymentStatus: PaymentStatus;
  readonly amountPaid: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toSubscriptionDto(subscription: Subscription): SubscriptionDto {
  return {
    id: subscription.id,
    clientMembershipId: subscription.clientMembershipId,
    gymOrgId: subscription.gymOrgId,
    planId: subscription.planId,
    kind: subscription.kind,
    capability: subscription.capability,
    priceAmount: subscription.priceAmount.value,
    durationDays: subscription.durationDays.value,
    startDate: subscription.startDate?.value ?? null,
    endDate: subscription.endDate?.value ?? null,
    startSource: subscription.startSource,
    paymentStatus: subscription.paymentStatus,
    amountPaid: subscription.amountPaid.value,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}

export function toSubscriptionDtoFromSummary(summary: SubscriptionSummary): SubscriptionDto {
  return {
    id: summary.id,
    clientMembershipId: summary.clientMembershipId,
    gymOrgId: summary.gymOrgId,
    planId: summary.planId,
    kind: summary.kind,
    capability: summary.capability,
    priceAmount: summary.priceAmount,
    durationDays: summary.durationDays,
    startDate: summary.startDate,
    endDate: summary.endDate,
    startSource: summary.startSource,
    paymentStatus: summary.paymentStatus,
    amountPaid: summary.amountPaid,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}
