import { NotFoundError } from '../../../domain/errors/not-found.error';
import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { ClientDataGrantGate } from '../domain/client-data-grant.gate';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import { InvalidWorkoutScheduleError } from '../domain/invalid-workout-schedule.error';
import type { WorkoutScheduleCompletionQueries } from '../domain/workout-schedule-completion.queries';
import type { WorkoutScheduleQueries } from '../domain/workout-schedule.queries';
import {
  toWorkoutScheduleDayDtoFromSummary,
  type WorkoutScheduleDayDto,
} from './coaching.dto';
import type { DietAssignPolicy } from './diet-assign.policy';
import { CoachingForbiddenError } from './coaching-forbidden.error';
import { loadCompletionsByScheduleDate } from './get-my-workout-schedule.use-case';

const MAX_RANGE_DAYS = 62;
const WORKOUT_PLANS_GRANT = 'WORKOUT_PLANS';

export class GetStaffWorkoutScheduleUseCase {
  constructor(
    private readonly policy: DietAssignPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly queries: WorkoutScheduleQueries,
    private readonly completions: WorkoutScheduleCompletionQueries,
    private readonly grants: ClientDataGrantGate,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    clientUserIdRaw: string,
    fromRaw: string,
    toRaw: string,
  ): Promise<readonly WorkoutScheduleDayDto[]> {
    const trainerId = await this.policy.requireStaffReader(actor, gymOrgId);
    const clientUserId = toUserId(clientUserIdRaw);
    const membership = await this.entitlement.findActiveMembership(clientUserId, gymOrgId);
    if (membership === null) {
      throw new NotFoundError('Active membership not found');
    }
    if (actor.roleCode === 'TRAINER' && membership.assignedTrainerId !== trainerId) {
      throw new CoachingForbiddenError('Only the assigned trainer can read this schedule');
    }

    const { from, to } = parseRange(fromRaw, toRaw);
    const days = await this.queries.listRange({
      clientUserId,
      gymOrgId,
      from: from.value,
      to: to.value,
    });

    const grantSnapshot = await this.grants.loadForActiveMembership(clientUserId, gymOrgId);
    const includeAdherence =
      grantSnapshot !== null && grantSnapshot.classGrants.includes(WORKOUT_PLANS_GRANT);

    if (!includeAdherence) {
      return days.map((day) => toWorkoutScheduleDayDtoFromSummary(day));
    }

    const completedByDate = await loadCompletionsByScheduleDate(
      this.completions,
      clientUserId,
      days,
    );

    return days.map((day) =>
      toWorkoutScheduleDayDtoFromSummary(day, {
        includeAdherence: true,
        completedExerciseIds: completedByDate.get(day.scheduleDate) ?? new Set(),
      }),
    );
  }
}

export function parseRange(fromRaw: string, toRaw: string): {
  from: CalendarDate;
  to: CalendarDate;
} {
  const from = CalendarDate.create(fromRaw);
  const to = CalendarDate.create(toRaw);
  if (to.value < from.value) {
    throw new InvalidWorkoutScheduleError('to must be on or after from');
  }
  let cursor = from;
  let days = 1;
  while (cursor.value < to.value) {
    cursor = cursor.addDays(1);
    days += 1;
    if (days > MAX_RANGE_DAYS) {
      throw new InvalidWorkoutScheduleError(
        `Schedule range cannot exceed ${MAX_RANGE_DAYS} days`,
      );
    }
  }
  return { from, to };
}
