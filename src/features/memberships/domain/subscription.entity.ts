import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { DurationDays } from './duration-days.value-object';
import { InvalidSubscriptionPaymentError } from './invalid-subscription-payment.error';
import { InvalidSubscriptionStartError } from './invalid-subscription-start.error';
import type { MembershipId } from './membership-id';
import type { MembershipPlanId } from './membership-plan-id';
import { isPaymentStatus, type PaymentStatus } from './payment-status';
import type { PlanCapability } from './plan-capability';
import { isPlanKind, type PlanKind } from './plan-kind';
import { PlanPrice } from './plan-price.value-object';
import type { SubscriptionId } from './subscription-id';
import {
  isSubscriptionStartSource,
  type SubscriptionStartSource,
} from './subscription-start-source';

export interface SubscriptionData {
  readonly id: SubscriptionId;
  readonly clientMembershipId: MembershipId;
  readonly gymOrgId: GymOrgId;
  readonly planId: MembershipPlanId;
  readonly kind: PlanKind;
  readonly capability: PlanCapability | null;
  readonly priceAmount: PlanPrice;
  readonly durationDays: DurationDays;
  readonly startDate: CalendarDate | null;
  readonly endDate: CalendarDate | null;
  readonly startSource: SubscriptionStartSource | null;
  readonly paymentStatus: PaymentStatus;
  readonly amountPaid: PlanPrice;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function assertSubscriptionData(data: SubscriptionData): void {
  if (!isPlanKind(data.kind)) {
    throw new Error('Subscription kind is invalid');
  }
  if (data.kind === 'BASE' && data.capability !== null) {
    throw new Error('BASE subscriptions cannot have a capability');
  }
  if (data.kind === 'ADDON' && data.capability === null) {
    throw new Error('ADDON subscriptions require a capability');
  }
  if (!isPaymentStatus(data.paymentStatus)) {
    throw new Error('Subscription payment status is invalid');
  }
  if (data.startSource !== null && !isSubscriptionStartSource(data.startSource)) {
    throw new Error('Subscription start source is invalid');
  }
  if ((data.startDate === null) !== (data.endDate === null)) {
    throw new Error('Subscription start and end dates must both be set or both null');
  }
  if ((data.startDate === null) !== (data.startSource === null)) {
    throw new Error('Subscription start source must match whether dates are set');
  }
  assertPaymentPair(data.paymentStatus, data.amountPaid, data.priceAmount);
}

function assertPaymentPair(
  status: PaymentStatus,
  amountPaid: PlanPrice,
  priceAmount: PlanPrice,
): void {
  if (status === 'unpaid') {
    if (amountPaid.value !== 0) {
      throw new InvalidSubscriptionPaymentError('Unpaid subscriptions must have amount paid 0');
    }
    return;
  }
  if (status === 'paid') {
    if (amountPaid.value !== priceAmount.value) {
      throw new InvalidSubscriptionPaymentError(
        'Paid subscriptions must have amount paid equal to price',
      );
    }
    return;
  }
  if (amountPaid.value <= 0 || amountPaid.value >= priceAmount.value) {
    throw new InvalidSubscriptionPaymentError(
      'Partial payment must be greater than 0 and less than price',
    );
  }
}

export class Subscription {
  private constructor(private data: SubscriptionData) {}

  static reconstitute(data: SubscriptionData): Subscription {
    assertSubscriptionData(data);
    return new Subscription(data);
  }

  get id(): SubscriptionId {
    return this.data.id;
  }

  get clientMembershipId(): MembershipId {
    return this.data.clientMembershipId;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get planId(): MembershipPlanId {
    return this.data.planId;
  }

  get kind(): PlanKind {
    return this.data.kind;
  }

  get capability(): PlanCapability | null {
    return this.data.capability;
  }

  get priceAmount(): PlanPrice {
    return this.data.priceAmount;
  }

  get durationDays(): DurationDays {
    return this.data.durationDays;
  }

  get startDate(): CalendarDate | null {
    return this.data.startDate;
  }

  get endDate(): CalendarDate | null {
    return this.data.endDate;
  }

  get startSource(): SubscriptionStartSource | null {
    return this.data.startSource;
  }

  get paymentStatus(): PaymentStatus {
    return this.data.paymentStatus;
  }

  get amountPaid(): PlanPrice {
    return this.data.amountPaid;
  }

  get deletedAt(): Date | null {
    return this.data.deletedAt;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  get isDeleted(): boolean {
    return this.data.deletedAt !== null;
  }

  /** Inclusive calendar-day range; false when unstarted (null dates). */
  isInDate(today: CalendarDate): boolean {
    if (this.data.deletedAt !== null) {
      return false;
    }
    if (this.data.startDate === null || this.data.endDate === null) {
      return false;
    }
    return this.data.startDate.value <= today.value && today.value <= this.data.endDate.value;
  }

  /**
   * Update payment fields. For `paid` / `unpaid`, amount is derived from snapshotted price.
   * For `partial`, `amountPaid` is required.
   */
  setPayment(status: PaymentStatus, amountPaid: PlanPrice | null, now: Date): void {
    if (this.data.deletedAt !== null) {
      throw new InvalidSubscriptionPaymentError('Cannot update payment on a deleted subscription');
    }
    if (!isPaymentStatus(status)) {
      throw new InvalidSubscriptionPaymentError('Payment status is invalid');
    }

    let nextAmount: PlanPrice;
    if (status === 'unpaid') {
      nextAmount = PlanPrice.create(0);
    } else if (status === 'paid') {
      nextAmount = this.data.priceAmount;
    } else if (amountPaid === null) {
      throw new InvalidSubscriptionPaymentError('Partial payment requires amountPaid');
    } else {
      nextAmount = amountPaid;
    }

    assertPaymentPair(status, nextAmount, this.data.priceAmount);

    this.data = {
      ...this.data,
      paymentStatus: status,
      amountPaid: nextAmount,
      updatedAt: now,
    };
  }

  /**
   * Admin start override for unstarted BASE lines only (A19).
   * Sets end_date = start + duration_days - 1 and start_source = ADMIN_OVERRIDE.
   */
  overrideStart(startDate: CalendarDate, now: Date): void {
    this.startUnstartedBase(startDate, now, 'ADMIN_OVERRIDE');
  }

  /**
   * First attendance starts an unstarted BASE (F5.1).
   * Sets end_date = start + duration_days - 1 and start_source = FIRST_ATTENDANCE.
   */
  startFromFirstAttendance(startDate: CalendarDate, now: Date): void {
    this.startUnstartedBase(startDate, now, 'FIRST_ATTENDANCE');
  }

  private startUnstartedBase(
    startDate: CalendarDate,
    now: Date,
    startSource: 'ADMIN_OVERRIDE' | 'FIRST_ATTENDANCE',
  ): void {
    if (this.data.deletedAt !== null) {
      throw new InvalidSubscriptionStartError('Cannot start a deleted subscription');
    }
    if (this.data.kind !== 'BASE') {
      throw new InvalidSubscriptionStartError('Start is only allowed on BASE subscriptions');
    }
    if (this.data.startDate !== null) {
      throw new InvalidSubscriptionStartError(
        'Start is only allowed on unstarted BASE subscriptions',
      );
    }

    const endDate = startDate.addDays(this.data.durationDays.value - 1);

    this.data = {
      ...this.data,
      startDate,
      endDate,
      startSource,
      updatedAt: now,
    };
  }
}
