import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { Clock } from '../../../shared/clock/clock';
import { toCalorieLogItemId } from '../domain/calorie-log-item-id';
import type { CalorieLogRepository } from '../domain/calorie-log.repository';
import { ClientSelfPolicy } from './client-self.policy';
import { toCalorieLogDtoFromEntry, type CalorieLogDto } from './nutrition.dto';

export class UnlogCalorieItemUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly logs: CalorieLogRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, itemId: string): Promise<CalorieLogDto> {
    this.policy.requireClientSelf(actor);

    const calorieLogItemId = toCalorieLogItemId(itemId);
    const entry = await this.logs.findByClientAndItem(actor.userId, calorieLogItemId);
    if (entry === null) {
      throw new NotFoundError('Calorie log item not found');
    }

    entry.softDeleteExtra(calorieLogItemId, this.clock.now());
    await this.logs.save(entry);

    return toCalorieLogDtoFromEntry(entry);
  }
}
