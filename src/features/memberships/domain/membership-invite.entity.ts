import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { InviteeEmail } from './invitee-email.value-object';
import type { InviteeName } from './invitee-name.value-object';
import type { InviteePhone } from './invitee-phone.value-object';
import type { MembershipId } from './membership-id';
import { MembershipInviteInvalidTransitionError } from './membership-invite-invalid-transition.error';
import type { MembershipInviteId } from './membership-invite-id';
import type { MembershipInviteStatus } from './membership-invite-status';
import type { MembershipPlanId } from './membership-plan-id';
import type { PaymentStatus } from './payment-status';

export interface MembershipInviteData {
  readonly id: MembershipInviteId;
  readonly gymOrgId: GymOrgId;
  readonly invitedEmail: InviteeEmail;
  readonly invitedUserId: UserId | null;
  readonly inviteeName: InviteeName;
  readonly inviteePhone: InviteePhone | null;
  readonly basePlanId: MembershipPlanId;
  readonly basePaymentStatus: PaymentStatus;
  readonly addonPlanId: MembershipPlanId | null;
  readonly addonPaymentStatus: PaymentStatus | null;
  readonly status: MembershipInviteStatus;
  readonly expiresAt: Date | null;
  readonly createdBy: UserId;
  readonly acceptedAt: Date | null;
  readonly acceptedMembershipId: MembershipId | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateMembershipInviteData {
  readonly id: MembershipInviteId;
  readonly gymOrgId: GymOrgId;
  readonly invitedEmail: InviteeEmail;
  readonly invitedUserId: UserId | null;
  readonly inviteeName: InviteeName;
  readonly inviteePhone: InviteePhone | null;
  readonly basePlanId: MembershipPlanId;
  readonly basePaymentStatus: PaymentStatus;
  readonly addonPlanId: MembershipPlanId | null;
  readonly addonPaymentStatus: PaymentStatus | null;
  readonly expiresAt: Date;
  readonly createdBy: UserId;
  readonly now: Date;
}

function assertAddonPaymentPair(
  addonPlanId: MembershipPlanId | null,
  addonPaymentStatus: PaymentStatus | null,
): void {
  if ((addonPlanId === null) !== (addonPaymentStatus === null)) {
    throw new Error('Addon plan and addon payment status must both be set or both be null');
  }
}

export class MembershipInvite {
  private constructor(private data: MembershipInviteData) {}

  static create(input: CreateMembershipInviteData): MembershipInvite {
    assertAddonPaymentPair(input.addonPlanId, input.addonPaymentStatus);
    return new MembershipInvite({
      id: input.id,
      gymOrgId: input.gymOrgId,
      invitedEmail: input.invitedEmail,
      invitedUserId: input.invitedUserId,
      inviteeName: input.inviteeName,
      inviteePhone: input.inviteePhone,
      basePlanId: input.basePlanId,
      basePaymentStatus: input.basePaymentStatus,
      addonPlanId: input.addonPlanId,
      addonPaymentStatus: input.addonPaymentStatus,
      status: 'PENDING',
      expiresAt: input.expiresAt,
      createdBy: input.createdBy,
      acceptedAt: null,
      acceptedMembershipId: null,
      deletedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstitute(data: MembershipInviteData): MembershipInvite {
    assertAddonPaymentPair(data.addonPlanId, data.addonPaymentStatus);
    return new MembershipInvite(data);
  }

  get id(): MembershipInviteId {
    return this.data.id;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get invitedEmail(): InviteeEmail {
    return this.data.invitedEmail;
  }

  get invitedUserId(): UserId | null {
    return this.data.invitedUserId;
  }

  get inviteeName(): InviteeName {
    return this.data.inviteeName;
  }

  get inviteePhone(): InviteePhone | null {
    return this.data.inviteePhone;
  }

  get basePlanId(): MembershipPlanId {
    return this.data.basePlanId;
  }

  get basePaymentStatus(): PaymentStatus {
    return this.data.basePaymentStatus;
  }

  get addonPlanId(): MembershipPlanId | null {
    return this.data.addonPlanId;
  }

  get addonPaymentStatus(): PaymentStatus | null {
    return this.data.addonPaymentStatus;
  }

  get status(): MembershipInviteStatus {
    return this.data.status;
  }

  get expiresAt(): Date | null {
    return this.data.expiresAt;
  }

  get createdBy(): UserId {
    return this.data.createdBy;
  }

  get acceptedAt(): Date | null {
    return this.data.acceptedAt;
  }

  get acceptedMembershipId(): MembershipId | null {
    return this.data.acceptedMembershipId;
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

  isExpiredAt(now: Date): boolean {
    return this.data.expiresAt !== null && this.data.expiresAt.getTime() <= now.getTime();
  }

  markExpired(now: Date): void {
    this.requirePending('EXPIRED');
    this.data = {
      ...this.data,
      status: 'EXPIRED',
      updatedAt: now,
    };
  }

  revoke(now: Date): void {
    this.requirePending('REVOKED');
    this.data = {
      ...this.data,
      status: 'REVOKED',
      updatedAt: now,
    };
  }

  /**
   * Identity: invited_user_id match, or null invited_user_id with email match.
   */
  assertAcceptableBy(actorUserId: UserId, actorEmail: string, now: Date): void {
    if (this.data.status !== 'PENDING') {
      throw new MembershipInviteInvalidTransitionError(this.data.status, 'ACCEPTED');
    }
    if (this.isExpiredAt(now)) {
      throw new MembershipInviteInvalidTransitionError(this.data.status, 'ACCEPTED');
    }

    const emailMatches = this.data.invitedEmail.value === actorEmail.trim().toLowerCase();
    const addressed =
      this.data.invitedUserId !== null ? this.data.invitedUserId === actorUserId : emailMatches;

    if (!addressed) {
      throw new MembershipInviteInvalidTransitionError(this.data.status, 'ACCEPTED');
    }
  }

  private requirePending(to: MembershipInviteStatus): void {
    if (this.data.status !== 'PENDING') {
      throw new MembershipInviteInvalidTransitionError(this.data.status, to);
    }
  }
}
