import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { MembershipPlanDeletedError } from './membership-plan-deleted.error';
import type { MembershipPlanId } from './membership-plan-id';
import type { DurationDays } from './duration-days.value-object';
import { isPlanCapability, type PlanCapability } from './plan-capability';
import { isPlanKind, type PlanKind } from './plan-kind';
import type { PlanName } from './plan-name.value-object';
import type { PlanPrice } from './plan-price.value-object';

export interface MembershipPlanData {
  readonly id: MembershipPlanId;
  readonly gymOrgId: GymOrgId;
  readonly name: PlanName;
  readonly kind: PlanKind;
  readonly capability: PlanCapability | null;
  readonly durationDays: DurationDays;
  readonly price: PlanPrice;
  readonly active: boolean;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateMembershipPlanProps {
  readonly id: MembershipPlanId;
  readonly gymOrgId: GymOrgId;
  readonly name: PlanName;
  readonly kind: PlanKind;
  readonly capability: PlanCapability | null;
  readonly durationDays: DurationDays;
  readonly price: PlanPrice;
  readonly now: Date;
}

export interface UpdateMembershipPlanProfile {
  readonly name: PlanName;
  readonly durationDays: DurationDays;
  readonly price: PlanPrice;
  readonly active: boolean;
}

function assertKindCapability(kind: PlanKind, capability: PlanCapability | null): void {
  if (!isPlanKind(kind)) {
    throw new Error('Plan kind is invalid');
  }
  if (kind === 'BASE') {
    if (capability !== null) {
      throw new Error('BASE plans cannot have a capability');
    }
    return;
  }
  if (capability === null) {
    throw new Error('ADDON plans require a capability');
  }
  if (!isPlanCapability(capability)) {
    throw new Error('Plan capability is invalid');
  }
}

function assertPlanData(data: MembershipPlanData): void {
  assertKindCapability(data.kind, data.capability);
}

export class MembershipPlan {
  private constructor(private data: MembershipPlanData) {}

  static create(props: CreateMembershipPlanProps): MembershipPlan {
    const data: MembershipPlanData = {
      id: props.id,
      gymOrgId: props.gymOrgId,
      name: props.name,
      kind: props.kind,
      capability: props.capability,
      durationDays: props.durationDays,
      price: props.price,
      active: true,
      deletedAt: null,
      createdAt: props.now,
      updatedAt: props.now,
    };
    assertPlanData(data);
    return new MembershipPlan(data);
  }

  static reconstitute(data: MembershipPlanData): MembershipPlan {
    assertPlanData(data);
    return new MembershipPlan(data);
  }

  get id(): MembershipPlanId {
    return this.data.id;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get name(): PlanName {
    return this.data.name;
  }

  get kind(): PlanKind {
    return this.data.kind;
  }

  get capability(): PlanCapability | null {
    return this.data.capability;
  }

  get durationDays(): DurationDays {
    return this.data.durationDays;
  }

  get price(): PlanPrice {
    return this.data.price;
  }

  get active(): boolean {
    return this.data.active;
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

  updateProfile(profile: UpdateMembershipPlanProfile, updatedAt: Date): void {
    this.assertNotDeleted();
    const next: MembershipPlanData = {
      ...this.data,
      name: profile.name,
      durationDays: profile.durationDays,
      price: profile.price,
      active: profile.active,
      updatedAt,
    };
    assertPlanData(next);
    this.data = next;
  }

  softDelete(deletedAt: Date): void {
    this.assertNotDeleted();
    this.data = { ...this.data, deletedAt, updatedAt: deletedAt };
  }

  private assertNotDeleted(): void {
    if (this.data.deletedAt !== null) {
      throw new MembershipPlanDeletedError();
    }
  }
}
