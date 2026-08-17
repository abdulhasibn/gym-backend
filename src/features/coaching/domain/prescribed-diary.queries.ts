import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { DietPlanMealItemId } from '../../../domain/shared/diet-plan-meal-item-id';
import type { UserId } from '../../../domain/shared/user-id';

export interface PrescribedDiaryQueries {
  findLoggedItemIds(
    clientUserId: UserId,
    logDate: CalendarDate,
    dietPlanMealItemIds: readonly DietPlanMealItemId[],
  ): Promise<readonly DietPlanMealItemId[]>;
}
