import type { UserId } from '../../../domain/shared/user-id';
import type { GymOrg } from './gym-org.entity';
import type { GymOrgName } from './gym-org-name.value-object';
import type { IanaTimezone } from './iana-timezone.value-object';

export interface CreateOwnedGymOrg {
  readonly ownerUserId: UserId;
  readonly name: GymOrgName;
  readonly address: string | null;
  readonly contactPhone: string | null;
  readonly contactEmail: string | null;
  readonly logoUrl: string | null;
  readonly timezone: IanaTimezone;
}

export interface GymOrgRepository {
  createOwnedGymOrg(command: CreateOwnedGymOrg): Promise<GymOrg>;
}
