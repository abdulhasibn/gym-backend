import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Clock } from '../../../shared/clock/clock';
import type { IdGenerator } from '../../../shared/ids/id-generator';
import { Attendance } from '../domain/attendance.entity';
import { toAttendanceId } from '../domain/attendance-id';
import type { AttendanceRepository } from '../domain/attendance.repository';
import type { BaseSubscriptionStarter } from '../domain/base-subscription-starter.port';
import { assertCheckInAllowed } from '../domain/check-in-eligibility';
import type { CheckInMembershipGate } from '../domain/check-in-membership.gate';
import type { GymLocalClock } from '../domain/gym-local-clock.port';
import { AttendanceAccessPolicy } from './attendance-access.policy';
import { toAttendanceDto, type AttendanceDto } from './attendance.dto';

export interface DeskMarkAttendanceCommand {
  readonly gymOrgId: GymOrgId;
  readonly clientUserId: UserId;
}

export class DeskMarkAttendanceUseCase {
  constructor(
    private readonly policy: AttendanceAccessPolicy,
    private readonly attendances: AttendanceRepository,
    private readonly gate: CheckInMembershipGate,
    private readonly starter: BaseSubscriptionStarter,
    private readonly gymClock: GymLocalClock,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: AuthenticatedActor,
    command: DeskMarkAttendanceCommand,
  ): Promise<AttendanceDto> {
    await this.policy.requireAdmin(actor, command.gymOrgId);

    const now = this.clock.now();
    const today = await this.gymClock.today(command.gymOrgId, now);
    const snapshot = await this.gate.loadActive(command.clientUserId, command.gymOrgId);
    const eligibility = assertCheckInAllowed(snapshot, today);

    let baseStarted = false;
    if (eligibility.needsBaseStart && eligibility.subscriptionId !== null) {
      await this.starter.startFromFirstAttendance(
        command.gymOrgId,
        eligibility.subscriptionId,
        today,
        now,
      );
      baseStarted = true;
    }

    const attendance = Attendance.create({
      id: toAttendanceId(this.ids.generate()),
      clientUserId: command.clientUserId,
      gymOrgId: command.gymOrgId,
      occurredAt: now,
      recordedBy: 'ADMIN',
      recorderUserId: actor.userId,
      now,
    });
    await this.attendances.save(attendance);
    return toAttendanceDto(attendance, baseStarted);
  }
}
