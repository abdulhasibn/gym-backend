import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Clock } from '../../../shared/clock/clock';
import type { GymOrgId } from '../domain/gym-org-id';
import type { GymOrgName } from '../domain/gym-org-name.value-object';
import type { GymOrgRepository } from '../domain/gym-org.repository';
import type { IanaTimezone } from '../domain/iana-timezone.value-object';
import type { GymOrgAdminPolicy } from './gym-org-admin.policy';
import type { GymOrgDto } from './gym-org.dto';
import { toGymOrgDto } from './gym-org.dto';

export interface UpdateGymOrgCommand {
  readonly gymOrgId: GymOrgId;
  readonly name: GymOrgName;
  readonly address: string | null;
  readonly contactPhone: string | null;
  readonly contactEmail: string | null;
  readonly logoUrl: string | null;
  readonly timezone: IanaTimezone;
}

export class UpdateGymOrgUseCase {
  constructor(
    private readonly gymOrgs: GymOrgRepository,
    private readonly policy: GymOrgAdminPolicy,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, command: UpdateGymOrgCommand): Promise<GymOrgDto> {
    await this.policy.requireOrgWrite(actor, command.gymOrgId);

    const gymOrg = await this.gymOrgs.findById(command.gymOrgId);
    if (gymOrg === null) {
      throw new NotFoundError('Gym organization not found');
    }

    gymOrg.updateProfile(
      {
        name: command.name,
        address: command.address,
        contactPhone: command.contactPhone,
        contactEmail: command.contactEmail,
        logoUrl: command.logoUrl,
        timezone: command.timezone,
      },
      this.clock.now(),
    );
    await this.gymOrgs.save(gymOrg);

    return toGymOrgDto(gymOrg);
  }
}
