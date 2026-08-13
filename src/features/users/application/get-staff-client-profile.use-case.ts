import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { ClientDataGrantGate } from '../domain/client-data-grant.gate';
import type { ClientProfileQueries } from '../domain/client-profile.queries';
import { filterProfileByGrants } from './filter-profile-by-grants';
import { StaffClientReadPolicy } from './staff-client-read.policy';
import { UsersForbiddenError } from './users-forbidden.error';
import type { ClientProfileDto } from './users.dto';

export class GetStaffClientProfileUseCase {
  constructor(
    private readonly policy: StaffClientReadPolicy,
    private readonly profiles: ClientProfileQueries,
    private readonly grants: ClientDataGrantGate,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    clientUserId: string,
  ): Promise<ClientProfileDto> {
    await this.policy.requireStaffAtGym(actor, gymOrgId);

    const clientId = toUserId(clientUserId);
    const grantSnapshot = await this.grants.loadForActiveMembership(clientId, gymOrgId);
    if (grantSnapshot === null) {
      throw new UsersForbiddenError('No active membership or grants for this client at gym');
    }

    const profile = await this.profiles.get(clientId);
    if (profile === null) {
      throw new NotFoundError('Client profile not found');
    }

    return filterProfileByGrants(profile, grantSnapshot);
  }
}
