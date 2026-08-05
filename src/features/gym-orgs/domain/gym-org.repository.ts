import type { UserId } from '../../../domain/shared/user-id';
import type { GymOrgAdminDirectory } from './gym-org-admin.directory';
import type { GymOrg } from './gym-org.entity';
import type { GymOrgId } from './gym-org-id';
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

export interface GymOrgRepository extends GymOrgAdminDirectory {
  createOwnedGymOrg(command: CreateOwnedGymOrg): Promise<GymOrg>;
  findById(id: GymOrgId): Promise<GymOrg | null>;
  save(gymOrg: GymOrg): Promise<void>;
}
