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
  readonly checkedOutAt: Date | null;
  readonly checkoutRecorderUserId: UserId | null;
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

export interface CheckOutAttendanceProps {
  readonly at: Date;
  readonly recorderUserId: UserId;
  readonly recordedBy: AttendanceRecorder;
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
  const checkoutPairComplete = data.checkedOutAt !== null && data.checkoutRecorderUserId !== null;
  const checkoutPairEmpty = data.checkedOutAt === null && data.checkoutRecorderUserId === null;
  if (!checkoutPairComplete && !checkoutPairEmpty) {
    throw new InvalidAttendanceError(
      'Check-out timestamp and recorder must both be set or both empty',
    );
  }
  if (data.checkedOutAt !== null && data.checkedOutAt.getTime() < data.occurredAt.getTime()) {
    throw new InvalidAttendanceError('Check-out cannot be before check-in');
  }
}

export class Attendance {
  private constructor(private data: AttendanceData) {}

  static create(props: CreateAttendanceProps): Attendance {
    const data: AttendanceData = {
      id: props.id,
      clientUserId: props.clientUserId,
      gymOrgId: props.gymOrgId,
      occurredAt: props.occurredAt,
      recordedBy: props.recordedBy,
      recorderUserId: props.recorderUserId,
      checkedOutAt: null,
      checkoutRecorderUserId: null,
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

  get checkedOutAt(): Date | null {
    return this.data.checkedOutAt;
  }

  get checkoutRecorderUserId(): UserId | null {
    return this.data.checkoutRecorderUserId;
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

  get isOpen(): boolean {
    return this.data.checkedOutAt === null;
  }

  durationSeconds(): number | null {
    if (this.data.checkedOutAt === null) {
      return null;
    }
    return Math.floor((this.data.checkedOutAt.getTime() - this.data.occurredAt.getTime()) / 1000);
  }

  checkOut(props: CheckOutAttendanceProps): void {
    if (this.data.checkedOutAt !== null) {
      throw new InvalidAttendanceError('Attendance visit is already checked out');
    }
    if (props.at.getTime() < this.data.occurredAt.getTime()) {
      throw new InvalidAttendanceError('Check-out cannot be before check-in');
    }
    if (props.recordedBy === 'CLIENT' && props.recorderUserId !== this.data.clientUserId) {
      throw new InvalidAttendanceError(
        'Client-recorded check-out must have recorder equal to client',
      );
    }
    this.data = {
      ...this.data,
      checkedOutAt: props.at,
      checkoutRecorderUserId: props.recorderUserId,
    };
  }
}
