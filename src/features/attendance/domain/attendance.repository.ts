import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Attendance } from './attendance.entity';
import type { AttendanceId } from './attendance-id';

export interface AttendanceRepository {
  findById(gymOrgId: GymOrgId, attendanceId: AttendanceId): Promise<Attendance | null>;
  save(attendance: Attendance): Promise<void>;
}
