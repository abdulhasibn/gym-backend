import { toUserId } from '../../../domain/shared/user-id';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { CalorieLogQueries } from '../domain/calorie-log.queries';
import type { ClientDataGrantGate } from '../domain/client-data-grant.gate';
import {
  hasCaloriesGrant,
  emptyCalorieLogDto,
  toCalorieLogDto,
  type CalorieLogDto,
} from './nutrition.dto';
import { StaffCalorieReadPolicy } from './staff-calorie-read.policy';
import { NutritionForbiddenError } from './nutrition-forbidden.error';

export class GetStaffClientCalorieLogUseCase {
  constructor(
    private readonly policy: StaffCalorieReadPolicy,
    private readonly queries: CalorieLogQueries,
    private readonly grants: ClientDataGrantGate,
    private readonly clock: Clock,
    private readonly todayInKolkata: (now: Date) => CalendarDate,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    clientUserId: string,
    logDate: string | undefined,
  ): Promise<CalorieLogDto> {
    await this.policy.requireStaffAtGym(actor, gymOrgId);

    const clientId = toUserId(clientUserId);
    const grantSnapshot = await this.grants.loadForActiveMembership(clientId, gymOrgId);
    if (grantSnapshot === null || !hasCaloriesGrant(grantSnapshot.classGrants)) {
      throw new NutritionForbiddenError('CALORIES grant required to view client diary');
    }

    const date =
      logDate === undefined ? this.todayInKolkata(this.clock.now()) : CalendarDate.create(logDate);
    const day = await this.queries.findDay(clientId, date);
    return day === null ? emptyCalorieLogDto(date.value) : toCalorieLogDto(day);
  }
}
