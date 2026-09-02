import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import { CalendarDate } from '../../../domain/shared/calendar-date.value-object';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { CoachingEntitlementPort } from '../domain/coaching-entitlement.port';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import type { WorkoutScheduleCompletionQueries } from '../domain/workout-schedule-completion.queries';
import type {
  WorkoutScheduleDaySummary,
  WorkoutScheduleQueries,
} from '../domain/workout-schedule.queries';
import type { WorkoutScheduleExerciseId } from '../domain/workout-schedule-exercise-id';
import {
  toWorkoutScheduleDayDtoFromSummary,
  type WorkoutScheduleDayDto,
} from './coaching.dto';
import { DietClientPolicy } from './diet-client.policy';
import { parseRange } from './get-staff-workout-schedule.use-case';

export class GetMyWorkoutScheduleUseCase {
  constructor(
    private readonly policy: DietClientPolicy,
    private readonly entitlement: CoachingEntitlementPort,
    private readonly queries: WorkoutScheduleQueries,
    private readonly completions: WorkoutScheduleCompletionQueries,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    gymOrgId: GymOrgId,
    fromRaw: string,
    toRaw: string,
  ): Promise<{
    readonly days: readonly WorkoutScheduleDayDto[];
    readonly writable: boolean;
    readonly today: string;
  }> {
    this.policy.requireClientSelf(actor);

    const membership = await this.entitlement.findActiveMembership(actor.userId, gymOrgId);
    if (membership === null) {
      return { days: [], writable: false, today: '' };
    }

    const { from, to } = parseRange(fromRaw, toRaw);
    const today = await this.gymClock.today(gymOrgId, this.clock.now());
    const writable = await this.entitlement.hasInDateCoachingAddon(
      actor.userId,
      gymOrgId,
      today,
    );

    const summaries = await this.queries.listRange({
      clientUserId: actor.userId,
      gymOrgId,
      from: from.value,
      to: to.value,
    });

    const completedByDate = await loadCompletionsByScheduleDate(
      this.completions,
      actor.userId,
      summaries,
    );

    return {
      days: summaries.map((day) =>
        toWorkoutScheduleDayDtoFromSummary(day, {
          writable,
          includeAdherence: true,
          completedExerciseIds: completedByDate.get(day.scheduleDate) ?? new Set(),
        }),
      ),
      writable,
      today: today.value,
    };
  }
}

export async function loadCompletionsByScheduleDate(
  completions: WorkoutScheduleCompletionQueries,
  clientUserId: Parameters<WorkoutScheduleCompletionQueries['findCompletedExerciseIds']>[0],
  summaries: readonly WorkoutScheduleDaySummary[],
): Promise<Map<string, Set<WorkoutScheduleExerciseId>>> {
  const result = new Map<string, Set<WorkoutScheduleExerciseId>>();
  for (const day of summaries) {
    const exerciseIds = day.sessions.flatMap((session) =>
      session.exercises.map((exercise) => exercise.id),
    );
    if (exerciseIds.length === 0) {
      result.set(day.scheduleDate, new Set());
      continue;
    }
    const completed = await completions.findCompletedExerciseIds(
      clientUserId,
      CalendarDate.create(day.scheduleDate),
      exerciseIds,
    );
    result.set(day.scheduleDate, new Set(completed));
  }
  return result;
}
