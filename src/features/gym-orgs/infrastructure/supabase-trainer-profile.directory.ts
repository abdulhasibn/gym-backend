import type { SupabaseClient } from '@supabase/supabase-js';

import { TransientDatabaseFailureError } from '../../../domain/errors/transient-database-failure.error';
import type { UserId } from '../../../domain/shared/user-id';
import type { Database } from '../../../infrastructure/supabase/database.types';
import type { GymOrgTrainerDirectory } from '../domain/gym-org-trainer.directory';
import type { GymOrgId } from '../domain/gym-org-id';

export class SupabaseTrainerProfileDirectory implements GymOrgTrainerDirectory {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findLiveTrainerProfileId(userId: UserId, gymOrgId: GymOrgId): Promise<string | null> {
    const { data, error } = await this.client
      .from('trainer_profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read trainer profile', { cause: error });
    }

    return data?.id ?? null;
  }

  async isLiveTrainerProfile(trainerProfileId: string, gymOrgId: GymOrgId): Promise<boolean> {
    const { data, error } = await this.client
      .from('trainer_profiles')
      .select('id')
      .eq('id', trainerProfileId)
      .eq('gym_org_id', gymOrgId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error !== null) {
      throw new TransientDatabaseFailureError('Unable to read trainer profile', { cause: error });
    }

    return data !== null;
  }
}
