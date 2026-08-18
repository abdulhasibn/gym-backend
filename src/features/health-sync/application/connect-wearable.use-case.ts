import { UniqueViolationError } from '../../../domain/errors/unique-violation.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import { WearableConnection } from '../domain/wearable-connection.entity';
import type { WearableConnectionRepository } from '../domain/wearable-connection.repository';
import { toWearableConnectionId } from '../domain/wearable-connection-id';
import { WearableProvider } from '../domain/wearable-provider';
import { ClientSelfPolicy } from './client-self.policy';
import { toWearableConnectionDto, type WearableConnectionDto } from './health-sync.dto';

export interface ConnectWearableCommand {
  readonly provider: string;
  readonly authRef?: Record<string, unknown> | null;
}

export class ConnectWearableUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly connections: WearableConnectionRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: ConnectWearableCommand,
  ): Promise<WearableConnectionDto> {
    this.policy.requireClientSelf(actor);

    const provider = WearableProvider.create(command.provider);
    const existing = await this.connections.findLiveByClientAndProvider(actor.userId, provider);
    if (existing !== null) {
      throw new UniqueViolationError('wearable connection');
    }

    const now = this.clock.now();
    const connection = WearableConnection.create({
      id: toWearableConnectionId(this.ids.generate()),
      clientUserId: actor.userId,
      provider,
      authRef: command.authRef ?? null,
      now,
    });
    await this.connections.save(connection);

    return toWearableConnectionDto({
      id: connection.id,
      provider: connection.provider.code,
      lastSyncedAt: null,
      active: connection.active,
      createdAt: connection.createdAt.toISOString(),
    });
  }
}
