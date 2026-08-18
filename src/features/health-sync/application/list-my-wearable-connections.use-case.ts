import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { WearableConnectionQueries } from '../domain/wearable-connection.queries';
import { ClientSelfPolicy } from './client-self.policy';
import { toWearableConnectionDto, type WearableConnectionDto } from './health-sync.dto';

export class ListMyWearableConnectionsUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly queries: WearableConnectionQueries,
  ) {}

  async execute(actor: AuthenticatedActor): Promise<readonly WearableConnectionDto[]> {
    this.policy.requireClientSelf(actor);
    const connections = await this.queries.listLiveForClient(actor.userId);
    return connections.map(toWearableConnectionDto);
  }
}
