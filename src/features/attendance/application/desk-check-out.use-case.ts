import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Clock } from '../../../shared/clock/clock';
import type { AttendanceRepository } from '../domain/attendance.repository';
import { NoOpenVisitError } from '../domain/no-open-visit.error';
import { AttendanceAccessPolicy } from './attendance-access.policy';
import { toAttendanceDto, type AttendanceDto } from './attendance.dto';

export interface DeskCheckOutCommand {
  readonly gymOrgId: GymOrgId;
  readonly clientUserId: UserId;
}

export class DeskCheckOutUseCase {
  constructor(
    private readonly policy: AttendanceAccessPolicy,
    private readonly attendances: AttendanceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, command: DeskCheckOutCommand): Promise<AttendanceDto> {
    await this.policy.requireAdmin(actor, command.gymOrgId);

    const open = await this.attendances.findOpenByClient(command.gymOrgId, command.clientUserId);
    if (open === null) {
      throw new NoOpenVisitError();
    }

    open.checkOut({
      at: this.clock.now(),
      recorderUserId: actor.userId,
      recordedBy: 'ADMIN',
    });
    await this.attendances.save(open);
    return toAttendanceDto(open, false);
  }
}
