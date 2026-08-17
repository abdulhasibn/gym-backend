import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import { toFoodItemId } from '../../../domain/shared/food-item-id';
import { toFoodServingId } from '../../../domain/shared/food-serving-id';
import { parseMealSlot } from '../../../domain/shared/meal-slot';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import { CalorieLogEntry } from '../domain/calorie-log-entry.entity';
import { toCalorieLogEntryId } from '../domain/calorie-log-entry-id';
import { toCalorieLogItemId } from '../domain/calorie-log-item-id';
import type { CalorieLogRepository } from '../domain/calorie-log.repository';
import type { FoodCatalogRepository } from '../domain/food-catalog.repository';
import { scaleNutrients } from '../domain/nutrients';
import { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';
import { ClientSelfPolicy } from './client-self.policy';
import { toCalorieLogDtoFromEntry, type CalorieLogDto } from './nutrition.dto';

export interface LogExtraFoodCommand {
  readonly foodItemId: string;
  readonly servingId: string;
  readonly quantity: number;
  readonly mealSlot: string;
  readonly logDate?: string;
}

export class LogExtraFoodUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly catalog: FoodCatalogRepository,
    private readonly logs: CalorieLogRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly todayInKolkata: (now: Date) => CalendarDate,
  ) {}

  async execute(actor: AuthenticatedActor, command: LogExtraFoodCommand): Promise<CalorieLogDto> {
    this.policy.requireClientSelf(actor);

    const now = this.clock.now();
    const logDate =
      command.logDate === undefined
        ? this.todayInKolkata(now)
        : CalendarDate.create(command.logDate);
    const foodItemId = toFoodItemId(command.foodItemId);
    const servingId = toFoodServingId(command.servingId);
    const serving = await this.catalog.findLiveSeedServing(foodItemId, servingId);
    if (serving === null) {
      throw new NotFoundError('Seed catalog food or serving not found');
    }

    const quantity = ServingQuantity.create(command.quantity);
    const mealSlot = parseMealSlot(command.mealSlot);
    const scaled = scaleNutrients(serving.per100g, serving.grams, quantity.value);

    let entry = await this.logs.findByClientAndDate(actor.userId, logDate);
    if (entry === null) {
      entry = CalorieLogEntry.create({
        id: toCalorieLogEntryId(this.ids.generate()),
        clientUserId: actor.userId,
        logDate,
        now,
      });
    }

    entry.addExtra({
      id: toCalorieLogItemId(this.ids.generate()),
      foodItemId,
      servingId,
      quantity,
      mealSlot,
      calories: scaled.calories,
      proteinG: scaled.proteinG,
      carbsG: scaled.carbsG,
      fatG: scaled.fatG,
    });
    await this.logs.save(entry);

    return toCalorieLogDtoFromEntry(entry);
  }
}
