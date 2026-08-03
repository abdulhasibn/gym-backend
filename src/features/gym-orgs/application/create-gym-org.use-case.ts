import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgName } from '../domain/gym-org-name.value-object';
import type { IanaTimezone } from '../domain/iana-timezone.value-object';
import type { GymOrgRepository } from '../domain/gym-org.repository';
import type { GymOrgDto } from './gym-org.dto';
import { toGymOrgDto } from './gym-org.dto';
import type { CreateGymOrgPolicy } from './create-gym-org.policy';

export interface CreateGymOrgCommand {
  readonly name: GymOrgName;
  readonly address: string | null;
  readonly contactPhone: string | null;
  readonly contactEmail: string | null;
  readonly logoUrl: string | null;
  readonly timezone: IanaTimezone;
}

export class CreateGymOrgUseCase {
  constructor(
    private readonly gymOrgs: GymOrgRepository,
    private readonly policy: CreateGymOrgPolicy,
  ) {}

  async execute(actor: AuthenticatedActor, command: CreateGymOrgCommand): Promise<GymOrgDto> {
    this.policy.requireAuthorized(actor);

    const gymOrg = await this.gymOrgs.createOwnedGymOrg({
      ownerUserId: actor.userId,
      ...command,
    });

    return toGymOrgDto(gymOrg);
  }
}
