import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';

export interface SyncWearableWeight {
  upsert(clientUserId: UserId, logDate: CalendarDate, weightKg: number): Promise<void>;
}
