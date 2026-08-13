import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { Database } from '../../../infrastructure/supabase/database.types';
import { toPage, type Page, type Pagination } from '../../../shared/pagination/pagination';
import type {
  AttendanceQueries,
  AttendanceSummary,
  ListClientAttendancesCriteria,
  ListGymDayAttendancesCriteria,
} from '../domain/attendance.queries';
import { toAttendanceSummary } from './attendance.mapper';

export class SupabaseAttendanceQueries implements AttendanceQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForGymDay(
    criteria: ListGymDayAttendancesCriteria,
    page: Pagination,
  ): Promise<Page<AttendanceSummary>> {
    const from = page.offset;
    const to = page.offset + page.limit - 1;

    const { data, error, count } = await this.client
      .from('attendances')
      .select('*', { count: 'exact' })
      .eq('gym_org_id', criteria.gymOrgId)
      .gte('occurred_at', criteria.occurredAtFrom.toISOString())
      .lt('occurred_at', criteria.occurredAtTo.toISOString())
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false })
      .range(from, to);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list gym-day attendances', {
        cause: error,
      });
    }

    return toPage((data ?? []).map(toAttendanceSummary), count ?? 0, page);
  }

  async listForClient(
    criteria: ListClientAttendancesCriteria,
    page: Pagination,
  ): Promise<Page<AttendanceSummary>> {
    const from = page.offset;
    const to = page.offset + page.limit - 1;

    const { data, error, count } = await this.client
      .from('attendances')
      .select('*', { count: 'exact' })
      .eq('gym_org_id', criteria.gymOrgId)
      .eq('client_user_id', criteria.clientUserId)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false })
      .range(from, to);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list client attendances', {
        cause: error,
      });
    }

    return toPage((data ?? []).map(toAttendanceSummary), count ?? 0, page);
  }
}
