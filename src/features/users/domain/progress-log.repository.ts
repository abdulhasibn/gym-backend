import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { UserId } from '../../../domain/shared/user-id';
import type { ProgressLog } from './progress-log.entity';

export interface ProgressLogRepository {
  findByClientAndDate(clientUserId: UserId, logDate: CalendarDate): Promise<ProgressLog | null>;
  save(log: ProgressLog): Promise<void>;
}
