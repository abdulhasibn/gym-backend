import type { UserId } from '../../../domain/shared/user-id';
import type { GymOrgId } from './gym-org-id';
import { StaffInviteInvalidTransitionError } from './staff-invite-invalid-transition.error';
import type { StaffInviteId } from './staff-invite-id';
import type { StaffInviteStatus } from './staff-invite-status';
import type { StaffInviteTargetRole } from './staff-invite-target-role';

export interface StaffInviteData {
  readonly id: StaffInviteId;
  readonly gymOrgId: GymOrgId;
  readonly invitedUserId: UserId;
  readonly targetRole: StaffInviteTargetRole;
  readonly status: StaffInviteStatus;
  readonly expiresAt: Date | null;
  readonly createdBy: UserId;
  readonly acceptedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateStaffInviteData {
  readonly id: StaffInviteId;
  readonly gymOrgId: GymOrgId;
  readonly invitedUserId: UserId;
  readonly targetRole: StaffInviteTargetRole;
  readonly expiresAt: Date;
  readonly createdBy: UserId;
  readonly now: Date;
}

export class StaffInvite {
  private constructor(private data: StaffInviteData) {}

  static create(input: CreateStaffInviteData): StaffInvite {
    return new StaffInvite({
      id: input.id,
      gymOrgId: input.gymOrgId,
      invitedUserId: input.invitedUserId,
      targetRole: input.targetRole,
      status: 'PENDING',
      expiresAt: input.expiresAt,
      createdBy: input.createdBy,
      acceptedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstitute(data: StaffInviteData): StaffInvite {
    return new StaffInvite(data);
  }

  get id(): StaffInviteId {
    return this.data.id;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get invitedUserId(): UserId {
    return this.data.invitedUserId;
  }

  get targetRole(): StaffInviteTargetRole {
    return this.data.targetRole;
  }

  get status(): StaffInviteStatus {
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

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
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

  assertAcceptableBy(actorUserId: UserId, now: Date): void {
    if (this.data.status !== 'PENDING') {
      throw new StaffInviteInvalidTransitionError(this.data.status, 'ACCEPTED');
    }
    if (this.data.invitedUserId !== actorUserId) {
      throw new StaffInviteInvalidTransitionError(this.data.status, 'ACCEPTED');
    }
    if (this.isExpiredAt(now)) {
      throw new StaffInviteInvalidTransitionError(this.data.status, 'ACCEPTED');
    }
  }

  markAccepted(now: Date): void {
    this.requirePending('ACCEPTED');
    this.data = {
      ...this.data,
      status: 'ACCEPTED',
      acceptedAt: now,
      updatedAt: now,
    };
  }

  private requirePending(to: StaffInviteStatus): void {
    if (this.data.status !== 'PENDING') {
      throw new StaffInviteInvalidTransitionError(this.data.status, to);
    }
  }
}
