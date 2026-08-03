import type { UserId } from '../../../domain/shared/user-id';
import type { GymOrgId } from './gym-org-id';
import type { GymOrgName } from './gym-org-name.value-object';
import type { IanaTimezone } from './iana-timezone.value-object';

export interface GymOrgData {
  readonly id: GymOrgId;
  readonly name: GymOrgName;
  readonly address: string | null;
  readonly contactPhone: string | null;
  readonly contactEmail: string | null;
  readonly logoUrl: string | null;
  readonly timezone: IanaTimezone;
  readonly ownerUserId: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class GymOrg {
  private constructor(private readonly data: GymOrgData) {}

  static reconstitute(data: GymOrgData): GymOrg {
    if (data.address?.trim() === '') {
      throw new Error('Gym organization address cannot be blank');
    }

    return new GymOrg(data);
  }

  get id(): GymOrgId {
    return this.data.id;
  }

  get name(): GymOrgName {
    return this.data.name;
  }

  get address(): string | null {
    return this.data.address;
  }

  get contactPhone(): string | null {
    return this.data.contactPhone;
  }

  get contactEmail(): string | null {
    return this.data.contactEmail;
  }

  get logoUrl(): string | null {
    return this.data.logoUrl;
  }

  get timezone(): IanaTimezone {
    return this.data.timezone;
  }

  get ownerUserId(): UserId {
    return this.data.ownerUserId;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  isOwnedBy(userId: UserId): boolean {
    return this.data.ownerUserId === userId;
  }
}
