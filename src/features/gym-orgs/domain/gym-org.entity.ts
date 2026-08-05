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

export interface UpdateGymOrgProfile {
  readonly name: GymOrgName;
  readonly address: string | null;
  readonly contactPhone: string | null;
  readonly contactEmail: string | null;
  readonly logoUrl: string | null;
  readonly timezone: IanaTimezone;
}

export class GymOrg {
  private constructor(private data: GymOrgData) {}

  static reconstitute(data: GymOrgData): GymOrg {
    assertProfileFields(data.address, data.contactPhone, data.contactEmail, data.logoUrl);
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

  updateProfile(profile: UpdateGymOrgProfile, updatedAt: Date): void {
    assertProfileFields(
      profile.address,
      profile.contactPhone,
      profile.contactEmail,
      profile.logoUrl,
    );

    this.data = {
      ...this.data,
      name: profile.name,
      address: profile.address,
      contactPhone: profile.contactPhone,
      contactEmail: profile.contactEmail,
      logoUrl: profile.logoUrl,
      timezone: profile.timezone,
      updatedAt,
    };
  }
}

function assertProfileFields(
  address: string | null,
  contactPhone: string | null,
  contactEmail: string | null,
  logoUrl: string | null,
): void {
  if (address?.trim() === '') {
    throw new Error('Gym organization address cannot be blank');
  }
  if (contactPhone?.trim() === '') {
    throw new Error('Gym organization contact phone cannot be blank');
  }
  if (contactEmail?.trim() === '') {
    throw new Error('Gym organization contact email cannot be blank');
  }
  if (logoUrl?.trim() === '') {
    throw new Error('Gym organization logo URL cannot be blank');
  }
}
