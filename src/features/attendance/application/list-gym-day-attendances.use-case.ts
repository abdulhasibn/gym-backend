import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import type { AttendanceQueries } from '../domain/attendance.queries';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import { AttendanceAccessPolicy } from './attendance-access.policy';
import { toAttendanceDtoFromSummary, type AttendanceDto } from './attendance.dto';

export class ListGymDayAttendancesUseCase {
  constructor(
    private readonly policy: AttendanceAccessPolicy,
    private readonly queries: AttendanceQueries,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    day: string | undefined,
    page: Pagination,
  ): Promise<Page<AttendanceDto>> {
    await this.policy.requireAdmin(actor, gymOrgId);

    const calendarDay =
      day === undefined
        ? await this.gymClock.today(gymOrgId, this.clock.now())
        : CalendarDate.create(day);
    const bounds = await this.gymClock.dayBounds(gymOrgId, calendarDay);

    const result = await this.queries.listForGymDay(
      {
        gymOrgId,
        occurredAtFrom: bounds.startInclusive,
        occurredAtTo: bounds.endExclusive,
      },
      page,
    );

    return {
      items: result.items.map(toAttendanceDtoFromSummary),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }
}
