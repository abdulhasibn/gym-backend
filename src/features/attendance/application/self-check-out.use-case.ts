import type { AuthenticatedActor } from '../../../domain/shared/authenticated-actor';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Clock } from '../../../shared/clock/clock';
import type { AttendanceRepository } from '../domain/attendance.repository';
import { NoOpenVisitError } from '../domain/no-open-visit.error';
import { AttendanceAccessPolicy } from './attendance-access.policy';
import { toAttendanceDto, type AttendanceDto } from './attendance.dto';

export class SelfCheckOutUseCase {
  constructor(
    private readonly policy: AttendanceAccessPolicy,
    private readonly attendances: AttendanceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actor: AuthenticatedActor, gymOrgId: GymOrgId): Promise<AttendanceDto> {
    this.policy.requireClientSelf(actor);

    const open = await this.attendances.findOpenByClient(gymOrgId, actor.userId);
    if (open === null) {
      throw new NoOpenVisitError();
    }

    open.checkOut({
      at: this.clock.now(),
      recorderUserId: actor.userId,
      recordedBy: 'CLIENT',
    });
    await this.attendances.save(open);
    return toAttendanceDto(open, false);
  }
}
