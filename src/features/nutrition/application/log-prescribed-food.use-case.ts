import { NotFoundError } from '../../../domain/errors/not-found.error';
import { toCalorieLogEntryId } from '../domain/calorie-log-entry-id';
import { toCalorieLogItemId } from '../domain/calorie-log-item-id';
import { CalorieLogEntry } from '../domain/calorie-log-entry.entity';
import type { CalorieLogRepository } from '../domain/calorie-log.repository';
import type { FoodCatalogRepository } from '../domain/food-catalog.repository';
import type {
  LogPrescribedFood,
  LogPrescribedFoodCommand,
  UnlogPrescribedFoodCommand,
} from '../domain/log-prescribed-food.port';
import { scaleNutrients } from '../domain/nutrients';
import { ServingQuantity } from '../../../domain/shared/serving-quantity.value-object';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';

export class LogPrescribedFoodUseCase implements LogPrescribedFood {
  constructor(
    private readonly catalog: FoodCatalogRepository,
    private readonly logs: CalorieLogRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async log(command: LogPrescribedFoodCommand): Promise<void> {
    const serving = await this.catalog.findLiveSeedServing(command.foodItemId, command.servingId);
    if (serving === null) {
      throw new NotFoundError('Seed catalog food or serving not found');
    }

    const quantity = ServingQuantity.create(command.quantity);
    const scaled = scaleNutrients(serving.per100g, serving.grams, quantity.value);
    const now = this.clock.now();

    let entry = await this.logs.findByClientAndDate(command.clientUserId, command.logDate);
    if (entry === null) {
      entry = CalorieLogEntry.create({
        id: toCalorieLogEntryId(this.ids.generate()),
        clientUserId: command.clientUserId,
        logDate: command.logDate,
        now,
      });
    }

    entry.addPrescribed({
      id: toCalorieLogItemId(this.ids.generate()),
      foodItemId: command.foodItemId,
      servingId: command.servingId,
      quantity,
      mealSlot: command.mealSlot,
      dietPlanMealItemId: command.dietPlanMealItemId,
      calories: scaled.calories,
      proteinG: scaled.proteinG,
      carbsG: scaled.carbsG,
      fatG: scaled.fatG,
    });
    await this.logs.save(entry);
  }

  async unlog(command: UnlogPrescribedFoodCommand): Promise<void> {
    const entry = await this.logs.findByClientAndDate(command.clientUserId, command.logDate);
    if (entry === null) {
      throw new NotFoundError('Prescribed item is not logged for this day');
    }
    entry.unlogPrescribed(command.dietPlanMealItemId, this.clock.now());
    await this.logs.save(entry);
  }
}
