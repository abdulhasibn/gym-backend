import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { ClientProfileQueries } from '../domain/client-profile.queries';
import { ClientSelfPolicy } from './client-self.policy';
import { toClientProfileDto, type ClientProfileDto } from './users.dto';

export class GetMyProfileUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly profiles: ClientProfileQueries,
  ) {}

  async execute(actor: AuthenticatedActor): Promise<ClientProfileDto> {
    this.policy.requireClientSelf(actor);
    const profile = await this.profiles.get(actor.userId);
    if (profile === null) {
      throw new NotFoundError('Client profile not found');
    }
    return toClientProfileDto(profile);
  }
}
