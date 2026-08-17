import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { Clock } from '../../../shared/clock/clock';
import type { CalorieLogQueries } from '../domain/calorie-log.queries';
import { ClientSelfPolicy } from './client-self.policy';
import { emptyCalorieLogDto, toCalorieLogDto, type CalorieLogDto } from './nutrition.dto';

export class GetMyCalorieLogUseCase {
  constructor(
    private readonly policy: ClientSelfPolicy,
    private readonly queries: CalorieLogQueries,
    private readonly clock: Clock,
    private readonly todayInKolkata: (now: Date) => CalendarDate,
  ) {}

  async execute(actor: AuthenticatedActor, logDate: string | undefined): Promise<CalorieLogDto> {
    this.policy.requireClientSelf(actor);
    const date =
      logDate === undefined ? this.todayInKolkata(this.clock.now()) : CalendarDate.create(logDate);
    const day = await this.queries.findDay(actor.userId, date);
    return day === null ? emptyCalorieLogDto(date.value) : toCalorieLogDto(day);
  }
}
