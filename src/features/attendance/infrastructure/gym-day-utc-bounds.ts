import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymLocalDayBounds } from '../domain/gym-local-clock.port';

/**
 * Convert a gym-local calendar day to exclusive UTC bounds.
 * Schema: query local days via UTC bounds — do not wrap column in AT TIME ZONE in WHERE.
 */
export function utcBoundsForGymLocalDay(day: CalendarDate, timeZone: string): GymLocalDayBounds {
  const startInclusive = localWallTimeToUtc(day.value, 0, 0, 0, 0, timeZone);
  const endExclusive = localWallTimeToUtc(day.addDays(1).value, 0, 0, 0, 0, timeZone);
  return { startInclusive, endExclusive };
}

export function calendarDateInTimeZone(now: Date, timeZone: string): CalendarDate {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return CalendarDate.create(formatted);
}

function localWallTimeToUtc(
  isoDate: string,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string,
): Date {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  let utc = Date.UTC(y, m - 1, d, hour, minute, second, ms);

  for (let i = 0; i < 3; i += 1) {
    const parts = zonedParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      ms,
    );
    const desired = Date.UTC(y, m - 1, d, hour, minute, second, ms);
    utc += desired - asUtc;
  }

  return new Date(utc);
}

function zonedParts(
  date: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map = Object.fromEntries(
    dtf
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: map.hour === '24' ? 0 : Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}
