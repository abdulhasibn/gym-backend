import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';

export const ASIA_KOLKATA = 'Asia/Kolkata';

export function calendarDateInTimeZone(now: Date, timeZone: string): CalendarDate {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return CalendarDate.create(formatted);
}

export function todayInKolkata(now: Date): CalendarDate {
  return calendarDateInTimeZone(now, ASIA_KOLKATA);
}
