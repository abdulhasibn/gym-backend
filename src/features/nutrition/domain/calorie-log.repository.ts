import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { CalorieLogEntry } from './calorie-log-entry.entity';
import type { CalorieLogItemId } from './calorie-log-item-id';

export interface CalorieLogRepository {
  findByClientAndDate(clientUserId: UserId, logDate: CalendarDate): Promise<CalorieLogEntry | null>;

  findByClientAndItem(
    clientUserId: UserId,
    itemId: CalorieLogItemId,
  ): Promise<CalorieLogEntry | null>;

  save(entry: CalorieLogEntry): Promise<void>;
}
