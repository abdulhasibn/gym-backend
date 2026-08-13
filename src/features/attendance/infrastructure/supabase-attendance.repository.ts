import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import { UniqueViolationError } from '../../../domain/errors/unique-violation.error';
import type { GymOrgId } from '../../../domain/shared/gym-org-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { Attendance } from '../domain/attendance.entity';
import type { AttendanceId } from '../domain/attendance-id';
import type { AttendanceRepository } from '../domain/attendance.repository';
import { toAttendance, toAttendanceInsert } from './attendance.mapper';

export class SupabaseAttendanceRepository implements AttendanceRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findById(gymOrgId: GymOrgId, attendanceId: AttendanceId): Promise<Attendance | null> {
    const { data, error } = await this.client
      .from('attendances')
      .select('*')
      .eq('gym_org_id', gymOrgId)
      .eq('id', attendanceId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read attendance', { cause: error });
    }
    if (data === null) {
      return null;
    }
    return toAttendance(data);
  }

  async save(attendance: Attendance): Promise<void> {
    const { error } = await this.client.from('attendances').insert(toAttendanceInsert(attendance));

    if (error !== null) {
      const code = error.code ?? '';
      if (code === '23505') {
        throw new UniqueViolationError('Attendance already exists');
      }
      throw new TransientDatabaseFailureError('Unable to save attendance', { cause: error });
    }
  }
}
