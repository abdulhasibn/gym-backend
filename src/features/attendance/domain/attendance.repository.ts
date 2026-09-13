import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { UserId } from '../../../domain/shared/user-id';
import type { Attendance } from './attendance.entity';
import type { AttendanceId } from './attendance-id';

export interface AttendanceRepository {
  findById(gymOrgId: GymOrgId, attendanceId: AttendanceId): Promise<Attendance | null>;
  findOpenByClient(gymOrgId: GymOrgId, clientUserId: UserId): Promise<Attendance | null>;
  save(attendance: Attendance): Promise<void>;
}
