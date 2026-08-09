import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { CalendarDate } from '../domain/calendar-date.value-object';
import { DurationDays } from '../domain/duration-days.value-object';
import { toMembershipId } from '../domain/membership-id';
import { toMembershipPlanId } from '../domain/membership-plan-id';
import { isPaymentStatus } from '../domain/payment-status';
import { isPlanCapability } from '../domain/plan-capability';
import { isPlanKind } from '../domain/plan-kind';
import { PlanPrice } from '../domain/plan-price.value-object';
import { Subscription } from '../domain/subscription.entity';
import { toSubscriptionId } from '../domain/subscription-id';
import type { SubscriptionSummary } from '../domain/subscription.queries';
import { isSubscriptionStartSource } from '../domain/subscription-start-source';

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];

export function toSubscription(row: SubscriptionRow): Subscription {
  try {
    if (!isPlanKind(row.kind)) {
      throw new Error('Stored subscription kind is invalid');
    }
    if (row.capability !== null && !isPlanCapability(row.capability)) {
      throw new Error('Stored subscription capability is invalid');
    }
    if (!isPaymentStatus(row.payment_status)) {
      throw new Error('Stored payment status is invalid');
    }
    if (row.start_source !== null && !isSubscriptionStartSource(row.start_source)) {
      throw new Error('Stored start source is invalid');
    }

    return Subscription.reconstitute({
      id: toSubscriptionId(row.id),
      clientMembershipId: toMembershipId(row.client_membership_id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      planId: toMembershipPlanId(row.plan_id),
      kind: row.kind,
      capability: row.capability,
      priceAmount: PlanPrice.create(Number(row.price_amount)),
      durationDays: DurationDays.create(row.duration_days),
      startDate: row.start_date === null ? null : CalendarDate.create(row.start_date),
      endDate: row.end_date === null ? null : CalendarDate.create(row.end_date),
      startSource: row.start_source,
      paymentStatus: row.payment_status,
      amountPaid: PlanPrice.create(Number(row.amount_paid)),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
      updatedAt: toValidDate(row.updated_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored subscription is invalid', { cause: error });
  }
}

export function toSubscriptionSummary(row: SubscriptionRow): SubscriptionSummary {
  if (!isPlanKind(row.kind)) {
    throw new DataIntegrityError('Stored subscription kind is invalid');
  }
  if (row.capability !== null && !isPlanCapability(row.capability)) {
    throw new DataIntegrityError('Stored subscription capability is invalid');
  }
  if (!isPaymentStatus(row.payment_status)) {
    throw new DataIntegrityError('Stored payment status is invalid');
  }
  if (row.start_source !== null && !isSubscriptionStartSource(row.start_source)) {
    throw new DataIntegrityError('Stored start source is invalid');
  }

  return {
    id: row.id,
    clientMembershipId: row.client_membership_id,
    gymOrgId: row.gym_org_id,
    planId: row.plan_id,
    kind: row.kind,
    capability: row.capability,
    priceAmount: Number(row.price_amount),
    durationDays: row.duration_days,
    startDate: row.start_date,
    endDate: row.end_date,
    startSource: row.start_source,
    paymentStatus: row.payment_status,
    amountPaid: Number(row.amount_paid),
    createdAt: toValidDate(row.created_at).toISOString(),
    updatedAt: toValidDate(row.updated_at).toISOString(),
  };
}

export function toSubscriptionUpdate(
  subscription: Subscription,
): Database['public']['Tables']['subscriptions']['Update'] {
  return {
    start_date: subscription.startDate?.value ?? null,
    end_date: subscription.endDate?.value ?? null,
    start_source: subscription.startSource,
    payment_status: subscription.paymentStatus,
    amount_paid: subscription.amountPaid.value,
    deleted_at: subscription.deletedAt?.toISOString() ?? null,
    updated_at: subscription.updatedAt.toISOString(),
  };
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}
