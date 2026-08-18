import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Clock } from '../../../shared/clock/clock';
import type { WearableConnectionRepository } from '../domain/wearable-connection.repository';
import { WearableProvider } from '../domain/wearable-provider';
import { ClientSelfPolicy } from './client-self.policy';
import { toWearableConnectionDto, type WearableConnectionDto } from './health-sync.dto';

export class DisconnectWearableUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly connections: WearableConnectionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, providerCode: string): Promise<WearableConnectionDto> {
    this.policy.requireClientSelf(actor);

    const provider = WearableProvider.create(providerCode);
    const connection = await this.connections.findLiveByClientAndProvider(actor.userId, provider);
    if (connection === null) {
      throw new NotFoundError('Wearable connection not found');
    }

    connection.disconnect(this.clock.now());
    await this.connections.save(connection);

    return toWearableConnectionDto({
      id: connection.id,
      provider: connection.provider.code,
      lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
      active: connection.active,
      createdAt: connection.createdAt.toISOString(),
    });
  }
}
