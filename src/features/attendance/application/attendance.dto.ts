import type { Attendance } from '../domain/attendance.entity';
import type { AttendanceSummary } from '../domain/attendance.queries';

export interface AttendanceDto {
  readonly id: string;
  readonly clientUserId: string;
  readonly gymOrgId: string;
  readonly checkedInAt: string;
  readonly checkedOutAt: string | null;
  readonly durationSeconds: number | null;
  readonly recordedBy: string;
  readonly recorderUserId: string;
  readonly checkoutRecorderUserId: string | null;
  readonly createdAt: string;
  readonly baseStarted: boolean;
}

function durationSecondsBetween(startIso: string, endIso: string): number {
  return Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000);
}

export function toAttendanceDto(attendance: Attendance, baseStarted: boolean): AttendanceDto {
  return {
    id: attendance.id,
    clientUserId: attendance.clientUserId,
    gymOrgId: attendance.gymOrgId,
    checkedInAt: attendance.occurredAt.toISOString(),
    checkedOutAt: attendance.checkedOutAt?.toISOString() ?? null,
    durationSeconds: attendance.durationSeconds(),
    recordedBy: attendance.recordedBy,
    recorderUserId: attendance.recorderUserId,
    checkoutRecorderUserId: attendance.checkoutRecorderUserId,
    createdAt: attendance.createdAt.toISOString(),
    baseStarted,
  };
}

export function toAttendanceDtoFromSummary(
  summary: AttendanceSummary,
  options?: { readonly asOf?: Date },
): AttendanceDto {
  let durationSeconds: number | null = null;
  if (summary.checkedOutAt !== null) {
    durationSeconds = durationSecondsBetween(summary.occurredAt, summary.checkedOutAt);
  } else if (options?.asOf !== undefined) {
    durationSeconds = durationSecondsBetween(summary.occurredAt, options.asOf.toISOString());
  }

  return {
    id: summary.id,
    clientUserId: summary.clientUserId,
    gymOrgId: summary.gymOrgId,
    checkedInAt: summary.occurredAt,
    checkedOutAt: summary.checkedOutAt,
    durationSeconds,
    recordedBy: summary.recordedBy,
    recorderUserId: summary.recorderUserId,
    checkoutRecorderUserId: summary.checkoutRecorderUserId,
    createdAt: summary.createdAt,
    baseStarted: false,
  };
}
