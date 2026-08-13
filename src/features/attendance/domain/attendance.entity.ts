import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { AttendanceId } from './attendance-id';
import { isAttendanceRecorder, type AttendanceRecorder } from './attendance-recorder';
import { InvalidAttendanceError } from './invalid-attendance.error';

export interface AttendanceData {
  readonly id: AttendanceId;
  readonly clientUserId: UserId;
  readonly gymOrgId: GymOrgId;
  readonly occurredAt: Date;
  readonly recordedBy: AttendanceRecorder;
  readonly recorderUserId: UserId;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
}

export interface CreateAttendanceProps {
  readonly id: AttendanceId;
  readonly clientUserId: UserId;
  readonly gymOrgId: GymOrgId;
  readonly occurredAt: Date;
  readonly recordedBy: AttendanceRecorder;
  readonly recorderUserId: UserId;
  readonly now: Date;
}

function assertAttendanceData(data: AttendanceData): void {
  if (!isAttendanceRecorder(data.recordedBy)) {
    throw new InvalidAttendanceError('Attendance recorder is invalid');
  }
  if (data.recordedBy === 'CLIENT' && data.recorderUserId !== data.clientUserId) {
    throw new InvalidAttendanceError(
      'Client-recorded attendance must have recorder equal to client',
    );
  }
}

export class Attendance {
  private constructor(private readonly data: AttendanceData) {}

  static create(props: CreateAttendanceProps): Attendance {
    const data: AttendanceData = {
      id: props.id,
      clientUserId: props.clientUserId,
      gymOrgId: props.gymOrgId,
      occurredAt: props.occurredAt,
      recordedBy: props.recordedBy,
      recorderUserId: props.recorderUserId,
      deletedAt: null,
      createdAt: props.now,
    };
    assertAttendanceData(data);
    return new Attendance(data);
  }

  static reconstitute(data: AttendanceData): Attendance {
    assertAttendanceData(data);
    return new Attendance(data);
  }

  get id(): AttendanceId {
    return this.data.id;
  }

  get clientUserId(): UserId {
    return this.data.clientUserId;
  }

  get gymOrgId(): GymOrgId {
    return this.data.gymOrgId;
  }

  get occurredAt(): Date {
    return this.data.occurredAt;
  }

  get recordedBy(): AttendanceRecorder {
    return this.data.recordedBy;
  }

  get recorderUserId(): UserId {
    return this.data.recorderUserId;
  }

  get deletedAt(): Date | null {
    return this.data.deletedAt;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get isDeleted(): boolean {
    return this.data.deletedAt !== null;
  }
}
