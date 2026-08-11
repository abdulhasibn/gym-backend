import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import { ClientMembershipInvalidTransitionError } from './client-membership-invalid-transition.error';
import type { MembershipId } from './membership-id';
import type { MembershipInviteId } from './membership-invite-id';
import type { MembershipStatus } from './membership-status';
import type { TrainerProfileId } from './trainer-profile-id';

export interface ClientMembershipData {
  readonly id: MembershipId;
  readonly clientUserId: UserId;
  readonly gymOrgId: GymOrgId;
  readonly status: MembershipStatus;
  readonly checkInBlocked: boolean;
  readonly assignedTrainerId: TrainerProfileId | null;
  readonly sourceInviteId: MembershipInviteId | null;
  readonly joinedAt: Date;
  readonly leftAt: Date | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateClientMembershipData {
  readonly id: MembershipId;
  readonly clientUserId: UserId;
  readonly gymOrgId: GymOrgId;
  readonly sourceInviteId: MembershipInviteId;
  readonly now: Date;
}

export class ClientMembership {
  private constructor(private data: ClientMembershipData) {}

  static create(input: CreateClientMembershipData): ClientMembership {
    return new ClientMembership({
      id: input.id,
      clientUserId: input.clientUserId,
      gymOrgId: input.gymOrgId,
      status: 'ACTIVE',
      checkInBlocked: false,
      assignedTrainerId: null,
      sourceInviteId: input.sourceInviteId,
      joinedAt: input.now,
      leftAt: null,
      deletedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstitute(data: ClientMembershipData): ClientMembership {
    return new ClientMembership(data);
  }

  get id(): MembershipId {
    return this.data.id;
  }

  get clientUserId(): UserId {
    return this.data.clientUserId;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get status(): MembershipStatus {
    return this.data.status;
  }

  get checkInBlocked(): boolean {
    return this.data.checkInBlocked;
  }

  get assignedTrainerId(): TrainerProfileId | null {
    return this.data.assignedTrainerId;
  }

  get sourceInviteId(): MembershipInviteId | null {
    return this.data.sourceInviteId;
  }

  get joinedAt(): Date {
    return this.data.joinedAt;
  }

  get leftAt(): Date | null {
    return this.data.leftAt;
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

  get isActive(): boolean {
    return this.data.status === 'ACTIVE' && this.data.deletedAt === null;
  }

  offboard(now: Date): void {
    this.requireActiveMutable('offboard');
    this.data = {
      ...this.data,
      status: 'INACTIVE',
      leftAt: now,
      updatedAt: now,
    };
  }

  assignTrainer(trainerProfileId: TrainerProfileId, now: Date): void {
    this.requireActiveMutable('assign trainer');
    this.data = {
      ...this.data,
      assignedTrainerId: trainerProfileId,
      updatedAt: now,
    };
  }

  blockCheckIn(now: Date): void {
    this.requireActiveMutable('block check-in');
    if (this.data.checkInBlocked) {
      return;
    }
    this.data = {
      ...this.data,
      checkInBlocked: true,
      updatedAt: now,
    };
  }

  unblockCheckIn(now: Date): void {
    this.requireActiveMutable('unblock check-in');
    if (!this.data.checkInBlocked) {
      return;
    }
    this.data = {
      ...this.data,
      checkInBlocked: false,
      updatedAt: now,
    };
  }

  private requireActiveMutable(action: string): void {
    if (this.data.deletedAt !== null) {
      throw new ClientMembershipInvalidTransitionError(`Cannot ${action} a deleted membership`);
    }
    if (this.data.status !== 'ACTIVE') {
      throw new ClientMembershipInvalidTransitionError(`Cannot ${action} an inactive membership`);
    }
  }
}
