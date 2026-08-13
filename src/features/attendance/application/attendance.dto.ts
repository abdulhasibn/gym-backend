import type { Attendance } from '../domain/attendance.entity';
import type { AttendanceSummary } from '../domain/attendance.queries';

export interface AttendanceDto {
  readonly id: string;
  readonly clientUserId: string;
  readonly gymOrgId: string;
  readonly occurredAt: string;
  readonly recordedBy: string;
  readonly recorderUserId: string;
  readonly createdAt: string;
  readonly baseStarted: boolean;
}

export function toAttendanceDto(attendance: Attendance, baseStarted: boolean): AttendanceDto {
  return {
    id: attendance.id,
    clientUserId: attendance.clientUserId,
    gymOrgId: attendance.gymOrgId,
    occurredAt: attendance.occurredAt.toISOString(),
    recordedBy: attendance.recordedBy,
    recorderUserId: attendance.recorderUserId,
    createdAt: attendance.createdAt.toISOString(),
    baseStarted,
  };
}

export function toAttendanceDtoFromSummary(summary: AttendanceSummary): AttendanceDto {
  return {
    id: summary.id,
    clientUserId: summary.clientUserId,
    gymOrgId: summary.gymOrgId,
    occurredAt: summary.occurredAt,
    recordedBy: summary.recordedBy,
    recorderUserId: summary.recorderUserId,
    createdAt: summary.createdAt,
    baseStarted: false,
  };
}
