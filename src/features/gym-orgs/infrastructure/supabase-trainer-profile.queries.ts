import type { SupabaseClient } from '@supabase/supabase-js';

import { DataIntegrityError } from '../../../domain/errors/data-integrity.error';
import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import { toUserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { Page, Pagination } from '../../../shared/pagination/pagination';
import { toPage } from '../../../shared/pagination/pagination';
import { toGymOrgId } from '../domain/gym-org-id';
import type { GymOrgId } from '../domain/gym-org-id';
import type { GymTrainerSummary, TrainerProfileQueries } from '../domain/trainer-profile.queries';

type TrainerProfileRow = Database['public']['Tables']['trainer_profiles']['Row'];
type UserEmbed = Pick<
  Database['public']['Tables']['users']['Row'],
  'name' | 'email' | 'staff_code' | 'deleted_at'
>;

interface TrainerProfileListRow extends TrainerProfileRow {
  users: UserEmbed | UserEmbed[] | null;
}

export class SupabaseTrainerProfileQueries implements TrainerProfileQueries {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listForGym(gymOrgId: GymOrgId, page: Pagination): Promise<Page<GymTrainerSummary>> {
    const { data, error, count } = await this.client
      .from('trainer_profiles')
      .select(
        '*, users!trainer_profiles_user_id_fkey!inner ( name, email, staff_code, deleted_at )',
        { count: 'exact' },
      )
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null)
      .is('users.deleted_at', null)
      .order('created_at', { ascending: true })
      .range(page.offset, page.offset + page.limit - 1);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to list gym trainers', { cause: error });
    }

    const rows = (data ?? []) as unknown as TrainerProfileListRow[];
    const userIds = rows.map((row) => row.user_id);
    const adminIds = await this.loadLiveAdminUserIds(gymOrgId, userIds);

    return toPage(
      rows.map((row) => toGymTrainerSummary(row, adminIds)),
      count ?? 0,
      page,
    );
  }

  private async loadLiveAdminUserIds(
    gymOrgId: GymOrgId,
    userIds: readonly string[],
  ): Promise<Set<string>> {
    if (userIds.length === 0) {
      return new Set();
    }

    const { data, error } = await this.client
      .from('gym_admins')
      .select('user_id')
      .eq('gym_org_id', gymOrgId)
      .in('user_id', [...userIds])
      .is('deleted_at', null);

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read gym admin affiliations', {
        cause: error,
      });
    }

    return new Set((data ?? []).map((row) => row.user_id));
  }
}

function toGymTrainerSummary(row: TrainerProfileListRow, adminIds: Set<string>): GymTrainerSummary {
  const user = Array.isArray(row.users) ? (row.users[0] ?? null) : row.users;
  if (user === null) {
    throw new DataIntegrityError('Trainer profile is missing user');
  }

  return {
    trainerProfileId: row.id,
    userId: toUserId(row.user_id),
    gymOrgId: toGymOrgId(row.gym_org_id),
    name: user.name,
    email: user.email,
    staffCode: user.staff_code,
    bio: row.bio,
    isAdmin: adminIds.has(row.user_id),
    createdAt: row.created_at,
  };
}
