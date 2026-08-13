import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { GymLocalClock, GymLocalDayBounds } from '../domain/gym-local-clock.port';
import { calendarDateInTimeZone, utcBoundsForGymLocalDay } from './gym-day-utc-bounds';

export interface GymTimezoneLookup {
  findTimezone(gymOrgId: GymOrgId): Promise<string | null>;
}

export class GymOrgLocalClock implements GymLocalClock {
  constructor(private readonly gyms: GymTimezoneLookup) {}

  async today(gymOrgId: GymOrgId, now: Date): Promise<CalendarDate> {
    const timeZone = await this.requireTimezone(gymOrgId);
    return calendarDateInTimeZone(now, timeZone);
  }

  async dayBounds(gymOrgId: GymOrgId, day: CalendarDate): Promise<GymLocalDayBounds> {
    const timeZone = await this.requireTimezone(gymOrgId);
    return utcBoundsForGymLocalDay(day, timeZone);
  }

  private async requireTimezone(gymOrgId: GymOrgId): Promise<string> {
    const timeZone = await this.gyms.findTimezone(gymOrgId);
    if (timeZone === null) {
      throw new NotFoundError('Gym organization not found');
    }
    return timeZone;
  }
}
