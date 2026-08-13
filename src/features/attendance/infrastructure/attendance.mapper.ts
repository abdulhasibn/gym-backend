import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { toGymOrgId } from '../../../domain/shared/gym-org-id';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { Attendance } from '../domain/attendance.entity';
import { toAttendanceId } from '../domain/attendance-id';
import { isAttendanceRecorder } from '../domain/attendance-recorder';
import type { AttendanceSummary } from '../domain/attendance.queries';

type AttendanceRow = Database['public']['Tables']['attendances']['Row'];

export function toAttendance(row: AttendanceRow): Attendance {
  try {
    if (!isAttendanceRecorder(row.recorded_by)) {
      throw new Error('Stored attendance recorder is invalid');
    }
    return Attendance.reconstitute({
      id: toAttendanceId(row.id),
      clientUserId: toUserId(row.client_user_id),
      gymOrgId: toGymOrgId(row.gym_org_id),
      occurredAt: toValidDate(row.occurred_at),
      recordedBy: row.recorded_by,
      recorderUserId: toUserId(row.recorder_user_id),
      deletedAt: row.deleted_at === null ? null : toValidDate(row.deleted_at),
      createdAt: toValidDate(row.created_at),
    });
  } catch (error) {
    throw new DataIntegrityError('Stored attendance is invalid', { cause: error });
  }
}

export function toAttendanceSummary(row: AttendanceRow): AttendanceSummary {
  if (!isAttendanceRecorder(row.recorded_by)) {
    throw new DataIntegrityError('Stored attendance recorder is invalid');
  }
  return {
    id: toAttendanceId(row.id),
    clientUserId: toUserId(row.client_user_id),
    gymOrgId: toGymOrgId(row.gym_org_id),
    occurredAt: toValidDate(row.occurred_at).toISOString(),
    recordedBy: row.recorded_by,
    recorderUserId: toUserId(row.recorder_user_id),
    createdAt: toValidDate(row.created_at).toISOString(),
  };
}

export function toAttendanceInsert(
  attendance: Attendance,
): Database['public']['Tables']['attendances']['Insert'] {
  return {
    id: attendance.id,
    client_user_id: attendance.clientUserId,
    gym_org_id: attendance.gymOrgId,
    occurred_at: attendance.occurredAt.toISOString(),
    recorded_by: attendance.recordedBy,
    recorder_user_id: attendance.recorderUserId,
    deleted_at: attendance.deletedAt?.toISOString() ?? null,
    created_at: attendance.createdAt.toISOString(),
  };
}

function toValidDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Stored timestamp is invalid');
  }
  return date;
}
